import { Droplet, Leaf, Sun } from 'lucide-react';
import type { Indicators as Levels } from '../lib/schema';

const items = [
 { key: 'sol', label: 'Exposição solar', icon: Sun },
 { key: 'rega', label: 'Rega', icon: Droplet },
 { key: 'cuidado', label: 'Nível de cuidado', icon: Leaf },
] as const;

// Sun, drop and leaf on a 1–5 scale. In curation mode each icon is a button that sets the level.
export default function Indicators({ levels, large = false, legends, editing = false, onChange }: { levels: Required<Levels>; large?: boolean; legends?: Partial<Record<keyof Levels, string>>; editing?: boolean; onChange?: (key: keyof Levels, value: number) => void }) {
 const visible = items.filter(item => editing || levels[item.key] > 0);
 if (!visible.length) return null;
 return <div className={`indicators ${large ? 'indicators-large' : ''}`}>{visible.map(({ key, label, icon: Icon }) => {
  const value = levels[key];
  return <div key={key} className={`indicator indicator-${key}`}>
   {large && <span className="indicator-label">{label}{legends?.[key] && <strong>{legends[key]}</strong>}</span>}
   <span className="indicator-scale" role={editing ? 'group' : 'img'} aria-label={`${label}: ${value} de 5`} title={`${label}: ${value}/5`}>
    {[1, 2, 3, 4, 5].map(n => editing
     ? <button key={n} type="button" className={n <= value ? 'filled' : ''} aria-label={`${label}: ${n} de 5`} aria-pressed={n === value} onClick={() => onChange?.(key, n)}><Icon size={large ? 18 : 14} /></button>
     : <Icon key={n} className={n <= value ? 'filled' : ''} size={large ? 18 : 13} aria-hidden="true" />)}
   </span>
  </div>;
 })}</div>;
}
