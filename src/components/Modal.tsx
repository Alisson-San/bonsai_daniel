import { useEffect, useRef, type ReactNode, type MouseEvent } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';

export default function Modal({ title, children, onClose, wide = false, instant = false }: { title: string; children: ReactNode; onClose: () => void; wide?: boolean; instant?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ref.current?.focus();
    const handle = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); close.current(); }
      if (event.key !== 'Tab') return;
      const elements = Array.from(ref.current?.querySelectorAll<HTMLElement>('button, a[href], input, select, textarea, [tabindex="0"]') ?? []).filter(e => !e.hasAttribute('disabled') && e.getClientRects().length);
      const first = elements[0], last = elements.at(-1);
      if (!first) { event.preventDefault(); return; }
      if (event.shiftKey && (document.activeElement === first || document.activeElement === ref.current)) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || document.activeElement === ref.current)) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', handle);
    return () => { document.body.style.overflow = overflow; document.removeEventListener('keydown', handle); previous?.focus(); };
  }, []);
  return <motion.div className="modal-backdrop" initial={instant ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={(e: MouseEvent<HTMLDivElement>) => { if (e.target === e.currentTarget) onClose(); }}>
    <motion.div ref={ref} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} className={`modal ${wide ? 'modal-wide' : ''}`} initial={instant ? false : { opacity: 0, y: 24, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 16 }}>
      <button className="icon-button modal-close" aria-label="Fechar janela" onClick={onClose}><X size={21} /></button>
      {children}
    </motion.div>
  </motion.div>;
}
