import { it } from 'node:test';
import assert from 'node:assert/strict';
import { initialCatalog } from '../src/data/initial.ts';
import { removeTag, renameTag, tagsOf } from '../src/lib/tags.ts';

const catalog = { ...initialCatalog, categories: ['Shohin', 'Bonsai Formado'], species: ['Ficus retusa'], plants: initialCatalog.plants.map((p, i) => ({ ...p, categoria: i ? 'Bonsai Formado' : 'Shohin', especieCientifica: 'Ficus retusa' })) };

it('renomear categoria muda a lista e os exemplares', () => {
 const next = renameTag(catalog, 'categories', 'Shohin', 'Mini Shohin');
 assert.deepEqual(next.categories, ['Mini Shohin', 'Bonsai Formado']);
 assert.equal(next.plants[0].categoria, 'Mini Shohin');
 assert.equal(next.plants[1].categoria, 'Bonsai Formado');
});

it('remover categoria em uso move os exemplares para a escolhida', () => {
 const next = removeTag(catalog, 'categories', 'Shohin', 'Bonsai Formado');
 assert.deepEqual(next.categories, ['Bonsai Formado']);
 assert.ok(next.plants.every(p => p.categoria === 'Bonsai Formado'));
 assert.deepEqual(tagsOf(next, 'categories'), ['Bonsai Formado']);
});

it('remover espécie pode deixar os exemplares sem espécie', () => {
 const next = removeTag(catalog, 'species', 'Ficus retusa', '');
 assert.deepEqual(next.species, []);
 assert.ok(next.plants.every(p => p.especieCientifica === ''));
 assert.deepEqual(tagsOf(next, 'species'), []);
});
