import { useState, type FormEvent } from 'react';
import { Save } from 'lucide-react';
import Modal from './Modal';
import { settingsSchema, type Settings } from '../lib/schema';
import { defaultTemplate } from '../data/initial';

export default function SettingsEditor({ settings, onClose, onSave }: { settings: Settings; onClose: () => void; onSave: (s: Settings) => Promise<boolean> }) {
  const [draft, setDraft] = useState(settings);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const close = () => { if (!busy && (JSON.stringify(draft) === JSON.stringify(settings) || confirm('Descartar alterações de contato?'))) onClose(); };
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setError('');
    if (draft.whatsapp && !/^[1-9]\d{9,14}$/.test(draft.whatsapp.replace(/\D/g, ''))) { setError('Informe o telefone com código do país e DDD, por exemplo +55 47 99999-9999.'); return; }
    const result = settingsSchema.safeParse(draft);
    if (!result.success) { setError('Confira os campos e o texto da mensagem.'); return; }
    setBusy(true); try { if (await onSave(result.data)) onClose(); } finally { setBusy(false); }
  };
  return <Modal title="Configurações de contato" onClose={close}><form className="settings-form" onSubmit={e => void submit(e)}><span className="eyebrow">CURADORIA</span><h2>Vamos conversar.</h2><p>Configure os caminhos entre sua coleção e quem deseja conhecê-la.</p><label>WhatsApp (código do país + DDD)<input type="tel" value={draft.whatsapp} placeholder="+55 47 99999-9999" onChange={e => setDraft({ ...draft, whatsapp: e.target.value })} /></label><label>Instagram (usuário)<input value={draft.instagram} placeholder="@seu.perfil" onChange={e => setDraft({ ...draft, instagram: e.target.value.replace(/^@/, '') })} /></label><label>Localização<input value={draft.location} placeholder="Cidade, Estado" onChange={e => setDraft({ ...draft, location: e.target.value })} /></label><label>Mensagem de interesse<textarea rows={6} value={draft.messageTemplate} onChange={e => setDraft({ ...draft, messageTemplate: e.target.value })} /></label><p className="small muted">Variáveis: {'{nome}, {codigo}, {especie}, {idade}, {preco}, {foto}'}</p><button className="text-link" type="button" onClick={() => setDraft({ ...draft, messageTemplate: defaultTemplate })}>Restaurar mensagem padrão</button>{error && <p className="form-error" role="alert">{error}</p>}<div className="editor-actions"><button type="button" className="button button-outline" disabled={busy} onClick={close}>Cancelar</button><button className="button button-gold" disabled={busy}><Save size={16} />{busy ? 'Salvando…' : 'Salvar contato'}</button></div></form></Modal>;
}
