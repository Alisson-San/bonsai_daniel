import { useEffect, useState, type FormEvent } from 'react';
import { LockKeyhole } from 'lucide-react';
import Modal from './Modal';
import { NOT_SITE_ADMIN, requireSiteAdmin, supabase } from '../lib/supabase';

export type AccessMode = 'entrar' | 'recuperar' | 'nova-senha';
type Props = { mode?: AccessMode; onClose: () => void; onEnter: () => void; notify: (message: string) => void };

// Sign-in for the curation. Accounts are Supabase Auth users; only admins of this site (public.is_site_admin('bonsai')) may edit;
// accounts of other sites are signed out at once. New curators are added in the curation ("Administradores"); the
// invite and the reset link both come back here as "nova-senha". "recuperar" sends the reset link.
export default function CurationAccess({ mode: initialMode = 'entrar', onClose, onEnter, notify }: Props) {
  const [mode, setMode] = useState<AccessMode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  // Already signed in as an admin: go straight to the curation.
  useEffect(() => {
    if (initialMode === 'nova-senha') return;
    let cancelled = false;
    void (async () => {
      const db = await supabase();
      const { data: { session } } = await db.auth.getSession();
      if (cancelled || !session) return;
      const ok = await requireSiteAdmin();
      if (cancelled) return;
      if (ok) onEnter(); else setMessage(NOT_SITE_ADMIN);
    })().catch(() => {});
    return () => { cancelled = true; };
  }, []);
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setMessage(''); setBusy(true);
    try {
      const db = await supabase(), redirectTo = location.origin;
      if (mode === 'entrar') {
        const { error } = await db.auth.signInWithPassword({ email, password });
        if (error) { setMessage(error.message.includes('confirmed') ? 'Confirme o e-mail pelo link que enviamos antes de entrar.' : 'E-mail ou senha incorretos.'); return; }
        if (await requireSiteAdmin()) { notify('Curadoria aberta.'); onEnter(); } else { setPassword(''); setMessage(NOT_SITE_ADMIN); }
      } else if (mode === 'recuperar') {
        const { error } = await db.auth.resetPasswordForEmail(email, { redirectTo });
        setMessage(error ? 'Não foi possível enviar o e-mail agora. Tente de novo em alguns minutos.' : 'Se o e-mail tiver conta, enviamos um link para criar uma nova senha.');
      } else {
        const { error } = await db.auth.updateUser({ password });
        if (error) { setMessage('Não foi possível salvar a senha. Use ao menos 10 caracteres, misturando letras e números.'); return; }
        notify('Senha atualizada.');
        if (await requireSiteAdmin()) onEnter(); else { notify(NOT_SITE_ADMIN); onClose(); }
      }
    } catch { setMessage('Sem conexão com o servidor. Tente de novo.'); }
    finally { setBusy(false); }
  };
  const titles: Record<AccessMode, string> = { entrar: 'Entrar na curadoria', recuperar: 'Recuperar senha', 'nova-senha': 'Definir senha' };
  return <Modal title={titles[mode]} onClose={onClose}>
    <form className="curation-intro curation-access" onSubmit={e => void submit(e)}>
      <span className="round-icon"><LockKeyhole size={25} /></span>
      <span className="eyebrow">CURADORIA</span>
      <h2>{titles[mode]}</h2>
        <p>{mode === 'recuperar' ? 'Informe o e-mail da curadoria para receber o link.' : mode === 'nova-senha' ? 'Escolha a senha da curadoria (mínimo de 10 caracteres).' : 'As alterações ficam salvas no banco de dados e aparecem para todos os visitantes.'}</p>
        {mode !== 'nova-senha' && <label>E-mail<input type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} /></label>}
        {mode !== 'recuperar' && <label>Senha<input type="password" autoComplete={mode === 'entrar' ? 'current-password' : 'new-password'} minLength={mode === 'nova-senha' ? 10 : 8} required value={password} onChange={e => setPassword(e.target.value)} /></label>}
        {message && <p className="access-message" role="status">{message}</p>}
        <button className="button button-gold full" disabled={busy}>{busy ? 'Aguarde…' : mode === 'entrar' ? 'Entrar' : mode === 'recuperar' ? 'Enviar link' : 'Salvar senha'}</button>
        {mode !== 'nova-senha' && <div className="access-links">
          {mode !== 'entrar' && <button type="button" className="text-link" onClick={() => { setMode('entrar'); setMessage(''); }}>Já tenho senha</button>}
          {mode !== 'recuperar' && <button type="button" className="text-link" onClick={() => { setMode('recuperar'); setMessage(''); }}>Esqueci a senha</button>}
        </div>}
    </form>
  </Modal>;
}
