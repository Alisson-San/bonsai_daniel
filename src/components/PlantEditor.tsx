import { useState, useRef, type FormEvent } from 'react';
import { Crop, ImagePlus, Plus, Star, Trash2, Save, Upload } from 'lucide-react';
import Modal from './Modal';
import BonsaiPhoto from './BonsaiPhoto';
import PhotoControls from './PhotoControls';
import PhotoAdjuster from './PhotoAdjuster';
import { angles, plantSchema, safeImageUrl, statuses, statusLabels, type Catalog, type Plant } from '../lib/schema';
import { fileToImage } from '../lib/media';
import { coverOf, formatPrice } from '../lib/catalog';

export default function PlantEditor({ plant, catalog, onClose, onSave }: { plant: Plant; catalog: Catalog; onClose: () => void; onSave: (plant: Plant) => Promise<boolean> }) {
  const uploadInput = useRef<HTMLInputElement>(null);
  const vitrineInput = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState(() => structuredClone(plant));
  const [previewOriginal,setPreviewOriginal] = useState(false);
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [adjusting, setAdjusting] = useState<string | null>(null);
  function update<K extends keyof Plant>(key: K, value: Plant[K]) { setDraft(p => ({ ...p, [key]: value })); setDirty(true); }
  const close = () => { if (!busy && !uploading && (!dirty || window.confirm('Descartar as alterações deste exemplar?'))) onClose(); };
  const addImages = (urls: string[]) => {
    setDraft(p => {
      const images = urls.map(url => ({ id: crypto.randomUUID(), url, anguloTag: angles[0] }));
      return { ...p, galeria: [...p.galeria, ...images], capaId: p.capaId || images[0]?.id || '' };
    }); setDirty(true);
  };
  const upload = async (files: FileList | File[]) => {
    setError('');
    if (draft.galeria.length + files.length > 40) { setError(`Cada exemplar pode ter até 40 fotos. Esta ficha tem ${draft.galeria.length}; escolha no máximo ${40 - draft.galeria.length}.`); return; }
    setUploading(true);
    // One at a time, so a large batch from a phone does not hold every full-size photo in memory at once.
    try { const images: string[] = []; for (const file of Array.from(files)) images.push(await fileToImage(file)); addImages(images); }
    catch (e) { setError(e instanceof Error ? e.message : 'Falha ao carregar imagens.'); }
    finally { setUploading(false); }
  };
  const uploadVitrine = async (file: File) => {
    setError('');
    if (!['image/png', 'image/webp'].includes(file.type)) { setError('A foto de vitrine precisa ser PNG ou WebP com fundo transparente.'); return; }
    setUploading(true);
    try { update('fotoVitrine', await fileToImage(file)); }
    catch (e) { setError(e instanceof Error ? e.message : 'Falha ao carregar a foto de vitrine.'); }
    finally { setUploading(false); }
  };
  const addUrl = () => {
    const value = url.trim();
    if (draft.galeria.length >= 40) { setError('Cada exemplar pode ter até 40 fotos.'); return; }
    if (!/^https?:\/\//i.test(value) || !safeImageUrl(value)) { setError('Informe uma URL completa de imagem http(s).'); return; }
    addImages([value]); setUrl(''); setError('');
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError('');
    const result = plantSchema.safeParse(draft);
    if (!result.success) { setError(result.error.issues.map(i => i.message).join(' ')); return; }
    if (catalog.plants.some(p => p.id !== draft.id && p.codigo.trim().toLowerCase() === draft.codigo.trim().toLowerCase())) { setError('Este código já pertence a outro exemplar.'); return; }
    setBusy(true); try { if (await onSave(result.data)) onClose(); } finally { setBusy(false); }
  };
  const textField = (key: 'codigo' | 'nomePopular' | 'especieCientifica' | 'categoria' | 'idadeEstimada' | 'estilo' | 'ambiente' | 'nivelCuidado' | 'rega', label: string, list?: string) => <label key={key}>{label}<input value={draft[key]} required={['codigo', 'nomePopular', 'categoria'].includes(key)} maxLength={200} list={list} onChange={e => update(key, e.target.value)} placeholder="A confirmar" /></label>;
  const numberField = (key: 'alturaCm' | 'larguraNebariCm' | 'preco', label: string) => <label key={key}>{label}<input type="number" min="0" step="0.01" value={draft[key] ?? ''} onChange={e => update(key, e.target.value === '' ? null : Number(e.target.value))} placeholder={key === 'preco' ? 'Sob consulta' : 'A confirmar'} /></label>;
  return <Modal title="Curadoria do exemplar" onClose={close} wide><form onSubmit={e => void submit(e)} className="editor-form"><div className="editor-heading"><span className="eyebrow">CURADORIA · EDIÇÃO VISUAL</span><h2>{plant.nomePopular ? 'Um novo olhar.' : 'Uma nova história.'}</h2><p>Preencha o que conhece. Os demais dados podem ser adicionados depois.</p></div>
    <fieldset disabled={busy || uploading} className="editor-fieldset"><div className="editor-grid"><div className="gallery-editor">
      <div className="editor-preview">{coverOf(draft) ? <BonsaiPhoto image={coverOf(draft)} name={draft.nomePopular||'Prévia da capa'} framing={draft.framing} open={previewOriginal}/> : <div><ImagePlus size={36} /><span>Adicione a primeira foto</span></div>}<span>{draft.nomePopular || 'Seu próximo exemplar'}<small>{formatPrice(draft.preco)}</small></span></div>
      {coverOf(draft)&&<button type="button" className="button button-outline full photo-compare" onClick={()=>setPreviewOriginal(v=>!v)} aria-pressed={previewOriginal}>{previewOriginal?'Voltar ao enquadramento':'Ver enquadramento aberto'}</button>}
      {coverOf(draft)?.crop ? <p className="small muted">A capa usa um detalhe ampliado da galeria. Escolha a visão geral como capa para ajustar zoom e foco da moldura.</p> : <PhotoControls value={draft.framing} onChange={value=>update('framing',value)}/>}
      <div className="drop-zone" onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); if (!busy && !uploading) void upload(e.dataTransfer.files); }}><Upload size={22} /><strong>{uploading ? 'Lendo imagens…' : 'Arraste fotos ou selecione arquivos'}</strong><span>JPEG, PNG, WebP ou GIF · até 40 MB por foto (GIF até 8 MB)</span><button type="button" className="button button-outline" onClick={()=>uploadInput.current?.click()}>Selecionar fotos</button><input ref={uploadInput} type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif" onChange={e => { if (e.target.files) void upload(e.target.files); e.target.value = ''; }} /></div>
      <div className="url-input"><input type="url" aria-label="URL da imagem" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://…/foto.jpg" /><button type="button" className="icon-button" aria-label="Adicionar foto por URL" onClick={addUrl}><Plus size={20} /></button></div>
      <div className="gallery-list">{draft.galeria.map((img, index) => <div key={img.id} className="gallery-row"><img src={img.url} alt={`Foto ${index + 1}`} /><label><span>Visão {index + 1}</span><select value={img.anguloTag} onChange={e => update('galeria', draft.galeria.map(i => i.id === img.id ? { ...i, anguloTag: e.target.value as typeof img.anguloTag, label: undefined } : i))}>{angles.map(a => <option key={a}>{a}</option>)}</select></label><button type="button" className="icon-button" title="Ajustar foto" aria-label={`Ajustar foto ${index + 1}`} onClick={() => setAdjusting(img.id)}><Crop size={16} /></button><button type="button" className={`icon-button ${draft.capaId === img.id ? 'gold' : ''}`} title="Definir capa" aria-label={`Definir foto ${index + 1} como capa`} aria-pressed={draft.capaId === img.id} onClick={() => update('capaId', img.id)}><Star size={17} fill={draft.capaId === img.id ? 'currentColor' : 'none'} /></button><button type="button" className="icon-button danger" aria-label={`Remover foto ${index + 1}`} onClick={() => { const gallery = draft.galeria.filter(i => i.id !== img.id); setDraft(p => ({ ...p, galeria: gallery, capaId: p.capaId === img.id ? gallery[0]?.id ?? '' : p.capaId })); setDirty(true); }}><Trash2 size={16} /></button></div>)}</div>
      <div className="vitrine-upload"><strong>Foto de vitrine (recortada)</strong><p>Recorte em remove.bg, Photoroom ou Photoshop. Inclua a mão inteira ou nenhuma parte dela.</p>
        {draft.fotoVitrine && <div className="vitrine-preview"><img src={draft.fotoVitrine} alt="Prévia da foto de vitrine" /></div>}
        <div className="vitrine-upload-actions"><button type="button" className="button button-outline" onClick={() => vitrineInput.current?.click()}><ImagePlus size={17} />{draft.fotoVitrine ? 'Trocar recorte' : 'Enviar PNG/WebP'}</button>{draft.fotoVitrine && <button type="button" className="button button-outline" onClick={() => update('fotoVitrine', undefined)}><Trash2 size={16} />Remover</button>}</div>
        <p>Sem recorte, a vitrine mostra a foto real da capa numa moldura em arco. O modal sempre usa só as fotos reais.</p>
        <input ref={vitrineInput} type="file" accept="image/png,image/webp" onChange={e => { const file = e.target.files?.[0]; if (file) void uploadVitrine(file); e.target.value = ''; }} />
      </div>
    </div><div className="editor-fields"><div className="field-grid">{textField('nomePopular', 'Nome popular *')}{textField('codigo', 'Código *')}{textField('especieCientifica', 'Espécie científica', 'species-list')}{textField('categoria', 'Categoria *', 'categories-list')}{textField('idadeEstimada', 'Idade estimada')}{textField('estilo', 'Estilo')}{numberField('alturaCm', 'Altura (cm)')}{numberField('larguraNebariCm', 'Largura do nebari (cm)')}{textField('ambiente', 'Ambiente', 'environments-list')}{textField('nivelCuidado', 'Nível de cuidado', 'care-list')}{textField('rega', 'Orientação de rega')}{(['sol','rega','cuidado'] as const).map(key=><label key={key}>{key==='sol'?'Indicador de sol':key==='rega'?'Indicador de rega':'Indicador de cuidado'}<select value={draft.indicadores?.[key]??''} onChange={e=>update('indicadores',{...draft.indicadores,[key]:e.target.value?Number(e.target.value):undefined})}><option value="">Automático pelo texto</option>{[1,2,3,4,5].map(n=><option key={n} value={n}>{n} / 5</option>)}</select></label>)}{numberField('preco', 'Preço (R$)')}<label>Status<select value={draft.status} onChange={e => update('status', e.target.value as Plant['status'])}>{statuses.map(s => <option key={s} value={s}>{statusLabels[s]}</option>)}</select></label></div><label>História do exemplar<textarea rows={6} maxLength={12000} value={draft.descricao} onChange={e => update('descricao', e.target.value)} placeholder="Conte sobre o cultivo, a ramificação e o vaso…" /></label><p className="muted small">Preço vazio = sob consulta. Novas categorias e espécies serão adicionadas aos filtros ao salvar.</p></div></div></fieldset>
    <datalist id="categories-list">{catalog.categories.map(c => <option key={c} value={c} />)}</datalist><datalist id="species-list">{catalog.species.map(s => <option key={s} value={s} />)}</datalist><datalist id="environments-list"><option>Sol pleno</option><option>Meia-sombra</option></datalist><datalist id="care-list"><option>Iniciante</option><option>Intermediário</option><option>Avançado</option></datalist>
    {error && <p className="form-error" role="alert">{error}</p>}<div className="editor-actions"><button type="button" className="button button-outline" onClick={close} disabled={busy || uploading}>Cancelar</button><button className="button button-gold" type="submit" disabled={busy || uploading}><Save size={17} />{busy ? 'Salvando…' : 'Salvar exemplar'}</button></div>
  </form>{adjusting && (() => { const target = draft.galeria.find(i => i.id === adjusting); return target && <PhotoAdjuster src={target.url} title={`Ajustar foto ${draft.galeria.indexOf(target) + 1}`} onClose={() => setAdjusting(null)} onApply={url => { update('galeria', draft.galeria.map(i => i.id === adjusting ? { ...i, url, crop: undefined } : i)); setAdjusting(null); }} />; })()}</Modal>;
}
