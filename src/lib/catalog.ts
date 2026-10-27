import { catalogSchema, type Plant, type Settings, type Catalog, type Indicators } from './schema.ts';
import { initialCatalog } from '../data/initial.ts';

export function publicPlantLink(plant: Plant, origin: string): string | null {
  const published = initialCatalog.plants.find(p => p.id === plant.id);
  if (!published || JSON.stringify(published) !== JSON.stringify(plant)) return null;
  return `${origin}/?exemplar=${encodeURIComponent(plant.id)}`;
}

export const MAX_BACKUP_BYTES = 80_000_000;
export function serializeBackup(catalog: Catalog): string {
  const text = JSON.stringify(catalogSchema.parse(catalog), null, 2);
  if (new TextEncoder().encode(text).byteLength > MAX_BACKUP_BYTES) throw new Error('O catálogo excede 80 MB. Remova fotos ou use imagens menores para preservar o backup.');
  return text;
}
export function parseBackup(text: string): Catalog {
  if (new TextEncoder().encode(text).byteLength > MAX_BACKUP_BYTES) throw new Error('Backup muito grande. O limite é 80 MB.');
  return catalogSchema.parse(JSON.parse(text));
}
export const formatPrice = (value: number | null) => value === null ? 'Sob consulta' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
export const coverOf = (p: Plant) => p.galeria.find(i => i.id === p.capaId) ?? p.galeria[0];
const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
export function filterPlants(plants: Plant[], query: string, category: string, species: string, status: string) {
  return plants.filter(p => (!category || p.categoria === category) && (!species || p.especieCientifica === species) && (!status || p.status === status) && normalize([p.nomePopular, p.codigo, p.especieCientifica, p.categoria].join(' ')).includes(normalize(query.trim())));
}
export function contactMessage(plant: Plant, settings: Settings, origin: string) {
  const photo = coverOf(plant)?.url ?? '';
  const values: Record<string, string> = {
    nome: plant.nomePopular, codigo: plant.codigo, especie: plant.especieCientifica || 'Espécie a confirmar',
    idade: plant.idadeEstimada || 'Idade a confirmar', preco: formatPrice(plant.preco),
    foto: photo.startsWith('data:') ? 'foto disponível em Compartilhar Ficha c/ Foto' : new URL(photo, origin).href,
    link: plantLink(plant, origin),
  };
  // Templates saved before {link} existed still carry the direct link to the plant.
  const template = settings.messageTemplate.includes('{link}') ? settings.messageTemplate : `${settings.messageTemplate}\nFicha: {link}`;
  return template.replace(/\{(nome|codigo|especie|idade|preco|foto|link)\}/g, (_, key: string) => values[key]);
}
export function buildWhatsappUrl(plant: Plant, settings: Settings, origin: string) {
  const phone = settings.whatsapp.replace(/\D/g, '');
  if (!/^[1-9]\d{9,14}$/.test(phone)) throw new Error('O WhatsApp ainda não foi configurado. Na curadoria, informe o número com código do país e DDD.');
  return `https://wa.me/${phone}?text=${encodeURIComponent(contactMessage(plant, settings, origin))}`;
}
export function duplicatePlant(plant: Plant, plants: Plant[]): Plant {
  const copy = structuredClone(plant);
  copy.id = crypto.randomUUID();
  let index = 1;
  while (plants.some(p => p.codigo === `${plant.codigo}-C${index}`)) index++;
  copy.codigo = `${plant.codigo}-C${index}`;
  copy.nomePopular = `${plant.nomePopular} (cópia)`;
  return copy;
}
// One entry per source photograph, preferring the uncropped record: the modal shows photos as shot.
export function rawPhotosOf(plant: Plant) {
  const byUrl = new Map<string, Plant['galeria'][number]>();
  for (const image of plant.galeria) { const current = byUrl.get(image.url); if (!current || current.crop && !image.crop) byUrl.set(image.url, image); }
  return [...byUrl.values()];
}

// Direct link to a plant sheet: site.com/#DB-001 (the hash opens the modal on load).
export const plantHash = (plant: Plant) => encodeURIComponent(plant.codigo.trim().replace(/^#/, ''));
export const plantLink = (plant: Plant, origin: string) => `${origin}/#${plantHash(plant)}`;
export function plantFromHash(plants: Plant[], hash: string) {
  let code: string;
  try { code = decodeURIComponent(hash.replace(/^#/, '')).trim().replace(/^#/, '').toLowerCase(); } catch { return undefined; }
  return code ? plants.find(p => p.codigo.trim().replace(/^#/, '').toLowerCase() === code) : undefined;
}

// Indicators on a 1–5 scale. Records saved before the scale existed fall back to the 1–3 levels and texts.
export function indicatorsOf(plant: Plant): Required<Indicators> {
  const fromThree = (n?: number) => n ? [1, 3, 5][n - 1] : 0;
  const sol = plant.indicadores?.sol ?? (fromThree(plant.solarNivel) || (/sol pleno/i.test(plant.ambiente) ? 5 : /meia/i.test(plant.ambiente) ? 3 : /sombra/i.test(plant.ambiente) ? 2 : 0));
  const cuidado = plant.indicadores?.cuidado ?? (fromThree(plant.cuidadoNivel) || (/iniciante/i.test(plant.nivelCuidado) ? 1 : /intermedi/i.test(plant.nivelCuidado) ? 3 : /avan/i.test(plant.nivelCuidado) ? 5 : 0));
  const rega = plant.indicadores?.rega ?? (/di[aá]ri/i.test(plant.rega) ? 4 : /semanal/i.test(plant.rega) ? 2 : plant.rega ? 3 : 0);
  return { sol, rega, cuidado };
}
