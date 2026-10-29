import { useEffect } from 'react';
export function useScrollReveal() {
 useEffect(() => {
  const media = matchMedia('(prefers-reduced-motion: reduce)');
  let observer: IntersectionObserver | undefined;
  const nodes = document.querySelectorAll<HTMLElement>('.section-heading, .cultivator-image, .cultivator-copy, .contact > h2, .contact > p, .contact > .eyebrow');
  const setup = () => { observer?.disconnect(); nodes.forEach(n => n.classList.remove('reveal-pending')); if(media.matches)return;
   observer = new IntersectionObserver(entries => entries.forEach(entry => { if(entry.isIntersecting){entry.target.classList.remove('reveal-pending');observer?.unobserve(entry.target);} }),{ threshold:.12 });
   nodes.forEach((node,index) => { node.classList.add('reveal-item','reveal-pending');node.style.setProperty('--reveal-delay',`${index%3 * 100}ms`);observer!.observe(node); });
  };setup();media.addEventListener('change',setup);return () => {observer?.disconnect();media.removeEventListener('change',setup);nodes.forEach(n=>n.classList.remove('reveal-pending'));};
 }, []);
}
