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
  const debug = new URLSearchParams(location.search).has('debug3d'), started = performance.now();
  // ?debug3d in the URL lists each start-up step and any error in a panel on the page (for phones without a
  // console). The panel is plain DOM so it stays when the hero falls back and this component unmounts.
  const panel = debug ? document.querySelector('.debug-3d') ?? document.body.appendChild(Object.assign(document.createElement('pre'), { className: 'debug-3d', textContent: `Diagnóstico do 3D\n${navigator.userAgent}` })) : null;
  // The GPU may drop the context (low memory on phones): report it.
  const lost = () => log('a placa de vídeo descartou o 3D (contexto WebGL perdido)');
  ref.current?.addEventListener('webglcontextlost', lost);
  const log = (step: string) => { const line = `${((performance.now() - started) / 1000).toFixed(1)} s · ${step}`; console.info('[3D]', line); if (panel) panel.textContent += `\n${line}`; };
  const describe = (error: unknown) => error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  const uncaught = (event: ErrorEvent | PromiseRejectionEvent) => log(`erro: ${describe('reason' in event ? event.reason : event.error ?? event.message)}`);
  if (debug) { addEventListener('error', uncaught); addEventListener('unhandledrejection', uncaught); }
  let ready = false;
  const hero = ref.current?.closest('.hero-spatial');
  // If the live scene is not up after 8 s, show the still in full instead of the faint ghost.
  const watchdog = window.setTimeout(() => { if (!ready) { hero?.classList.add('is-slow'); log('3D ainda não ficou pronto em 8 s: mostrando a imagem inteira'); } }, 8000);
  // Three.js downloads right away; the scene is built once the page is idle, so text and photos come first.
  log('baixando Three.js');
  loadThree().then(() => log('Three.js carregado'), error => log(`Three.js não carregou: ${describe(error)}`));
  const fail = (error: unknown) => { log(`falhou: ${describe(error)}`); if (!cancelled) status.current('failed'); };
  const begin = () => loadThree().then(THREE => {
   if (cancelled || !ref.current) return;
   return createBonsaiScene(THREE, ref.current, { theme: themeRef.current, reduced, entrance: true, onTrace: log, onError: fail, onFirstFrame: () => { ready = true; hero?.classList.remove('is-slow'); log('pronto'); status.current('ready'); }, onCanopy: rect => { canopy.current = rect; } }).then(created => {
    if (cancelled) { created.dispose(); return; }
    // The theme may have changed while the scene was being built.
    scene.current = created; created.setTheme(themeRef.current);
   });
  }).catch(fail);
  const idleSupported = typeof requestIdleCallback === 'function';
  const idle = idleSupported ? requestIdleCallback(begin, { timeout: 1500 }) : window.setTimeout(begin, 300);
  return () => { cancelled = true; clearTimeout(watchdog); removeEventListener('error', uncaught); removeEventListener('unhandledrejection', uncaught); ref.current?.removeEventListener('webglcontextlost', lost); if (idleSupported) cancelIdleCallback(idle); else clearTimeout(idle); scene.current?.dispose(); scene.current = null; };
 }, []);
 useEffect(() => { themeRef.current = theme; scene.current?.setTheme(theme); }, [theme]);
 return <><canvas id="bonsai-3d-hero" ref={ref} aria-hidden="true" data-poster-aspect={POSTER.aspect.toFixed(4)} /><FallingLeaves source={canopy} /></>;
}
