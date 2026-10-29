import { it } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { safeImageUrl } from '../src/lib/schema.ts';

const sha = (text: string) => `'sha256-${createHash('sha256').update(text).digest('base64')}'`;
const vercel = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8')) as { headers: { headers: { key: string; value: string }[] }[] };
const csp = vercel.headers.flatMap(rule => rule.headers).find(header => header.key === 'Content-Security-Policy')?.value ?? '';

it('a Content-Security-Policy permite exatamente o script e o handler inline de index.html', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const inline = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(match => match[1]);
  const handlers = [...html.matchAll(/\son\w+="([^"]*)"/g)].map(match => match[1]);
  assert.ok(inline.length > 0 && csp.includes("frame-ancestors 'none'"));
  // Editing the inline script or handler changes its hash: update vercel.json in the same change.
  for (const code of [...inline, ...handlers]) assert.ok(csp.includes(sha(code)), `hash ausente na CSP: ${sha(code)}`);
});

it('só aceita imagens do site, https ou dados de imagem', () => {
  for (const ok of ['/images/bonsai_01.jpeg', 'https://exemplo.com/a.jpg', 'data:image/png;base64,iVBORw0KGgo=']) assert.ok(safeImageUrl(ok), ok);
  for (const bad of ['http://exemplo.com/a.jpg', 'javascript:alert(1)', 'data:text/html;base64,PHNjcmlwdD4=', '/images/../x', 'https://user:pass@exemplo.com/a.jpg']) assert.ok(!safeImageUrl(bad), bad);
});
