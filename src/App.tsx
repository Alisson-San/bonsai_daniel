import { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion';
import { ArrowUpRight, Camera, Check, Download, LayoutGrid, Leaf, LockKeyhole, MapPin, Plus, Rows3, Search, Settings2, Tags, Upload, X, Instagram, LogOut, Sun, Moon } from 'lucide-react';
import { initialCatalog, newPlant } from './data/initial';
import { buildWhatsappUrl, duplicatePlant, filterPlants, parseBackup, plantFromHash, serializeBackup, MAX_BACKUP_BYTES } from './lib/catalog';
import { downloadFile, fileToImage } from './lib/media';
import { StaleCatalogError } from './lib/repository';
import { createRemoteRepository, NotAdminError, PhotoUploadError } from './lib/remoteRepository';
import { supabase } from './lib/supabase';
import CurationAccess, { type AccessMode } from './components/CurationAccess';
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
import { PurchaseSteps, SoldShowcase, Testimonials } from './components/HomeSections';
import { PersonalCollection } from './components/PersonalCollection';
import Awards from './components/Awards';
import TagManager from './components/TagManager';
import CategoryRope from './components/CategoryRope';
import { tagsOf, type TagKind } from './lib/tags';
import { useTheme } from './hooks/useTheme';
import { useScrollReveal } from './hooks/useScrollReveal';
import { useButtonFlourish } from './hooks/useButtonFlourish';
import BranchNav from './components/BranchNav';
import type { SavePlantField } from './components/PlantInline';
import SectionMark from './components/SectionMark';

// The catalog is read from and saved to Supabase (see lib/remoteRepository.ts).
const catalogRepository = createRemoteRepository();
type TextSetting = Exclude<keyof Settings, 'fotoCultivador' | 'bioGallery'>;
type Page = 'home' | 'bio';
const pageOf = (path: string): Page => path.replace(/\/+$/, '') === '/biografia' ? 'bio' : 'home';
const titles: Record<Page, string> = { home: 'Bonsai Daniel Bourscheid', bio: 'Biografia — Bonsai Daniel Bourscheid' };

// `path` comes from the server when the page is prerendered; in the browser it is the current URL.
export default function App({ path: initialPath = '/', catalog: preloaded }: { path?: string; catalog?: Catalog }) {
  const [page, setPage] = useState<Page>(() => pageOf(initialPath));
  const { theme, toggle } = useTheme();
  useScrollReveal();
  useButtonFlourish();
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
  // Home: scroll progress through the hero emblem (0 at the top, 1 once it has passed under the header) drives the
  // hand-off from the 3D emblem to the header logo (--hero-p, see system.css).
  useEffect(() => {
    if (page !== 'home') return;
    let frame = 0;
    const update = () => { frame = 0; const stage = document.querySelector('.hero-stage'); const height = stage ? stage.getBoundingClientRect().height : innerHeight * .6; document.documentElement.style.setProperty('--hero-p', Math.min(1, Math.max(0, scrollY / Math.max(1, height * .8))).toFixed(3)); };
    const schedule = () => { frame ||= requestAnimationFrame(update); };
    update(); addEventListener('scroll', schedule, { passive: true }); addEventListener('resize', schedule);
    return () => { cancelAnimationFrame(frame); removeEventListener('scroll', schedule); removeEventListener('resize', schedule); };
  }, [page]);
  const [catalog, setCatalog] = useState<Catalog>(preloaded ?? initialCatalog);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const [stale, setStale] = useState(false);
  const [editing, setEditing] = useState(false);
  // Open sign-in dialog for the curation (null: closed).
  const [access, setAccess] = useState<AccessMode | null>(null);
  const [selected, setSelected] = useState<Plant | null>(null);
  const [editor, setEditor] = useState<Plant | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [species, setSpecies] = useState('');
  const [status, setStatus] = useState('');
  const [moreFilters, setMoreFilters] = useState(false);
  const [tagManager, setTagManager] = useState<TagKind | null>(null);
  // "detalhada" (large cards) or "blocos" (dense grid); remembered per browser, read after hydration.
  const [view, setView] = useState<'detalhada' | 'blocos'>('detalhada');
  useEffect(() => { try { if (localStorage.getItem('catalog-view') === 'blocos') setView('blocos'); } catch { /* storage blocked */ } }, []);
  const chooseView = (next: typeof view) => { setView(next); try { localStorage.setItem('catalog-view', next); } catch { /* storage blocked */ } };
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
    }).catch(() => { if (!cancelled) { setStorageError(true); notify('Não foi possível carregar o catálogo agora. A edição fica desativada até recarregar a página.'); } }).finally(() => { if (!cancelled) setReady(true); });
    return () => { cancelled = true; clearTimeout(noticeTimer.current); };
  }, []);
  // Back from an e-mail link (invitation or password reset): the Supabase client reads the session from the URL, then
  // the sign-in dialog asks for the password (invite, recovery) or goes straight into the curation.
  useEffect(() => {
    const hash = location.hash, query = location.search;
    if (!/access_token|type=(recovery|invite)/.test(hash) && !/[?&]code=/.test(query)) return;
    void supabase().then(db => {
      db.auth.onAuthStateChange(event => { if (event === 'PASSWORD_RECOVERY') setAccess('nova-senha'); });
      setAccess(current => current ?? (/type=(recovery|invite)/.test(hash) ? 'nova-senha' : 'entrar'));
    });
  }, []);
  // Plant sheet links (site.com/#DB-001) open the modal, also when the hash changes in place.
  useEffect(() => {
    const open = () => { const found = plantFromHash(latest.current.plants, location.hash); if (found) { setInstantDetail(false); setSelected(found); } };
    addEventListener('hashchange', open);
    return () => removeEventListener('hashchange', open);
  }, []);
  // The header hides while scrolling down (on the home page only past the hero, so the logo hand-off stays in view)
  // and returns on any upward scroll.
  useEffect(() => {
    let last = scrollY;
    const onScroll = () => { const y = scrollY; if (Math.abs(y - last) < 6) return; setHeaderHidden(y > last && y > (document.querySelector('.is-home .hero') ? innerHeight * 1.1 : 140)); last = y; };
    addEventListener('scroll', onScroll, { passive: true });
    return () => removeEventListener('scroll', onScroll);
  }, []);
  const commit = async (change: (current: Catalog) => Catalog, message = 'Alterações publicadas.') => {
    if (busy.current || !ready || storageError || stale) { notify(storageError || stale ? 'Recarregue a página para acessar o catálogo salvo antes de editar.' : 'Aguarde o salvamento atual.'); return false; }
    busy.current = true; setSaving(true);
    try { const next = change(latest.current); const saved = await catalogRepository.save(next) ?? next; latest.current = saved; setCatalog(saved); notify(message); return true; }
    catch (error) { if (error instanceof StaleCatalogError) { setStale(true); notify(error.message); } else if (error instanceof NotAdminError) { setEditing(false); setAccess('entrar'); notify(error.message); } else if (error instanceof PhotoUploadError) { notify(error.message); } else { notify(error instanceof Error && error.message.includes('80 MB') ? error.message : 'Não foi possível salvar. Verifique a conexão e os dados informados. Nenhuma alteração foi aplicada.'); } return false; }
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
  // Leaving the curation ends the session, so the next visit to the lock asks for the password again.
  const signOut = async () => {
    setEditing(false);
    try { await (await supabase()).auth.signOut(); notify('Você saiu da curadoria.'); } catch { notify('Saiu da edição; não foi possível encerrar a sessão agora.'); }
  };
  const awardsSection = (limit?: number) => <Awards feature={!limit} awards={catalog.awards} editing={editing} saving={saving} limit={limit} onSave={award => commit(c => ({ ...c, awards: c.awards.some(item => item.id === award.id) ? c.awards.map(item => item.id === award.id ? award : item) : [award, ...c.awards] }), 'Registro salvo.')} onDelete={award => { if (confirm(`Excluir "${award.titulo}"?`)) void commit(c => ({ ...c, awards: c.awards.filter(item => item.id !== award.id) }), 'Registro excluído.'); }} />;
  const personalSection = (limit?: number) => <PersonalCollection feature={!limit} limit={limit} trees={catalog.personal} editing={editing} saving={saving} notify={notify} onSave={tree => commit(c => ({ ...c, personal: c.personal.some(t => t.id === tree.id) ? c.personal.map(t => t.id === tree.id ? tree : t) : [tree, ...c.personal] }), 'Árvore da coleção pessoal salva.')} onDelete={tree => { if (confirm(`Excluir ${tree.nome} da coleção pessoal?`)) void commit(c => ({ ...c, personal: c.personal.filter(t => t.id !== tree.id) }), 'Árvore removida da coleção pessoal.'); }} />;
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
      if (!confirm(`Substituir o catálogo publicado por ${next.plants.length} exemplar(es) deste backup? Exporte o catálogo atual antes se precisar preservá-lo.`)) return;
      if (await commit(() => next, 'Backup importado com sucesso.')) { setCategory(''); setSpecies(''); setStatus(''); setQuery(''); }
    } catch { notify('Backup inválido. Confira a versão, os campos, os códigos e as imagens. O catálogo atual foi preservado.'); }
  };
  // A renamed or removed tag must not stay selected as a filter.
  const saveTags = async (change: (current: Catalog) => Catalog, message: string) => {
    const ok = await commit(change, message);
    if (ok) { if (category && !tagsOf(latest.current, 'categories').includes(category)) setCategory(''); if (species && !tagsOf(latest.current, 'species').includes(species)) setSpecies(''); }
    return ok;
  };
  const plants = filterPlants(catalog.plants, query, category, species, status);
  // Sold plants gather in their own section; the curator and the "Vendido" filter still see them in the collection.
  const listed = editing || status === 'vendido' ? plants : plants.filter(p => p.status !== 'vendido');
  const sold = catalog.plants.filter(p => p.status === 'vendido');
  const allCategories = tagsOf(catalog, 'categories');
  const allSpecies = tagsOf(catalog, 'species');
  const categoryCounts = Object.fromEntries(allCategories.map(c => [c, catalog.plants.filter(p => p.categoria === c && (editing || p.status !== 'vendido')).length]));
  const detailPlant = selected ? catalog.plants.find(p=>p.id===selected.id) ?? selected : null;
  const s = catalog.settings;
  const inline = (key: TextSetting, label: string, multiline = false) => <Editable value={s[key]} editing={editing} onSave={value => saveSetting(key, value)} label={label} multiline={multiline} />;
  return <LayoutGroup><div className={`site ${editing ? 'is-editing' : ''} ${page === 'home' ? 'is-home' : ''}`}>
    <a className="skip-link" href="#colecao">Ir para a coleção</a>
    <header className={`site-header ${headerHidden ? 'is-hidden' : ''}`}><a href={page === 'home' ? '#inicio' : '/'} data-route={page === 'home' ? undefined : true} className="wordmark" aria-label="Bonsai Daniel Bourscheid, início"><Brand /></a><nav aria-label="Navegação principal">{page === 'home' ? <a href="#colecao">A coleção</a> : <a href="/#colecao" data-route>A coleção</a>}<a href="/biografia" data-route aria-current={page === 'bio' ? 'page' : undefined}>Biografia</a>{page === 'home' ? <a href="#contato">Contato <ArrowUpRight size={13} /></a> : <a href="/#contato" data-route>Contato <ArrowUpRight size={13} /></a>}</nav><div className="header-actions"><button className="theme-toggle icon-button" onClick={toggle} aria-label={theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'} title={theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'}>{theme === 'dark' ? <Sun size={20}/> : <Moon size={20}/>}</button><button className={`curation-toggle ${editing ? 'active' : ''}`} aria-label={editing ? 'Sair da curadoria' : 'Abrir curadoria local'} onClick={() => { if (editing) void signOut(); else if (ready && !storageError) setAccess('entrar'); }} disabled={!ready}><LockKeyhole size={16} /><span>{editing ? 'Em edição' : 'Curadoria'}</span></button></div></header>
    {page === 'home' ? <main><BranchNav /><section className={`hero hero-spatial is-${spatial} section-shell`} id="inicio">{spatial !== 'failed' && <BonsaiHero3D theme={theme} onStatus={setSpatial} />}<div className="hero-stage">{spatial === 'failed' && <><AcerCanvas /><div className="hero-fallback-brand"><Brand hero /></div></>}</div>
      <div className="hero-copy"><div className="eyebrow hero-eyebrow"><span />{inline('heroEyebrow', 'chamada do hero')}</div><h1>{inline('heroTitle', 'título do hero', true)}</h1><p className="hero-description">{inline('heroDescription', 'descrição do hero', true)}</p><a className="button button-gold" href="#colecao">Ver a coleção <ArrowUpRight size={18} /></a><HeroBenefits /></div>

    </section>
    <div className="philosophy-strip"><span>Raízes que contam histórias</span><i>✦</i><span>Formas que inspiram</span><i>✦</i><span>Arte que permanece viva</span></div>
    <section className="collection section-shell" id="colecao"><div className="section-heading"><div><SectionMark label="ACERVO VIVO" /><h2>Uma árvore.<br className="mobile-only" /> Infinitas possibilidades.</h2></div><p>Encontre a forma que conversa com você.<br />O próximo capítulo começa aqui.</p></div>
      <div className="catalog-toolbar"><CategoryRope categories={allCategories} selected={category} total={editing ? catalog.plants.length : catalog.plants.length - sold.length} counts={categoryCounts} editing={editing} onSelect={setCategory} onManage={() => setTagManager('categories')} /><div className="search-row"><label className="search-box"><Search size={17} strokeWidth={1.4} /><input placeholder="Procurar por nome, espécie ou código" aria-label="Buscar exemplares" value={query} onChange={e => setQuery(e.target.value)} />{query && <button className="icon-button" aria-label="Limpar busca" onClick={() => setQuery('')}><X size={14} /></button>}<span className="brush-line" aria-hidden="true" /></label><button className={`filter-toggle ${moreFilters ? 'selected' : ''}`} onClick={() => setMoreFilters(v => !v)} aria-expanded={moreFilters}><span className="filter-toggle-icon" aria-hidden="true" />Refinar</button></div></div>
      <AnimatePresence>{moreFilters && <motion.div className="extra-filters" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}><label>Espécie<select value={species} onChange={e => setSpecies(e.target.value)}><option value="">Todas as espécies</option>{allSpecies.map(sp => <option key={sp}>{sp}</option>)}</select></label><label>Disponibilidade<select value={status} onChange={e => setStatus(e.target.value)}><option value="">Todos os estados</option><option value="disponivel">Disponível</option><option value="reservado">Reservado</option><option value="vendido">Vendido</option></select></label>{editing && <button className="button button-outline" onClick={() => setTagManager('species')}><Tags size={15} />Gerenciar espécies</button>}<button className="text-link" onClick={() => { setQuery(''); setCategory(''); setSpecies(''); setStatus(''); }}>Limpar filtros</button></motion.div>}</AnimatePresence>
      <div className="results-line"><p className="results-count" aria-live="polite">{!ready ? 'Carregando coleção…' : <><strong>{listed.length}</strong>{listed.length === 1 ? ' exemplar' : ' exemplares'}<em>cada um, único</em></>}</p><span className="view-toggle" role="group" aria-label="Visualização do catálogo">{([['detalhada', 'Detalhada', Rows3], ['blocos', 'Blocos', LayoutGrid]] as const).map(([value, label, Icon]) => <button key={value} className={view === value ? 'selected' : ''} aria-pressed={view === value} onClick={() => chooseView(value)}><span className="enso-mark" aria-hidden="true"><svg className="enso" viewBox="0 0 40 40"><circle cx="20" cy="20" r="16" /></svg><Icon size={15} strokeWidth={1.5} /></span><span>{label}</span></button>)}</span></div>
      {/* Up to four plants each get a wide row of their own (a stage, not a half-empty grid); more become a grid. */}
      <motion.div layout className={`plant-grid tile-grid ${view === 'blocos' ? 'is-compact' : listed.length <= 4 ? 'is-showcase' : ''}`}><AnimatePresence>{editing && <motion.button layout key="add" className="add-card" onClick={() => setEditor(newPlant())}><span><Plus size={28} strokeWidth={1} /></span><h3>Cadastrar novo bonsai</h3><p>Uma nova história para a coleção.</p></motion.button>}{listed.map((plant, index) => <PlantCard key={plant.id} index={index} compact={view === 'blocos'} onSaveField={saveField} plant={plant} editing={editing} onOpen={source => openPlant(plant, source)} onSaveIndicator={(key, value) => void saveIndicator(plant.id, key, value)} onEdit={() => setEditor(plant)} onDuplicate={() => void commit(c => ({ ...c, plants: [duplicatePlant(plant, c.plants), ...c.plants] }), 'Exemplar duplicado. Edite os dados da cópia.')} onStatus={() => void commit(c => ({ ...c, plants: c.plants.map(p => p.id === plant.id ? { ...p, status: statuses[(statuses.indexOf(p.status) + 1) % statuses.length] } : p) }))} onDelete={() => remove(plant)} onInterest={() => interest(plant)} />)}</AnimatePresence></motion.div>
      {ready && !listed.length && <div className="empty-state"><Leaf size={32} /><h3>Nenhum exemplar por aqui.</h3><p>Tente outra busca ou escolha uma categoria diferente.</p><button className="button button-outline" onClick={() => { setQuery(''); setCategory(''); setSpecies(''); setStatus(''); }}>Ver toda a coleção</button></div>}
    </section>
    <PurchaseSteps text={s.purchaseSteps} editing={editing} saving={saving} onSave={value => saveSetting('purchaseSteps', value)} />
    <section className="cultivator section-shell" id="cultivador"><div className="cultivator-image"><img src={s.fotoCultivador ?? '/images/bonsai_01.jpeg'} alt="Daniel Bourscheid e seu trabalho de cultivo" loading="lazy" />{editing && <div className="cultivator-edit"><button className="button button-outline" onClick={() => cultivatorInput.current?.click()} disabled={saving}><Camera size={16} />Trocar foto do cultivador</button>{s.fotoCultivador && <button className="text-link" onClick={() => void commit(c => { const { fotoCultivador: _removed, ...settings } = c.settings; return { ...c, settings }; }, 'Foto do cultivador restaurada.')}>Restaurar padrão</button>}<input ref={cultivatorInput} type="file" accept="image/jpeg,image/png,image/webp" onChange={e => { const file = e.target.files?.[0]; if (file) void replaceCultivatorPhoto(file); e.target.value = ''; }} /></div>}</div><div className="cultivator-copy"><SectionMark label="O CULTIVADOR" /><h2>{inline('bioTitle', 'título da bio', true)}</h2>{(s.bio || editing) && <p>{inline('bio', 'bio do cultivador', true)}</p>}<div className="signature">Daniel Bourscheid</div><a className="button button-outline" href="/biografia" data-route>Conheça a história <ArrowUpRight size={18} /></a></div></section>
    {personalSection(4)}
    {awardsSection(3)}
    {!editing && <SoldShowcase plants={sold} onOpen={plant => openPlant(plant, null)} />}
    <Testimonials text={s.testimonials} editing={editing} saving={saving} onSave={value => saveSetting('testimonials', value)} />
    <section className="contact section-shell" id="contato"><SectionMark label="UMA CONVERSA, UM COMEÇO" /><h2>Sua próxima história<br />pode criar raízes aqui.</h2><p>Escolha um exemplar e converse sobre as possibilidades.</p><a className="button button-gold" href="#colecao">Ver a coleção <ArrowUpRight size={18} /></a><div className="contact-details">{(s.location || editing) && <div><MapPin size={16} />{inline('location', 'localização')}</div>}{(s.instagram || editing) && <div><Instagram size={16} />{editing ? inline('instagram', 'Instagram') : <a href={`https://www.instagram.com/${encodeURIComponent(s.instagram.replace(/^@/, ''))}/`} target="_blank" rel="noreferrer">@{s.instagram.replace(/^@/, '')}</a>}</div>}{editing && <div><Settings2 size={16} /><button className="text-link" onClick={() => setSettingsOpen(true)}>Configurar WhatsApp e mensagem</button></div>}</div></section>
    </main> : <Biography settings={s} editing={editing} saving={saving} personal={personalSection()} awards={awardsSection()} inline={(key, label, multiline) => inline(key, label, multiline)} onSaveList={saveSetting} />}<footer className="site-footer"><a href="#inicio" className="wordmark"><Brand /></a><span>© {new Date().getFullYear()} · Cultivando histórias.</span><button className="icon-button" aria-label="Abrir curadoria local" onClick={() => setAccess('entrar')} disabled={!ready}><LockKeyhole size={15} /></button></footer>
    {(storageError || stale) && <div className="storage-warning" role="alert">{stale ? 'O catálogo foi atualizado em outra aba ou aparelho. Recarregue esta página antes de editar novamente.' : 'Catálogo indisponível no momento. Exibindo o acervo inicial; edição desabilitada.'}</div>}
    <AnimatePresence>{editing && <motion.aside className="admin-dock" aria-label="Barra de curadoria" initial={{ y: 90 }} animate={{ y: 0 }} exit={{ y: 90 }}><div className="dock-status"><span className="editing-dot" /><strong>Modo Edição Ativo</strong><small>{saving ? 'Salvando…' : 'Publicado ao salvar'}</small></div><div className="dock-actions"><button aria-label="Novo Bonsai" onClick={() => setEditor(newPlant())} disabled={saving}><Plus size={18}/><span>Novo Bonsai</span></button><button title="Configurações de contato" aria-label="Configurações de contato" onClick={() => setSettingsOpen(true)} disabled={saving}><Settings2 size={18} /><span>WhatsApp/Contatos</span></button><button aria-label="Exportar Backup JSON" onClick={exportCatalog} disabled={saving}><Download size={18} /><span>Exportar Backup JSON</span></button><button aria-label="Importar JSON" onClick={() => importInput.current?.click()} disabled={saving}><Upload size={18} /><span>Importar JSON</span></button><button onClick={() => void signOut()} aria-label="Sair da curadoria e encerrar a sessão"><LogOut size={18} /><span>Sair</span></button></div></motion.aside>}</AnimatePresence>
    <input ref={importInput} type="file" accept="application/json,.json" hidden onChange={e => { const file = e.target.files?.[0]; if (file) void importCatalog(file); e.target.value = ''; }} />
    <AnimatePresence>{detailPlant && <PlantDetail key={detailPlant.id} plant={detailPlant} editing={editing} instant={instantDetail} onSaveField={saveField} onSaveIndicator={(key, value) => void saveIndicator(detailPlant.id, key, value)} onEditGallery={() => { setEditor(detailPlant);setSelected(null); }} onClose={closeDetail} onInterest={() => interest(detailPlant)} notify={notify} />}{editor && <PlantEditor key={editor.id} plant={editor} catalog={catalog} onClose={() => setEditor(null)} onSave={savePlant} />}{tagManager && <TagManager key={tagManager} kind={tagManager} catalog={catalog} saving={saving} onClose={() => setTagManager(null)} onSave={saveTags} />}{settingsOpen && <SettingsEditor settings={s} onClose={() => setSettingsOpen(false)} onSave={settings => commit(c => ({ ...c, settings }))} />}{access && <CurationAccess mode={access} onClose={() => setAccess(null)} onEnter={() => { setAccess(null); if (ready && !storageError) setEditing(true); }} notify={notify} />}</AnimatePresence>
    <AnimatePresence>{toast && <motion.div className="toast" role="status" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}><Check size={17} /><span>{toast}</span><button className="icon-button" aria-label="Fechar aviso" onClick={() => setToast('')}><X size={16} /></button></motion.div>}</AnimatePresence>
  </div></LayoutGroup>;
}
