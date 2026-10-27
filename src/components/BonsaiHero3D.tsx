import { useEffect, useRef } from 'react';
import { createBonsaiScene, loadThree, type BonsaiScene, type PageRect } from '../lib/bonsaiScene';
import FallingLeaves from './FallingLeaves';
import type { Theme } from '../lib/theme';

export type SpatialStatus = 'loading' | 'ready' | 'failed';

export default function BonsaiHero3D({ theme, onStatus }: { theme: Theme; onStatus: (status: SpatialStatus) => void }) {
 const ref = useRef<HTMLCanvasElement>(null);
 const scene = useRef<BonsaiScene | null>(null);
 const themeRef = useRef(theme);
 const status = useRef(onStatus);
 const canopy = useRef<PageRect | null>(null);
 status.current = onStatus;
 useEffect(() => {
  let cancelled = false;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // On phones a still of the finished scene (hero-poster-*.webp) shows at once; the live scene
  // starts on the same composition, without the entrance, and fades in over it.
  const still = matchMedia('(max-width: 800px)').matches;
  // The scene starts once the page is idle, so text, catalog and photos come first on slow phones.
  const begin = () => loadThree().then(THREE => {
   if (cancelled || !ref.current) return;
   scene.current = createBonsaiScene(THREE, ref.current, { theme: themeRef.current, reduced, entrance: !still, onFirstFrame: () => status.current('ready'), onCanopy: rect => { canopy.current = rect; } });
  }).catch(() => { if (!cancelled) status.current('failed'); });
  const idleSupported = typeof requestIdleCallback === 'function';
  const idle = idleSupported ? requestIdleCallback(begin, { timeout: 1500 }) : window.setTimeout(begin, 300);
  return () => { cancelled = true; if (idleSupported) cancelIdleCallback(idle); else clearTimeout(idle); scene.current?.dispose(); scene.current = null; };
 }, []);
 useEffect(() => { themeRef.current = theme; scene.current?.setTheme(theme); }, [theme]);
 return <><canvas id="bonsai-3d-hero" ref={ref} aria-hidden="true" /><FallingLeaves source={canopy} /></>;
}
