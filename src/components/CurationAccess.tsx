import { useEffect, useState, type FormEvent } from 'react';
import { LockKeyhole } from 'lucide-react';
import Modal from './Modal';
import { isAdmin, supabase } from '../lib/supabase';

export type AccessMode = 'entrar' | 'criar' | 'recuperar' | 'nova-senha';
type Props = { mode?: AccessMode; onClose: () => void; onEnter: () => void; notify: (message: string) => void };

// Sign-in for the curation. Accounts are Supabase Auth users; only confirmed e-mails listed in public.admins may edit.
// "criar" makes the first password (confirmed by e-mail), "recuperar" sends a reset link, "nova-senha" comes back
// from that link.
export default function CurationAccess({ mode: initialMode = 'entrar', onClose, onEnter, notify }: Props) {
  const [mode, setMode] = useState<AccessMode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [signedIn, setSignedIn] = useState<string | null>(null);
  // Already signed in as an admin: go straight to the curation.
  useEffect(() => {
    if (initialMode === 'nova-senha') return;
    let cancelled = false;
    void (async () => {
      const db = await supabase();
      const { data: { session } } = await db.auth.getSession();
      if (cancelled || !session) return;
      if (await isAdmin()) { if (!cancelled) onEnter(); } else if (!cancelled) setSignedIn(session.user.email ?? '');
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
        if (await isAdmin()) { notify('Curadoria aberta.'); onEnter(); } else { setSignedIn(email); setMessage('Esta conta não tem acesso à curadoria.'); }
      } else if (mode === 'criar') {
        const { error } = await db.auth.signUp({ email, password, options: { emailRedirectTo: redirectTo } });
        setMessage(error ? 'Não foi possível criar a senha. Use ao menos 8 caracteres e confira o e-mail.' : 'Enviamos um e-mail de confirmação. Abra o link e depois entre com o e-mail e a senha.');
      } else if (mode === 'recuperar') {
        const { error } = await db.auth.resetPasswordForEmail(email, { redirectTo });
        setMessage(error ? 'Não foi possível enviar o e-mail agora. Tente de novo em alguns minutos.' : 'Se o e-mail tiver conta, enviamos um link para criar uma nova senha.');
      } else {
        const { error } = await db.auth.updateUser({ password });
        if (error) { setMessage('Não foi possível salvar a nova senha. Use ao menos 8 caracteres.'); return; }
        notify('Senha atualizada.');
        if (await isAdmin()) onEnter(); else onClose();
      }
    } catch { setMessage('Sem conexão com o servidor. Tente de novo.'); }
    finally { setBusy(false); }
  };
  const signOut = async () => { await (await supabase()).auth.signOut(); setSignedIn(null); setMessage(''); };
  const titles: Record<AccessMode, string> = { entrar: 'Entrar na curadoria', criar: 'Criar senha', recuperar: 'Recuperar senha', 'nova-senha': 'Nova senha' };
  return <Modal title={titles[mode]} onClose={onClose}>
    <form className="curation-intro curation-access" onSubmit={e => void submit(e)}>
      <span className="round-icon"><LockKeyhole size={25} /></span>
      <span className="eyebrow">CURADORIA</span>
      <h2>{titles[mode]}</h2>
      {signedIn ? <>
        <p>Você entrou como <strong>{signedIn}</strong>, que não tem acesso à curadoria.</p>
        <button type="button" className="button button-outline full" onClick={() => void signOut()}>Sair desta conta</button>
      </> : <>
        <p>{mode === 'criar' ? 'Primeiro acesso: defina a senha do e-mail autorizado.' : mode === 'recuperar' ? 'Informe o e-mail da curadoria para receber o link.' : mode === 'nova-senha' ? 'Escolha a nova senha da curadoria.' : 'As alterações ficam salvas no banco de dados e aparecem para todos os visitantes.'}</p>
        {mode !== 'nova-senha' && <label>E-mail<input type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} /></label>}
        {mode !== 'recuperar' && <label>Senha<input type="password" autoComplete={mode === 'entrar' ? 'current-password' : 'new-password'} minLength={8} required value={password} onChange={e => setPassword(e.target.value)} /></label>}
        {message && <p className="access-message" role="status">{message}</p>}
        <button className="button button-gold full" disabled={busy}>{busy ? 'Aguarde…' : mode === 'entrar' ? 'Entrar' : mode === 'criar' ? 'Criar senha' : mode === 'recuperar' ? 'Enviar link' : 'Salvar senha'}</button>
        {mode !== 'nova-senha' && <div className="access-links">
          {mode !== 'entrar' && <button type="button" className="text-link" onClick={() => { setMode('entrar'); setMessage(''); }}>Já tenho senha</button>}
          {mode !== 'criar' && <button type="button" className="text-link" onClick={() => { setMode('criar'); setMessage(''); }}>Primeiro acesso</button>}
          {mode !== 'recuperar' && <button type="button" className="text-link" onClick={() => { setMode('recuperar'); setMessage(''); }}>Esqueci a senha</button>}
        </div>}
      </>}
      {message && signedIn && <p className="access-message" role="status">{message}</p>}
    </form>
  </Modal>;
}
