import { catalogSchema, type Catalog } from './schema.ts';
import { serializeBackup } from './catalog.ts';
import { upgradeSeed } from '../data/upgrade.ts';
import { initialCatalog } from '../data/initial.ts';
import { SUPABASE, supabase } from './supabase.ts';
import { StaleCatalogError, type CatalogRepository } from './repository.ts';

export class NotAdminError extends Error {
  constructor() { super('Entre com uma conta de curadoria para salvar.'); }
}
// A photo could not be stored; nothing was saved. The message says which and why, for the curator.
export class PhotoUploadError extends Error {}

type Row = { revision: number; data: unknown };

// Public read through the REST API (no client library): the catalog row, or null before the first save.
export async function fetchCatalogRow(fetcher: typeof fetch = fetch): Promise<Row | null> {
  const response = await fetcher(`${SUPABASE.url}/rest/v1/catalog?id=eq.current&select=revision,data`, { headers: { apikey: SUPABASE.key, Authorization: `Bearer ${SUPABASE.key}` } });
  if (!response.ok) throw new Error(`Catálogo indisponível (${response.status}).`);
  const rows = await response.json() as Row[];
  return rows[0] ?? null;
}
export const catalogFromRow = (row: Row | null): Catalog => row ? upgradeSeed(catalogSchema.parse(row.data)) : structuredClone(initialCatalog);

const extension: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };

// Photos added in the curation arrive as data: URLs; before saving they go to the "fotos" bucket and the catalog
// keeps only their public URLs.
async function uploadPhotos(catalog: Catalog): Promise<Catalog> {
  const pending = new Map<string, string>();
  const collect = (url: string | undefined) => { if (url?.startsWith('data:')) pending.set(url, ''); };
  for (const plant of catalog.plants) { plant.galeria.forEach(image => collect(image.url)); collect(plant.fotoVitrine); }
  collect(catalog.settings.fotoCultivador); catalog.settings.bioGallery.forEach(photo => collect(photo.url));
  catalog.personal.forEach(tree => tree.fotos.forEach(collect));
  catalog.awards.forEach(award => collect(award.foto));
  if (!pending.size) return catalog;
  const db = await supabase();
  // Four uploads at a time: quick for a batch of phone photos without flooding a mobile connection.
  const queue = [...pending.keys()];
  const total = queue.length;
  const worker = async () => {
    for (let dataUrl = queue.shift(); dataUrl; dataUrl = queue.shift()) {
      const blob = await (await fetch(dataUrl)).blob();
      const path = `${new Date().toISOString().slice(0, 7)}/${crypto.randomUUID()}.${extension[blob.type] ?? 'jpg'}`;
      const { error } = await db.storage.from('fotos').upload(path, blob, { contentType: blob.type, cacheControl: '31536000', upsert: false });
      if (error) throw new PhotoUploadError(`Não foi possível enviar ${total > 1 ? 'uma das fotos' : 'a foto'} (${Math.round(blob.size / 1024)} KB): ${error.message}. Nada foi salvo; tente de novo.`);
      pending.set(dataUrl, db.storage.from('fotos').getPublicUrl(path).data.publicUrl);
    }
  };
  await Promise.all(Array.from({ length: Math.min(4, total) }, worker));
  const swap = (url: string) => pending.get(url) || url;
  return {
    ...catalog,
    plants: catalog.plants.map(plant => ({ ...plant, fotoVitrine: plant.fotoVitrine && swap(plant.fotoVitrine), galeria: plant.galeria.map(image => ({ ...image, url: swap(image.url) })) })),
    personal: catalog.personal.map(tree => ({ ...tree, fotos: tree.fotos.map(swap) })),
    awards: catalog.awards.map(award => award.foto ? { ...award, foto: swap(award.foto) } : award),
    settings: { ...catalog.settings, fotoCultivador: catalog.settings.fotoCultivador && swap(catalog.settings.fotoCultivador), bioGallery: catalog.settings.bioGallery.map(photo => ({ ...photo, url: swap(photo.url) })) },
  };
}

// The catalog lives in one row of public.catalog with a revision: a save only applies on top of the revision it was
// edited from, so two curators (or two tabs) never overwrite each other silently.
export function createRemoteRepository(): CatalogRepository {
  let knownRevision = 0;
  return {
    async load() {
      const row = await fetchCatalogRow();
      const catalog = catalogFromRow(row);
      knownRevision = row?.revision ?? 0;
      return catalog;
    },
    async save(catalog) {
      serializeBackup(catalogSchema.parse(catalog));
      const db = await supabase();
      const { data: { session } } = await db.auth.getSession();
      if (!session) throw new NotAdminError();
      const data = catalogSchema.parse(await uploadPhotos(catalog));
      if (knownRevision === 0) {
        const { error } = await db.from('catalog').insert({ id: 'current', revision: 1, data });
        if (error) throw error.code === '23505' ? new StaleCatalogError() : error.code === '42501' ? new NotAdminError() : error;
        knownRevision = 1;
      } else {
        const { data: rows, error } = await db.from('catalog').update({ data, revision: knownRevision + 1 }).eq('id', 'current').eq('revision', knownRevision).select('revision');
        if (error) throw error;
        if (!rows?.length) { const { data: admin } = await db.rpc('is_admin'); throw admin === true ? new StaleCatalogError() : new NotAdminError(); }
        knownRevision += 1;
      }
      return data;
    },
  };
}
