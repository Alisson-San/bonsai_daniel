import { it } from 'node:test';
import assert from 'node:assert/strict';
import { previousSeeds } from '../src/data/previous.ts';
import { initialCatalog } from '../src/data/initial.ts';
import { resolveTheme } from '../src/lib/theme.ts';
import { upgradeSeed } from '../src/data/upgrade.ts';
it('segue SO sem preferência e preserva escolha explícita', () => {
 assert.equal(resolveTheme(null, true), 'dark'); assert.equal(resolveTheme(null, false), 'light');
 assert.equal(resolveTheme('light', true), 'light'); assert.equal(resolveTheme('invalid', false), 'light');
});
it('carrega os preços e medidas fornecidos', () => {
 assert.equal(initialCatalog.plants[0].preco, 1850); assert.equal(initialCatalog.plants[1].preco, 2400);
 assert.equal(initialCatalog.plants[0].larguraNebariCm, 24); assert.equal(initialCatalog.plants[1].idadeEstimada, '~18 anos');
});
it('não sobrescreve exemplares editados nem recria excluídos', () => {
 const data = structuredClone(initialCatalog); data.plants[0].nomePopular='Minha árvore';data.plants[0].preco=900;data.plants.pop();
 assert.equal(upgradeSeed(data).plants[0].preco, 900);assert.equal(upgradeSeed(data).plants.length,1);
});
it('atualiza apenas os placeholders originais preservados no IndexedDB', () => {
 const data={...structuredClone(initialCatalog),plants:structuredClone(previousSeeds)};
 Object.assign(data.plants[0], {nomePopular:'Exemplar 01',especieCientifica:'',idadeEstimada:'',alturaCm:null,larguraNebariCm:null,estilo:'',ambiente:'',nivelCuidado:'',rega:'',preco:null,descricao:'Exemplar do acervo de Daniel Bourscheid. Entre em contato para conhecer a espécie, as medidas e os detalhes do cultivo.'});
 assert.equal(upgradeSeed(data).plants[0].preco,1850);
 data.plants[0].descricao='Texto personalizado';
 assert.equal(upgradeSeed(data).plants[0].preco,null);
 assert.equal(upgradeSeed(data).plants[0].descricao,'Texto personalizado');
});
