import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

type Page = 'home' | 'bio';
type Link = { key: string; label: string; href: string; route: boolean };

const desktopLinks = (page: Page): Link[] => [
  { key: 'colecao', label: 'A coleção', href: page === 'home' ? '#colecao' : '/#colecao', route: page !== 'home' },
  { key: 'bio', label: 'Biografia', href: '/biografia', route: true },
  { key: 'contato', label: 'Contato', href: page === 'home' ? '#contato' : '/#contato', route: page !== 'home' },
];
const menuLinks = (page: Page): Link[] => [
  ['colecao', 'A coleção'], ['como-comprar', 'Como funciona'], ['cultivador', 'O cultivador'], ['bio', 'Biografia'], ['colecao-pessoal', 'Coleção pessoal'], ['premios', 'Exposições e prêmios'], ['contato', 'Contato'],
].map(([key, label]) => key === 'bio' ? { key, label, href: '/biografia', route: true } : { key, label, href: page === 'home' ? `#${key}` : `/#${key}`, route: page !== 'home' });

// Header navigation. Desktop: a gold brush stroke sits under the link of the section in view and glides to the link
// under the pointer. Every screen: a brush line along the header's bottom edge grows with the page. Phones: the
// links live in a hanging scroll (kakejiku) that unrolls from the header, its gold rod coming down last.
export default function HeaderNav({ page }: { page: Page }) {
  const reduced = useReducedMotion();
  const nav = useRef<HTMLElement>(null), ink = useRef<HTMLSpanElement>(null), progress = useRef<HTMLSpanElement>(null);
  const [active, setActive] = useState<string | null>(page === 'bio' ? 'bio' : null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const range = Math.max(1, document.documentElement.scrollHeight - innerHeight);
      progress.current?.style.setProperty('scale', `${Math.min(1, scrollY / range).toFixed(4)} 1`);
      if (page === 'bio') { setActive('bio'); return; }
      const reached = (id: string) => { const el = document.getElementById(id); return !!el && el.getBoundingClientRect().top < innerHeight * .5; };
      setActive(reached('contato') ? 'contato' : reached('colecao') ? 'colecao' : null);
    };
    const schedule = () => { frame ||= requestAnimationFrame(update); };
    update(); addEventListener('scroll', schedule, { passive: true }); addEventListener('resize', schedule);
    return () => { cancelAnimationFrame(frame); removeEventListener('scroll', schedule); removeEventListener('resize', schedule); };
  }, [page]);
  // Place the stroke under the hovered link, else the active one.
  useEffect(() => {
    const target = nav.current?.querySelector<HTMLElement>(`[data-key="${hovered ?? active}"]`), stroke = ink.current;
    if (!stroke) return;
    if (!target) { stroke.style.opacity = '0'; return; }
    stroke.style.opacity = '1'; stroke.style.width = `${target.offsetWidth}px`; stroke.style.translate = `${target.offsetLeft}px 0`;
  }, [hovered, active]);
  useEffect(() => {
    if (!open) return;
    const key = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    addEventListener('keydown', key);
    return () => removeEventListener('keydown', key);
  }, [open]);
  const link = (item: Link, className = '') => <a key={item.key} data-key={item.key} className={className} href={item.href} data-route={item.route ? true : undefined}
    aria-current={item.key === 'bio' && page === 'bio' ? 'page' : undefined} onClick={() => setOpen(false)}
    onPointerEnter={() => setHovered(item.key)} onPointerLeave={() => setHovered(null)} onFocus={() => setHovered(item.key)} onBlur={() => setHovered(null)}>{item.label}</a>;
  const unroll = reduced ? { duration: 0 } : { duration: .75, ease: [.65, 0, .25, 1] as const };
  return <>
    <nav ref={nav} className="header-nav" aria-label="Navegação principal">
      {desktopLinks(page).map(item => link(item))}
      <span ref={ink} className="header-ink" aria-hidden="true" />
    </nav>
    <span className="header-progress" aria-hidden="true"><span ref={progress} /></span>
    <button className={`menu-toggle ${open ? 'is-open' : ''}`} aria-expanded={open} aria-controls="scroll-menu" aria-label={open ? 'Fechar menu' : 'Abrir menu'} onClick={() => setOpen(v => !v)}><span /><span /></button>
    <AnimatePresence>{open && <>
      <motion.div key="shade" className="scroll-menu-shade" onClick={() => setOpen(false)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
      <div key="menu" className="scroll-menu" id="scroll-menu">
        <motion.div className="scroll-menu-paper" initial={{ clipPath: 'inset(0 0 100% 0)' }} animate={{ clipPath: 'inset(0 0 0% 0)' }} exit={{ clipPath: 'inset(0 0 100% 0)' }} transition={unroll}>
          <nav aria-label="Menu">{menuLinks(page).map((item, i) => <a key={item.key} href={item.href} data-route={item.route ? true : undefined} onClick={() => setOpen(false)} aria-current={item.key === 'bio' && page === 'bio' ? 'page' : undefined}><small>{String(i + 1).padStart(2, '0')}</small>{item.label}</a>)}</nav>
        </motion.div>
        <motion.span className="scroll-menu-rod" aria-hidden="true" initial={{ top: '0%' }} animate={{ top: '100%' }} exit={{ top: '0%' }} transition={unroll}><i /></motion.span>
      </div>
    </>}</AnimatePresence>
  </>;
}
