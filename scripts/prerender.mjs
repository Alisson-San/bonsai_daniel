// Writes the server-rendered pages into dist (the home page and /biografia), then removes the temporary SSR build.
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const server = new URL('../.ssr/entry-server.js', import.meta.url);
const { render } = await import(pathToFileURL(server.pathname).href);
const page = new URL('../dist/index.html', import.meta.url);
const html = readFileSync(page, 'utf8');
if (!html.includes('<div id="root"></div>')) throw new Error('dist/index.html sem <div id="root"></div>.');
const fill = path => html.replace('<div id="root"></div>', () => `<div id="root">${render(path)}</div>`);

writeFileSync(page, fill('/'));
// The biography has its own title and no hero still to preload.
const biography = fill('/biografia')
  .replace(/<title>[^<]*<\/title>/, '<title>Biografia — Bonsai Daniel Bourscheid</title>')
  .replace(/const poster = [^;]*;[^;]*;[^;]*;[^;]*;\s*document\.head\.appendChild\(poster\);/, '');
if (biography.includes("poster.rel")) throw new Error('Pré-carregamento da imagem do hero não removido da biografia.');
mkdirSync(new URL('../dist/biografia', import.meta.url), { recursive: true });
writeFileSync(new URL('../dist/biografia/index.html', import.meta.url), biography);
rmSync(new URL('../.ssr', import.meta.url), { recursive: true, force: true });
