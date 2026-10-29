import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight, Hand, Share2, Download, Check, Sun, Sprout, Ruler, ZoomIn, ZoomOut, Images, Camera } from 'lucide-react';
import Modal from './Modal';
import RawPhoto from './RawPhoto';
import ScaleComparator from './ScaleComparator';
import PlantInline, { type SavePlantField } from './PlantInline';
import WhatsAppIcon from './WhatsAppIcon';
import { formatPrice, indicatorsOf, plantLink, publicPlantLink, rawPhotosOf } from '../lib/catalog';
import Indicators from './Indicators';
import { downloadFile, preparePhoto } from '../lib/media';
import { statusLabels, type Indicators as Levels, type Plant } from '../lib/schema';

export default function PlantDetail({ plant, onClose, onInterest, notify, editing, onSaveField, onSaveIndicator, onEditGallery, instant = false }: { plant: Plant; editing: boolean; instant?: boolean; onSaveField: SavePlantField; onSaveIndicator: (key: keyof Levels, value: number) => void; onEditGallery: () => void; onClose: () => void; onInterest: () => void; notify: (text: string) => void }) {
  const photos = rawPhotosOf(plant);
  const [zoom, setZoom] = useState(false);
  const [imageId, setImageId] = useState(() => photos[0].id);
  const [photo, setPhoto] = useState<File | null>(null);
  const [fallback, setFallback] = useState(false);
  const selected = photos.find(i => i.id === imageId) ?? photos[0];
  const scale = photos.find(i => i.anguloTag === 'Escala Real (Comparação Humana)');
  const publicUrl = plantLink(plant, location.origin);
  const published = publicPlantLink(plant, location.origin);
  const shareText = `${plant.nomePopular} · ${plant.codigo} · ${formatPrice(plant.preco)}`;
  useEffect(() => { let cancelled = false; preparePhoto(plant).then(file => { if (!cancelled) setPhoto(file); }).catch(() => {}); return () => { cancelled = true; }; }, [plant]);
  const share = async () => {
    const text = publicUrl ? `${shareText}\n${publicUrl}` : shareText;
    try {
      if (photo && navigator.canShare?.({ files: [photo] }) && navigator.share) {
        await navigator.share({ files: [photo], title: plant.nomePopular, text });
      } else if (navigator.share) {
        setFallback(true);
        await navigator.share({ title: plant.nomePopular, text, ...(publicUrl ? { url: publicUrl } : {}) });
      } else { setFallback(true); await navigator.clipboard.writeText(text); notify(publicUrl ? 'Ficha copiada. Você também pode baixar a foto.' : 'Descrição copiada. Este cadastro é local; envie também a foto.'); }
    } catch (error) { if (error instanceof Error && error.name === 'AbortError') return; setFallback(true); notify('Compartilhamento não disponível. Copie os dados abaixo ou baixe a foto.'); }
  };
  return <Modal title={`${plant.nomePopular} — ficha do exemplar`} onClose={onClose} wide instant={instant}>
    <div className="detail-grid"><div className="detail-gallery">
      <div className={`raw-photo-frame ${zoom ? 'is-zoomed' : ''}`}><RawPhoto transitionName={selected.id === photos[0].id ? 'plant-photo' : undefined} image={selected} name={plant.nomePopular} zoom={zoom}/><button className="zoom-toggle icon-button" onClick={()=>setZoom(v=>!v)} aria-label={zoom ? 'Reduzir imagem' : 'Ampliar imagem'} aria-pressed={zoom}>{zoom?<ZoomOut size={20}/>:<ZoomIn size={20}/>}</button><span className="raw-photo-label"><Camera size={13}/>Fotografia original · sem filtros nem recortes</span></div>
      <p className="raw-photo-caption">{selected.anguloTag === 'Escala Real (Comparação Humana)' ? <><Hand size={15}/>Escala real: a mão do cultivador ao lado do tronco mostra o volume exato da planta.</> : <>{selected.label ?? selected.anguloTag}</>}</p>
      {photos.length > 1 && <div className="thumbnails">{photos.map((img, index) => <button key={img.id} className={selected.id === img.id ? 'selected' : ''} onClick={() => {setImageId(img.id);setZoom(false);}} aria-label={`Foto ${index + 1}: ${img.label??img.anguloTag}`} aria-pressed={selected.id === img.id}><div className="thumbnail-frame"><img src={img.url} alt=""/></div><span>{img.label??img.anguloTag}</span>{selected.id === img.id && <Check size={13} />}</button>)}</div>}
      {scale && scale.id !== selected.id && <button className="button button-outline scale-button" onClick={()=>{setImageId(scale.id);setZoom(false);}}><Hand size={17}/>Ver Escala Real (Mão)</button>}
    <ScaleComparator height={plant.alturaCm}/>
    {editing && <button className="button button-outline full" onClick={onEditGallery}><Images size={17}/>Adicionar / remover fotos</button>}
    </div><div className="detail-info"><span className="eyebrow">{plant.categoria}</span><div className="detail-meta"><span>{plant.codigo}</span><span className={`status status-${plant.status}`}><i />{statusLabels[plant.status]}</span></div><h2><PlantInline plant={plant} field="nomePopular" editing={editing} onSave={onSaveField}/></h2><p className="scientific"><PlantInline plant={plant} field="especieCientifica" editing={editing} onSave={onSaveField}/></p><p className="detail-description"><PlantInline plant={plant} field="descricao" editing={editing} onSave={onSaveField}/></p>
      <div className="specs">{[['Idade estimada', plant.idadeEstimada, Sprout], ['Altura', plant.alturaCm === null ? '' : `${plant.alturaCm} cm`, Ruler], ['Nebari', plant.larguraNebariCm === null ? '' : `${plant.larguraNebariCm} cm`, Ruler], ['Estilo', plant.estilo, Sprout], ['Ambiente', plant.ambiente, Sun], ['Cuidado', plant.nivelCuidado, Hand]].filter(([,value])=>Boolean(value)).map(([label, value, Icon]) => { const Symbol = Icon as typeof Sprout; return <div key={String(label)}><Symbol size={17} /><span>{String(label)}<strong>{String(value)}</strong></span></div>; })}</div>
      <Indicators large levels={indicatorsOf(plant)} legends={{ sol: plant.ambiente, rega: plant.rega, cuidado: plant.nivelCuidado }} editing={editing} onChange={onSaveIndicator} />
      <div className="detail-price"><small>INVESTIMENTO</small><strong><PlantInline plant={plant} field="preco" editing={editing} onSave={onSaveField}/></strong></div>
      <button className="button button-gold full" onClick={onInterest} disabled={plant.status === 'vendido'}>{plant.status === 'vendido' ? 'Exemplar vendido' : 'Negociar este Exemplar no WhatsApp'}<WhatsAppIcon size={19} /></button>
      <button className="button button-outline full" onClick={() => void share()}><Share2 size={17} />Compartilhar ficha c/ foto</button>
      {!published && <p className="small muted">Cadastro local: compartilhe a foto e os dados. Ainda não há uma ficha pública deste exemplar.</p>}
      {fallback && <div className="share-fallback"><p>Se o dispositivo não enviar arquivos, copie os dados e baixe a foto separadamente.</p>{photo && <button className="text-link" onClick={() => downloadFile(photo, photo.name)}><Download size={16} />Baixar foto</button>}<input aria-label="Dados para compartilhar" readOnly value={publicUrl ? `${shareText} ${publicUrl}` : shareText} onFocus={e => e.target.select()} /></div>}
      <div className="detail-authenticity"><p className="detail-note">Uma árvore única.<br/>Uma nova história para cultivar.</p></div>
    </div></div>
  </Modal>;
}
