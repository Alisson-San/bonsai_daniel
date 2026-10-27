import { renderToString } from 'react-dom/server';
import { MotionConfig } from 'framer-motion';
import App from './App';

// Build-time render of the initial page (scripts/prerender.mjs): text, catalog and photos show
// before the JavaScript arrives; the browser bundle then mounts the live app in its place.
export function render() {
  return renderToString(<MotionConfig reducedMotion="user" transition={{ type: 'spring', stiffness: 300, damping: 30 }}><App /></MotionConfig>);
}
