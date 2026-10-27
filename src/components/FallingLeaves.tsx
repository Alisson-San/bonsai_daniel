import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { palmateLeaf } from '../lib/acer';
import type { PageRect } from '../lib/bonsaiScene';

// Depth layers: far leaves are small and faded, near ones large, blurred and faster (parallax).
const layers = [
 { size: [18, 24], alpha: .6, fall: 34, blur: 0 },
 { size: [28, 36], alpha: .95, fall: 50, blur: 0 },
 { size: [50, 64], alpha: .85, fall: 80, blur: 2.5 },
];
const colors = ['#D9232E', '#D9232E', '#C41E29', '#B81D27'];

function sprite(color: string, blur: number) {
 const size = 112, canvas = document.createElement('canvas'); canvas.width = canvas.height = size;
 const c = canvas.getContext('2d')!;
 if (blur) c.filter = `blur(${blur}px)`;
 const { path, veins } = palmateLeaf(size / 2, size * .58, size * .4);
 const fill = c.createRadialGradient(size / 2, size * .58, 2, size / 2, size * .58, size * .45);
 fill.addColorStop(0, '#e8393c'); fill.addColorStop(.4, color); fill.addColorStop(1, color);
 c.fillStyle = fill; c.fill(path);
 c.strokeStyle = 'rgba(255,255,255,.22)'; c.lineWidth = 1.1;
 for (const [x, y] of veins) { c.beginPath(); c.moveTo(size / 2, size * .58); c.lineTo(x, y); c.stroke(); }
 return canvas;
}

// A few maple leaves falling from the 3D crown over the whole page, above all content.
// The canvas never takes pointer events, so links, buttons and text selection keep working.
export default function FallingLeaves({ source }: { source: { current: PageRect | null } }) {
 const ref = useRef<HTMLCanvasElement>(null);
 // The portal needs document.body, so it only mounts in the browser (the page is also prerendered).
 const [mounted, setMounted] = useState(false);
 useEffect(() => setMounted(true), []);
 useEffect(() => {
  const canvas = ref.current, context = canvas?.getContext('2d');
  if (!canvas || !context) return;
  const media = matchMedia('(prefers-reduced-motion: reduce)');
  const sprites = layers.map(layer => colors.map(color => sprite(color, layer.blur)));
  const count = innerWidth < 760 ? 10 : 18;
  type Leaf = { x: number; y: number; startY: number; size: number; layer: number; sprite: HTMLCanvasElement; phase: number; sway: number; spin: number; rotation: number; flip: number; wait: number };
  const leaves: Leaf[] = [];
  const spawn = (leaf: Partial<Leaf>, wait: number) => {
   const rect = source.current, layer = leaf.layer ?? 0, [min, max] = layers[layer].size;
   // Mostly from the right side of the crown, as in the logo.
   const x = rect ? rect.x + rect.width * (Math.random() < .75 ? .5 + Math.random() * .5 : Math.random()) : -100;
   let y = rect ? rect.y + rect.height * (.25 + Math.random() * .6) : -100;
   // Once the crown has scrolled away, leaves enter from just above the viewport, as if still falling from it.
   const top = scrollY - 40;
   if (rect && y < top) y = top - rect.y < innerHeight * 2.4 ? top - Math.random() * 60 : -1e5;
   return Object.assign(leaf, { x, y, startY: rect ? rect.y : y, size: min + Math.random() * (max - min), sprite: sprites[layer][Math.floor(Math.random() * colors.length)], phase: Math.random() * 6.28, sway: 18 + Math.random() * 30, spin: (Math.random() - .5) * 1.4, rotation: Math.random() * 6.28, flip: .6 + Math.random() * 1.2, wait }) as Leaf;
  };
  // Mostly mid-depth leaves, a few far ones and two or three large ones right in front.
  for (let i = 0; i < count; i++) leaves.push(spawn({ layer: i < 2 || (count > 10 && i === 2) ? 2 : i % 3 === 0 ? 0 : 1 }, 1.6 + Math.random() * 6));
  let frame = 0, previous = 0, width = 0, height = 0, time = 0;
  const resize = () => {
   const dpr = Math.min(devicePixelRatio || 1, 2);
   width = innerWidth; height = innerHeight;
   canvas.width = width * dpr; canvas.height = height * dpr; context.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  const draw = (now: number) => {
   frame = 0;
   // Waits run on wall-clock time; motion steps are capped so a slow frame never teleports a leaf.
   const real = previous ? (now - previous) / 1000 : 0, dt = Math.min(real, .1); previous = now; time += dt;
   context.clearRect(0, 0, width, height);
   for (const leaf of leaves) {
    if (leaf.wait > 0) { leaf.wait -= real; if (leaf.wait <= 0) spawn(leaf, 0); continue; }
    const layer = layers[leaf.layer];
    leaf.y += layer.fall * dt; leaf.x += (Math.sin(time * .9 + leaf.phase) * leaf.sway + 6) * dt; leaf.rotation += leaf.spin * dt;
    // Each leaf falls past the first cards (about 2.6 screens below the crown), then rests before falling again.
    if (leaf.y - leaf.startY > height * 2.6) { spawn(leaf, 1 + Math.random() * 4); continue; }
    const sx = leaf.x - scrollX, sy = leaf.y - scrollY, crown = source.current;
    // Leaves left behind above the viewport re-enter at its top while the crown is scrolled away.
    if (sy < -120 && crown && crown.y + crown.height < scrollY) { spawn(leaf, 0); continue; }
    if (sx < -60 || sx > width + 60 || sy < -60 || sy > height + 60) continue;
    context.save(); context.globalAlpha = layer.alpha; context.translate(sx, sy); context.rotate(leaf.rotation);
    context.scale(Math.max(.18, Math.abs(Math.cos(time * leaf.flip + leaf.phase))), 1);
    context.drawImage(leaf.sprite, -leaf.size / 2, -leaf.size / 2, leaf.size, leaf.size);
    context.restore();
   }
   frame = requestAnimationFrame(draw);
  };
  const start = () => {
   cancelAnimationFrame(frame); frame = 0; previous = 0;
   if (media.matches || document.hidden) { context.clearRect(0, 0, width, height); return; }
   frame = requestAnimationFrame(draw);
  };
  resize(); start();
  addEventListener('resize', resize); document.addEventListener('visibilitychange', start); media.addEventListener('change', start);
  return () => { cancelAnimationFrame(frame); removeEventListener('resize', resize); document.removeEventListener('visibilitychange', start); media.removeEventListener('change', start); };
 }, [source, mounted]);
 return mounted && createPortal(<canvas ref={ref} className="falling-leaves" aria-hidden="true" />, document.body);
}
