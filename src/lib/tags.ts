import type { Catalog } from './schema.ts';

export type TagKind = 'categories' | 'species';
export const field = { categories: 'categoria', species: 'especieCientifica' } as const;
export const tagsOf = (catalog: Catalog, kind: TagKind) => [...new Set([...catalog[kind], ...catalog.plants.map(p => p[field[kind]])].filter(Boolean))];

// Pure catalog changes, so the curation can rename or remove a tag without leaving a plant pointing to nothing.
export function renameTag(catalog: Catalog, kind: TagKind, from: string, to: string): Catalog {
  const list = catalog[kind].includes(from) ? catalog[kind].map(tag => tag === from ? to : tag) : [...catalog[kind], to];
  return { ...catalog, [kind]: [...new Set(list)], plants: catalog.plants.map(p => p[field[kind]] === from ? { ...p, [field[kind]]: to } : p) };
}
// Plants using a removed tag move to `target` ('' leaves the species blank; a category is required).
export function removeTag(catalog: Catalog, kind: TagKind, tag: string, target: string): Catalog {
  const list = catalog[kind].filter(item => item !== tag);
  return { ...catalog, [kind]: target && !list.includes(target) ? [...list, target] : list, plants: catalog.plants.map(p => p[field[kind]] === tag ? { ...p, [field[kind]]: target } : p) };
}
