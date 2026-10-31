import { useEffect, useRef, useState } from 'react';
import { createBonsaiScene, loadThree, POSTER, type BonsaiScene, type PageRect } from '../lib/bonsaiScene';
import FallingLeaves, { type LeafControl } from './FallingLeaves';
import type { Theme } from '../lib/theme';

export type SpatialStatus = 'loading' | 'ready' | 'failed';

export default function BonsaiHero3D({ theme, onStatus }: { theme: Theme; onStatus: (status: SpatialStatus) => void }) {
 const ref = useRef<HTMLCanvasElement>(null);
 const scene = useRef<BonsaiScene | null>(null);
 const themeRef = useRef(theme);
 const status = useRef(onStatus);
 const canopy = useRef<PageRect | null>(null);
 const leaves = useRef<LeafControl | null>(null);
 // Hint shown once per visit under the crown, until the visitor plays with the tree.
 const [hint, setHint] = useState<{ x: number; y: number; touch: boolean } | null>(null);
 const played = useRef(false);
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
  let hintTimer = 0;
  const offerHint = () => {
   let seen = false; try { seen = sessionStorage.getItem('bonsai-hint') === '1'; } catch { /* storage blocked */ }
   if (seen || reduced) return;
   hintTimer = window.setTimeout(() => {
    const rect = canopy.current, box = hero?.getBoundingClientRect();
    if (!rect || !box || played.current) return;
    setHint({ x: rect.x + rect.width / 2 - box.left - scrollX, y: rect.y + rect.height * .92 - box.top - scrollY, touch: matchMedia('(pointer: coarse)').matches });
    try { sessionStorage.setItem('bonsai-hint', '1'); } catch { /* storage blocked */ }
    hintTimer = window.setTimeout(() => setHint(null), 7000);
   }, 2600);
  };
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
   return createBonsaiScene(THREE, ref.current, { theme: themeRef.current, reduced: false, gentle: reduced, entrance: true, onError: fail, onFirstFrame: () => { ready = true; hero?.classList.remove('is-slow'); status.current('ready'); offerHint(); }, onCanopy: rect => { canopy.current = rect; } }).then(created => {
    if (cancelled) { created.dispose(); return; }
    // The theme may have changed while the scene was being built.
    scene.current = created; created.setTheme(themeRef.current);
   });
  }).catch(fail);
  const idleSupported = typeof requestIdleCallback === 'function';
  const idle = idleSupported ? requestIdleCallback(begin, { timeout: 1500 }) : window.setTimeout(begin, 300);
  return () => { cancelled = true; clearTimeout(watchdog); clearTimeout(hintTimer); canvas?.removeEventListener('webglcontextlost', fail); if (idleSupported) cancelIdleCallback(idle); else clearTimeout(idle); scene.current?.dispose(); scene.current = null; };
 }, []);
 useEffect(() => { themeRef.current = theme; scene.current?.setTheme(theme); }, [theme]);
 // Playing with the tree: brushing the crown with the mouse or a finger pushes its leaves aside and lets a few go;
 // a click or tap shakes the whole tree and showers leaves. Vertical swipes still scroll the page (touch-action).
 useEffect(() => {
  const hero = ref.current?.closest<HTMLElement>('.hero-spatial');
  if (!hero) return;
  let travelled = 0, last: { x: number; y: number } | null = null, lastShake = 0;
  const overCrown = (event: PointerEvent | MouseEvent) => {
   const rect = canopy.current; if (!rect || !scene.current) return false;
   const x = event.clientX + scrollX, y = event.clientY + scrollY, padX = rect.width * .06, padY = rect.height * .08;
   return x > rect.x - padX && x < rect.x + rect.width + padX && y > rect.y - padY && y < rect.y + rect.height + padY;
  };
  const onControl = (event: Event) => !!(event.target as Element).closest?.('a, button, input, textarea, select, [contenteditable="true"]');
  const move = (event: PointerEvent) => {
   if (!overCrown(event) || onControl(event)) { hero.classList.remove('is-over-crown'); last = null; return; }
   hero.classList.add('is-over-crown');
   if (!played.current) { played.current = true; setHint(null); }
   scene.current?.touch(event.clientX, event.clientY);
   if (last) travelled += Math.hypot(event.clientX - last.x, event.clientY - last.y);
   last = { x: event.clientX, y: event.clientY };
   // One leaf for every stretch of crown brushed (shorter with a finger, whose strokes are short).
   const step = event.pointerType === 'mouse' ? 90 : 45;
   if (travelled > step) { travelled = 0; leaves.current?.release(event.clientX + scrollX, event.clientY + scrollY, 1); }
  };
  const down = (event: PointerEvent) => { if (event.pointerType !== 'mouse' && overCrown(event) && !onControl(event)) { played.current = true; setHint(null); scene.current?.touch(event.clientX, event.clientY); leaves.current?.release(event.clientX + scrollX, event.clientY + scrollY, 2); } };
  const leave = () => { hero.classList.remove('is-over-crown'); last = null; };
  const click = (event: MouseEvent) => {
   if (!overCrown(event) || onControl(event) || performance.now() - lastShake < 600) return;
   lastShake = performance.now();
   scene.current?.shake(); leaves.current?.shower();
  };
  hero.addEventListener('pointermove', move, { passive: true }); hero.addEventListener('pointerdown', down, { passive: true });
  hero.addEventListener('pointerleave', leave); hero.addEventListener('click', click);
  return () => { hero.removeEventListener('pointermove', move); hero.removeEventListener('pointerdown', down); hero.removeEventListener('pointerleave', leave); hero.removeEventListener('click', click); };
 }, []);
 return <><canvas id="bonsai-3d-hero" ref={ref} aria-hidden="true" data-poster-aspect={POSTER.aspect.toFixed(4)} /><FallingLeaves source={canopy} control={leaves} />{hint && <span className="crown-hint" aria-hidden="true" style={{ left: hint.x, top: hint.y }}>{hint.touch ? 'toque na árvore' : 'passe o mouse pela copa, clique para sacudir'}</span>}</>;
}
