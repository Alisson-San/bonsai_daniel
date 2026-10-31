import { motion, useReducedMotion } from 'framer-motion';

// Section opener: a red hanko (the seal Japanese masters stamp on their work) with the section's kanji, a brush line
// and the label. The seal is stamped as it scrolls into view: it comes down from above, presses and settles askew.
// The seal font only carries the kanji listed in index.html (Shippori Mincho &text=…): add new ones there too.
export default function SectionMark({ kanji, label }: { kanji: string; label: string }) {
  const reduced = useReducedMotion();
  return <div className="section-mark">
    <motion.span className="hanko" aria-hidden="true"
      initial={reduced ? false : { opacity: 0, scale: 1.9, rotate: -16 }} whileInView={{ opacity: 1, scale: 1, rotate: -4 }}
      viewport={{ once: true, amount: .5 }} transition={{ type: 'spring', stiffness: 420, damping: 22, mass: .8 }}>
      {[...kanji].map((char, i) => <span key={i}>{char}</span>)}
    </motion.span>
    <span className="section-mark-line" aria-hidden="true" />
    <span className="eyebrow">{label}</span>
  </div>;
}
