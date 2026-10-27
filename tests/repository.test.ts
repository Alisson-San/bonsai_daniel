import 'fake-indexeddb/auto';
import { it } from 'node:test';
import assert from 'node:assert/strict';
import { catalogRepository, createCatalogRepository, StaleCatalogError } from '../src/lib/repository.ts';
import { initialCatalog } from '../src/data/initial.ts';

it('persiste alterações completas entre leituras e rejeita backup inválido', async () => {
  const data = structuredClone(initialCatalog);
  data.settings.heroTitle = 'Coleção de teste';
  await catalogRepository.save(data);
  assert.equal((await catalogRepository.load()).settings.heroTitle, 'Coleção de teste');
  await assert.rejects(catalogRepository.save({ ...data, version: 2 } as unknown as typeof data));
  assert.equal((await catalogRepository.load()).settings.heroTitle, 'Coleção de teste');
});

it('rejeita a gravação de uma aba desatualizada sem perder o cadastro mais recente', async () => {
  const name = `test-${crypto.randomUUID()}`;
  const a = createCatalogRepository(name);
  const b = createCatalogRepository(name);
  const first = await a.load();
  const second = await b.load();
  first.plants[0].nomePopular = 'Nome atualizado na aba A';
  await a.save(first);
  second.settings.location = 'Outra cidade';
  await assert.rejects(b.save(second), StaleCatalogError);
  assert.equal((await b.load()).plants[0].nomePopular, 'Nome atualizado na aba A');
});
