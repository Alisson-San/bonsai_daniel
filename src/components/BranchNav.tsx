import { useEffect, useRef, useState } from 'react';
import { acerOutline } from '../lib/acer';

const SECTIONS = [
  ['colecao', 'A coleção'], ['como-comprar', 'Como funciona'], ['cultivador', 'O cultivador'], ['colecao-pessoal', 'Coleção pessoal'],
  ['premios', 'Exposições e prêmios'], ['vendidos', 'Novos lares'], ['depoimentos', 'Depoimentos'], ['contato', 'Contato'],
] as const;
const STEM = 'M10 0C4 160 16 330 10 500S4 840 10 1000';

// Desktop navigation along the page edge: a thin branch that grows as the page scrolls, with a maple leaf for each
// section (alternating sides, like leaves on a twig). A leaf turns red once its section is reached; clicking one
// scrolls there. Hidden over the hero and on narrow screens (CSS).
export default function BranchNav() {
  const root = useRef<HTMLElement>(null);
  const [marks, setMarks] = useState<{ id: string; label: string; at: number }[]>([]);
  const [reached, setReached] = useState(0);
  useEffect(() => {
    let frame = 0, positions: { id: string; label: string; top: number }[] = [];
    const measure = () => {
      const range = Math.max(1, document.documentElement.scrollHeight - innerHeight);
      positions = SECTIONS.flatMap(([id, label]) => { const el = document.getElementById(id); return el ? [{ id, label, top: el.getBoundingClientRect().top + scrollY }] : []; });
      setMarks(positions.map(({ id, label, top }) => ({ id, label, at: Math.min(1, Math.max(0, (top - innerHeight * .35) / range)) })));
      update();
    };
    const update = () => {
      frame = 0;
      const range = Math.max(1, document.documentElement.scrollHeight - innerHeight), progress = Math.min(1, scrollY / range);
      const grown = root.current?.querySelector<SVGElement>('.branch-grown'); if (grown) grown.style.clipPath = `inset(0 0 ${((1 - progress) * 100).toFixed(2)}% 0)`;
      root.current?.classList.toggle('is-shown', scrollY > innerHeight * .7);
      setReached(positions.filter(p => p.top - innerHeight * .4 <= scrollY).length);
    };
    const schedule = () => { frame ||= requestAnimationFrame(update); };
    measure();
    // Sections appear and change height as the catalog loads and filters change.
    const observer = new ResizeObserver(() => measure()); observer.observe(document.body);
    addEventListener('scroll', schedule, { passive: true });
    return () => { cancelAnimationFrame(frame); observer.disconnect(); removeEventListener('scroll', schedule); };
  }, []);
  return <nav ref={root} className="branch-nav" aria-label="Seções da página">
    <svg className="branch-stem" viewBox="0 0 20 1000" preserveAspectRatio="none" aria-hidden="true"><path className="branch-base" d={STEM} /></svg>
    <svg className="branch-stem branch-grown" viewBox="0 0 20 1000" preserveAspectRatio="none" aria-hidden="true"><path d={STEM} /></svg>
    {marks.map((mark, i) => <a key={mark.id} href={`#${mark.id}`} className={`branch-leaf ${i % 2 ? 'is-right' : 'is-left'} ${i < reached ? 'is-reached' : ''}`} style={{ top: `${mark.at * 100}%` }} aria-current={i === reached - 1 ? 'location' : undefined}>
      <svg viewBox="-31 -36 62 66" aria-hidden="true"><path d={acerOutline} /></svg>
      <span>{mark.label}</span>
    </a>)}
  </nav>;
}
