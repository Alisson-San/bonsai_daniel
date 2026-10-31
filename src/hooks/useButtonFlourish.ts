import { useEffect } from 'react';
import { palmateLeaf } from '../lib/acer';

const TARGETS = '.button-gold, .whatsapp-button';

// Primary buttons come alive: on a mouse they lean a few pixels toward the cursor, and a click lets a handful of maple
// leaves go from the button (a short-lived canvas over the page, removed once the leaves are gone).
export function useButtonFlourish() {
 useEffect(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let canvas: HTMLCanvasElement | null = null, frame = 0, previous = 0;
  type Leaf = { x: number; y: number; vx: number; vy: number; rotation: number; spin: number; size: number; life: number; flip: number };
  const leaves: Leaf[] = [];
  const sprite = document.createElement('canvas'); sprite.width = sprite.height = 64;
  { const c = sprite.getContext('2d')!, { path } = palmateLeaf(32, 37, 24); const fill = c.createRadialGradient(32, 37, 2, 32, 37, 28); fill.addColorStop(0, '#e8393c'); fill.addColorStop(1, '#B81D27'); c.fillStyle = fill; c.fill(path); }
  const draw = (now: number) => {
   frame = 0;
   const dt = previous ? Math.min((now - previous) / 1000, .05) : 0; previous = now;
   const c = canvas!.getContext('2d')!; c.clearRect(0, 0, canvas!.width, canvas!.height);
   for (const leaf of [...leaves]) {
    leaf.life -= dt; if (leaf.life <= 0) { leaves.splice(leaves.indexOf(leaf), 1); continue; }
    leaf.vy += 260 * dt; leaf.vx *= Math.exp(-dt * 1.5); leaf.vy *= Math.exp(-dt * 2.6);
    leaf.x += leaf.vx * dt + Math.sin(now / 300 + leaf.flip) * 12 * dt; leaf.y += leaf.vy * dt; leaf.rotation += leaf.spin * dt;
    c.save(); c.globalAlpha = Math.min(1, leaf.life / .5); c.translate(leaf.x, leaf.y); c.rotate(leaf.rotation);
    c.scale(.35 + .65 * Math.abs(Math.cos(now / 260 + leaf.flip)), 1); c.drawImage(sprite, -leaf.size / 2, -leaf.size / 2, leaf.size, leaf.size); c.restore();
   }
   if (leaves.length) frame = requestAnimationFrame(draw); else { canvas!.remove(); canvas = null; previous = 0; }
  };
  const burst = (x: number, y: number) => {
   if (!canvas) {
    canvas = document.createElement('canvas'); canvas.className = 'leaf-burst'; canvas.setAttribute('aria-hidden', 'true');
    const dpr = Math.min(devicePixelRatio || 1, 2); canvas.width = innerWidth * dpr; canvas.height = innerHeight * dpr;
    canvas.getContext('2d')!.setTransform(dpr, 0, 0, dpr, 0, 0); document.body.append(canvas);
   }
   for (let i = 0; i < 7; i++) {
    const angle = -Math.PI / 2 + (Math.random() - .5) * 2.2, speed = 140 + Math.random() * 160;
    leaves.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, rotation: Math.random() * 6.3, spin: (Math.random() - .5) * 6, size: 14 + Math.random() * 12, life: 1.3 + Math.random() * .6, flip: Math.random() * 6 });
   }
   frame ||= requestAnimationFrame(draw);
  };
  const click = (event: MouseEvent) => {
   const button = (event.target as Element).closest?.<HTMLElement>(TARGETS);
   if (!button || reduced.matches || (button as HTMLButtonElement).disabled) return;
   const box = button.getBoundingClientRect();
   burst(event.clientX || box.left + box.width / 2, event.clientY || box.top + box.height / 2);
  };
  let pulled: HTMLElement | null = null;
  const release = () => { if (pulled) { pulled.style.translate = ''; pulled = null; } };
  const move = (event: PointerEvent) => {
   if (event.pointerType !== 'mouse' || reduced.matches) return;
   const button = (event.target as Element).closest?.<HTMLElement>(TARGETS);
   if (button !== pulled) release();
   if (!button) return;
   pulled = button;
   const box = button.getBoundingClientRect(), dx = event.clientX - (box.left + box.width / 2), dy = event.clientY - (box.top + box.height / 2);
   button.style.translate = `${(dx / box.width * 8).toFixed(1)}px ${(dy / box.height * 6).toFixed(1)}px`;
  };
  document.addEventListener('click', click); document.addEventListener('pointermove', move, { passive: true });
  return () => { document.removeEventListener('click', click); document.removeEventListener('pointermove', move); cancelAnimationFrame(frame); canvas?.remove(); release(); };
 }, []);
}
