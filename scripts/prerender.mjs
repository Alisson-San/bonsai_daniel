// Writes the server-rendered pages into dist (the home page and /biografia) with the catalog published in Supabase,
// embedded as JSON for hydration, then removes the temporary SSR build. Without the database (offline build) the
// pages use the initial catalog and the browser loads the live one.
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const server = new URL('../.ssr/entry-server.js', import.meta.url);
const { render, fetchCatalogRow, catalogFromRow } = await import(pathToFileURL(server.pathname).href);
const row = await fetchCatalogRow().catch(error => { console.warn(`Catálogo do banco indisponível no build (${error.message}); usando o acervo inicial.`); return null; });
const catalog = catalogFromRow(row);
console.log(`Pré-renderização com ${catalog.plants.length} exemplar(es)${row ? ` (revisão ${row.revision} do banco)` : ''}.`);

const page = new URL('../dist/index.html', import.meta.url);
const html = readFileSync(page, 'utf8');
if (!html.includes('<div id="root"></div>')) throw new Error('dist/index.html sem <div id="root"></div>.');
const data = `<script id="catalog-data" type="application/json">${JSON.stringify(catalog).replace(/</g, '\\u003c')}</script>`;
const fill = path => html.replace('<div id="root"></div>', () => `<div id="root">${render(path, catalog)}</div>${data}`);

writeFileSync(page, fill('/'));
// The biography has its own title (the inline script in index.html only preloads the hero still on the home page, and
// stays byte-identical so its hash in the Content-Security-Policy of vercel.json matches both pages).
const biography = fill('/biografia').replace(/<title>[^<]*<\/title>/, '<title>Biografia — Bonsai Daniel Bourscheid</title>');
mkdirSync(new URL('../dist/biografia', import.meta.url), { recursive: true });
writeFileSync(new URL('../dist/biografia/index.html', import.meta.url), biography);
rmSync(new URL('../.ssr', import.meta.url), { recursive: true, force: true });
