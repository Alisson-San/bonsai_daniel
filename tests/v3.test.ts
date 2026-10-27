import { it } from 'node:test';
import assert from 'node:assert/strict';
import { initialCatalog } from '../src/data/initial.ts';
import { catalogSchema } from '../src/lib/schema.ts';
import { upgradeSeed } from '../src/data/upgrade.ts';
import { previousSeeds } from '../src/data/previous.ts';
it('fichas completas e três enquadramentos preservados no backup',()=>{
 const catalog=catalogSchema.parse(initialCatalog);
 assert.equal(catalog.plants[0].alturaCm,48);assert.equal(catalog.plants[1].alturaCm,52);
 for(const p of catalog.plants){assert.ok(p.rega);assert.equal(p.cuidadoNivel,2);assert.equal(p.solarNivel,3);assert.equal(p.galeria.length,3);assert.ok(p.galeria[1].crop!.scale>1);assert.notDeepEqual(p.galeria[1].crop,p.galeria[2].crop);}
});
it('atualiza sementes V2 intactas mas preserva edições e exclusões',()=>{
 const old={...structuredClone(initialCatalog),plants:structuredClone(previousSeeds)};
 assert.equal(upgradeSeed(old).plants[0].alturaCm,48);
 old.plants[0].preco=1999;old.plants.pop();
 assert.equal(upgradeSeed(old).plants[0].preco,1999);assert.equal(upgradeSeed(old).plants.length,1);
});
it('centraliza o recorte com origem fixa para evitar saltos entre visões',async()=>{
 const {cropTransform}=await import('../src/lib/crop.ts');
 assert.deepEqual(cropTransform(),{scale:1,x:'0%',y:'0%'});
 assert.deepEqual(cropTransform({scale:2.05,x:50,y:65}),{scale:2.05,x:'0%',y:'-30.75%'});
 assert.deepEqual(cropTransform({scale:1.85,x:52,y:25}),{scale:1.85,x:'-3.7%',y:'46.25%'});
});
it('não descarta indicadores editados em uma ficha inicial',()=>{
 const data=structuredClone(initialCatalog);data.plants[0].indicadores={sol:2};
 assert.deepEqual(upgradeSeed(data).plants[0].indicadores,{sol:2});
});
