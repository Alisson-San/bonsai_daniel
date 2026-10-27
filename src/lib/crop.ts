export function cropTransform(crop?: {scale:number;x:number;y:number}) {
 const scale=crop?.scale??1;
 // Fixed center origin: move the requested source point to the frame center.
 const x=Number(((50-(crop?.x??50))*scale).toFixed(2));
 const y=Number(((50-(crop?.y??50))*scale).toFixed(2));
 return {scale,x:`${x}%`,y:`${y}%`};
}
