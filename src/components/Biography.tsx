import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import type { Settings } from '../lib/schema';
import RowsEditor from './RowsEditor';
import SectionMark from './SectionMark';

type BioText = 'bioPageLead' | 'bioStory';
type Props = {
  settings: Settings; editing: boolean; saving: boolean; personal: ReactNode; awards: ReactNode;
  inline: (key: BioText, label: string, multiline?: boolean) => ReactNode;
  onSaveList: (key: 'bioHighlights' | 'bioMilestones', value: string) => Promise<boolean>;
};

const lines = (text: string) => text.split('\n').map(line => line.split('|').map(part => part.trim())).filter(parts => parts[0]);
const reveal = { initial: { opacity: 0, y: 28 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, amount: .2 } };

// The cultivator's own page: portrait and lead, highlights, story, personal collection, exhibitions and awards, milestones.
// Every block is edited in place by the curator; empty blocks stay hidden for visitors.
export default function Biography({ settings: s, editing, saving, personal, awards, inline, onSaveList }: Props) {
  const reduced = useReducedMotion();
  const motionProps = reduced ? {} : reveal;
  const highlights = lines(s.bioHighlights), milestones = lines(s.bioMilestones);
  const paragraphs = s.bioStory.split(/\n{2,}/).map(p => p.trim()).filter(Boolean);
  return <main className="biography">
    <section className="bio-hero section-shell">
      <motion.div className="bio-portrait" initial={reduced ? false : { opacity: 0, scale: .96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: .9, ease: [.16, 1, .3, 1] }}>
        <img src={s.fotoCultivador ?? '/images/bonsai_01.jpeg'} alt="Daniel Bourscheid e seu trabalho de cultivo" />
      </motion.div>
      <motion.div className="bio-intro" initial={reduced ? false : { opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .9, delay: .15, ease: [.16, 1, .3, 1] }}>
        <SectionMark label="BIOGRAFIA" />
        <h1>Daniel Bourscheid</h1>
        <p className="bio-lead">{inline('bioPageLead', 'apresentação da biografia', true)}</p>
      </motion.div>
    </section>

    {(highlights.length > 0 || editing) && <section className="bio-highlights section-shell">
      {editing ? <div className="bio-edit-block"><small>Destaques (até 3 ou 4 aparecem lado a lado)</small><RowsEditor value={s.bioHighlights} saving={saving} addLabel="Adicionar destaque" fields={[{ label: 'Destaque', placeholder: '15 anos' }, { label: 'Complemento', placeholder: 'dedicados ao bonsai' }]} onSave={value => onSaveList('bioHighlights', value)} /></div>
        : highlights.map(([title, detail], i) => <motion.div key={i} className="bio-highlight" {...motionProps} transition={{ delay: i * .1 }}><strong>{title}</strong>{detail && <span>{detail}</span>}</motion.div>)}
    </section>}

    {(paragraphs.length > 0 || editing) && <section className="bio-story section-shell">
      <motion.div {...motionProps}>
        <SectionMark label="A HISTÓRIA" />
        {editing ? <div className="bio-edit-block"><small>Texto da história; separe os parágrafos com uma linha em branco.</small>{inline('bioStory', 'história', true)}</div>
          : paragraphs.map((p, i) => <p key={i} className={i === 0 ? 'bio-first' : ''}>{p}</p>)}
      </motion.div>
    </section>}

    {personal}

    {awards}

    {(milestones.length > 0 || editing) && <section className="bio-timeline section-shell">
      <SectionMark label="TRAJETÓRIA" />
      <h2>Marcos de uma vida no bonsai.</h2>
      {editing ? <div className="bio-edit-block"><small>Marcos da trajetória, em ordem</small><RowsEditor value={s.bioMilestones} saving={saving} addLabel="Adicionar marco" fields={[{ label: 'Ano', placeholder: '2010', width: 'narrow' }, { label: 'Título', placeholder: 'Primeiro bonsai' }, { label: 'Texto', placeholder: 'Opcional', long: true }]} onSave={value => onSaveList('bioMilestones', value)} /></div>
        : <ol>{milestones.map(([year, title, text], i) => <motion.li key={i} {...motionProps}><span className="bio-year">{year}</span><div><strong>{title}</strong>{text && <p>{text}</p>}</div></motion.li>)}</ol>}
    </section>}

    <section className="bio-cta section-shell">
      <SectionMark label="A COLEÇÃO" />
      <h2>Cada exemplar carrega<br />anos de cuidado.</h2>
      <a className="button button-gold" href="/#colecao" data-route>Ver a coleção <ArrowUpRight size={18} /></a>
    </section>
  </main>;
}
