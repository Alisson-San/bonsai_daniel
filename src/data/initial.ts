import { defaultFraming } from '../lib/schema.ts';
import type { Catalog, Plant } from '../lib/schema.ts';

export const defaultTemplate = 'Olá Daniel! Estava navegando no catálogo e tenho interesse no exemplar: *{nome} - {codigo}* ({especie} - {idade} - Valor: {preco}). Foto de referência: {foto}. Ficha: {link}. Poderia me passar mais detalhes?';
export function newPlant(): Plant {
  const id = crypto.randomUUID();
  return { framing: {...defaultFraming}, id, codigo: `#DB-${id.slice(0, 6).toUpperCase()}`, nomePopular: '', especieCientifica: '', categoria: 'Pré-Bonsai de Engorda', idadeEstimada: '', alturaCm: null, larguraNebariCm: null, estilo: '', ambiente: '', nivelCuidado: '', rega: '', preco: null, status: 'disponivel', descricao: '', galeria: [], capaId: '' };
}
export const initialCatalog: Catalog = {
  version: 1,
  categories: ['Pré-Bonsai de Engorda', 'Bonsai Formado', 'Exemplar de Coleção / Mestre', 'Shohin'],
  species: [],
  settings: {
    heroEyebrow: 'BONSAI DANIEL BOURSCHEID',
    heroTitle: 'Bonsaísta há 15 anos.',
    heroDescription: 'Diversos cursos, workshops e premiações em eventos e exposições.\nAbaixo, alguns bonsai e pré-bonsai da coleção que estão à venda. A lista é atualizada toda semana.',
    bioTitle: 'Cultivar é aprender\na respeitar o tempo.',
    // Text pending from Daniel; the paragraph stays hidden while empty.
    bio: '',
    whatsapp: '', instagram: '', location: '', messageTemplate: defaultTemplate,
  },
  plants: [1, 2].map((n): Plant => ({
    framing: {...defaultFraming}, id: `db-00${n}`, codigo: `#DB-00${n}`, nomePopular: n === 1 ? 'Ficus Microcarpa — Tronco Esculpido' : 'Ficus Retusa — Tronco Duplo',
    especieCientifica: n === 1 ? 'Ficus microcarpa' : 'Ficus retusa', categoria: 'Pré-Bonsai de Engorda', idadeEstimada: n === 1 ? '~15 anos' : '~18 anos', alturaCm: n === 1 ? 48 : 52, larguraNebariCm: n === 1 ? 24 : 28,
    estilo: n === 1 ? 'Moyogi / Tronco Esculpido' : 'Sokan (Tronco Duplo)', ambiente: 'Sol Pleno (Externo)', nivelCuidado: n === 1 ? 'Iniciante / Muito Resistente' : 'Iniciante / Vigor Alto', rega: 'Diária no verão (substrato drenante pedrisco/caqueira)', cuidadoNivel: 2, solarNivel: 3, preco: n === 1 ? 1850 : 2400, status: 'disponivel',
    descricao: n === 1 ? 'Ficus microcarpa em fase de engorda, com tronco esculpido e nebari de 24 cm. Aproximadamente 15 anos de desenvolvimento. A fotografia com a mão permite observar a escala real do tronco.' : 'Ficus retusa em fase de engorda, conduzido em estilo Sokan, de tronco duplo. Aproximadamente 18 anos e nebari de 28 cm. Conheça o porte do exemplar na fotografia com referência humana.',
    galeria: [
      { id: `photo-${n}`, url: `/images/bonsai_0${n}.jpeg`, anguloTag: 'Escala Real (Comparação Humana)', label: 'Visão Geral (Escala Humana)' },
      { id: `photo-${n}-nebari`, url: `/images/bonsai_0${n}.jpeg`, anguloTag: 'Detalhe de Tronco / Nebari', label: 'Close-up Nebari & Base', crop: { scale: 2.05, x: 50, y: 65 } },
      { id: `photo-${n}-copa`, url: `/images/bonsai_0${n}.jpeg`, anguloTag: 'Frente (Omote)', label: 'Detalhe de Copa & Brotação', crop: { scale: 1.85, x: 52, y: 25 } },
    ], capaId: `photo-${n}`,
  })),
};
