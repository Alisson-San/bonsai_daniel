import { useRef, type PointerEvent } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import { ArrowUpRight, Copy, Pencil, Trash2, RefreshCw } from 'lucide-react';
import { coverOf, formatPrice, indicatorsOf, rawPhotosOf } from '../lib/catalog';
import { statusLabels, type Indicators as Levels, type Plant } from '../lib/schema';
import PlantInline, { type SavePlantField } from './PlantInline';
import Indicators from './Indicators';
import WhatsAppIcon from './WhatsAppIcon';

type Props = { plant: Plant; index: number; editing: boolean; compact?: boolean; onOpen: (source: HTMLElement | null) => void; onEdit: () => void; onDuplicate: () => void; onStatus: () => void; onDelete: () => void; onInterest: () => void; onSaveField: SavePlantField; onSaveIndicator: (key: keyof Levels, value: number) => void };

// With a cut-out showcase photo the plant stands on a stage; otherwise the real photo sits in a rounded frame, untouched.
// The card shows only what decides a visit: name, a few facts, price and one action. Ratings live in the detail sheet.
// `compact` (the "Blocos" view): the real photo, name, price and the two actions, in a denser grid.
export default function PlantCard({ plant, index, editing, compact = false, onOpen, onEdit, onDuplicate, onStatus, onDelete, onInterest, onSaveField, onSaveIndicator }: Props) {
 const reduced = useReducedMotion();
 const visual = useRef<HTMLDivElement>(null);
 // The photo opens up from a smaller window as it scrolls into view.
 const inView = useInView(visual, { once: true, amount: .25 });
 const cover = coverOf(plant);
 const secondary = rawPhotosOf(plant).find(image => image.url !== cover.url);
 const tilt = (event: PointerEvent<HTMLDivElement>) => {
  if (event.pointerType !== 'mouse' || reduced) return;
  const box = event.currentTarget.getBoundingClientRect(), x = (event.clientX - box.left) / box.width - .5, y = (event.clientY - box.top) / box.height - .5;
  event.currentTarget.style.setProperty('--rx', `${(-y * 20).toFixed(2)}deg`);
  event.currentTarget.style.setProperty('--ry', `${(x * 20).toFixed(2)}deg`);
 };
 const center = (event: PointerEvent<HTMLDivElement>) => { event.currentTarget.style.removeProperty('--rx'); event.currentTarget.style.removeProperty('--ry'); };
 const open = () => onOpen(visual.current?.querySelector<HTMLElement>('.vitrine-plant>img, .arch-frame>img') ?? null);
 const facts = [
  plant.idadeEstimada && plant.idadeEstimada.replace(/^~\s*/, ''),
  plant.alturaCm !== null && `${plant.alturaCm} cm de altura`,
  plant.larguraNebariCm !== null && `nebari de ${plant.larguraNebariCm} cm`,
 ].filter(Boolean) as string[];
 return <motion.article layout className={`plant-tile status-${plant.status}`} initial={reduced ? false : { opacity: 0, y: 32 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .12 }} transition={{ delay: Math.min(index % 3 * .12, .24), type: 'spring', stiffness: 300, damping: 30 }} exit={{ opacity: 0, scale: .96 }}>
  <div className={`tile-visual ${inView || reduced ? 'is-in' : ''}`} ref={visual}>
   {plant.fotoVitrine && !compact
    ? <div className="vitrine-stage" onPointerMove={tilt} onPointerLeave={center}>
      <div className="vitrine-rig">
       <span className="vitrine-ring" aria-hidden="true" />
       <span className="vitrine-contact" aria-hidden="true" />
       <button className="vitrine-plant" onClick={open} aria-label={`Ver ficha e fotos reais de ${plant.nomePopular}`}><img src={plant.fotoVitrine} loading="lazy" decoding="async" alt={plant.nomePopular} draggable={false} /></button>
      </div>
     </div>
    : <button className="arch-frame" onClick={open} aria-label={`Ver ficha e fotos reais de ${plant.nomePopular}`}>
      <img src={cover.url} alt={plant.nomePopular} loading="lazy" decoding="async" style={{ objectPosition: `${(plant.framing?.focusX ?? .5) * 100}% 58%` }} draggable={false} />
      {secondary && <img className="arch-secondary" src={secondary.url} alt="" loading="lazy" decoding="async" draggable={false} />}
     </button>}
   <span className={`status status-${plant.status}`}><i />{statusLabels[plant.status]}</span>
   {editing && <div className="card-admin"><button className="icon-button" aria-label={`Editar ${plant.codigo}`} onClick={onEdit}><Pencil size={15} /></button><button className="icon-button" aria-label={`Duplicar ${plant.codigo}`} onClick={onDuplicate}><Copy size={15} /></button><button className="icon-button" aria-label={`Alternar status de ${plant.codigo}`} onClick={onStatus}><RefreshCw size={15} /></button><button className="icon-button danger" aria-label={`Excluir ${plant.codigo}`} onClick={onDelete}><Trash2 size={15} /></button></div>}
  </div>
  <div className="tile-body">
   <span className="eyebrow"><span>{plant.categoria}</span><span className="tile-code">{plant.codigo}</span></span>
   <h3 className="card-heading"><PlantInline plant={plant} field="nomePopular" editing={editing} onSave={onSaveField} /></h3>
   <p className="scientific"><PlantInline plant={plant} field="especieCientifica" editing={editing} onSave={onSaveField} /></p>
   {!compact && (plant.descricao || editing) && <p className="card-description"><PlantInline plant={plant} field="descricao" editing={editing} onSave={onSaveField} /></p>}
   {facts.length > 0 && <p className="tile-facts">{(compact ? facts.slice(0, 2) : facts).join(' · ')}</p>}
   {editing && !compact && <Indicators levels={indicatorsOf(plant)} editing={editing} onChange={onSaveIndicator} />}
   <p className="tile-price">{editing ? <PlantInline plant={plant} field="preco" editing={editing} onSave={onSaveField} /> : formatPrice(plant.preco)}</p>
   <div className="tile-actions"><button className="button whatsapp-button" disabled={plant.status === 'vendido'} aria-label={`Tenho interesse em ${plant.codigo}, abrir WhatsApp`} onClick={onInterest}><WhatsAppIcon /><span>{plant.status === 'vendido' ? (compact ? 'Vendido' : 'Exemplar vendido') : (compact ? 'Interesse' : 'Tenho interesse')}</span></button><button className="text-link tile-details" onClick={open}>{compact ? 'Detalhes' : 'Ver detalhes'}<ArrowUpRight size={16} /></button></div>
  </div>
 </motion.article>;
}
