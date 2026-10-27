// Inserts the server-rendered page into dist/index.html, then removes the temporary SSR build.
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const server = new URL('../.ssr/entry-server.js', import.meta.url);
const { render } = await import(pathToFileURL(server.pathname).href);
const page = new URL('../dist/index.html', import.meta.url);
const html = readFileSync(page, 'utf8');
if (!html.includes('<div id="root"></div>')) throw new Error('dist/index.html sem <div id="root"></div>.');
writeFileSync(page, html.replace('<div id="root"></div>', () => `<div id="root">${render()}</div>`));
rmSync(new URL('../.ssr', import.meta.url), { recursive: true, force: true });
