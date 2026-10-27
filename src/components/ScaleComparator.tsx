import { useId } from 'react';
export default function ScaleComparator({ height }: {height:number|null}) {
 const id=useId().replace(/:/g,'');
 if(height===null||height<=0)return null;
 const factor=140/Math.max(height,25), treeHeight=height*factor, bottleHeight=25*factor;
 return <figure className="scale-comparator"><figcaption>Comparador de Porte Visual</figcaption>
 <svg viewBox="0 0 320 205" role="img" aria-label={`Bonsai de ${height} centímetros comparado a uma garrafa ilustrativa de 25 centímetros, na mesma escala vertical`}>
  <defs><pattern id={`grid-${id}`} width="12" height="12" patternUnits="userSpaceOnUse"><path d="M12 0H0V12" fill="none" stroke="var(--line)" strokeWidth=".5"/></pattern></defs>
  <rect width="320" height="177" fill={`url(#grid-${id})`} rx="5"/>
  <path d="M25 165H295" stroke="var(--gold)" strokeWidth="1"/>
  <g transform={`translate(60 ${165-treeHeight}) scale(${treeHeight/140})`} fill="var(--text)">
   <path d="M50 2C35-2 29 11 17 15 5 17 1 28 12 33-1 37-4 51 13 54 5 65 17 73 33 67 43 76 55 71 63 66 80 73 96 66 90 55 108 51 103 37 88 35 96 23 82 15 72 18 68 7 59 7 50 2Z" opacity=".85"/>
   <path d="M45 39C51 63 35 77 45 96 44 107 35 116 26 120H70C56 109 55 95 54 80L75 56 70 53 52 66 49 38Z"/>
   <path d="M15 121H85L77 138H23Z" fill="var(--gold)"/>
  </g>
  <g transform={`translate(225 ${165-bottleHeight}) scale(${bottleHeight/100})`} fill="none" stroke="var(--muted)" strokeWidth="2"><path d="M12 1H28V17L36 30V96Q36 100 31 100H9Q4 100 4 96V30L12 17Z"/><path d="M12 6H28M4 49H36M4 75H36"/><path d="M11 52H29V72H11Z" fill="var(--secondary)" stroke="none"/></g>
  <path d={`M40 ${165-treeHeight}V165m-4 0h8M36 ${165-treeHeight}h8`} stroke="var(--gold)"/>
  <text x="95" y="188" textAnchor="middle">Bonsai · {height} cm</text><text x="250" y="188" textAnchor="middle">Garrafa · 25 cm</text>
 </svg><p>Ilustração proporcional à altura cadastrada. Confira o volume na foto com a mão.</p></figure>;
}
