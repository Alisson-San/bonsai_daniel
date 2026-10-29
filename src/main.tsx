import React from 'react';
import ReactDOM from 'react-dom/client';
import { MotionConfig } from 'framer-motion';
import { SpeedInsights } from '@vercel/speed-insights/react';
import App from './App';
import './styles.css';
import './refinement.css';
import './conversion.css';
import './photography.css';
import './spatial.css';
import './system.css';

import { catalogSchema } from './lib/schema';

// The catalog the page was prerendered with (scripts/prerender.mjs), so hydration starts from the same data.
const embedded = (() => { try { const parsed = catalogSchema.safeParse(JSON.parse(document.getElementById('catalog-data')?.textContent ?? 'null')); return parsed.success ? parsed.data : undefined; } catch { return undefined; } })();
const root = document.getElementById('root')!;
const app = <React.StrictMode><MotionConfig reducedMotion="user" transition={{ type: 'spring', stiffness: 300, damping: 30 }}><App path={location.pathname} catalog={embedded} /><SpeedInsights /></MotionConfig></React.StrictMode>;
// Hydrate the prerendered page in place (no flash, and the opening animation is not replayed); render from scratch
// when there is nothing to hydrate (development server).
if (root.firstElementChild) ReactDOM.hydrateRoot(root, app); else ReactDOM.createRoot(root).render(app);
