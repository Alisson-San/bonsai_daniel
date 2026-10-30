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

it('textos antigos do site salvos no navegador passam aos novos; textos editados ficam', () => {
 const data = structuredClone(initialCatalog);
 data.settings.heroTitle = 'O tempo transforma.\nO cuidado revela.';
 data.settings.bio = 'Um espaço dedicado à arte do bonsai e à beleza que se constrói aos poucos. Conheça os exemplares da coleção de Daniel Bourscheid e acompanhe cada nova possibilidade de cultivo.';
 data.settings.heroDescription = 'Descrição própria';
 const upgraded = upgradeSeed(data).settings;
 assert.equal(upgraded.heroTitle, initialCatalog.settings.heroTitle);
 assert.equal(upgraded.bio, '');
 assert.equal(upgraded.heroDescription, 'Descrição própria');
});

it('catálogos salvos antes da biografia e das seções novas continuam válidos, com os textos padrão', async () => {
 const { catalogSchema } = await import('../src/lib/schema.ts');
 const old = structuredClone(initialCatalog) as Record<string, unknown> & { settings: Record<string, unknown> };
 for (const key of ['bioPageLead', 'bioStory', 'bioHighlights', 'bioMilestones', 'bioGallery', 'purchaseSteps', 'testimonials']) delete old.settings[key];
 const parsed = catalogSchema.parse(old);
 assert.equal(parsed.settings.purchaseSteps, initialCatalog.settings.purchaseSteps);
 assert.equal(parsed.settings.testimonials, '');
 assert.deepEqual(parsed.settings.bioGallery, []);
});

it('prêmios em texto e fotos da antiga galeria viram registros de exposições e prêmios', () => {
 const data = structuredClone(initialCatalog);
 data.settings.awards = '2024 | 1º lugar Shohin | Exposição Nacional\nCurso de aramação | Escola X';
 data.settings.bioGallery = [{ id: 'g1', url: '/images/bonsai_01.jpeg', legenda: 'Exposição de outono' }];
 const upgraded = upgradeSeed(data);
 assert.deepEqual(upgraded.awards.map(a => [a.ano, a.titulo, a.local, a.foto]), [['2024', '1º lugar Shohin', 'Exposição Nacional', undefined], ['', 'Curso de aramação', 'Escola X', undefined], ['', 'Exposição de outono', '', '/images/bonsai_01.jpeg']]);
 assert.equal(upgraded.settings.awards, ''); assert.deepEqual(upgraded.settings.bioGallery, []);
 assert.deepEqual(upgradeSeed(upgraded).awards.length, 3);
});
