import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import type { Plant, PhotoFraming } from '../lib/schema';
import { photoGeometry } from '../lib/photography';
type Photo=Plant['galeria'][number];
export default function BonsaiPhoto({image,name,framing,open=false,magnified=false,layoutId}:{image:Photo;name:string;framing?:PhotoFraming;open?:boolean;magnified?:boolean;layoutId?:string}){
 const root=useRef<HTMLDivElement>(null);
 const [size,setSize]=useState({width:360,height:480});
 const [source,setSource]=useState({width:720,height:1280});
 const reduced=useReducedMotion();
 const [pointer,setPointer]=useState<{x:number;y:number}|null>(null);
 useEffect(()=>setPointer(null),[image.id,magnified]);
 useEffect(()=>{const node=root.current;if(!node)return;const observer=new ResizeObserver(entries=>{const {width,height}=entries[0].contentRect;if(width&&height)setSize({width,height});});observer.observe(node);return()=>observer.disconnect();},[]);
 const baseCrop=open?undefined:image.crop;
 const crop=magnified?{scale:Math.max(2.3,(baseCrop?.scale??framing?.zoom??1.18)*1.4),x:pointer?.x??baseCrop?.x??55,y:pointer?.y??baseCrop?.y??48}:baseCrop;
 const geometry=photoGeometry({...size,sourceWidth:source.width,sourceHeight:source.height,open,crop,framing});
 return <motion.div ref={root} onPointerMove={event=>{if(!magnified)return;const rect=event.currentTarget.getBoundingClientRect();setPointer({x:Math.max(0,Math.min(100,(event.clientX-rect.left)/rect.width*100)),y:Math.max(0,Math.min(100,(event.clientY-rect.top)/rect.height*100))});}} layoutId={layoutId} className={`bonsai-photo${open ? ' is-open' : ''}`} role="img" aria-label={`${name} — ${crop?image.label??image.anguloTag:open?'escala com a mão':'enquadramento da árvore'}`}>
  <div className="photograph-window"><motion.img className="clean-photograph" src={image.url} alt="" draggable={false} onLoad={event=>{const image=event.currentTarget;setSource({width:image.naturalWidth,height:image.naturalHeight});}} initial={false} animate={{width:geometry.width,height:geometry.height,x:geometry.x,y:geometry.y}} transition={{duration:reduced?0:.5,ease:[.16,1,.3,1]}}/></div>
  <div className="photograph-vignette" aria-hidden="true"/><div className="photograph-shelf" aria-hidden="true"/>
 </motion.div>;
}
