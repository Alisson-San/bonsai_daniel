import { it } from 'node:test';
import assert from 'node:assert/strict';
import { photoGeometry } from '../src/lib/photography.ts';
it('alinha a base do vaso ao friso sem mostrar os pixels do torno',()=>{
 for(const width of [280,360,500])for(const open of [false,true]){
 const height=width*4/3;
 const r=photoGeometry({width,height,sourceWidth:720,sourceHeight:1280,open});
 assert.ok(Math.abs(r.y+r.height*.78-(height-12))<.001);
 assert.ok(r.x<=0&&r.x+r.width>=width);assert.ok(r.y<=0);
 }
});
it('escala com a mão abre o enquadramento mantendo a bacia alinhada',()=>{
 const box={width:360,height:480,sourceWidth:720,sourceHeight:1280};
 const normal=photoGeometry(box),open=photoGeometry({...box,open:true});
 assert.ok(normal.width>open.width);
 assert.equal(normal.zoom,1.18);assert.equal(open.zoom,1.05);
});
it('nebari e copa não revelam o suporte inferior e mantêm a foto preenchendo a moldura',()=>{
 const box={width:360,height:480,sourceWidth:720,sourceHeight:1280};
 for(const crop of [{scale:2.05,x:50,y:65},{scale:1.85,x:52,y:25}]){
 const r=photoGeometry({...box,crop});
 assert.ok(r.y+r.height*.78>=box.height-12-.001);
 assert.ok(r.x<=0&&r.x+r.width>=box.width);assert.ok(r.y<=0);
 }
});
it('adapta enquadramento a fotografias horizontais sem distorção',()=>{
 const r=photoGeometry({width:360,height:480,sourceWidth:1600,sourceHeight:900});
 assert.ok(Math.abs(r.width/r.height-1600/900)<1e-12);
 assert.ok(r.width>=360&&r.height*.78>=468);
});
