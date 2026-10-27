import type { Plant } from './schema';
import { coverOf } from './catalog';

export async function fileToImage(file: File): Promise<string> {
  if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) throw new Error('Escolha uma imagem JPEG, PNG, WebP ou GIF.');
  if (file.size > 8_000_000) throw new Error('Cada imagem pode ter até 8 MB.');
  const data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Não foi possível ler a imagem.'));
    reader.readAsDataURL(file);
  });
  await new Promise<void>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('O arquivo não contém uma imagem válida.'));
    img.src = data;
  });
  return data;
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
