import { useEffect, useState, type FormEvent } from 'react';
import { KeyRound, Trash2, UserPlus } from 'lucide-react';
import Modal from './Modal';
import { SITE, siteAdmins, supabase, type SiteAdmin } from '../lib/supabase';

const MIN_PASSWORD = 10;

// Admin management for this site (curation only): lists the admins, adds one (e-mail + password) through the
// "site-admins" Edge Function, removes one, and lets the signed-in curator change their own password.
export default function AdminManager({ onClose, notify }: { onClose: () => void; notify: (message: string) => void }) {
  const [admins, setAdmins] = useState<SiteAdmin[] | null>(null);
  const [me, setMe] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [again, setAgain] = useState('');
  const [own, setOwn] = useState('');
  const [ownConfirm, setOwnConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [ownMessage, setOwnMessage] = useState('');
  const load = async () => {
    try { setAdmins((await siteAdmins({ action: 'list' })).admins ?? []); setMessage(''); }
    catch (error) { setAdmins(current => current ?? []); setMessage(error instanceof Error ? error.message : 'Não foi possível listar os administradores.'); }
  };
  useEffect(() => {
    void load();
    void supabase().then(db => db.auth.getSession()).then(({ data }) => setMe(data.session?.user.email ?? '')).catch(() => {});
  }, []);
  const add = async (event: FormEvent) => {
    event.preventDefault(); setMessage('');
    if (password.length < MIN_PASSWORD) { setMessage(`A senha precisa ter ao menos ${MIN_PASSWORD} caracteres.`); return; }
    if (password !== again) { setMessage('As senhas não coincidem.'); return; }
    setBusy(true);
    try {
      const result = await siteAdmins({ action: 'add', email: email.trim(), password });
      notify(result.existingAccount ? 'Administrador adicionado. A pessoa já tinha conta e mantém a senha atual.' : 'Administrador adicionado.');
      if (result.existingAccount) setMessage('Esta pessoa já tinha conta: a senha informada não foi alterada e ela entra com a senha que já usa.');
      setEmail(''); setPassword(''); setAgain(''); await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Não foi possível adicionar agora.'); }
    finally { setBusy(false); }
  };
  const remove = async (admin: SiteAdmin) => {
    if (!confirm(`Remover ${admin.email} da administração do site?`)) return;
    setBusy(true); setMessage('');
    try { await siteAdmins({ action: 'remove', email: admin.email }); notify('Administrador removido.'); await load(); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Não foi possível remover agora.'); }
    finally { setBusy(false); }
  };
  const changeOwn = async (event: FormEvent) => {
    event.preventDefault(); setOwnMessage('');
    if (own.length < MIN_PASSWORD) { setOwnMessage(`A senha precisa ter ao menos ${MIN_PASSWORD} caracteres.`); return; }
    if (own !== ownConfirm) { setOwnMessage('As senhas não coincidem.'); return; }
    setBusy(true);
    try {
      const { error } = await (await supabase()).auth.updateUser({ password: own });
      if (error) { setOwnMessage('Não foi possível salvar a senha. Use ao menos 10 caracteres, misturando letras e números.'); return; }
      setOwn(''); setOwnConfirm(''); notify('Sua senha foi atualizada.');
    } catch { setOwnMessage('Sem conexão com o servidor. Tente de novo.'); }
    finally { setBusy(false); }
  };
  return <Modal title="Administradores" onClose={onClose}>
    <div className="curation-intro curation-access admin-manager">
      <span className="round-icon"><UserPlus size={25} /></span>
      <span className="eyebrow">CURADORIA</span>
      <h2>Administradores</h2>
      <p>Quem pode editar o site <strong>{SITE}</strong>. A conta do responsável pela plataforma não aparece aqui.</p>
      <ul className="admin-list" aria-label="Administradores do site" aria-busy={!admins}>
        {!admins && <li className="admin-empty">Carregando…</li>}
        {admins?.length === 0 && <li className="admin-empty">Nenhum administrador listado.</li>}
        {admins?.map(admin => <li key={admin.email}>
          <span><strong>{admin.email}</strong>{admin.email === me && <small> (você)</small>}{!admin.has_account && <small> · ainda sem conta</small>}</span>
          {admin.email !== me && <button type="button" className="icon-button" aria-label={`Remover ${admin.email}`} title="Remover" disabled={busy} onClick={() => void remove(admin)}><Trash2 size={16} /></button>}
        </li>)}
      </ul>
      <form className="admin-form" onSubmit={e => void add(e)}>
        <h3>Adicionar administrador</h3>
        <label>E-mail<input type="email" autoComplete="off" required value={email} onChange={e => setEmail(e.target.value)} /></label>
        <label>Senha inicial<input type="password" autoComplete="new-password" minLength={MIN_PASSWORD} required value={password} onChange={e => setPassword(e.target.value)} /></label>
        <label>Confirmar senha<input type="password" autoComplete="new-password" minLength={MIN_PASSWORD} required value={again} onChange={e => setAgain(e.target.value)} /></label>
        <small className="admin-hint">Mínimo de {MIN_PASSWORD} caracteres. Se a pessoa já tiver conta, ela mantém a senha atual.</small>
        {message && <p className="access-message" role="status">{message}</p>}
        <button className="button button-gold full" disabled={busy}>{busy ? 'Aguarde…' : 'Adicionar'}</button>
      </form>
      <form className="admin-form" onSubmit={e => void changeOwn(e)}>
        <h3><KeyRound size={15} /> Alterar minha senha</h3>
        <label>Nova senha<input type="password" autoComplete="new-password" minLength={MIN_PASSWORD} required value={own} onChange={e => setOwn(e.target.value)} /></label>
        <label>Confirmar nova senha<input type="password" autoComplete="new-password" minLength={MIN_PASSWORD} required value={ownConfirm} onChange={e => setOwnConfirm(e.target.value)} /></label>
        {ownMessage && <p className="access-message" role="status">{ownMessage}</p>}
        <button className="button button-outline full" disabled={busy}>Salvar minha senha</button>
      </form>
    </div>
  </Modal>;
}
