import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { coverOf } from '../lib/catalog';
import type { Plant } from '../lib/schema';

type Inline = (key: 'purchaseSteps' | 'testimonials', label: string, multiline?: boolean) => ReactNode;
const lines = (text: string) => text.split('\n').map(line => line.split('|').map(part => part.trim())).filter(parts => parts[0]);
const reveal = { initial: { opacity: 0, y: 28 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, amount: .3 } };

// How buying works, in numbered steps. Edited as "title | text" lines in the curation mode.
export function PurchaseSteps({ text, editing, inline }: { text: string; editing: boolean; inline: Inline }) {
  const reduced = useReducedMotion(), steps = lines(text);
  if (!steps.length && !editing) return null;
  return <section className="purchase section-shell" id="como-comprar">
    <span className="eyebrow">COMO FUNCIONA</span>
    <h2>Do primeiro olhar<br />ao seu jardim.</h2>
    {editing ? <div className="bio-edit-block"><small>Um passo por linha, no formato <code>título | texto</code></small>{inline('purchaseSteps', 'passos da compra', true)}</div>
      : <ol className="purchase-steps">{steps.map(([title, detail], i) => <motion.li key={i} {...(reduced ? {} : reveal)} transition={{ delay: i * .12 }}>
        <span className="purchase-number">{String(i + 1).padStart(2, '0')}</span><strong>{title}</strong>{detail && <p>{detail}</p>}
      </motion.li>)}</ol>}
  </section>;
}

// Quotes from buyers ("quote | name | city" lines); hidden until the first one is added.
export function Testimonials({ text, editing, inline }: { text: string; editing: boolean; inline: Inline }) {
  const reduced = useReducedMotion(), quotes = lines(text);
  if (!quotes.length && !editing) return null;
  return <section className="testimonials section-shell" id="depoimentos">
    <span className="eyebrow">QUEM JÁ CULTIVA</span>
    {editing ? <div className="bio-edit-block"><small>Um depoimento por linha, no formato <code>depoimento | nome | cidade</code></small>{inline('testimonials', 'depoimentos', true)}</div>
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
    <div className="sold-heading"><span className="eyebrow">JÁ ENCONTRARAM UM NOVO LAR</span><h2>Exemplares que seguem<br />sendo cultivados.</h2></div>
    <div className="sold-list">{plants.map((plant, i) => <motion.button key={plant.id} className="sold-item" onClick={() => onOpen(plant)} {...(reduced ? {} : reveal)} transition={{ delay: i % 4 * .08 }} aria-label={`Ver ficha de ${plant.nomePopular}, vendido`}>
      <span className="sold-photo"><img src={coverOf(plant).url} alt="" loading="lazy" decoding="async" /><span className="sold-badge">Vendido</span></span>
      <strong>{plant.nomePopular}</strong>{plant.especieCientifica && <span className="sold-meta">{plant.especieCientifica}</span>}
    </motion.button>)}</div>
  </section>;
}
