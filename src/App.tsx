import { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion';
import { ArrowUpRight, Camera, Check, Download, Leaf, LockKeyhole, MapPin, Plus, Search, Settings2, SlidersHorizontal, Upload, X, Sprout, Instagram, LogOut, Sun, Moon, Monitor } from 'lucide-react';
import { initialCatalog, newPlant } from './data/initial';
import { buildWhatsappUrl, duplicatePlant, filterPlants, parseBackup, plantFromHash, serializeBackup, MAX_BACKUP_BYTES } from './lib/catalog';
import { downloadFile, fileToImage } from './lib/media';
import { catalogRepository, StaleCatalogError } from './lib/repository';
import { statuses, type Catalog, type Indicators, type Plant, type Settings } from './lib/schema';
import Editable from './components/Editable';
import PlantCard from './components/PlantCard';
import PlantDetail from './components/PlantDetail';
import PlantEditor from './components/PlantEditor';
import SettingsEditor from './components/SettingsEditor';
import Modal from './components/Modal';
import Brand from './components/Brand';
import HeroBenefits from './components/HeroBenefits';
import AcerCanvas from './components/AcerCanvas';
import BonsaiHero3D, { type SpatialStatus } from './components/BonsaiHero3D';
import Biography from './components/Biography';
import { useTheme } from './hooks/useTheme';
import { useScrollReveal } from './hooks/useScrollReveal';
import type { SavePlantField } from './components/PlantInline';

type TextSetting = Exclude<keyof Settings, 'fotoCultivador' | 'bioGallery'>;
type Page = 'home' | 'bio';
const pageOf = (path: string): Page => path.replace(/\/+$/, '') === '/biografia' ? 'bio' : 'home';
const titles: Record<Page, string> = { home: 'Bonsai Daniel Bourscheid', bio: 'Biografia — Bonsai Daniel Bourscheid' };

// `path` comes from the server when the page is prerendered; in the browser it is the current URL.
export default function App({ path: initialPath = '/' }: { path?: string }) {
  const [page, setPage] = useState<Page>(() => pageOf(initialPath));
  const { theme, toggle, reset, automatic } = useTheme();
  useScrollReveal();
  // Client-side pages: links marked data-route change the page without a reload (with a view transition where
  // supported), then scroll to their #section or to the top; the back button returns.
  useEffect(() => {
    const show = (next: Page, hash: string) => {
      const apply = () => flushSync(() => setPage(next));
      if (document.startViewTransition && !matchMedia('(prefers-reduced-motion: reduce)').matches) document.startViewTransition(apply); else apply();
      requestAnimationFrame(() => { const target = hash && document.getElementById(hash.slice(1)); if (target) target.scrollIntoView(); else scrollTo(0, 0); });
    };
    const click = (event: MouseEvent) => {
      const link = (event.target as Element).closest?.<HTMLAnchorElement>('a[data-route]');
      if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey) return;
      const url = new URL(link.href);
      if (url.origin !== location.origin) return;
      event.preventDefault();
      history.pushState(null, '', url.pathname + url.hash);
      show(pageOf(url.pathname), url.hash);
    };
    const back = () => show(pageOf(location.pathname), location.hash);
    document.addEventListener('click', click); addEventListener('popstate', back);
    return () => { document.removeEventListener('click', click); removeEventListener('popstate', back); };
  }, []);
  useEffect(() => { document.title = titles[page]; }, [page]);
  const [catalog, setCatalog] = useState<Catalog>(initialCatalog);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const [stale, setStale] = useState(false);
  const [editing, setEditing] = useState(false);
  const [curationInfo, setCurationInfo] = useState(false);
  const [selected, setSelected] = useState<Plant | null>(null);
  const [editor, setEditor] = useState<Plant | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [species, setSpecies] = useState('');
  const [status, setStatus] = useState('');
  const [moreFilters, setMoreFilters] = useState(false);
  const [toast, setToast] = useState('');
  const [saving, setSaving] = useState(false);
  const [spatial, setSpatial] = useState<SpatialStatus>('loading');
  const [headerHidden, setHeaderHidden] = useState(false);
  const [instantDetail, setInstantDetail] = useState(false);
  const cultivatorInput = useRef<HTMLInputElement>(null);
  const busy = useRef(false);
  const latest = useRef(catalog);
  const importInput = useRef<HTMLInputElement>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const notify = (message: string) => { setToast(message); clearTimeout(noticeTimer.current); noticeTimer.current = setTimeout(() => setToast(''), 6500); };
  useEffect(() => {
    let cancelled = false;
    catalogRepository.load().then(data => {
      if (cancelled) return;
      setCatalog(data); latest.current = data;
      const id = new URLSearchParams(location.search).get('exemplar');
      if (id) { const found = data.plants.find(p => p.id === id); if (found) setSelected(found); else notify('Este exemplar não foi encontrado neste catálogo.'); }
      const fromHash = plantFromHash(data.plants, location.hash);
      if (fromHash) setSelected(fromHash); else if (/^#[a-z]{1,5}-\w/i.test(location.hash) && !document.getElementById(location.hash.slice(1))) notify('Este exemplar não foi encontrado neste catálogo.');
    }).catch(() => { if (!cancelled) { setStorageError(true); notify('Não foi possível ler o catálogo local. Seus dados não serão sobrescritos.'); } }).finally(() => { if (!cancelled) setReady(true); });
    return () => { cancelled = true; clearTimeout(noticeTimer.current); };
  }, []);
  // Plant sheet links (site.com/#DB-001) open the modal, also when the hash changes in place.
  useEffect(() => {
    const open = () => { const found = plantFromHash(latest.current.plants, location.hash); if (found) { setInstantDetail(false); setSelected(found); } };
    addEventListener('hashchange', open);
    return () => removeEventListener('hashchange', open);
  }, []);
  // The header hides while scrolling down and returns on any upward scroll.
  useEffect(() => {
    let last = scrollY;
    const onScroll = () => { const y = scrollY; if (Math.abs(y - last) < 6) return; setHeaderHidden(y > last && y > 140); last = y; };
    addEventListener('scroll', onScroll, { passive: true });
    return () => removeEventListener('scroll', onScroll);
  }, []);
  const commit = async (change: (current: Catalog) => Catalog, message = 'Alterações salvas neste navegador.') => {
    if (busy.current || !ready || storageError || stale) { notify(storageError || stale ? 'Recarregue a página para acessar o catálogo salvo antes de editar.' : 'Aguarde o salvamento atual.'); return false; }
    busy.current = true; setSaving(true);
    try { const next = change(latest.current); await catalogRepository.save(next); latest.current = next; setCatalog(next); notify(message); return true; }
    catch (error) { if (error instanceof StaleCatalogError) { setStale(true); notify(error.message); } else { notify(error instanceof Error && error.message.includes('80 MB') ? error.message : 'Não foi possível salvar. Verifique o espaço do navegador e os dados informados. Nenhuma alteração foi aplicada.'); } return false; }
    finally { busy.current = false; setSaving(false); }
  };
  const openPlant = (plant: Plant, source: HTMLElement | null) => {
    // View Transitions: the card image grows into the first gallery photo. Fallback: the modal's own fade.
    if (!document.startViewTransition || !source || matchMedia('(prefers-reduced-motion: reduce)').matches) { setInstantDetail(false); setSelected(plant); return; }
    source.style.viewTransitionName = 'plant-photo';
    const transition = document.startViewTransition(() => { source.style.viewTransitionName = ''; flushSync(() => { setInstantDetail(true); setSelected(plant); }); });
    transition.finished.finally(() => { source.style.viewTransitionName = ''; });
  };
  const closeDetail = () => {
    setSelected(null);
    if (plantFromHash(latest.current.plants, location.hash)) history.replaceState(null, '', location.pathname + location.search);
  };
  const saveIndicator = (id: string, key: keyof Indicators, value: number) => commit(c => ({ ...c, plants: c.plants.map(p => p.id === id ? { ...p, indicadores: { ...p.indicadores, [key]: value } } : p) }), 'Indicador atualizado.');
  const replaceCultivatorPhoto = async (file: File) => {
    try { const image = await fileToImage(file); await commit(c => ({ ...c, settings: { ...c.settings, fotoCultivador: image } }), 'Foto do cultivador atualizada.'); }
    catch (error) { notify(error instanceof Error ? error.message : 'Não foi possível ler a imagem.'); }
  };
  const addBioPhoto = async (file: File) => {
    try { const url = await fileToImage(file); await commit(c => ({ ...c, settings: { ...c.settings, bioGallery: [...c.settings.bioGallery, { id: crypto.randomUUID(), url, legenda: '' }] } }), 'Foto adicionada à biografia.'); }
    catch (error) { notify(error instanceof Error ? error.message : 'Não foi possível ler a imagem.'); }
  };
  const saveSetting = (key: TextSetting, value: string) => commit(c => ({ ...c, settings: { ...c.settings, [key]: value } }));
  const interest = (plant: Plant) => {
    try { const url = buildWhatsappUrl(plant, catalog.settings, location.origin); window.open(url, '_blank', 'noopener,noreferrer'); }
    catch (error) { notify(error instanceof Error ? error.message : 'Configure o WhatsApp na curadoria.'); }
  };
  const savePlant = (plant: Plant) => commit(c => ({ ...c, plants: c.plants.some(p => p.id === plant.id) ? c.plants.map(p => p.id === plant.id ? plant : p) : [plant, ...c.plants], categories: [...new Set([...c.categories, plant.categoria])], species: [...new Set([...c.species, plant.especieCientifica].filter(Boolean))] }));
  const saveField: SavePlantField = (id, field, value) => {
    if (field === 'preco' && value !== null && (typeof value !== 'number' || !Number.isFinite(value) || value < 0)) { notify('Informe um preço válido ou deixe vazio para sob consulta.'); return Promise.resolve(false); }
    if (field === 'nomePopular' && !String(value).trim()) { notify('Informe o nome do exemplar.'); return Promise.resolve(false); }
    return commit(c => ({ ...c, plants: c.plants.map(p => p.id === id ? { ...p, [field]: value } : p) }));
  };
  const remove = (plant: Plant) => { if (confirm(`Excluir ${plant.nomePopular} (${plant.codigo})? Exporte um backup antes se quiser guardar este cadastro.`)) void commit(c => ({ ...c, plants: c.plants.filter(p => p.id !== plant.id) }), 'Exemplar excluído neste navegador.'); };
  const exportCatalog = () => { try { downloadFile(new Blob([serializeBackup(catalog)], { type: 'application/json' }), `bonsai-catalogo-${new Date().toISOString().slice(0, 10)}.json`); notify('Backup exportado com fotos e configurações.'); } catch (e) { notify(e instanceof Error ? e.message : 'Falha ao exportar backup.'); } };
  const importCatalog = async (file: File) => {
    try {
      if (file.size > MAX_BACKUP_BYTES) throw new Error('Limite de backup: 80 MB.');
      const next = parseBackup(await file.text());
      if (!confirm(`Substituir o catálogo local por ${next.plants.length} exemplar(es) deste backup? Exporte o catálogo atual antes se precisar preservá-lo.`)) return;
      if (await commit(() => next, 'Backup importado com sucesso.')) { setCategory(''); setSpecies(''); setStatus(''); setQuery(''); }
    } catch { notify('Backup inválido. Confira a versão, os campos, os códigos e as imagens. O catálogo atual foi preservado.'); }
  };
  const addTag = (key: 'categories' | 'species') => {
    const label = prompt(key === 'categories' ? 'Nome da nova categoria:' : 'Nome da nova espécie:')?.trim();
    if (label && label.length <= 200) void commit(c => ({ ...c, [key]: [...new Set([...c[key], label])] }));
  };
  const plants = filterPlants(catalog.plants, query, category, species, status);
  const allCategories = [...new Set([...catalog.categories, ...catalog.plants.map(p => p.categoria)])];
  const allSpecies = [...new Set([...catalog.species, ...catalog.plants.map(p => p.especieCientifica)].filter(Boolean))];
  const detailPlant = selected ? catalog.plants.find(p=>p.id===selected.id) ?? selected : null;
  const s = catalog.settings;
  const inline = (key: TextSetting, label: string, multiline = false) => <Editable value={s[key]} editing={editing} onSave={value => saveSetting(key, value)} label={label} multiline={multiline} />;
  return <LayoutGroup><div className={`site ${editing ? 'is-editing' : ''}`}>
    <a className="skip-link" href="#colecao">Ir para a coleção</a>
    <header className={`site-header ${headerHidden ? 'is-hidden' : ''}`}><a href={page === 'home' ? '#inicio' : '/'} data-route={page === 'home' ? undefined : true} className="wordmark" aria-label="Bonsai Daniel Bourscheid, início"><Brand /></a><nav aria-label="Navegação principal">{page === 'home' ? <a href="#colecao">A coleção</a> : <a href="/#colecao" data-route>A coleção</a>}<a href="/biografia" data-route aria-current={page === 'bio' ? 'page' : undefined}>Biografia</a>{page === 'home' ? <a href="#contato">Contato <ArrowUpRight size={13} /></a> : <a href="/#contato" data-route>Contato <ArrowUpRight size={13} /></a>}</nav><div className="header-actions"><button className="theme-toggle icon-button" onClick={toggle} aria-label={theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'} title={theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'}>{theme === 'dark' ? <Sun size={20}/> : <Moon size={20}/>}</button>{!automatic && <button className="icon-button theme-auto" onClick={reset} aria-label="Usar tema do sistema" title="Usar tema do sistema"><Monitor size={16}/></button>}<button className={`curation-toggle ${editing ? 'active' : ''}`} aria-label={editing ? 'Sair da curadoria' : 'Abrir curadoria local'} onClick={() => { if (ready && !storageError) setEditing(v=>!v); }} disabled={!ready}><LockKeyhole size={16} /><span>{editing ? 'Em edição' : 'Curadoria'}</span></button></div></header>
    {page === 'home' ? <main><section className={`hero hero-spatial is-${spatial} section-shell`} id="inicio">{spatial !== 'failed' && <BonsaiHero3D theme={theme} onStatus={setSpatial} />}<div className="hero-stage">{spatial === 'failed' && <><AcerCanvas /><div className="hero-fallback-brand"><Brand hero /></div></>}</div>
      <div className="hero-copy"><div className="eyebrow hero-eyebrow"><span />{inline('heroEyebrow', 'chamada do hero')}</div><h1>{inline('heroTitle', 'título do hero', true)}</h1><p className="hero-description">{inline('heroDescription', 'descrição do hero', true)}</p><a className="button button-gold" href="#colecao">Ver a coleção <ArrowUpRight size={18} /></a><HeroBenefits /></div>

    </section>
    <div className="philosophy-strip"><span>Raízes que contam histórias</span><i>✦</i><span>Formas que inspiram</span><i>✦</i><span>Arte que permanece viva</span></div>
    <section className="collection section-shell" id="colecao"><div className="section-heading"><div><span className="eyebrow">ACERVO VIVO</span><h2>Uma árvore.<br className="mobile-only" /> Infinitas possibilidades.</h2></div><p>Encontre a forma que conversa com você.<br />O próximo capítulo começa aqui.</p></div>
      <div className="catalog-toolbar"><div className="category-filters" role="group" aria-label="Filtrar por categoria"><button className={!category ? 'selected' : ''} onClick={() => setCategory('')} aria-pressed={!category}>Todos os exemplares <span>{catalog.plants.length}</span></button>{allCategories.map(c => <button key={c} className={category === c ? 'selected' : ''} onClick={() => setCategory(c)} aria-pressed={category === c}>{c === 'Exemplar de Coleção / Mestre' ? 'Coleção / Mestre' : c === 'Pré-Bonsai de Engorda' ? 'Pré-bonsai' : c}</button>)}{editing && <button onClick={() => addTag('categories')} aria-label="Criar categoria"><Plus size={15} /></button>}</div><div className="search-row"><label className="search-box"><Search size={17} /><input placeholder="Buscar um exemplar…" aria-label="Buscar exemplares" value={query} onChange={e => setQuery(e.target.value)} />{query && <button className="icon-button" aria-label="Limpar busca" onClick={() => setQuery('')}><X size={14} /></button>}</label><button className={`filter-toggle ${moreFilters ? 'selected' : ''}`} onClick={() => setMoreFilters(v => !v)} aria-expanded={moreFilters}><SlidersHorizontal size={17} />Filtros</button></div></div>
      <AnimatePresence>{moreFilters && <motion.div className="extra-filters" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}><label>Espécie<select value={species} onChange={e => setSpecies(e.target.value)}><option value="">Todas as espécies</option>{allSpecies.map(sp => <option key={sp}>{sp}</option>)}</select></label><label>Disponibilidade<select value={status} onChange={e => setStatus(e.target.value)}><option value="">Todos os estados</option><option value="disponivel">Disponível</option><option value="reservado">Reservado</option><option value="vendido">Vendido</option></select></label>{editing && <button className="button button-outline" onClick={() => addTag('species')}><Plus size={15} />Nova espécie</button>}<button className="text-link" onClick={() => { setQuery(''); setCategory(''); setSpecies(''); setStatus(''); }}>Limpar filtros</button></motion.div>}</AnimatePresence>
      <div className="results-line" aria-live="polite"><span>{!ready ? 'Carregando coleção…' : `${plants.length} exemplar${plants.length === 1 ? '' : 'es'}`}</span><span><i />Cada exemplar é único</span></div>
      {/* Up to four plants each get a wide row of their own (a stage, not a half-empty grid); more become a grid. */}
      <motion.div layout className={`plant-grid tile-grid ${plants.length <= 4 ? 'is-showcase' : ''}`}><AnimatePresence>{editing && <motion.button layout key="add" className="add-card" onClick={() => setEditor(newPlant())}><span><Plus size={28} strokeWidth={1} /></span><h3>Cadastrar novo bonsai</h3><p>Uma nova história para a coleção.</p></motion.button>}{plants.map((plant, index) => <PlantCard key={plant.id} index={index} onSaveField={saveField} plant={plant} editing={editing} onOpen={source => openPlant(plant, source)} onSaveIndicator={(key, value) => void saveIndicator(plant.id, key, value)} onEdit={() => setEditor(plant)} onDuplicate={() => void commit(c => ({ ...c, plants: [duplicatePlant(plant, c.plants), ...c.plants] }), 'Exemplar duplicado. Edite os dados da cópia.')} onStatus={() => void commit(c => ({ ...c, plants: c.plants.map(p => p.id === plant.id ? { ...p, status: statuses[(statuses.indexOf(p.status) + 1) % statuses.length] } : p) }))} onDelete={() => remove(plant)} onInterest={() => interest(plant)} />)}</AnimatePresence></motion.div>
      {ready && !plants.length && <div className="empty-state"><Leaf size={32} /><h3>Nenhum exemplar por aqui.</h3><p>Tente outra busca ou escolha uma categoria diferente.</p><button className="button button-outline" onClick={() => { setQuery(''); setCategory(''); setSpecies(''); setStatus(''); }}>Ver toda a coleção</button></div>}
    </section>
    <section className="cultivator section-shell" id="cultivador"><div className="cultivator-image"><img src={s.fotoCultivador ?? '/images/bonsai_01.jpeg'} alt="Daniel Bourscheid e seu trabalho de cultivo" loading="lazy" />{editing && <div className="cultivator-edit"><button className="button button-outline" onClick={() => cultivatorInput.current?.click()} disabled={saving}><Camera size={16} />Trocar foto do cultivador</button>{s.fotoCultivador && <button className="text-link" onClick={() => void commit(c => { const { fotoCultivador: _removed, ...settings } = c.settings; return { ...c, settings }; }, 'Foto do cultivador restaurada.')}>Restaurar padrão</button>}<input ref={cultivatorInput} type="file" accept="image/jpeg,image/png,image/webp" onChange={e => { const file = e.target.files?.[0]; if (file) void replaceCultivatorPhoto(file); e.target.value = ''; }} /></div>}</div><div className="cultivator-copy"><span className="eyebrow">O CULTIVADOR</span><h2>{inline('bioTitle', 'título da bio', true)}</h2>{(s.bio || editing) && <p>{inline('bio', 'bio do cultivador', true)}</p>}<div className="signature">Daniel Bourscheid</div><a className="button button-outline" href="/biografia" data-route>Conheça a história <ArrowUpRight size={18} /></a></div></section>
    <section className="contact section-shell" id="contato"><span className="eyebrow">UMA CONVERSA, UM COMEÇO</span><h2>Sua próxima história<br />pode criar raízes aqui.</h2><p>Escolha um exemplar e converse sobre as possibilidades.</p><a className="button button-gold" href="#colecao">Ver a coleção <ArrowUpRight size={18} /></a><div className="contact-details">{(s.location || editing) && <div><MapPin size={16} />{inline('location', 'localização')}</div>}{(s.instagram || editing) && <div><Instagram size={16} />{editing ? inline('instagram', 'Instagram') : <a href={`https://www.instagram.com/${encodeURIComponent(s.instagram.replace(/^@/, ''))}/`} target="_blank" rel="noreferrer">@{s.instagram.replace(/^@/, '')}</a>}</div>}{editing && <div><Settings2 size={16} /><button className="text-link" onClick={() => setSettingsOpen(true)}>Configurar WhatsApp e mensagem</button></div>}</div></section>
    </main> : <Biography settings={s} editing={editing} saving={saving} inline={(key, label, multiline) => inline(key, label, multiline)} onAddPhoto={addBioPhoto} onRemovePhoto={id => void commit(c => ({ ...c, settings: { ...c.settings, bioGallery: c.settings.bioGallery.filter(photo => photo.id !== id) } }), 'Foto removida.')} onCaption={(id, legenda) => commit(c => ({ ...c, settings: { ...c.settings, bioGallery: c.settings.bioGallery.map(photo => photo.id === id ? { ...photo, legenda } : photo) } }))} />}<footer className="site-footer"><a href="#inicio" className="wordmark"><Brand /></a><span>© {new Date().getFullYear()} · Cultivando histórias.</span><button className="icon-button" aria-label="Abrir curadoria local" onClick={() => setCurationInfo(true)} disabled={!ready}><LockKeyhole size={15} /></button></footer>
    {(storageError || stale) && <div className="storage-warning" role="alert">{stale ? 'Outra aba atualizou o catálogo. Recarregue esta página antes de editar novamente.' : 'Armazenamento local indisponível. Exibindo o acervo inicial; edição desabilitada.'}</div>}
    <AnimatePresence>{editing && <motion.aside className="admin-dock" aria-label="Barra de curadoria" initial={{ y: 90 }} animate={{ y: 0 }} exit={{ y: 90 }}><div className="dock-status"><span className="editing-dot" /><strong>Modo Edição Ativo</strong><small>{saving ? 'Salvando…' : 'Edição local'}</small></div><div className="dock-actions"><button aria-label="Novo Bonsai" onClick={() => setEditor(newPlant())} disabled={saving}><Plus size={18}/><span>Novo Bonsai</span></button><button title="Configurações de contato" aria-label="Configurações de contato" onClick={() => setSettingsOpen(true)} disabled={saving}><Settings2 size={18} /><span>WhatsApp/Contatos</span></button><button aria-label="Exportar Backup JSON" onClick={exportCatalog} disabled={saving}><Download size={18} /><span>Exportar Backup JSON</span></button><button aria-label="Importar JSON" onClick={() => importInput.current?.click()} disabled={saving}><Upload size={18} /><span>Importar JSON</span></button><button onClick={() => setEditing(false)} aria-label="Sair da edição"><LogOut size={18} /><span>Sair</span></button></div></motion.aside>}</AnimatePresence>
    <input ref={importInput} type="file" accept="application/json,.json" hidden onChange={e => { const file = e.target.files?.[0]; if (file) void importCatalog(file); e.target.value = ''; }} />
    <AnimatePresence>{detailPlant && <PlantDetail key={detailPlant.id} plant={detailPlant} editing={editing} instant={instantDetail} onSaveField={saveField} onSaveIndicator={(key, value) => void saveIndicator(detailPlant.id, key, value)} onEditGallery={() => { setEditor(detailPlant);setSelected(null); }} onClose={closeDetail} onInterest={() => interest(detailPlant)} notify={notify} />}{editor && <PlantEditor key={editor.id} plant={editor} catalog={catalog} onClose={() => setEditor(null)} onSave={savePlant} />}{settingsOpen && <SettingsEditor settings={s} onClose={() => setSettingsOpen(false)} onSave={settings => commit(c => ({ ...c, settings }))} />}{curationInfo && <Modal title="Curadoria local" onClose={() => setCurationInfo(false)}><div className="curation-intro"><span className="round-icon"><LockKeyhole size={25} /></span><span className="eyebrow">SEU ESPAÇO DE CULTIVO</span><h2>A coleção,<br />do seu jeito.</h2><p>Edite textos, cadastre exemplares e organize as fotos diretamente na página.</p><div className="local-notice"><strong>Nesta versão, a curadoria é local.</strong><p>As alterações ficam somente neste navegador. Elas não são publicadas para outros visitantes. Exporte um backup para preservar ou transferir seu catálogo. Este acesso não é um login protegido.</p></div><button className="button button-gold full" disabled={storageError || !ready} onClick={() => { setCurationInfo(false); setEditing(true); }}>Ativar edição visual <ArrowUpRight size={18} /></button></div></Modal>}</AnimatePresence>
    <AnimatePresence>{toast && <motion.div className="toast" role="status" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}><Check size={17} /><span>{toast}</span><button className="icon-button" aria-label="Fechar aviso" onClick={() => setToast('')}><X size={16} /></button></motion.div>}</AnimatePresence>
  </div></LayoutGroup>;
}
