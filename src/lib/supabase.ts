import type { SupabaseClient } from '@supabase/supabase-js';

// Project "bonsai-daniel" on Supabase. The publishable key is meant to ship in the browser: row level security in the
// database decides what it can do (read the catalog; only signed-in admins write). Override with VITE_ variables.
export const SUPABASE = {
  url: import.meta.env?.VITE_SUPABASE_URL ?? 'https://rwkvsepkevhqzpltmsck.supabase.co',
  key: import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY ?? 'sb_publishable_FqO5YvR5KmiDVuynAGw6Hg_sOncWykC',
};

// The client (auth and writes, ~45 KB) loads only when the curation needs it; visitors read through plain fetch.
let client: Promise<SupabaseClient> | null = null;
export function supabase() {
  client ??= import('@supabase/supabase-js').then(({ createClient }) => createClient(SUPABASE.url, SUPABASE.key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }));
  return client;
}

// The signed-in user may edit (confirmed e-mail listed in public.admins).
export async function isAdmin() {
  const db = await supabase();
  const { data: { session } } = await db.auth.getSession();
  if (!session) return false;
  const { data, error } = await db.rpc('is_admin');
  return !error && data === true;
}
