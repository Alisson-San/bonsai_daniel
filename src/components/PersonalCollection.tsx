import { useRef, useState, type FormEvent } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, ArrowRight, ImagePlus, Pencil, Plus, Star, Trash2, X } from 'lucide-react';
import Modal from './Modal';
import { fileToImage } from '../lib/media';
import { personalSchema, type PersonalTree } from '../lib/schema';
import SectionMark from './SectionMark';

const reveal = { initial: { opacity: 0, y: 28 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, amount: .2 } };
const MAX_PHOTOS = 12;

type Props = {
  trees: PersonalTree[]; editing: boolean; saving: boolean;
  // Home page: the first `limit` trees as a compact gallery with a link to the cultivator page, which shows them all
  // as large editorial rows (`feature`).
  limit?: number; feature?: boolean;
  onSave: (tree: PersonalTree) => Promise<boolean>; onDelete: (tree: PersonalTree) => void; notify: (message: string) => void;
};

// The cultivator's own trees, not for sale, with a short record per tree.
export function PersonalCollection({ trees, editing, saving, limit, feature = false, onSave, onDelete, notify }: Props) {
  const reduced = useReducedMotion();
  const [viewing, setViewing] = useState<{ tree: PersonalTree; index: number } | null>(null);
  const [editor, setEditor] = useState<PersonalTree | null>(null);
  if (!trees.length && !editing) return null;
  const shown = limit && !editing ? trees.slice(0, limit) : trees;
  const add = editing && <button className="personal-add" onClick={() => setEditor({ id: crypto.randomUUID(), nome: '', especie: '', idade: '', descricao: '', fotos: [] })} disabled={saving}><Plus size={26} strokeWidth={1.2} /><span>Adicionar bonsai da coleção</span></button>;
  const admin = (tree: PersonalTree) => editing && <div className="personal-admin"><button className="icon-button" aria-label={`Editar ${tree.nome}`} onClick={() => setEditor(tree)} disabled={saving}><Pencil size={15} /></button><button className="icon-button danger" aria-label={`Excluir ${tree.nome}`} onClick={() => onDelete(tree)} disabled={saving}><Trash2 size={15} /></button></div>;
  const meta = (tree: PersonalTree) => [tree.especie, tree.idade].filter(Boolean).join(' · ');
  return <section className={`personal section-shell ${feature ? 'is-feature' : ''}`} id="colecao-pessoal">
    {feature
      ? <div className="feature-heading"><SectionMark label="COLEÇÃO PESSOAL" /><h2>Árvores que ficam<br />com o cultivador.</h2><p>Exemplares que não estão à venda: anos de trabalho, mostrados como inspiração.</p></div>
      : <div className="section-heading"><div><SectionMark label="COLEÇÃO PESSOAL" /><h2>Árvores que ficam<br />com o cultivador.</h2></div><p>Exemplares que não estão à venda: anos de trabalho, mostrados como inspiração.</p></div>}
    {feature ? <div className="personal-feature">
      {add}
      {shown.map((tree, i) => <motion.article key={tree.id} className="personal-row" {...(reduced ? {} : reveal)}>
        <div className="personal-row-media">
          <button className="personal-photo" onClick={() => setViewing({ tree, index: 0 })} aria-label={`Ampliar fotos de ${tree.nome}`}><img src={tree.fotos[0]} alt={tree.nome} loading="lazy" decoding="async" /></button>
          {admin(tree)}
        </div>
        <div className="personal-row-text">
          <span className="personal-index">{String(i + 1).padStart(2, '0')}</span>
          <h3>{tree.nome}</h3>
          {meta(tree) && <p className="scientific">{meta(tree)}</p>}
          {tree.descricao && <p className="personal-description">{tree.descricao}</p>}
          {tree.fotos.length > 1 && <div className="personal-thumbs">{tree.fotos.slice(1, 6).map((url, k) => <button key={url + k} onClick={() => setViewing({ tree, index: k + 1 })} aria-label={`Ver foto ${k + 2} de ${tree.nome}`}><img src={url} alt="" loading="lazy" decoding="async" /></button>)}{tree.fotos.length > 6 && <button className="personal-more" onClick={() => setViewing({ tree, index: 6 })} aria-label={`Ver todas as ${tree.fotos.length} fotos`}>+{tree.fotos.length - 6}</button>}</div>}
          <span className="personal-tag">Não está à venda</span>
        </div>
      </motion.article>)}
    </div> : <div className="personal-grid">
      {add}
      {shown.map((tree, i) => <motion.article key={tree.id} className="personal-card" {...(reduced ? {} : reveal)} transition={{ delay: i % 4 * .08 }}>
        <button className="personal-photo" onClick={() => setViewing({ tree, index: 0 })} aria-label={`Ver ${tree.nome}`}><img src={tree.fotos[0]} alt={tree.nome} loading="lazy" decoding="async" />{tree.fotos.length > 1 && <span className="personal-count">{tree.fotos.length} fotos</span>}</button>
        <strong>{tree.nome}</strong>
        <span className="personal-meta">{meta(tree)}</span>
        {admin(tree)}
      </motion.article>)}
    </div>}
    {limit && !editing && <a className="text-link section-more" href="/biografia#colecao-pessoal" data-route>{trees.length > shown.length ? `Ver toda a coleção pessoal (${trees.length})` : 'Conhecer cada árvore na página do cultivador'}<ArrowRight size={15} /></a>}
    {viewing && <PersonalViewer tree={viewing.tree} start={viewing.index} onClose={() => setViewing(null)} />}
    {editor && <PersonalEditor tree={editor} saving={saving} notify={notify} onClose={() => setEditor(null)} onSave={async tree => { if (await onSave(tree)) setEditor(null); }} />}
  </section>;
}

