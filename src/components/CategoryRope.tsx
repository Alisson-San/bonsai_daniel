import { Tags } from 'lucide-react';

type Props = { categories: string[]; selected: string; total: number; counts: Record<string, number>; editing: boolean; onSelect: (category: string) => void; onManage: () => void };
const short = (c: string) => c === 'Exemplar de Coleção / Mestre' ? 'Coleção / Mestre' : c === 'Pré-Bonsai de Engorda' ? 'Pré-bonsai' : c;

// Category filter as small wooden tags hanging from a rope, like the labels in a Japanese nursery. Each one swings
// when touched; the chosen one turns gold. On narrow screens the rope scrolls sideways.
export default function CategoryRope({ categories, selected, total, counts, editing, onSelect, onManage }: Props) {
  const tag = (key: string, label: string, count: number | null, active: boolean, onClick: () => void) =>
    <button key={key} className={`rope-tag ${active ? 'selected' : ''}`} aria-pressed={active} onClick={onClick}>
      <span className="rope-segment" aria-hidden="true" />
      <span className="rope-hang"><span className="rope-plate"><span className="rope-name">{label}</span>{count !== null && <span className="rope-count">{count}</span>}</span></span>
    </button>;
  return <div className="category-rope" role="group" aria-label="Filtrar por categoria">
    {tag('all', 'Todos', total, !selected, () => onSelect(''))}
    {categories.map(c => tag(c, short(c), counts[c] ?? 0, selected === c, () => onSelect(c)))}
    {editing && <button className="rope-tag rope-manage" onClick={onManage} aria-label="Gerenciar categorias: criar, renomear ou remover"><span className="rope-segment" aria-hidden="true" /><span className="rope-hang"><span className="rope-plate"><Tags size={15} /><span className="rope-name">Gerenciar</span></span></span></button>}
  </div>;
}
