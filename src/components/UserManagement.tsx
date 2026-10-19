import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

type Profile = { id: string; email: string; display_name: string; role: 'admin' | 'operator'; access_status: 'active' | 'pending' | 'blocked'; created_at: string };

export const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<Profile[]>([]);
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<'admin' | 'operator'>('operator');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('user_profiles').select('id,email,display_name,role,access_status,created_at').order('created_at', { ascending: true });
    if (error) setMessage('Não foi possível carregar usuários. Confirme se a migração de acesso foi aplicada.');
    else setUsers((data || []) as Profile[]);
    setLoading(false);
  };
  useEffect(() => { void load(); }, []);

  const authorize = async (event: React.FormEvent) => {
    event.preventDefault();
    const normalized = email.trim().toLowerCase();
    if (!normalized.includes('@')) { setMessage('Informe um e-mail válido.'); return; }
    setSaving(true); setMessage('');
    const { error } = await supabase.from('authorized_emails').upsert({ email: normalized, display_name: displayName.trim(), role });
    if (error) setMessage('Falha ao autorizar e-mail: ' + error.message);
    else {
      setMessage('E-mail autorizado. Envie o link da MARISOFT; a pessoa deve criar a conta usando este mesmo e-mail.');
      setEmail(''); setDisplayName(''); setRole('operator');
    }
    setSaving(false);
  };

  const changeUser = async (id: string, patch: Partial<Pick<Profile, 'role' | 'access_status'>>) => {
    setMessage('');
    const { error } = await supabase.from('user_profiles').update(patch).eq('id', id);
    if (error) setMessage('Não foi possível alterar o usuário: ' + error.message);
    else { setMessage('Usuário atualizado.'); await load(); }
  };

  const copyLink = async () => {
    try { await navigator.clipboard.writeText(window.location.origin); setMessage('Link da MARISOFT copiado.'); }
    catch { setMessage('Copie o endereço do navegador para compartilhar: ' + window.location.origin); }
  };

  return <div className="space-y-5">
    <div className="rounded-xl border border-cyan-800 bg-cyan-950/40 p-4">
      <h2 className="text-lg font-bold text-white">Gerenciar Usuários</h2>
      <p className="mt-1 text-sm text-slate-300">Você autoriza os e-mails e controla quem pode acessar a MARISOFT.</p>
      <button type="button" onClick={copyLink} className="mt-3 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-500">Copiar link da MARISOFT</button>
    </div>
    {message && <p role="status" className="rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm text-slate-200">{message}</p>}
    <form onSubmit={authorize} className="grid gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-4 md:grid-cols-2">
      <h3 className="font-semibold text-white md:col-span-2">Autorizar novo e-mail</h3>
      <label className="text-sm text-slate-300">Nome de exibição<input required value={displayName} onChange={e=>setDisplayName(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white" placeholder="Nome da pessoa"/></label>
      <label className="text-sm text-slate-300">E-mail<input required type="email" value={email} onChange={e=>setEmail(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white" placeholder="pessoa@empresa.com"/></label>
      <label className="text-sm text-slate-300 md:col-span-2">Função<select value={role} onChange={e=>setRole(e.target.value as 'admin'|'operator')} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"><option value="operator">Operador</option><option value="admin">Administrador</option></select></label>
      <button disabled={saving} className="rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white disabled:opacity-50 md:col-span-2">{saving ? 'Autorizando...' : 'Autorizar e-mail'}</button>
    </form>
    <div className="overflow-x-auto rounded-xl border border-slate-800">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-950 text-xs uppercase text-slate-400"><tr><th className="p-3">Nome</th><th className="p-3">E-mail</th><th className="p-3">Função</th><th className="p-3">Acesso</th><th className="p-3">Ações</th></tr></thead>
        <tbody className="divide-y divide-slate-800">{loading ? <tr><td colSpan={5} className="p-4 text-slate-400">Carregando usuários...</td></tr> : users.map(u => <tr key={u.id}>
          <td className="p-3 text-white">{u.display_name || '—'}</td><td className="p-3 text-slate-300">{u.email}</td>
          <td className="p-3"><select aria-label={'Função de '+u.email} value={u.role} onChange={e=>void changeUser(u.id,{role:e.target.value as 'admin'|'operator'})} className="rounded border border-slate-700 bg-slate-950 p-1 text-white"><option value="operator">Operador</option><option value="admin">Administrador</option></select></td>
          <td className="p-3"><span className={u.access_status==='active'?'text-emerald-400':u.access_status==='blocked'?'text-rose-400':'text-amber-300'}>{u.access_status==='active'?'Liberado':u.access_status==='blocked'?'Bloqueado':'Pendente'}</span></td>
          <td className="p-3"><button type="button" onClick={()=>void changeUser(u.id,{access_status:u.access_status==='active'?'blocked':'active'})} className="rounded border border-slate-700 px-3 py-1 text-xs text-white hover:bg-slate-800">{u.access_status==='active'?'Bloquear':'Liberar'}</button></td>
        </tr>)}</tbody>
      </table>
    </div>
  </div>;
};
