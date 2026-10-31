import { useRef, useState, type FormEvent } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Crop, ImagePlus, Pencil, Plus, Trash2, X } from 'lucide-react';
import Modal from './Modal';
import PhotoAdjuster from './PhotoAdjuster';
import { fileToImage } from '../lib/media';
import { awardSchema, type Award } from '../lib/schema';
import SectionMark from './SectionMark';

const reveal = { initial: { opacity: 0, y: 24 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, amount: .2 } };
// Newest first; items without a year after the dated ones, in the order they were added.
const sorted = (awards: Award[]) => [...awards].sort((a, b) => (Number(b.ano) || 0) - (Number(a.ano) || 0));

type Props = {
  awards: Award[]; editing: boolean; saving: boolean;
  // Home page: the newest `limit` as compact cards with a link to the cultivator page, which shows them all
  // (`feature`): records with a photo as a large gallery, the others as a list by year.
  limit?: number; feature?: boolean;
  onSave: (award: Award) => Promise<boolean>; onDelete: (award: Award) => void;
};

// Exhibitions, awards and courses, one record each (photo optional).
export default function Awards({ awards, editing, saving, limit, feature = false, onSave, onDelete }: Props) {
  const reduced = useReducedMotion();
  const [editor, setEditor] = useState<Award | null>(null);
  const [viewing, setViewing] = useState<Award | null>(null);
  const all = sorted(awards), shown = limit && !editing ? all.slice(0, limit) : all;
  if (!all.length && !editing) return null;
  const add = editing && <button className="awards-add" onClick={() => setEditor({ id: crypto.randomUUID(), ano: String(new Date().getFullYear()), titulo: '', local: '' })} disabled={saving}><Plus size={24} strokeWidth={1.2} /><span>Adicionar exposição ou prêmio</span></button>;
  const admin = (award: Award) => editing && <div className="award-admin"><button className="icon-button" aria-label={`Editar ${award.titulo}`} onClick={() => setEditor(award)} disabled={saving}><Pencil size={15} /></button><button className="icon-button danger" aria-label={`Excluir ${award.titulo}`} onClick={() => onDelete(award)} disabled={saving}><Trash2 size={15} /></button></div>;
  const card = (award: Award, i: number) => <motion.article key={award.id} className={`award-card ${award.foto ? 'has-photo' : ''}`} {...(reduced ? {} : reveal)} transition={{ delay: i % 3 * .08 }}>
    {award.foto && <button className="award-photo" onClick={() => setViewing(award)} aria-label={`Ampliar foto: ${award.titulo}`}><img src={award.foto} alt={award.titulo} loading="lazy" decoding="async" /></button>}
    <div className="award-text">
      {award.ano && <span className="awards-year">{award.ano}</span>}
      <strong>{award.titulo}</strong>
      {award.local && <span className="awards-place">{award.local}</span>}
    </div>
    {admin(award)}
  </motion.article>;
  const years = all.map(a => Number(a.ano)).filter(year => year > 0);
  const withPhoto = shown.filter(a => a.foto), withoutPhoto = shown.filter(a => !a.foto);
  return <section className={`awards section-shell ${feature ? 'is-feature' : ''}`} id="premios">
    <div className={feature ? 'feature-heading' : ''}>
      <SectionMark label="EXPOSIÇÕES E PRÊMIOS" />
      <h2>Reconhecimento<br />em cada estação.</h2>
      {feature && all.length > 0 && <p>{all.length} registro{all.length === 1 ? '' : 's'} de exposições, prêmios e encontros{years.length ? `, desde ${Math.min(...years)}` : ''}.</p>}
    </div>
    {feature ? <>
      {(withPhoto.length > 0 || editing) && <div className="awards-gallery">
        {add}
        {withPhoto.map((award, i) => <motion.figure key={award.id} className="award-shot" {...(reduced ? {} : reveal)} transition={{ delay: i % 3 * .08 }}>
          <button className="award-photo" onClick={() => setViewing(award)} aria-label={`Ampliar foto: ${award.titulo}`}><img src={award.foto} alt={award.titulo} loading="lazy" decoding="async" /></button>
          <figcaption>{award.ano && <span className="awards-year">{award.ano}</span>}<strong>{award.titulo}</strong>{award.local && <span className="awards-place">{award.local}</span>}</figcaption>
          {admin(award)}
        </motion.figure>)}
      </div>}
      {withoutPhoto.length > 0 && <ol className="awards-list">{withoutPhoto.map(award => <motion.li key={award.id} {...(reduced ? {} : reveal)}>
        <span className="awards-year">{award.ano || '—'}</span><div><strong>{award.titulo}</strong>{award.local && <span className="awards-place">{award.local}</span>}</div>{admin(award)}
      </motion.li>)}</ol>}
    </> : <div className="awards-grid">{add}{shown.map(card)}</div>}
    {limit && !editing && <a className="text-link section-more" href="/biografia#premios" data-route>{all.length > shown.length ? `Ver todos os registros (${all.length})` : 'Ver na página do cultivador'}<ArrowRight size={15} /></a>}
    {viewing?.foto && <Modal title={viewing.titulo} onClose={() => setViewing(null)} wide><figure className="award-viewer"><img src={viewing.foto} alt={viewing.titulo} /><figcaption><strong>{viewing.titulo}</strong>{[viewing.ano, viewing.local].filter(Boolean).join(' · ')}</figcaption></figure></Modal>}
    {editor && <AwardEditor award={editor} saving={saving} onClose={() => setEditor(null)} onSave={async award => { if (await onSave(award)) setEditor(null); }} />}
  </section>;
}

function AwardEditor({ award, saving, onClose, onSave }: { award: Award; saving: boolean; onClose: () => void; onSave: (award: Award) => Promise<void> }) {
  const [draft, setDraft] = useState(award);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState('');
  const [adjusting, setAdjusting] = useState(false);
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
        {draft.foto && <span className="award-photo-links"><button type="button" className="text-link" onClick={() => setAdjusting(true)} disabled={busy}><Crop size={14} />Ajustar foto</button><button type="button" className="text-link" onClick={() => input.current?.click()} disabled={busy}>Trocar foto</button></span>}
      </div>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={e => { const file = e.target.files?.[0]; if (file) void pick(file); e.target.value = ''; }} />
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="editor-actions"><button type="button" className="button button-outline" onClick={onClose} disabled={busy}>Cancelar</button><button className="button button-gold" disabled={busy}>{saving ? 'Salvando…' : 'Salvar'}</button></div>
    </form>
    {adjusting && draft.foto && <PhotoAdjuster src={draft.foto} onClose={() => setAdjusting(false)} onApply={foto => { setDraft(d => ({ ...d, foto })); setAdjusting(false); }} />}
  </Modal>;
}
