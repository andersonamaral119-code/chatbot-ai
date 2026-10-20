import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  email: string;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ isOpen, onClose, email }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (newPassword.length < 8) {
      setErrorMessage('A nova senha deve ter pelo menos 8 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage('A confirmação não corresponde à nova senha.');
      return;
    }
    if (newPassword === currentPassword) {
      setErrorMessage('A nova senha deve ser diferente da senha atual.');
      return;
    }

    setLoading(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword,
      });
      if (signInError) throw new Error('A senha atual está incorreta.');

      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) throw updateError;

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSuccessMessage('Senha alterada com sucesso.');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Não foi possível alterar a senha.';
      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 text-slate-100 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-white">Alterar minha senha</h2>
            <p className="mt-1 text-xs text-slate-400">Confirme a senha atual para cadastrar uma nova.</p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white" aria-label="Fechar">✕</button>
        </div>

        {errorMessage && <p role="alert" className="mb-4 rounded-lg border border-rose-800 bg-rose-950/60 p-3 text-sm text-rose-300">{errorMessage}</p>}
        {successMessage && <p role="status" className="mb-4 rounded-lg border border-emerald-800 bg-emerald-950/60 p-3 text-sm text-emerald-300">{successMessage}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-xs font-medium text-slate-300">
            Senha atual
            <input autoComplete="current-password" type="password" required value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none" />
          </label>
          <label className="block text-xs font-medium text-slate-300">
            Nova senha
            <input autoComplete="new-password" type="password" required minLength={8} value={newPassword} onChange={event => setNewPassword(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none" />
          </label>
          <label className="block text-xs font-medium text-slate-300">
            Confirmar nova senha
            <input autoComplete="new-password" type="password" required minLength={8} value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none" />
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800">Cancelar</button>
            <button type="submit" disabled={loading} className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-500 disabled:opacity-50">{loading ? 'Alterando...' : 'Salvar nova senha'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};
