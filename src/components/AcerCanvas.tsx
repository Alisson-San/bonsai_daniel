import { useEffect, useRef } from 'react';
import { acerOutline, acerVeins } from '../lib/acer';

export default function AcerCanvas() {
 const ref = useRef<HTMLCanvasElement>(null);
 useEffect(() => {
  const canvas = ref.current!;
  const context = canvas.getContext('2d'); if (!context) return;
  const parent = canvas.parentElement!;
  const media = matchMedia('(prefers-reduced-motion: reduce)');
  let width = 0, height = 0, frame = 0, previous = 0, visible = true;
  const pointer = { x: -1000, y: -1000 };
  const leaves = Array.from({ length: 25 }, () => ({ x: Math.random(), y: Math.random(), size: 9 + Math.random()*16, rotation: Math.random()*6.28, speed: 12 + Math.random()*18, phase: Math.random()*6.28, depth: Math.random() }));
  const leaf = new Path2D(acerOutline);
  const veins = new Path2D(acerVeins);
  const resize = () => { width = parent.clientWidth; height = parent.clientHeight; const dpr = Math.min(devicePixelRatio || 1, 2); canvas.width = width*dpr; canvas.height = height*dpr; context.setTransform(dpr,0,0,dpr,0,0); };
  const observer = new ResizeObserver(resize); observer.observe(parent); resize();
  const move = (e: PointerEvent) => { const box = canvas.getBoundingClientRect(); pointer.x = e.clientX-box.left; pointer.y = e.clientY-box.top; };
  const leave = () => { pointer.x = -1000; pointer.y = -1000; };
  const stop = () => { cancelAnimationFrame(frame); frame = 0; previous = 0; };
  const draw = (time: number) => {
   frame = 0; if (media.matches || !visible || document.hidden) return;
   const dt = previous ? Math.min((time-previous)/1000,.05) : 0; previous=time;
   context.clearRect(0,0,width,height);
   for (const p of leaves) {
    const dx = p.x*width-pointer.x, dy = p.y*height-pointer.y, distance = Math.hypot(dx,dy);
    const gust = distance < 180 ? (1-distance/180)*70*Math.sign(dx || 1) : 0;
    p.x += (Math.sin(time/2000+p.phase)*13 + 7 + gust)*dt/Math.max(width,1);
    p.y += p.speed*dt/Math.max(height,1); p.rotation += dt*(.3+p.depth*.4);
    if(p.y>1.06){p.y=-.06;p.x=Math.random();} if(p.x>1.08)p.x=-.08;if(p.x<-.08)p.x=1.08;
    context.save();context.translate(p.x*width,p.y*height);context.rotate(p.rotation);
    context.scale(p.size/24 * (.4+.6*Math.abs(Math.cos(time/1700+p.phase))),p.size/24);
    context.globalAlpha=.35+p.depth*.45;context.fillStyle=p.depth>.5?'#C81E28':'#A62C25';
    context.filter=p.size<15?'blur(1.6px)':'none';context.fill(leaf);context.strokeStyle='#F3B16B';context.lineWidth=.65;context.globalAlpha*=.45;context.stroke(veins);context.restore();
   }
   frame=requestAnimationFrame(draw);
  };
  const start = () => { stop(); if(media.matches){context.clearRect(0,0,width,height);return;} if(visible&&!document.hidden)frame=requestAnimationFrame(draw); };
  const intersection = new IntersectionObserver(entries => { visible = entries[0].isIntersecting;start(); }); intersection.observe(parent);
  parent.addEventListener('pointermove', move);parent.addEventListener('pointerleave', leave);document.addEventListener('visibilitychange', start);media.addEventListener('change',start);start();
  return () => { stop();observer.disconnect();intersection.disconnect();parent.removeEventListener('pointermove',move);parent.removeEventListener('pointerleave',leave);document.removeEventListener('visibilitychange',start);media.removeEventListener('change',start); };
 }, []);
 return <canvas ref={ref} className="acer-canvas" aria-hidden="true" />;
}
