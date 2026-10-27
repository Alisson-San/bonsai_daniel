import Editable from './Editable';
import { formatPrice } from '../lib/catalog';
import type { Plant } from '../lib/schema';
export type EditablePlantField = 'nomePopular' | 'especieCientifica' | 'descricao' | 'preco';
export type SavePlantField = (id: string, field: EditablePlantField, value: string | number | null) => Promise<boolean>;
export default function PlantInline({ plant, field, editing, onSave }: { plant: Plant; field: EditablePlantField; editing: boolean; onSave: SavePlantField }) {
 const labels = { nomePopular: 'nome do exemplar', especieCientifica: 'espécie', descricao: 'descrição', preco: 'preço em reais' };
 const value = plant[field];
 const display = field === 'preco' ? formatPrice(plant.preco) : String(value || (field === 'especieCientifica' ? 'Espécie a confirmar' : 'Adicionar descrição'));
 return <Editable value={value === null ? '' : String(value)} displayValue={display} editing={editing} label={`${labels[field]} ${plant.codigo}`} multiline={field === 'descricao'} inputType={field === 'preco' ? 'number' : 'text'} onSave={raw => onSave(plant.id,field,field === 'preco' ? raw.trim() === '' ? null : Number(raw) : raw)} />;
}
