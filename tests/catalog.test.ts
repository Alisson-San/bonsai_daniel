import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseBackup, serializeBackup, buildWhatsappUrl, formatPrice, filterPlants, publicPlantLink, duplicatePlant, rawPhotosOf, indicatorsOf, plantFromHash, plantLink } from '../src/lib/catalog.ts';
import { initialCatalog } from '../src/data/initial.ts';

describe('backup', () => {
  it('não permite salvar um catálogo maior que o limite de restauração', () => {
    const data = structuredClone(initialCatalog);
    data.plants[0].galeria = Array.from({ length: 9 }, (_, index) => ({ id: `large-${index}`, url: `data:image/jpeg;base64,${'A'.repeat(9_000_000)}`, anguloTag: 'Frente (Omote)' as const }));
    data.plants[0].capaId = 'large-0';
    assert.throws(() => serializeBackup(data), /80 MB/);
  });
  it('preserva catálogo e galeria em um ciclo JSON', () => {
    const parsed = parseBackup(serializeBackup(initialCatalog));
    assert.equal(parsed.plants.length, 2);
    assert.equal(parsed.plants[0].galeria[0].url, '/images/bonsai_01.jpeg');
  });
  it('rejeita versão incompatível sem aceitar dados parciais', () => {
    assert.throws(() => parseBackup(JSON.stringify({ ...initialCatalog, version: 99 })));
  });
  it('rejeita URL executável e preço negativo', () => {
    const data = structuredClone(initialCatalog);
    data.plants[0].galeria[0].url = 'javascript:alert(1)';
    assert.throws(() => parseBackup(JSON.stringify(data)));
    data.plants[0].galeria[0].url = '/images/bonsai_01.jpeg';
    data.plants[0].preco = -10;
    assert.throws(() => parseBackup(JSON.stringify(data)));
  });
  it('rejeita ids duplicados e capas inexistentes', () => {
    const data = structuredClone(initialCatalog);
    data.plants[1].id = data.plants[0].id;
    assert.throws(() => parseBackup(JSON.stringify(data)));
    data.plants[1].id = 'outro';
    data.plants[0].capaId = 'inexistente';
    assert.throws(() => parseBackup(JSON.stringify(data)));
  });
});

describe('contato e busca', () => {
  it('só oferece link público para fichas publicadas sem alterações locais', () => {
    const plant = structuredClone(initialCatalog.plants[0]);
    assert.equal(publicPlantLink(plant, 'https://bonsai.test'), 'https://bonsai.test/?exemplar=db-001');
    const copy = duplicatePlant(plant, initialCatalog.plants);
    assert.equal(publicPlantLink(copy, 'https://bonsai.test'), null);
    plant.nomePopular = 'Nome editado localmente';
    assert.equal(publicPlantLink(plant, 'https://bonsai.test'), null);
  });
  it('formata reais e preço sob consulta', () => {
    assert.equal(formatPrice(null), 'Sob consulta');
    assert.equal(formatPrice(1250).replace(/\s/g, ' '), 'R$ 1.250,00');
  });
  it('exige número válido para não abrir contato errado', () => {
    assert.throws(() => buildWhatsappUrl(initialCatalog.plants[0], initialCatalog.settings, 'https://bonsai.test'));
  });
  it('gera mensagem contextual com preço e URL pública absoluta', () => {
    const settings = { ...initialCatalog.settings, whatsapp: '+55 (47) 99999-8888' };
    const url = new URL(buildWhatsappUrl(initialCatalog.plants[0], settings, 'https://bonsai.test'));
    assert.equal(url.pathname, '/5547999998888');
    assert.ok(url.searchParams.get('text')?.includes('#DB-001'));
    assert.ok(url.searchParams.get('text')?.includes('https://bonsai.test/images/bonsai_01.jpeg'));
    assert.match(url.searchParams.get('text')!, /1\.850,00/);
  });
  it('não envia Base64 como link de referência', () => {
    const plant = structuredClone(initialCatalog.plants[0]);
    plant.galeria[0].url = 'data:image/jpeg;base64,YQ==';
    const settings = { ...initialCatalog.settings, whatsapp: '5547999998888' };
    assert.ok(!decodeURIComponent(buildWhatsappUrl(plant, settings, 'https://bonsai.test')).includes('base64'));
  });
  it('combina busca sem acentos, categoria e status', () => {
    const plants = structuredClone(initialCatalog.plants);
    plants[0].nomePopular = 'Figueira coleção';
    plants[0].status = 'reservado';
    assert.equal(filterPlants(plants, 'colecao', '', '', 'reservado').length, 1);
    assert.equal(filterPlants(plants, 'colecao', '', '', 'disponivel').length, 0);
  });
});

describe('fotografias originais', () => {
  it('lista cada arquivo uma vez, sem os enquadramentos de detalhe', () => {
    const photos = rawPhotosOf(initialCatalog.plants[0]);
    assert.equal(photos.length, 1);
    assert.equal(photos[0].crop, undefined);
    assert.equal(photos[0].anguloTag, 'Escala Real (Comparação Humana)');
  });
});

describe('vitrine, indicadores e link da ficha', () => {
  it('aceita fotoVitrine no backup e continua lendo JSONs antigos sem o campo', () => {
    const data = structuredClone(initialCatalog);
    data.plants[0].fotoVitrine = 'data:image/png;base64,iVBORw0KGgo=';
    data.settings.fotoCultivador = '/images/bonsai_02.jpeg';
    const parsed = parseBackup(serializeBackup(data));
    assert.equal(parsed.plants[0].fotoVitrine, 'data:image/png;base64,iVBORw0KGgo=');
    assert.equal(parsed.settings.fotoCultivador, '/images/bonsai_02.jpeg');
    assert.equal(parseBackup(JSON.stringify(initialCatalog)).plants[0].fotoVitrine, undefined);
  });
  it('deriva indicadores 1–5 dos níveis antigos e respeita os editados', () => {
    const plant = structuredClone(initialCatalog.plants[0]);
    assert.deepEqual(indicatorsOf(plant), { sol: 5, rega: 4, cuidado: 3 });
    plant.indicadores = { rega: 2 };
    assert.equal(indicatorsOf(plant).rega, 2);
    assert.throws(() => parseBackup(JSON.stringify({ ...initialCatalog, plants: [{ ...plant, indicadores: { sol: 6 } }] })));
  });
  it('gera link #DB-001 na mensagem e encontra a planta pelo hash', () => {
    const plant = initialCatalog.plants[0];
    assert.equal(plantLink(plant, 'https://bonsai.test'), 'https://bonsai.test/#DB-001');
    assert.equal(plantFromHash(initialCatalog.plants, '#db-001')?.id, 'db-001');
    assert.equal(plantFromHash(initialCatalog.plants, '#colecao'), undefined);
    const settings = { ...initialCatalog.settings, whatsapp: '5547999998888', messageTemplate: 'Modelo antigo {nome}' };
    assert.match(new URL(buildWhatsappUrl(plant, settings, 'https://bonsai.test')).searchParams.get('text')!, /Ficha: https:\/\/bonsai\.test\/#DB-001/);
  });
});
