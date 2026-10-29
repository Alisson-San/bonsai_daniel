import { renderToString } from 'react-dom/server';
import { MotionConfig } from 'framer-motion';
import App from './App';
import type { Catalog } from './lib/schema';
export { catalogFromRow, fetchCatalogRow } from './lib/remoteRepository';

// Build-time render of the pages (scripts/prerender.mjs) with the catalog as published at build time: text, catalog
// and photos show before the JavaScript arrives; the browser bundle then hydrates the page with the same data.
export function render(path: string, catalog: Catalog) {
  return renderToString(<MotionConfig reducedMotion="user" transition={{ type: 'spring', stiffness: 300, damping: 30 }}><App path={path} catalog={catalog} /></MotionConfig>);
}
