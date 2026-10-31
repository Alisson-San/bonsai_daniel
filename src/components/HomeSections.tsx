import { motion, useReducedMotion } from 'framer-motion';
import { coverOf } from '../lib/catalog';
import type { Plant } from '../lib/schema';
import RowsEditor from './RowsEditor';
import SectionMark from './SectionMark';

type SaveList = (value: string) => Promise<boolean>;
const lines = (text: string) => text.split('\n').map(line => line.split('|').map(part => part.trim())).filter(parts => parts[0]);
const reveal = { initial: { opacity: 0, y: 28 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, amount: .3 } };

// How buying works, in numbered steps.
export function PurchaseSteps({ text, editing, saving, onSave }: { text: string; editing: boolean; saving: boolean; onSave: SaveList }) {
  const reduced = useReducedMotion(), steps = lines(text);
  if (!steps.length && !editing) return null;
  return <section className="purchase section-shell" id="como-comprar">
    <SectionMark kanji="道" label="COMO FUNCIONA" />
    <h2>Do primeiro olhar<br />ao seu jardim.</h2>
    {editing ? <div className="bio-edit-block"><small>Passos da compra, em ordem</small><RowsEditor value={text} saving={saving} addLabel="Adicionar passo" fields={[{ label: 'Passo', placeholder: 'Escolha', width: 'narrow' }, { label: 'Explicação', placeholder: 'Veja as fotos reais…', long: true }]} onSave={onSave} /></div>
      : <ol className="purchase-steps">{steps.map(([title, detail], i) => <motion.li key={i} {...(reduced ? {} : reveal)} transition={{ delay: i * .12 }}>
        <span className="purchase-number">{String(i + 1).padStart(2, '0')}</span><strong>{title}</strong>{detail && <p>{detail}</p>}
      </motion.li>)}</ol>}
  </section>;
}

// Quotes from buyers; hidden until the first one is added.
export function Testimonials({ text, editing, saving, onSave }: { text: string; editing: boolean; saving: boolean; onSave: SaveList }) {
  const reduced = useReducedMotion(), quotes = lines(text);
  if (!quotes.length && !editing) return null;
  return <section className="testimonials section-shell" id="depoimentos">
    <SectionMark kanji="声" label="QUEM JÁ CULTIVA" />
    {editing ? <div className="bio-edit-block"><small>Depoimentos de quem comprou</small><RowsEditor value={text} saving={saving} addLabel="Adicionar depoimento" fields={[{ label: 'Depoimento', placeholder: 'Chegou perfeito…', long: true }, { label: 'Nome', placeholder: 'Marcos' }, { label: 'Cidade', placeholder: 'Joinville, SC' }]} onSave={onSave} /></div>
      : <div className="testimonial-list">{quotes.map(([quote, name, city], i) => <motion.figure key={i} {...(reduced ? {} : reveal)} transition={{ delay: i * .12 }}>
        <blockquote>“{quote}”</blockquote>{name && <figcaption><strong>{name}</strong>{city && <span>{city}</span>}</figcaption>}
      </motion.figure>)}</div>}
  </section>;
}

// Sold plants leave the collection and gather here, as a record of trees that found a new home.
export function SoldShowcase({ plants, onOpen }: { plants: Plant[]; onOpen: (plant: Plant) => void }) {
  const reduced = useReducedMotion();
  if (!plants.length) return null;
  return <section className="sold section-shell" id="vendidos">
    <div className="sold-heading"><SectionMark kanji="家" label="JÁ ENCONTRARAM UM NOVO LAR" /><h2>Exemplares que seguem<br />sendo cultivados.</h2></div>
    <div className="sold-list">{plants.map((plant, i) => <motion.button key={plant.id} className="sold-item" onClick={() => onOpen(plant)} {...(reduced ? {} : reveal)} transition={{ delay: i % 4 * .08 }} aria-label={`Ver ficha de ${plant.nomePopular}, vendido`}>
      <span className="sold-photo"><img src={coverOf(plant).url} alt="" loading="lazy" decoding="async" /><span className="sold-badge">Vendido</span></span>
      <strong>{plant.nomePopular}</strong>{plant.especieCientifica && <span className="sold-meta">{plant.especieCientifica}</span>}
    </motion.button>)}</div>
  </section>;
}
