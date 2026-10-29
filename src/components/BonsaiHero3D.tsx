import { useEffect, useRef } from 'react';
import { createBonsaiScene, loadThree, POSTER, type BonsaiScene, type PageRect } from '../lib/bonsaiScene';
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
  // Visitors who prefer reduced motion (often an OS default, e.g. Windows with animation effects off) get a gentle
  // version of the hero, not a frozen one.
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // A still of the finished scene (hero-poster-*.webp) shows at once on every screen as a faint "ghost" of the emblem
  // (in full with reduced motion), with leaves already falling from its crown; when the live scene is ready it plays
  // its entrance over it (the arch draws, the pot appears, the leaves come out in a wave) while the ghost fades.
  const stage = ref.current?.parentElement?.querySelector('.hero-stage')?.getBoundingClientRect();
  if (stage) {
   const width = Math.min(stage.width, stage.height * POSTER.aspect), height = width / POSTER.aspect;
   const left = stage.left + scrollX + (stage.width - width) / 2, top = stage.top + scrollY + (stage.height - height) / 2;
   canopy.current = { x: left + POSTER.crown.x * width, y: top + POSTER.crown.y * height, width: POSTER.crown.width * width, height: POSTER.crown.height * height };
  }
  let ready = false;
  const hero = ref.current?.closest('.hero-spatial');
  // If the live scene is not up after 8 s, show the still in full instead of the faint ghost.
  const watchdog = window.setTimeout(() => { if (!ready) hero?.classList.add('is-slow'); }, 8000);
  const fail = () => { if (!cancelled) status.current('failed'); };
  // The GPU may drop the context (low memory on phones): fall back to the logo.
  const canvas = ref.current;
  canvas?.addEventListener('webglcontextlost', fail);
  // Three.js downloads right away; the scene is built once the page is idle, so text and photos come first.
  loadThree().catch(() => {});
  const begin = () => loadThree().then(THREE => {
   if (cancelled || !ref.current) return;
   return createBonsaiScene(THREE, ref.current, { theme: themeRef.current, reduced: false, gentle: reduced, entrance: true, onError: fail, onFirstFrame: () => { ready = true; hero?.classList.remove('is-slow'); status.current('ready'); }, onCanopy: rect => { canopy.current = rect; } }).then(created => {
    if (cancelled) { created.dispose(); return; }
    // The theme may have changed while the scene was being built.
    scene.current = created; created.setTheme(themeRef.current);
   });
  }).catch(fail);
  const idleSupported = typeof requestIdleCallback === 'function';
  const idle = idleSupported ? requestIdleCallback(begin, { timeout: 1500 }) : window.setTimeout(begin, 300);
  return () => { cancelled = true; clearTimeout(watchdog); canvas?.removeEventListener('webglcontextlost', fail); if (idleSupported) cancelIdleCallback(idle); else clearTimeout(idle); scene.current?.dispose(); scene.current = null; };
 }, []);
 useEffect(() => { themeRef.current = theme; scene.current?.setTheme(theme); }, [theme]);
 return <><canvas id="bonsai-3d-hero" ref={ref} aria-hidden="true" data-poster-aspect={POSTER.aspect.toFixed(4)} /><FallingLeaves source={canopy} /></>;
}
