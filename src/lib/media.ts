import type { Plant } from './schema';
import { coverOf } from './catalog';

// Photos are reduced in the browser before anything else: a phone photo (4000 px, ~5 MB) becomes at most 2000 px on
// the long side, ~300–600 KB, which is plenty for the site and keeps saving fast. Images with transparency (cut-outs)
// stay WebP with alpha; the rest become JPEG. GIFs are kept as they are (animation).
const MAX_SIDE = 2000;
export async function fileToImage(file: File): Promise<string> {
  if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) throw new Error('Escolha uma imagem JPEG, PNG, WebP ou GIF.');
  if (file.size > 40_000_000) throw new Error('Cada imagem pode ter até 40 MB.');
  const data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Não foi possível ler a imagem.'));
    reader.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('O arquivo não contém uma imagem válida.'));
    image.src = data;
  });
  if (file.type === 'image/gif') { if (file.size > 8_000_000) throw new Error('GIFs podem ter até 8 MB.'); return data; }
  const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(img.naturalWidth * scale)); canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
  const context = canvas.getContext('2d');
  if (!context) return data;
  context.drawImage(img, 0, 0, canvas.width, canvas.height);
  const transparent = file.type !== 'image/jpeg' && context.getImageData(0, 0, canvas.width, canvas.height).data.some((value, index) => index % 4 === 3 && value < 255);
  const reduced = transparent ? canvas.toDataURL('image/webp', .9) : canvas.toDataURL('image/jpeg', .86);
  // Browsers without WebP encoding return PNG; keep whichever is smaller.
  return reduced.length < data.length ? reduced : data;
}
export function downloadFile(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
export async function preparePhoto(plant: Plant): Promise<File> {
  const response = await fetch(coverOf(plant).url, { signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw new Error('Não foi possível carregar a foto para compartilhar.');
  const blob = await response.blob();
  if (!/^image\/(jpeg|png|webp|gif)$/.test(blob.type)) throw new Error('Formato de imagem não compatível com compartilhamento.');
  const extension = blob.type.split('/')[1];
  return new File([blob], `bonsai-${plant.id}.${extension}`, { type: blob.type });
}
