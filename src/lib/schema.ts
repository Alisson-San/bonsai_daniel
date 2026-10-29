import { z } from 'zod';

export const angles = ['Frente (Omote)', 'Costas (Ura)', 'Detalhe de Tronco / Nebari', 'Escala Real (Comparação Humana)'] as const;
export const statuses = ['disponivel', 'reservado', 'vendido'] as const;
export const statusLabels = { disponivel: 'Disponível', reservado: 'Reservado', vendido: 'Vendido' };
export const safeImageUrl = (url: string) => /^\/images\/[\w.-]+$/.test(url) || /^https?:\/\//i.test(url) && (() => { try { const u = new URL(url); return !!u.hostname && !u.username && !u.password; } catch { return false; } })() || /^data:image\/(jpeg|png|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(url);
const shortText = z.string().trim().max(200);
export const defaultTexts = {
  bioPageLead: 'Bonsaísta há 15 anos, com diversos cursos, workshops e premiações em eventos e exposições.',
  bioHighlights: '15 anos | dedicados ao bonsai\nCursos e workshops | estudo e prática constantes\nPremiações | em eventos e exposições',
  purchaseSteps: 'Escolha | Veja as fotos reais, as medidas e o valor de cada exemplar.\nConverse | Toque em Tenho interesse e fale direto com o Daniel pelo WhatsApp: tire dúvidas e peça mais fotos.\nReserve | Combinem a forma de pagamento e o exemplar fica reservado para você.\nReceba | Embalagem cuidadosa e envio seguro para todo o Brasil.',
};
const imageSchema = z.object({ id: z.string().min(1), url: z.string().max(12_000_000).refine(safeImageUrl, 'Use uma imagem JPEG, PNG, WebP ou GIF, ou uma URL http(s).'), anguloTag: z.enum(angles), label: shortText.optional(), crop: z.object({ scale: z.number().min(1).max(4), x: z.number().min(0).max(100), y: z.number().min(0).max(100) }).optional() });
export const stageSchema = z.object({
 enabled:z.boolean(),pedestal:z.enum(['slate','wood','plinth']),offsetY:z.number().min(-15).max(15),scale:z.number().min(.65).max(1.6),cropBottomOffset:z.number().min(0).max(.45),matteStrength:z.number().min(0).max(1),
});
export type StageSettings = z.infer<typeof stageSchema>;
export const defaultStage: StageSettings = {enabled:true,pedestal:'slate',offsetY:0,scale:1,cropBottomOffset:.2,matteStrength:.35};
const level = z.number().int().min(1).max(5);
export const indicatorsSchema = z.object({ sol: level.optional(), rega: level.optional(), cuidado: level.optional() });
export type Indicators = z.infer<typeof indicatorsSchema>;
const imageUrl = z.string().max(12_000_000).refine(safeImageUrl, 'Use uma imagem JPEG, PNG, WebP ou GIF, ou uma URL http(s).');
export const photoFramingSchema=z.object({cropBottomOffset:z.number().min(0).max(.45),zoom:z.number().min(1.05).max(1.6),focusX:z.number().min(.3).max(.7)});
export type PhotoFraming=z.infer<typeof photoFramingSchema>;
export const defaultFraming:PhotoFraming={cropBottomOffset:.22,zoom:1.18,focusX:.55};
// Legacy stage settings remain importable for backup compatibility; never used for rendering.
export const plantSchema = z.object({
  // fotoVitrine: cut-out PNG/WebP prepared outside the site; never shown in the detail modal.
  fotoVitrine: imageUrl.optional(), indicadores: indicatorsSchema.optional(),
  framing:photoFramingSchema.optional(), stage: stageSchema.optional(), id: z.string().min(1), codigo: shortText.min(1), nomePopular: shortText.min(1), especieCientifica: shortText,
  categoria: shortText.min(1), idadeEstimada: shortText, alturaCm: z.number().nonnegative().nullable(), larguraNebariCm: z.number().nonnegative().nullable(),
  estilo: shortText, ambiente: shortText, nivelCuidado: shortText, rega: shortText.default(''), cuidadoNivel: z.number().int().min(1).max(3).optional(), solarNivel: z.number().int().min(1).max(3).optional(),
  preco: z.number().nonnegative().nullable(), status: z.enum(statuses), descricao: z.string().max(12000),
  galeria: z.array(imageSchema).min(1).max(24), capaId: z.string().min(1),
}).refine(p => p.galeria.some(i => i.id === p.capaId), 'Selecione uma capa da galeria.')
  .refine(p => new Set(p.galeria.map(i => i.id)).size === p.galeria.length, 'Imagens com identificador duplicado.');
export const settingsSchema = z.object({
  heroEyebrow: shortText, heroTitle: shortText, heroDescription: z.string().max(2000),
  bioTitle: shortText, bio: z.string().max(6000), whatsapp: shortText,
  instagram: shortText, location: shortText, messageTemplate: z.string().min(1).max(4000), fotoCultivador: imageUrl.optional(),
  // Biography page (/biografia). Defaults keep older catalogs and backups valid.
  bioPageLead: z.string().max(2000).default(defaultTexts.bioPageLead),
  bioStory: z.string().max(20000).default(''),
  // One highlight per line: "headline | detail".
  bioHighlights: z.string().max(2000).default(defaultTexts.bioHighlights),
  // One milestone per line: "year | title | text".
  bioMilestones: z.string().max(12000).default(''),
  // Home page: buying steps ("title | text") and testimonials ("quote | name | city"), one per line.
  purchaseSteps: z.string().max(4000).default(defaultTexts.purchaseSteps),
  testimonials: z.string().max(12000).default(''),
  bioGallery: z.array(z.object({ id: z.string().min(1), url: imageUrl, legenda: shortText.default('') })).max(24).default([]),
});
export const catalogSchema = z.object({
  version: z.literal(1), plants: z.array(plantSchema).max(500), settings: settingsSchema,
  categories: z.array(shortText.min(1)).max(100), species: z.array(shortText.min(1)).max(200),
}).refine(c => new Set(c.plants.map(p => p.id)).size === c.plants.length, 'Identificadores de exemplares duplicados.')
  .refine(c => new Set(c.plants.map(p => p.codigo.trim().toLowerCase())).size === c.plants.length, 'Códigos de exemplares duplicados.');
export type Plant = z.infer<typeof plantSchema>;
export type Settings = z.infer<typeof settingsSchema>;
export type Catalog = z.infer<typeof catalogSchema>;
