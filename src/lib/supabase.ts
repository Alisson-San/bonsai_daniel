import type { SupabaseClient } from '@supabase/supabase-js';

// Project "bonsai-daniel" on Supabase. The publishable key is meant to ship in the browser: row level security in the
// database decides what it can do (read the catalog; only signed-in admins write). Override with VITE_ variables.
export const SUPABASE = {
  url: import.meta.env?.VITE_SUPABASE_URL ?? 'https://rwkvsepkevhqzpltmsck.supabase.co',
  key: import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY ?? 'sb_publishable_FqO5YvR5KmiDVuynAGw6Hg_sOncWykC',
};

// This site's id and Postgres schema in the shared project (each site has its own schema).
export const SITE = 'bonsai';
export const NOT_SITE_ADMIN = 'Esta conta não administra este site.';

// The client (auth and writes, ~45 KB) loads only when the curation needs it; visitors read through plain fetch.
let client: Promise<SupabaseClient<any, any, any>> | null = null;
export function supabase() {
  client ??= import('@supabase/supabase-js').then(({ createClient }) => createClient(SUPABASE.url, SUPABASE.key, { db: { schema: SITE }, auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }));
  return client;
}

// The signed-in user administers this site (public.is_site_admin, checked server side against the site's admin list).
export async function isAdmin() {
  const db = await supabase();
  const { data: { session } } = await db.auth.getSession();
  if (!session) return false;
  const { data, error } = await db.schema('public').rpc('is_site_admin', { p_site: SITE });
  return !error && data === true;
}

// Signed in but not an admin of this site (an account of another site): end the session so it never enters edit mode.
export async function requireSiteAdmin() {
  if (await isAdmin()) return true;
  await (await supabase()).auth.signOut().catch(() => {});
  return false;
}

export type SiteAdmin = { email: string; created_at: string; has_account: boolean };
type AdminCall = { action: 'list' } | { action: 'add'; email: string; password: string } | { action: 'remove'; email: string };
// Admin management goes through the "site-admins" Edge Function (it holds the privileged key; the site never does).
// invoke() sends the signed-in user's JWT; failures carry the function's pt-BR message in the response body.
export async function siteAdmins(body: AdminCall): Promise<{ admins?: SiteAdmin[]; ok?: boolean; existingAccount?: boolean }> {
  const db = await supabase();
  const { data, error } = await db.functions.invoke('site-admins', { body: { ...body, site: SITE } });
  if (error) {
    let message = 'Não foi possível concluir agora. Tente de novo.';
    try { const detail = await (error as { context?: Response }).context?.json(); if (typeof detail?.error === 'string') message = detail.error; } catch { /* keep the generic message */ }
    throw new Error(message);
  }
  return data ?? {};
}
