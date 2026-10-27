import type { Plant } from '../lib/schema.ts';
export const previousSeeds: Plant[] = [1, 2].map((n): Plant => ({
    id: `db-00${n}`, codigo: `#DB-00${n}`, nomePopular: n === 1 ? 'Ficus Microcarpa (Tronco Esculpido)' : 'Ficus Retusa (Estilo Sokan / Tronco Duplo)',
    especieCientifica: n === 1 ? 'Ficus microcarpa' : 'Ficus retusa', categoria: 'Pré-Bonsai de Engorda', idadeEstimada: n === 1 ? '~15 anos' : '~18 anos', alturaCm: null, larguraNebariCm: n === 1 ? 24 : 28,
    estilo: n === 1 ? 'Tronco esculpido' : 'Sokan / Tronco duplo', ambiente: '', nivelCuidado: '', rega: '', preco: n === 1 ? 1850 : 2400, status: 'disponivel',
    descricao: n === 1 ? 'Ficus microcarpa em fase de engorda, com tronco esculpido e nebari de 24 cm. Aproximadamente 15 anos de desenvolvimento. A fotografia com a mão permite observar a escala real do tronco.' : 'Ficus retusa em fase de engorda, conduzido em estilo Sokan, de tronco duplo. Aproximadamente 18 anos e nebari de 28 cm. Conheça o porte do exemplar na fotografia com referência humana.',
    galeria: [{ id: `photo-${n}`, url: `/images/bonsai_0${n}.jpeg`, anguloTag: 'Escala Real (Comparação Humana)' }], capaId: `photo-${n}`,
  }));
