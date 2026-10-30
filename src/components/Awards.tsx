import { useRef, useState, type FormEvent } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ImagePlus, Pencil, Plus, Trash2, X } from 'lucide-react';
import Modal from './Modal';
import { fileToImage } from '../lib/media';
import { awardSchema, type Award } from '../lib/schema';

const reveal = { initial: { opacity: 0, y: 24 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, amount: .2 } };
// Newest first; items without a year after the dated ones, in the order they were added.
const sorted = (awards: Award[]) => [...awards].sort((a, b) => (Number(b.ano) || 0) - (Number(a.ano) || 0));

type Props = {
  awards: Award[]; editing: boolean; saving: boolean; limit?: number;
  onSave: (award: Award) => Promise<boolean>; onDelete: (award: Award) => void;
};

// Exhibitions, awards and courses, one card each (photo optional). The home page shows the newest few with a link to
// the biography, which shows them all.
export default function Awards({ awards, editing, saving, limit, onSave, onDelete }: Props) {
  const reduced = useReducedMotion();
  const [editor, setEditor] = useState<Award | null>(null);
  const [viewing, setViewing] = useState<Award | null>(null);
  const all = sorted(awards), shown = limit && !editing ? all.slice(0, limit) : all;
  if (!all.length && !editing) return null;
  return <section className="awards section-shell" id="premios">
    <span className="eyebrow">EXPOSIÇÕES E PRÊMIOS</span>
    <h2>Reconhecimento<br />em cada estação.</h2>
    <div className="awards-grid">
      {editing && <button className="awards-add" onClick={() => setEditor({ id: crypto.randomUUID(), ano: String(new Date().getFullYear()), titulo: '', local: '' })} disabled={saving}><Plus size={24} strokeWidth={1.2} /><span>Adicionar exposição ou prêmio</span></button>}
      {shown.map((award, i) => <motion.article key={award.id} className={`award-card ${award.foto ? 'has-photo' : ''}`} {...(reduced ? {} : reveal)} transition={{ delay: i % 3 * .08 }}>
        {award.foto && <button className="award-photo" onClick={() => setViewing(award)} aria-label={`Ampliar foto: ${award.titulo}`}><img src={award.foto} alt={award.titulo} loading="lazy" decoding="async" /></button>}
        <div className="award-text">
          {award.ano && <span className="awards-year">{award.ano}</span>}
          <strong>{award.titulo}</strong>
          {award.local && <span className="awards-place">{award.local}</span>}
        </div>
        {editing && <div className="award-admin"><button className="icon-button" aria-label={`Editar ${award.titulo}`} onClick={() => setEditor(award)} disabled={saving}><Pencil size={15} /></button><button className="icon-button danger" aria-label={`Excluir ${award.titulo}`} onClick={() => onDelete(award)} disabled={saving}><Trash2 size={15} /></button></div>}
      </motion.article>)}
    </div>
    {limit && !editing && all.length > shown.length && <a className="text-link" href="/biografia#premios" data-route>Ver todos ({all.length})</a>}
    {viewing?.foto && <Modal title={viewing.titulo} onClose={() => setViewing(null)} wide><figure className="award-viewer"><img src={viewing.foto} alt={viewing.titulo} /><figcaption><strong>{viewing.titulo}</strong>{[viewing.ano, viewing.local].filter(Boolean).join(' · ')}</figcaption></figure></Modal>}
    {editor && <AwardEditor award={editor} saving={saving} onClose={() => setEditor(null)} onSave={async award => { if (await onSave(award)) setEditor(null); }} />}
  </section>;
}

function AwardEditor({ award, saving, onClose, onSave }: { award: Award; saving: boolean; onClose: () => void; onSave: (award: Award) => Promise<void> }) {
  const [draft, setDraft] = useState(award);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const busy = saving || reading;
  const pick = async (file: File) => {
    setReading(true); setError('');
    try { const foto = await fileToImage(file); setDraft(d => ({ ...d, foto })); }
    catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível ler a imagem.'); }
    finally { setReading(false); }
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const result = awardSchema.safeParse({ ...draft, titulo: draft.titulo.trim(), ano: draft.ano.trim(), local: draft.local.trim() });
    if (!result.success) { setError('Informe ao menos o título.'); return; }
    await onSave(result.data);
  };
  return <Modal title={award.titulo ? `Editar ${award.titulo}` : 'Nova exposição ou prêmio'} onClose={() => { if (!busy) onClose(); }}>
    <form className="settings-form award-editor" onSubmit={e => void submit(e)}>
      <span className="eyebrow">EXPOSIÇÕES E PRÊMIOS</span>
      <h2>{award.titulo ? 'Editar' : 'Novo registro'}</h2>
      <div className="award-editor-row">
        <label>Ano<input inputMode="numeric" maxLength={20} value={draft.ano} onChange={e => setDraft(d => ({ ...d, ano: e.target.value }))} placeholder="2024" /></label>
        <label>Título<input required maxLength={200} value={draft.titulo} onChange={e => setDraft(d => ({ ...d, titulo: e.target.value }))} placeholder="1º lugar, categoria Shohin" /></label>
      </div>
      <label>Evento ou local<input maxLength={200} value={draft.local} onChange={e => setDraft(d => ({ ...d, local: e.target.value }))} placeholder="Exposição Nacional de Bonsai, São Paulo" /></label>
      <div className="award-editor-photo">
        {draft.foto ? <div><img src={draft.foto} alt="Foto do registro" /><button type="button" className="icon-button danger" aria-label="Remover foto" onClick={() => setDraft(d => ({ ...d, foto: undefined }))}><X size={14} /></button></div>
          : <button type="button" onClick={() => input.current?.click()} disabled={busy}><ImagePlus size={20} /><span>{reading ? 'Preparando…' : 'Adicionar foto (opcional)'}</span><small>Certificado, troféu ou a árvore na exposição</small></button>}
        {draft.foto && <button type="button" className="text-link" onClick={() => input.current?.click()} disabled={busy}>Trocar foto</button>}
      </div>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={e => { const file = e.target.files?.[0]; if (file) void pick(file); e.target.value = ''; }} />
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="editor-actions"><button type="button" className="button button-outline" onClick={onClose} disabled={busy}>Cancelar</button><button className="button button-gold" disabled={busy}>{saving ? 'Salvando…' : 'Salvar'}</button></div>
    </form>
  </Modal>;
}
