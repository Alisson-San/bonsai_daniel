type GeometryInput={width:number;height:number;sourceWidth:number;sourceHeight:number;open?:boolean;crop?:{scale:number;x:number;y:number};framing?:{cropBottomOffset:number;zoom:number;focusX:number}};
export function photoGeometry({width,height,sourceWidth,sourceHeight,open=false,crop,framing}:GeometryInput){
 const bottom=1-(framing?.cropBottomOffset??.22);
 const available=Math.max(1,height-12);
 const zoom=crop?.scale??(open?1.05:framing?.zoom??1.18);
 const fit=Math.max(width/sourceWidth,available/(sourceHeight*bottom))*zoom;
 const imageWidth=sourceWidth*fit,imageHeight=sourceHeight*fit;
 const focusX=crop ? crop.x/100 : open ? .5 : (framing?.focusX??.55);
 const x=Math.min(0,Math.max(width-imageWidth,width*.5-imageWidth*focusX));
 const potAlignedY=available-imageHeight*bottom;
 const desiredY=crop?available*.5-imageHeight*crop.y/100:potAlignedY;
 // Never allow the viewport to reveal any pixel below the pot's calibrated base.
 const y=Math.min(0,Math.max(potAlignedY,desiredY));
 return {width:imageWidth,height:imageHeight,x,y,zoom};
}
