import { useState } from 'react';
import { Check, Pencil, X } from 'lucide-react';

export default function Editable({ value, editing, onSave, className = '', multiline = false, label, displayValue, inputType = 'text' }: { value: string; editing: boolean; onSave: (value: string) => Promise<boolean>; className?: string; multiline?: boolean; label: string; displayValue?: string; inputType?: 'text' | 'number' }) {
  const [active, setActive] = useState(false);
  const [draft, setDraft] = useState(value);
  const [busy, setBusy] = useState(false);
  if (!editing) return <span className={className}>{displayValue ?? value}</span>;
  if (!active) return <button className={`editable ${className}`} title={`Editar ${label}`} onClick={() => { setDraft(value); setActive(true); }}>{displayValue ?? (value || `Adicionar ${label}`)}<Pencil size={13} /></button>;
  const save = async () => { setBusy(true); try { if (await onSave(draft)) setActive(false); } finally { setBusy(false); } };
  return <span className={`inline-editor ${className}`}>
    {multiline ? <textarea aria-label={label} autoFocus value={draft} onChange={e => setDraft(e.target.value)} /> : <input type={inputType} min={inputType === 'number' ? 0 : undefined} step={inputType === 'number' ? '0.01' : undefined} aria-label={label} autoFocus value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void save(); } }} />}
    <span className="inline-actions"><button type="button" className="icon-button" aria-label={`Salvar ${label}`} disabled={busy} onClick={() => void save()}><Check size={16} /></button><button type="button" className="icon-button" aria-label={`Cancelar ${label}`} disabled={busy} onClick={() => setActive(false)}><X size={16} /></button></span>
  </span>;
}
