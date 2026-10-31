import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { Crosshair, FlipHorizontal2, RotateCcw, RotateCw, Undo2, X } from 'lucide-react';

const ASPECTS = [['original', 'Original'], ['1', '1:1'], ['0.8', '4:5'], ['0.75', '3:4'], ['1.7778', '16:9']] as const;
const MAX_SIDE = 2000;
type Tone = { brightness: number; contrast: number; saturation: number };
type Props = { src: string; title?: string; onApply: (image: string) => void; onClose: () => void };

// Photo adjustment for the curation: framing (proportion, drag to recentre, zoom with the slider, the wheel or two
// fingers), quarter turns, fine straightening, mirroring and tone. The result is baked into a new image (at most
// 2000 px, never enlarged beyond the original's pixels), so every place that shows the photo gets the adjusted one.
export default function PhotoAdjuster({ src, title = 'Ajustar foto', onApply, onClose }: Props) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [failed, setFailed] = useState(false);
  const [aspect, setAspect] = useState<string>('original');
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [quarter, setQuarter] = useState(0);
  const [straighten, setStraighten] = useState(0);
  const [flip, setFlip] = useState(false);
  const [tone, setTone] = useState<Tone>({ brightness: 0, contrast: 0, saturation: 0 });
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [frameSize, setFrameSize] = useState({ w: 0, h: 0 });
  const stage = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ distance: number; zoom: number } | null>(null);

  useEffect(() => {
    const img = new Image();
    // Photos already in the Storage come from another origin; they are served with CORS, so the canvas stays exportable.
    if (/^https?:/i.test(src) && !src.startsWith(location.origin)) img.crossOrigin = 'anonymous';
    img.onload = () => setImage(img); img.onerror = () => setFailed(true);
    img.src = src;
  }, [src]);
  useEffect(() => { const overflow = document.body.style.overflow; document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = overflow; }; }, []);
  // Escape closes only this dialog, not the editor underneath.
  useEffect(() => {
    const key = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.stopPropagation(); event.preventDefault(); if (!busy) onClose(); } };
    window.addEventListener('keydown', key, true);
    return () => window.removeEventListener('keydown', key, true);
  }, [busy, onClose]);

  const turned = quarter % 2 === 1;
  const iw = image ? (turned ? image.naturalHeight : image.naturalWidth) : 1, ih = image ? (turned ? image.naturalWidth : image.naturalHeight) : 1;
  const ratio = aspect === 'original' ? iw / ih : Number(aspect);
  // The frame fits the stage area; the image covers it at zoom 1 whatever the straightening angle.
  useEffect(() => {
    const el = stage.current; if (!el) return;
    const fit = () => { const box = el.getBoundingClientRect(); const w = Math.min(box.width, box.height * ratio); setFrameSize({ w, h: w / ratio }); };
    fit(); const observer = new ResizeObserver(fit); observer.observe(el);
    return () => observer.disconnect();
  }, [ratio, image]);
  const angle = Math.abs(straighten) * Math.PI / 180, W = frameSize.w, H = frameSize.h;
  const needW = W * Math.cos(angle) + H * Math.sin(angle), needH = W * Math.sin(angle) + H * Math.cos(angle);
  const cover = Math.max(needW / iw, needH / ih), scale = cover * zoom;
  const limit = useMemo(() => ({ x: Math.max(0, (iw * scale - needW) / 2), y: Math.max(0, (ih * scale - needH) / 2) }), [iw, ih, scale, needW, needH]);
  const clampPan = (p: { x: number; y: number }) => ({ x: Math.max(-limit.x, Math.min(limit.x, p.x)), y: Math.max(-limit.y, Math.min(limit.y, p.y)) });
  useEffect(() => { setPan(p => clampPan(p)); }, [limit.x, limit.y]);
  const filter = `brightness(${1 + tone.brightness}) contrast(${1 + tone.contrast}) saturate(${1 + tone.saturation})`;
  const transform = `translate(-50%, -50%) translate(${pan.x}px, ${pan.y}px) rotate(${quarter * 90 + straighten}deg) scale(${flip ? -scale : scale}, ${scale})`;

  const down = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY }); setDragging(true);
    if (pointers.current.size === 2) { const [a, b] = [...pointers.current.values()]; pinch.current = { distance: Math.hypot(a.x - b.x, a.y - b.y), zoom }; }
  };
  const move = (event: ReactPointerEvent<HTMLDivElement>) => {
    const last = pointers.current.get(event.pointerId); if (!last) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.current.size === 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()];
      setZoom(Math.min(4, Math.max(1, pinch.current.zoom * Math.hypot(a.x - b.x, a.y - b.y) / pinch.current.distance)));
    } else if (pointers.current.size === 1) setPan(p => clampPan({ x: p.x + event.clientX - last.x, y: p.y + event.clientY - last.y }));
  };
  const up = (event: ReactPointerEvent<HTMLDivElement>) => { pointers.current.delete(event.pointerId); if (pointers.current.size < 2) pinch.current = null; if (!pointers.current.size) setDragging(false); };
  const reset = () => { setZoom(1); setPan({ x: 0, y: 0 }); setQuarter(0); setStraighten(0); setFlip(false); setTone({ brightness: 0, contrast: 0, saturation: 0 }); setAspect('original'); };

  const apply = async () => {
    if (!image || !W) return;
    setBusy(true);
    try {
      // Output: the frame at the original's own resolution (scale ≤ 1 per pixel), capped at 2000 px.
      const k = Math.min(1 / scale, MAX_SIDE / Math.max(W, H));
      const canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(W * k)); canvas.height = Math.max(1, Math.round(H * k));
      const c = canvas.getContext('2d')!;
      c.imageSmoothingQuality = 'high';
      c.translate(canvas.width / 2 + pan.x * k, canvas.height / 2 + pan.y * k);
      c.rotate((quarter * 90 + straighten) * Math.PI / 180); c.scale(flip ? -1 : 1, 1);
      const dw = image.naturalWidth * scale * k, dh = image.naturalHeight * scale * k;
      c.drawImage(image, -dw / 2, -dh / 2, dw, dh);
      c.setTransform(1, 0, 0, 1, 0, 0);
      const pixels = c.getImageData(0, 0, canvas.width, canvas.height), data = pixels.data;
      let transparent = false;
      if (tone.brightness || tone.contrast || tone.saturation) {
        const b = 1 + tone.brightness, ct = 1 + tone.contrast, s = 1 + tone.saturation;
        for (let i = 0; i < data.length; i += 4) {
          let r = data[i] * b, g = data[i + 1] * b, bl = data[i + 2] * b;
          r = (r - 128) * ct + 128; g = (g - 128) * ct + 128; bl = (bl - 128) * ct + 128;
          const l = .2126 * r + .7152 * g + .0722 * bl;
          data[i] = l + (r - l) * s; data[i + 1] = l + (g - l) * s; data[i + 2] = l + (bl - l) * s;
        }
        c.putImageData(pixels, 0, 0);
      }
      for (let i = 3; i < data.length; i += 16) if (data[i] < 255) { transparent = true; break; }
      onApply(transparent ? canvas.toDataURL('image/webp', .9) : canvas.toDataURL('image/jpeg', .88));
    } catch { setFailed(true); }
    finally { setBusy(false); }
  };

  const slider = (label: string, value: number, min: number, max: number, step: number, set: (v: number) => void, show: (v: number) => string) =>
    <label className="adjust-slider"><span>{label}<output>{show(value)}</output></span><input type="range" min={min} max={max} step={step} value={value} onChange={e => set(Number(e.target.value))} onDoubleClick={() => set(min < 0 ? 0 : min)} /></label>;
  const percent = (v: number) => `${v > 0 ? '+' : ''}${Math.round(v * 100)}%`;

  return <div className="adjust-backdrop" role="dialog" aria-modal="true" aria-label={title}>
    <div className="adjust-panel">
      <header className="adjust-head"><span className="eyebrow">CURADORIA</span><h2>{title}</h2><button type="button" className="icon-button" aria-label="Fechar" onClick={onClose} disabled={busy}><X size={20} /></button></header>
      <div className="adjust-body">
        <div className="adjust-stage" ref={stage}>
          {failed ? <p className="form-error">Não foi possível abrir esta foto para ajuste. Envie a foto de novo pelo botão de adicionar.</p>
            : !image ? <p className="muted">Carregando foto…</p>
            : <div className={`adjust-frame ${dragging ? 'is-dragging' : ''}`} style={{ width: W, height: H }} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
              onWheel={e => setZoom(z => Math.min(4, Math.max(1, z * (e.deltaY < 0 ? 1.08 : 1 / 1.08))))}>
              <img src={image.src} alt="" draggable={false} style={{ width: image.naturalWidth, height: image.naturalHeight, transform, filter }} />
              <span className="adjust-grid" aria-hidden="true" />
            </div>}
        </div>
        <div className="adjust-controls">
          <div className="adjust-group"><span className="adjust-label">Proporção</span><div className="adjust-chips">{ASPECTS.map(([value, label]) => <button key={value} type="button" className={aspect === value ? 'selected' : ''} aria-pressed={aspect === value} onClick={() => { setAspect(value); setPan({ x: 0, y: 0 }); }}>{label}</button>)}</div></div>
          {slider('Zoom', zoom, 1, 4, .01, setZoom, v => `${Math.round(v * 100)}%`)}
          <div className="adjust-group"><span className="adjust-label">Posição e giro</span><div className="adjust-tools">
            <button type="button" onClick={() => setPan({ x: 0, y: 0 })} title="Centralizar"><Crosshair size={17} /><span>Centralizar</span></button>
            <button type="button" onClick={() => { setQuarter(q => (q + 3) % 4); setPan({ x: 0, y: 0 }); }} title="Girar para a esquerda"><RotateCcw size={17} /><span>90°</span></button>
            <button type="button" onClick={() => { setQuarter(q => (q + 1) % 4); setPan({ x: 0, y: 0 }); }} title="Girar para a direita"><RotateCw size={17} /><span>90°</span></button>
            <button type="button" className={flip ? 'selected' : ''} aria-pressed={flip} onClick={() => setFlip(f => !f)} title="Espelhar"><FlipHorizontal2 size={17} /><span>Espelhar</span></button>
          </div></div>
          {slider('Endireitar', straighten, -15, 15, .1, setStraighten, v => `${v.toFixed(1)}°`)}
          {slider('Brilho', tone.brightness, -.5, .5, .01, v => setTone(t => ({ ...t, brightness: v })), percent)}
          {slider('Contraste', tone.contrast, -.5, .5, .01, v => setTone(t => ({ ...t, contrast: v })), percent)}
          {slider('Saturação', tone.saturation, -1, 1, .01, v => setTone(t => ({ ...t, saturation: v })), percent)}
          <p className="adjust-help">Arraste a foto para recentralizar; use a roda do mouse ou dois dedos para aproximar. Dois cliques num controle o zeram.</p>
        </div>
      </div>
      <footer className="adjust-actions"><button type="button" className="text-link" onClick={reset} disabled={busy}><Undo2 size={15} />Restaurar</button><span><button type="button" className="button button-outline" onClick={onClose} disabled={busy}>Cancelar</button><button type="button" className="button button-gold" onClick={() => void apply()} disabled={busy || !image || failed}>{busy ? 'Aplicando…' : 'Aplicar ajuste'}</button></span></footer>
    </div>
  </div>;
}
