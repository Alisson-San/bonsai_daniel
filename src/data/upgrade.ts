import type { Catalog, Settings } from '../lib/schema.ts';
import { initialCatalog } from './initial.ts';
import { previousSeeds } from './previous.ts';
// Texts the site shipped with before. A saved catalog still holding one of them gets the current default; any text
// the curator changed is kept.
const previousSettings: Partial<Record<keyof Settings, string[]>> = {
 heroTitle: ['O tempo transforma.\nO cuidado revela.'],
 heroDescription: ['Entre raízes, formas e estações, cada árvore guarda uma história. Encontre o próximo capítulo da sua coleção.'],
 bio: ['Um espaço dedicado à arte do bonsai e à beleza que se constrói aos poucos. Conheça os exemplares da coleção de Daniel Bourscheid e acompanhe cada nova possibilidade de cultivo.'],
};
function upgradeSettings(settings: Settings): Settings {
 const next = { ...settings };
 for (const [key, old] of Object.entries(previousSettings) as [keyof Settings, string[]][]) if (old.includes(next[key] as string)) Object.assign(next, { [key]: initialCatalog.settings[key] });
 return next;
}
// Match whole published records. Never merge defaults into customized/deleted plants.
export function upgradeSeed(catalog: Catalog): Catalog {
 return { ...catalog, settings: upgradeSettings(catalog.settings), plants: catalog.plants.map(plant => {
  const seed=initialCatalog.plants.find(p=>p.id===plant.id);
  const previous=previousSeeds.find(p=>p.id===plant.id);
  if(!seed||!previous)return plant;
  const legacy={...previous,nomePopular:plant.id==='db-001'?'Exemplar 01':'Exemplar 02',especieCientifica:'',idadeEstimada:'',alturaCm:null,larguraNebariCm:null,estilo:'',ambiente:'',nivelCuidado:'',rega:'',preco:null,descricao:'Exemplar do acervo de Daniel Bourscheid. Entre em contato para conhecer a espécie, as medidas e os detalhes do cultivo.'};
  // Fields added later (indicadores, fotoVitrine…) mean the record was customized and must be kept.
  const onlySeedKeys=Object.keys(plant).every(key=>key in seed);
  if(plant.stage===undefined && onlySeedKeys && Object.entries(seed).filter(([key])=>key!=='stage').every(([key,value])=>JSON.stringify(plant[key as keyof typeof plant])===JSON.stringify(value))) return structuredClone(seed);
  const matches=(source: typeof previous)=>Object.entries(source).every(([key,value])=>JSON.stringify(plant[key as keyof typeof plant])===JSON.stringify(value)) && plant.stage===undefined && plant.cuidadoNivel===undefined && plant.solarNivel===undefined;
  return matches(previous)||matches(legacy)?structuredClone(seed):plant;
 }) };
}
