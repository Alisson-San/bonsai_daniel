import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Plus, X } from 'lucide-react';

type Field = { label: string; placeholder?: string; long?: boolean; width?: 'narrow' };
type Props = { value: string; fields: Field[]; addLabel: string; saving: boolean; onSave: (value: string) => Promise<boolean> };

// Curation editor for short lists stored as "a | b | c" lines (highlights, milestones, steps, testimonials): one
// labelled field per part, one row per item, with add, remove and reorder. Visitors never see this format.
export default function RowsEditor({ value, fields, addLabel, saving, onSave }: Props) {
  const parse = (text: string) => text.split('\n').map(line => line.split('|').map(part => part.trim())).filter(parts => parts[0]).map(parts => fields.map((_, i) => parts[i] ?? ''));
  const [rows, setRows] = useState(() => parse(value));
  useEffect(() => setRows(parse(value)), [value]);
  // "|" separates the parts, so it cannot appear inside one.
  const serialize = (list: string[][]) => list.filter(row => row[0].trim()).map(row => row.map(cell => cell.replace(/\|/g, '/').replace(/\s*\n\s*/g, ' ').trim()).join(' | ').replace(/( \| )+$/, '')).join('\n');
  const dirty = serialize(rows) !== serialize(parse(value));
  const set = (r: number, f: number, text: string) => setRows(list => list.map((row, i) => i === r ? row.map((cell, k) => k === f ? text : cell) : row));
  const move = (r: number, by: number) => setRows(list => { const next = [...list]; const [row] = next.splice(r, 1); next.splice(r + by, 0, row); return next; });
  return <div className="rows-editor">
    {rows.map((row, r) => <div key={r} className="rows-editor-row">
      {fields.map((field, f) => <label key={f} className={field.width === 'narrow' ? 'is-narrow' : field.long ? 'is-long' : ''}>{field.label}
        {field.long ? <textarea rows={2} value={row[f]} placeholder={field.placeholder} onChange={e => set(r, f, e.target.value)} /> : <input value={row[f]} placeholder={field.placeholder} onChange={e => set(r, f, e.target.value)} />}
      </label>)}
      <span className="rows-editor-actions">
        <button type="button" className="icon-button" aria-label="Subir" disabled={r === 0} onClick={() => move(r, -1)}><ArrowUp size={14} /></button>
        <button type="button" className="icon-button" aria-label="Descer" disabled={r === rows.length - 1} onClick={() => move(r, 1)}><ArrowDown size={14} /></button>
        <button type="button" className="icon-button danger" aria-label="Remover" onClick={() => setRows(list => list.filter((_, i) => i !== r))}><X size={14} /></button>
      </span>
    </div>)}
    <div className="rows-editor-footer">
      <button type="button" className="text-link" onClick={() => setRows(list => [...list, fields.map(() => '')])}><Plus size={15} />{addLabel}</button>
      {dirty && <span><button type="button" className="text-link" onClick={() => setRows(parse(value))} disabled={saving}>Desfazer</button><button type="button" className="button button-gold" disabled={saving} onClick={() => void onSave(serialize(rows))}>{saving ? 'Salvando…' : 'Salvar'}</button></span>}
    </div>
  </div>;
}
