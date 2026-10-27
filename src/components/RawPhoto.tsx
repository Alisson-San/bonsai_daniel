import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import type { Plant } from '../lib/schema';
type Photo = Plant['galeria'][number];

// The photograph exactly as shot: full frame, no crop, mask or grading. Zoom is opt-in only.
export default function RawPhoto({ image, name, zoom, transitionName }: { image: Photo; name: string; zoom: boolean; transitionName?: string }) {
 const [origin, setOrigin] = useState('50% 50%');
 useEffect(() => setOrigin('50% 50%'), [image.id, zoom]);
 return <motion.div className="raw-photo" onPointerMove={event => { if (!zoom) return; const box = event.currentTarget.getBoundingClientRect(); setOrigin(`${(event.clientX - box.left) / box.width * 100}% ${(event.clientY - box.top) / box.height * 100}%`); }}>
  <img src={image.url} alt={`${name} — fotografia original: ${image.label ?? image.anguloTag}`} draggable={false} style={{ transformOrigin: origin, viewTransitionName: transitionName }} />
 </motion.div>;
}
