import { useId } from 'react';
import { acerOutline, acerVeins } from '../lib/acer';
export default function AuthenticitySeal() {
 const id=useId().replace(/:/g,'');
 return <svg className="authenticity-seal" viewBox="0 0 150 150" role="img" aria-label="Autêntico Daniel Bourscheid — Bonsai Arte Viva, Exemplar Único">
  <defs><path id={`seal-${id}`} d="M75 75m-57 0a57 57 0 1 1 114 0a57 57 0 1 1-114 0"/></defs>
  <circle cx="75" cy="75" r="72" className="seal-ring"/><circle cx="75" cy="75" r="46" className="seal-inner"/>
  <g className="seal-rotating"><text textLength="354" lengthAdjust="spacing" className="seal-type"><textPath href={`#seal-${id}`}>BONSAI ARTE VIVA • DANIEL BOURSCHEID • EXEMPLAR ÚNICO • </textPath></text></g>
  <g transform="translate(75 70) scale(.85)"><path d={acerOutline} fill="var(--accent)"/><path d={acerVeins} fill="none" stroke="var(--gold)" strokeWidth=".65"/></g>
  <text x="75" y="105" textAnchor="middle" className="seal-signature">AUTÊNTICO</text>
 </svg>;
}
