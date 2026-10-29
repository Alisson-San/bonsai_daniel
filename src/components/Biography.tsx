import { useRef, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowUpRight, Camera, Plus, Trash2 } from 'lucide-react';
import type { Settings } from '../lib/schema';
import Editable from './Editable';

type BioText = 'bioPageLead' | 'bioStory' | 'bioHighlights' | 'bioMilestones';
type Props = {
  settings: Settings; editing: boolean; saving: boolean;
  inline: (key: BioText, label: string, multiline?: boolean) => ReactNode;
  onAddPhoto: (file: File) => void; onRemovePhoto: (id: string) => void; onCaption: (id: string, legenda: string) => Promise<boolean>;
};

const lines = (text: string) => text.split('\n').map(line => line.split('|').map(part => part.trim())).filter(parts => parts[0]);
const reveal = { initial: { opacity: 0, y: 28 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, amount: .2 } };

// The cultivator's own page: portrait and lead, highlights, story, milestones and a photo gallery.
// Every block is edited in place by the curator; empty blocks stay hidden for visitors.
export default function Biography({ settings: s, editing, saving, inline, onAddPhoto, onRemovePhoto, onCaption }: Props) {
  const reduced = useReducedMotion();
  const upload = useRef<HTMLInputElement>(null);
  const motionProps = reduced ? {} : reveal;
  const highlights = lines(s.bioHighlights), milestones = lines(s.bioMilestones);
  const paragraphs = s.bioStory.split(/\n{2,}/).map(p => p.trim()).filter(Boolean);
  return <main className="biography">
    <section className="bio-hero section-shell">
      <motion.div className="bio-portrait" initial={reduced ? false : { opacity: 0, scale: .96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: .9, ease: [.16, 1, .3, 1] }}>
        <img src={s.fotoCultivador ?? '/images/bonsai_01.jpeg'} alt="Daniel Bourscheid e seu trabalho de cultivo" />
      </motion.div>
      <motion.div className="bio-intro" initial={reduced ? false : { opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .9, delay: .15, ease: [.16, 1, .3, 1] }}>
        <span className="eyebrow">BIOGRAFIA</span>
        <h1>Daniel Bourscheid</h1>
        <p className="bio-lead">{inline('bioPageLead', 'apresentação da biografia', true)}</p>
      </motion.div>
    </section>

    {(highlights.length > 0 || editing) && <section className="bio-highlights section-shell">
      {editing ? <div className="bio-edit-block"><small>Destaques: um por linha, no formato <code>título | detalhe</code></small>{inline('bioHighlights', 'destaques', true)}</div>
        : highlights.map(([title, detail], i) => <motion.div key={i} className="bio-highlight" {...motionProps} transition={{ delay: i * .1 }}><strong>{title}</strong>{detail && <span>{detail}</span>}</motion.div>)}
    </section>}

    {(paragraphs.length > 0 || editing) && <section className="bio-story section-shell">
      <motion.div {...motionProps}>
        <span className="eyebrow">A HISTÓRIA</span>
        {editing ? <div className="bio-edit-block"><small>Texto da história; separe os parágrafos com uma linha em branco.</small>{inline('bioStory', 'história', true)}</div>
          : paragraphs.map((p, i) => <p key={i} className={i === 0 ? 'bio-first' : ''}>{p}</p>)}
      </motion.div>
    </section>}

    {(milestones.length > 0 || editing) && <section className="bio-timeline section-shell">
      <span className="eyebrow">TRAJETÓRIA</span>
      <h2>Marcos de uma vida no bonsai.</h2>
      {editing ? <div className="bio-edit-block"><small>Um marco por linha, no formato <code>ano | título | texto</code></small>{inline('bioMilestones', 'marcos da trajetória', true)}</div>
        : <ol>{milestones.map(([year, title, text], i) => <motion.li key={i} {...motionProps}><span className="bio-year">{year}</span><div><strong>{title}</strong>{text && <p>{text}</p>}</div></motion.li>)}</ol>}
    </section>}

    {(s.bioGallery.length > 0 || editing) && <section className="bio-gallery section-shell">
      <span className="eyebrow">EVENTOS, EXPOSIÇÕES E PRÊMIOS</span>
      <div className="bio-grid">
        {s.bioGallery.map(photo => <motion.figure key={photo.id} {...motionProps}>
          <img src={photo.url} alt={photo.legenda || 'Foto da trajetória de Daniel Bourscheid'} loading="lazy" decoding="async" />
          {(photo.legenda || editing) && <figcaption><Editable value={photo.legenda} editing={editing} label="legenda" onSave={value => onCaption(photo.id, value)} /></figcaption>}
          {editing && <button className="icon-button danger bio-remove" aria-label="Remover foto" onClick={() => onRemovePhoto(photo.id)} disabled={saving}><Trash2 size={15} /></button>}
        </motion.figure>)}
        {editing && <button className="bio-add" onClick={() => upload.current?.click()} disabled={saving}><Plus size={24} strokeWidth={1.2} /><span><Camera size={15} />Adicionar foto</span></button>}
      </div>
      <input ref={upload} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={e => { const file = e.target.files?.[0]; if (file) onAddPhoto(file); e.target.value = ''; }} />
    </section>}

    <section className="bio-cta section-shell">
      <span className="eyebrow">A COLEÇÃO</span>
      <h2>Cada exemplar carrega<br />anos de cuidado.</h2>
      <a className="button button-gold" href="/#colecao" data-route>Ver a coleção <ArrowUpRight size={18} /></a>
    </section>
  </main>;
}
