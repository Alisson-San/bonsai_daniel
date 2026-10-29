import { catalogSchema, type Catalog } from './schema.ts';
import { serializeBackup } from './catalog.ts';
import { upgradeSeed } from '../data/upgrade.ts';
import { initialCatalog } from '../data/initial.ts';

// save may return the catalog as stored (photos moved to storage, for example); otherwise the given one is kept.
export interface CatalogRepository { load(): Promise<Catalog>; save(catalog: Catalog): Promise<Catalog | void> }
type StoredCatalog = { revision: number; catalog: Catalog };
export class StaleCatalogError extends Error {
  constructor() { super('O catálogo foi alterado em outra aba ou aparelho. Recarregue a página antes de editar novamente para preservar as alterações.'); }
}
function openDatabase(name: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, 1);
    request.onupgradeneeded = () => request.result.createObjectStore('catalog');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('Feche outras abas do catálogo para atualizar o armazenamento.'));
  });
}
export function createCatalogRepository(name = 'bourscheid-catalog'): CatalogRepository {
  let knownRevision = 0;
  return {
    async load() {
      const db = await openDatabase(name);
      try {
        const stored = await new Promise<StoredCatalog | undefined>((resolve, reject) => {
          const tx = db.transaction('catalog', 'readonly');
          const request = tx.objectStore('catalog').get('current');
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
        if (!stored) { knownRevision = 0; return structuredClone(initialCatalog); }
        if (!Number.isSafeInteger(stored.revision) || stored.revision < 1) throw new Error('Armazenamento incompatível.');
        const data = catalogSchema.parse(stored.catalog);
        knownRevision = stored.revision;
        return upgradeSeed(data);
      } finally { db.close(); }
    },
    async save(catalog) {
      const data = catalogSchema.parse(catalog);
      serializeBackup(data);
      const expectedRevision = knownRevision;
      const db = await openDatabase(name);
      try {
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction('catalog', 'readwrite');
          const store = tx.objectStore('catalog');
          const read = store.get('current');
          let stale = false;
          read.onsuccess = () => {
            const current = read.result as StoredCatalog | undefined;
            if ((current?.revision ?? 0) !== expectedRevision) { stale = true; tx.abort(); return; }
            store.put({ revision: expectedRevision + 1, catalog: data } satisfies StoredCatalog, 'current');
          };
          tx.oncomplete = () => { knownRevision = expectedRevision + 1; resolve(); };
          tx.onerror = () => reject(tx.error);
          tx.onabort = () => reject(stale ? new StaleCatalogError() : tx.error ?? new Error('Salvamento interrompido.'));
        });
      } finally { db.close(); }
    },
  };
}
export const catalogRepository = createCatalogRepository();
