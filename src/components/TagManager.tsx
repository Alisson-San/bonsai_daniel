import { useState } from 'react';
import { Check, Plus, Trash2, X } from 'lucide-react';
import Modal from './Modal';
import type { Catalog } from '../lib/schema';
import { field, removeTag, renameTag, tagsOf, type TagKind } from '../lib/tags';

type Props = { kind: TagKind; catalog: Catalog; saving: boolean; onClose: () => void; onSave: (change: (current: Catalog) => Catalog, message: string) => Promise<boolean> };

const words = { categories: { one: 'categoria', title: 'Categorias', add: 'Nova categoria' }, species: { one: 'espécie', title: 'Espécies', add: 'Nova espécie' } };

// Curation dialog for the filter tags: add, rename (every plant follows) and remove (its plants move to another tag).
export default function TagManager({ kind, catalog, saving, onClose, onSave }: Props) {
  const w = words[kind], tags = tagsOf(catalog, kind);
  const count = (tag: string) => catalog.plants.filter(p => p[field[kind]] === tag).length;
  const [names, setNames] = useState<Record<string, string>>({});
  const [removing, setRemoving] = useState<string | null>(null);
  const [target, setTarget] = useState('');
  const [added, setAdded] = useState('');
  const [error, setError] = useState('');
  const valid = (name: string, except?: string) => {
    if (!name) { setError(`Informe o nome da ${w.one}.`); return false; }
    if (name.length > 200) { setError('Use até 200 caracteres.'); return false; }
    if (name !== except && tags.includes(name)) { setError(`Já existe uma ${w.one} com esse nome.`); return false; }
    setError(''); return true;
  };
  const rename = async (tag: string) => {
    const name = (names[tag] ?? tag).trim();
    if (name === tag || !valid(name, tag)) return;
    if (await onSave(c => renameTag(c, kind, tag, name), `${w.one[0].toUpperCase() + w.one.slice(1)} renomeada.`)) setNames(n => { const { [tag]: _done, ...rest } = n; return rest; });
  };
  const startRemove = (tag: string) => { setError(''); setRemoving(tag); setTarget(kind === 'categories' ? tags.find(t => t !== tag) ?? '' : ''); };
  const remove = async (tag: string) => {
    if (kind === 'categories' && count(tag) && !target) { setError('Escolha para qual categoria os exemplares vão.'); return; }
    if (await onSave(c => removeTag(c, kind, tag, count(tag) ? target : ''), `${w.one[0].toUpperCase() + w.one.slice(1)} removida.`)) setRemoving(null);
  };
  const add = async () => {
    const name = added.trim();
    if (!valid(name)) return;
    if (await onSave(c => ({ ...c, [kind]: [...new Set([...c[kind], name])] }), `${w.one[0].toUpperCase() + w.one.slice(1)} criada.`)) setAdded('');
  };
  return <Modal title={`Gerenciar ${w.title.toLowerCase()}`} onClose={() => { if (!saving) onClose(); }}>
    <div className="settings-form tag-manager">
      <span className="eyebrow">CURADORIA</span>
      <h2>{w.title}</h2>
      <p className="muted small">Renomear muda todos os exemplares que usam a {w.one}. Para remover uma {w.one} em uso, escolha para onde vão os exemplares.</p>
      <ul className="tag-list">{tags.map(tag => {
        const n = count(tag), name = names[tag] ?? tag;
        return <li key={tag} className={removing === tag ? 'is-removing' : ''}>
          <div className="tag-row">
            <input aria-label={`Nome da ${w.one} ${tag}`} value={name} maxLength={200} disabled={saving} onChange={e => setNames(v => ({ ...v, [tag]: e.target.value }))} onKeyDown={e => { if (e.key === 'Enter') void rename(tag); }} />
            <span className="tag-count">{n ? `${n} exemplar${n === 1 ? '' : 'es'}` : 'sem exemplares'}</span>
            {name.trim() !== tag && <button type="button" className="icon-button gold" aria-label={`Salvar novo nome de ${tag}`} title="Salvar nome" onClick={() => void rename(tag)} disabled={saving}><Check size={16} /></button>}
            <button type="button" className="icon-button danger" aria-label={`Remover ${tag}`} title="Remover" onClick={() => startRemove(tag)} disabled={saving}><Trash2 size={15} /></button>
          </div>
          {removing === tag && <div className="tag-remove">
            {n > 0 ? <label>Mover {n === 1 ? 'o exemplar' : `os ${n} exemplares`} para<select value={target} onChange={e => setTarget(e.target.value)}>
              {kind === 'species' && <option value="">Deixar sem espécie</option>}
              {tags.filter(t => t !== tag).map(t => <option key={t} value={t}>{t}</option>)}
            </select></label> : <span>Remover “{tag}” dos filtros?</span>}
            <span className="tag-remove-actions"><button type="button" className="text-link" onClick={() => setRemoving(null)} disabled={saving}>Cancelar</button><button type="button" className="button button-outline danger-button" onClick={() => void remove(tag)} disabled={saving}>{saving ? 'Salvando…' : 'Remover'}</button></span>
          </div>}
        </li>;
      })}</ul>
      <div className="tag-add"><input aria-label={w.add} placeholder={w.add} value={added} maxLength={200} disabled={saving} onChange={e => setAdded(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') void add(); }} /><button type="button" className="button button-gold" onClick={() => void add()} disabled={saving || !added.trim()}><Plus size={16} />Adicionar</button></div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="editor-actions"><button type="button" className="button button-outline" onClick={onClose} disabled={saving}><X size={16} />Fechar</button></div>
    </div>
  </Modal>;
}