function PersonalViewer({ tree, start, onClose }: { tree: PersonalTree; start: number; onClose: () => void }) {
  const [index, setIndex] = useState(Math.min(start, tree.fotos.length - 1));
  const step = (by: number) => setIndex(i => (i + by + tree.fotos.length) % tree.fotos.length);
  return <Modal title={tree.nome} onClose={onClose} wide>
    <div className="personal-viewer">
      <div className="personal-viewer-photo"><img src={tree.fotos[index]} alt={`${tree.nome}, foto ${index + 1} de ${tree.fotos.length}`} />
        {tree.fotos.length > 1 && <><button className="icon-button personal-prev" onClick={() => step(-1)} aria-label="Foto anterior"><ArrowLeft size={18} /></button><button className="icon-button personal-next" onClick={() => step(1)} aria-label="Próxima foto"><ArrowRight size={18} /></button></>}
      </div>
      <div className="personal-viewer-info">
        <span className="eyebrow">COLEÇÃO PESSOAL · NÃO ESTÁ À VENDA</span>
        <h2>{tree.nome}</h2>
        {(tree.especie || tree.idade) && <p className="scientific">{[tree.especie, tree.idade].filter(Boolean).join(' · ')}</p>}
        {tree.descricao && <p className="personal-description">{tree.descricao}</p>}
        {tree.fotos.length > 1 && <div className="personal-thumbs">{tree.fotos.map((url, i) => <button key={url + i} className={i === index ? 'selected' : ''} onClick={() => setIndex(i)} aria-label={`Foto ${i + 1}`} aria-pressed={i === index}><img src={url} alt="" /></button>)}</div>}
      </div>
    </div>
  </Modal>;
}

function PersonalEditor({ tree, saving, notify, onClose, onSave }: { tree: PersonalTree; saving: boolean; notify: (message: string) => void; onClose: () => void; onSave: (tree: PersonalTree) => Promise<void> }) {
  const [draft, setDraft] = useState(tree);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const set = <K extends keyof PersonalTree>(key: K, value: PersonalTree[K]) => setDraft(d => ({ ...d, [key]: value }));
  const add = async (files: FileList) => {
    if (draft.fotos.length + files.length > MAX_PHOTOS) { setError(`Até ${MAX_PHOTOS} fotos por árvore.`); return; }
    setReading(true); setError('');
    try { const added: string[] = []; for (const file of Array.from(files)) added.push(await fileToImage(file)); set('fotos', [...draft.fotos, ...added]); }
    catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível ler a imagem.'); }
    finally { setReading(false); }
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const result = personalSchema.safeParse({ ...draft, nome: draft.nome.trim() });
    if (!result.success) { setError(!draft.nome.trim() ? 'Informe o nome da árvore.' : !draft.fotos.length ? 'Adicione ao menos uma foto.' : 'Confira os campos.'); return; }
    await onSave(result.data);
  };
  const busy = saving || reading;
  return <Modal title={tree.nome ? `Editar ${tree.nome}` : 'Novo bonsai da coleção'} onClose={() => { if (!busy) onClose(); }}>
    <form className="personal-editor settings-form" onSubmit={e => void submit(e)}>
      <span className="eyebrow">COLEÇÃO PESSOAL</span>
      <h2>{tree.nome ? 'Editar árvore' : 'Nova árvore'}</h2>
      <label>Nome<input value={draft.nome} onChange={e => set('nome', e.target.value)} maxLength={200} required placeholder="Ex.: Pinheiro negro" /></label>
      <div className="personal-editor-row">
        <label>Espécie<input value={draft.especie} onChange={e => set('especie', e.target.value)} maxLength={200} placeholder="Ex.: Pinus thunbergii" /></label>
        <label>Idade<input value={draft.idade} onChange={e => set('idade', e.target.value)} maxLength={200} placeholder="Ex.: ~30 anos" /></label>
      </div>
      <label>Sobre a árvore<textarea value={draft.descricao} onChange={e => set('descricao', e.target.value)} maxLength={2000} rows={4} placeholder="Origem, estilo, prêmios, trabalho feito…" /></label>
      <div className="personal-editor-photos">
        {draft.fotos.map((url, i) => <div key={url.slice(-24) + i} className={i === 0 ? 'is-cover' : ''}>
          <img src={url} alt={`Foto ${i + 1}`} />
          <span className="personal-editor-actions">
            {i > 0 && <button type="button" className="icon-button" title="Usar como capa" aria-label="Usar como capa" onClick={() => set('fotos', [url, ...draft.fotos.filter((_, k) => k !== i)])}><Star size={14} /></button>}
            <button type="button" className="icon-button danger" aria-label="Remover foto" onClick={() => set('fotos', draft.fotos.filter((_, k) => k !== i))}><X size={14} /></button>
          </span>
          {i === 0 && <small>Capa</small>}
        </div>)}
        {draft.fotos.length < MAX_PHOTOS && <button type="button" className="personal-editor-add" onClick={() => input.current?.click()} disabled={busy}><ImagePlus size={20} /><span>{reading ? 'Preparando…' : 'Adicionar fotos'}</span></button>}
      </div>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={e => { if (e.target.files?.length) void add(e.target.files); e.target.value = ''; }} />
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="editor-actions"><button type="button" className="button button-outline" onClick={onClose} disabled={busy}>Cancelar</button><button className="button button-gold" disabled={busy}>{saving ? 'Salvando…' : 'Salvar árvore'}</button></div>
    </form>
  </Modal>;
}
