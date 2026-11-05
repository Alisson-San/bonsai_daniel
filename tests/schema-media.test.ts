import { it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { encodeCanvas } from '../src/lib/media.ts';
import { fetchCatalogRow } from '../src/lib/remoteRepository.ts';
import { SITE } from '../src/lib/supabase.ts';
import { safeImageUrl } from '../src/lib/schema.ts';

const canvas = (webp: boolean) => ({ calls: [] as string[], toDataURL(type?: string) { this.calls.push(String(type)); return type === 'image/webp' && webp ? 'data:image/webp;base64,AAAA' : `data:${webp || type !== 'image/webp' ? type : 'image/png'};base64,AAAA`; } });

it('prefere WebP e cai para JPEG (ou PNG com transparência) quando o canvas não codifica WebP', () => {
  assert.match(encodeCanvas(canvas(true) as never, false), /^data:image\/webp/);
  assert.match(encodeCanvas(canvas(false) as never, false), /^data:image\/jpeg/);
  assert.match(encodeCanvas(canvas(false) as never, true), /^data:image\/png/);
  for (const url of [encodeCanvas(canvas(true) as never, false), encodeCanvas(canvas(false) as never, false), encodeCanvas(canvas(false) as never, true)]) assert.ok(safeImageUrl(url), url);
});

it('lê o catálogo do schema bonsai pelo cabeçalho Accept-Profile', async () => {
  let seen: { url: string; headers: Record<string, string> } | undefined;
  const row = await fetchCatalogRow((async (url: string, init: RequestInit) => { seen = { url, headers: init.headers as Record<string, string> }; return new Response(JSON.stringify([{ revision: 3, data: {} }])); }) as never);
  assert.equal(SITE, 'bonsai');
  assert.equal(seen?.headers['Accept-Profile'], 'bonsai');
  assert.match(seen?.url ?? '', /\/rest\/v1\/catalog\?/);
  assert.equal(row?.revision, 3);
});

it('o código não usa mais public.catalog nem is_admin()', () => {
  const sources = ['../src/lib/supabase.ts', '../src/lib/remoteRepository.ts', '../src/components/AdminManager.tsx', '../src/components/CurationAccess.tsx'].map(file => readFileSync(new URL(file, import.meta.url), 'utf8')).join('\n');
  assert.ok(!/rpc\('is_admin'\)/.test(sources));
  assert.ok(/schema\('public'\)\.rpc\('is_site_admin', \{ p_site: SITE \}\)/.test(sources));
  assert.ok(/db: \{ schema: SITE \}/.test(sources));
});
