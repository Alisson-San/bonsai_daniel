import { useEffect, useRef } from 'react';
import { palmateLeaf } from '../lib/acer';
import type { PageRect } from '../lib/bonsaiScene';

// Depth layers: far leaves are small and faded, near ones larger and softly blurred.
const layers = [
 { size: [16, 22], alpha: .5, fall: 22, blur: 0 },
 { size: [24, 32], alpha: .9, fall: 30, blur: 0 },
 { size: [40, 50], alpha: .75, fall: 42, blur: 2 },
];
const colors = ['#D9232E', '#C41E29', '#B81D27', '#cf3a2a'];

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

// Commands from the hero: release leaves where the pointer brushes the crown, or a shower over the whole crown.
export type LeafControl = { release: (pageX: number, pageY: number, count: number) => void; shower: () => void };

// A few maple leaves let go of the 3D crown and drift down through the hero only: the canvas fills the hero section,
// leaves fade out before its bottom edge and nothing is drawn while the hero is off screen. Each leaf glides like a
// real one, swinging side to side, tilting into the swing and slowing at each end of it.
export default function FallingLeaves({ source, control }: { source: { current: PageRect | null }; control?: { current: LeafControl | null } }) {
 const ref = useRef<HTMLCanvasElement>(null);
 useEffect(() => {
  const canvas = ref.current, context = canvas?.getContext('2d'), hero = canvas?.parentElement;
  if (!canvas || !context || !hero) return;
  const media = matchMedia('(prefers-reduced-motion: reduce)');
  const sprites = layers.map(layer => colors.map(color => sprite(color, layer.blur)));
  type Leaf = { x: number; y: number; age: number; size: number; layer: number; sprite: HTMLCanvasElement; phase: number; swing: number; amp: number; drift: number; spin: number; rotation: number; flip: number; wait: number; vx: number; vy: number; extra?: boolean };
  const leaves: Leaf[] = [];
  let width = 0, height = 0;
  // Hero-local coordinates: the crown rectangle comes in page coordinates.
  const spawn = (leaf: Partial<Leaf>, wait: number) => {
   const crown = source.current, box = hero.getBoundingClientRect(), left = box.left + scrollX, top = box.top + scrollY;
   const layer = leaf.layer ?? 1, [min, max] = layers[layer].size;
   // Mostly from the right side of the crown, as in the logo.
   const x = crown ? crown.x - left + crown.width * (Math.random() < .7 ? .5 + Math.random() * .45 : .1 + Math.random() * .4) : width * (.45 + Math.random() * .5);
   const y = crown ? crown.y - top + crown.height * (.3 + Math.random() * .4) : height * .1;
   return Object.assign(leaf, { x, y, age: 0, size: min + Math.random() * (max - min), sprite: sprites[layer][Math.floor(Math.random() * colors.length)], phase: Math.random() * 6.28, swing: .7 + Math.random() * .5, amp: 22 + Math.random() * 26, drift: 4 + Math.random() * 8, spin: (Math.random() - .5) * .5, rotation: Math.random() * 6.28, flip: .35 + Math.random() * .5, wait, vx: 0, vy: 0 }) as Leaf;
  };
  const calm = media.matches, pace = calm ? .6 : 1;
  const count = calm ? 3 : innerWidth < 760 ? 5 : 8;
  // Mostly mid-depth leaves, a couple far away and one large one in front (none with reduced motion).
  for (let i = 0; i < count; i++) leaves.push(spawn({ layer: !calm && i === 0 ? 2 : i % 3 === 1 ? 0 : 1 }, 1.2 + i * 1.6 + Math.random() * 2.5));
  // Extra leaves (released by touch or shake) fall once and are dropped; capped so a long play stays light.
  const MAX_EXTRA = calm ? 12 : 48;
  const extra = (pageX: number, pageY: number, wait: number, push: number) => {
   if (leaves.filter(l => l.extra).length >= MAX_EXTRA) return;
   const box = hero.getBoundingClientRect(), leaf = spawn({ layer: Math.random() < .2 ? 0 : Math.random() < .85 ? 1 : 2, extra: true }, wait);
   leaf.x = pageX - box.left - scrollX; leaf.y = pageY - box.top - scrollY; leaf.age = .5;
   // A small outward toss, mostly sideways and a little upward, that the air slows down.
   const angle = Math.random() * Math.PI * 2;
   leaf.vx = Math.cos(angle) * push * (.5 + Math.random()); leaf.vy = -Math.abs(Math.sin(angle)) * push * .6 * Math.random();
   leaves.push(leaf);
  };
  if (control) control.current = {
   release: (x, y, n) => { for (let i = 0; i < n; i++) extra(x + (Math.random() - .5) * 30, y + (Math.random() - .5) * 30, i * .05, 50); start(); },
   shower: () => {
    const crown = source.current; if (!crown) return;
    for (let i = 0; i < (calm ? 8 : 26); i++) extra(crown.x + crown.width * (.05 + Math.random() * .9), crown.y + crown.height * (.15 + Math.random() * .65), Math.random() * .7, 120);
    start();
   },
  };
  let frame = 0, previous = 0, visible = true;
  const resize = () => {
   const dpr = Math.min(devicePixelRatio || 1, 2);
   width = hero.clientWidth; height = hero.clientHeight;
   canvas.width = width * dpr; canvas.height = height * dpr; context.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  const draw = (now: number) => {
   frame = 0;
   // Waits run on wall-clock time; motion steps are capped so a slow frame never teleports a leaf.
   const real = previous ? (now - previous) / 1000 : 0, dt = Math.min(real, .1); previous = now;
   context.clearRect(0, 0, width, height);
   for (const leaf of [...leaves]) {
    if (leaf.wait > 0) { leaf.wait -= real; if (leaf.wait <= 0 && !leaf.extra) spawn(leaf, 0); continue; }
    const layer = layers[leaf.layer];
    leaf.age += dt * pace;
    const angle = leaf.age * leaf.swing + leaf.phase, sway = Math.cos(angle);
    // Faster through the middle of the swing, almost hovering at its ends.
    leaf.y += (layer.fall * pace * (.45 + .75 * Math.abs(sway)) + leaf.vy) * dt;
    leaf.x += ((sway * leaf.amp * leaf.swing + leaf.drift) * pace + leaf.vx) * dt;
    const drag = Math.exp(-dt * 1.8); leaf.vx *= drag; leaf.vy *= drag;
    leaf.rotation += leaf.spin * pace * dt;
    // Fades in as it lets go of the crown and out over the last quarter of the hero.
    const fade = Math.min(1, leaf.age / .8, (height * .92 - leaf.y) / (height * .25));
    if (fade <= 0 || leaf.x > width + 60 || leaf.x < -60) { if (leaf.extra) leaves.splice(leaves.indexOf(leaf), 1); else spawn(leaf, 2 + Math.random() * 5); continue; }
    context.save(); context.globalAlpha = layer.alpha * fade; context.translate(leaf.x, leaf.y);
    context.rotate(leaf.rotation + sway * .55);
    context.scale(.35 + .65 * Math.abs(Math.cos(leaf.age * leaf.flip + leaf.phase)), 1);
    context.drawImage(leaf.sprite, -leaf.size / 2, -leaf.size / 2, leaf.size, leaf.size);
    context.restore();
   }
   frame = requestAnimationFrame(draw);
  };
  const start = () => {
   cancelAnimationFrame(frame); frame = 0; previous = 0;
   if (document.hidden || !visible) return;
   frame = requestAnimationFrame(draw);
  };
  const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; start(); });
  const sizes = new ResizeObserver(resize);
  resize(); observer.observe(hero); sizes.observe(hero);
  document.addEventListener('visibilitychange', start);
  return () => { cancelAnimationFrame(frame); observer.disconnect(); sizes.disconnect(); document.removeEventListener('visibilitychange', start); };
 }, [source]);
 return <canvas ref={ref} className="falling-leaves" aria-hidden="true" />;
}
