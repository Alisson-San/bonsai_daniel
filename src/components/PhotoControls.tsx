import { defaultFraming, type PhotoFraming } from '../lib/schema';
export default function PhotoControls({value,onChange}:{value?:PhotoFraming;onChange:(value:PhotoFraming)=>void}){
 const framing=value??defaultFraming;
 const fields=[['cropBottomOffset','Corte inferior (esconder torno)',0,.45,.005],['zoom','Zoom da árvore',1.05,1.6,.01],['focusX','Foco horizontal',.3,.7,.01]] as const;
 return <div className="photo-controls"><h3>Enquadramento Fotográfico</h3><p>Foto original, sem remoção de fundo. Ajuste o corte até a base do vaso tocar o friso de madeira.</p>{fields.map(([key,label,min,max,step])=><label key={key}><span>{label}<output>{Math.round(framing[key]*100)}%</output></span><input type="range" min={min} max={max} step={step} value={framing[key]} onChange={e=>onChange({...framing,[key]:Number(e.target.value)})}/></label>)}</div>;
}
