import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AuthModalProps {
  isOpen: boolean;
  onClose?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleForgotPassword = async () => {
    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      if (!email.trim()) {
        setErrorMessage('Informe seu e-mail para receber o link de recuperação.');
        return;
      }
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: window.location.origin,
      });
      if (error) throw error;
      setSuccessMessage('Se o e-mail estiver cadastrado, você receberá um link para redefinir a senha. Confira também o spam.');
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      setErrorMessage(errObj?.message || 'Não foi possível solicitar a recuperação da senha.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      if (isSignUp) {
        // Cadastro público: nunca permite escolher função ou nível de acesso no frontend.
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { display_name: displayName.trim() } },
        });

        if (error) throw error;
        setSuccessMessage('Cadastro enviado com sucesso! Se a confirmação por e-mail estiver ativada, confirme seu endereço antes de entrar.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) throw error;
        if (onClose) onClose();
      }
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      setErrorMessage(errObj?.message || 'Falha na autenticação. Verifique suas credenciais.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl text-slate-100">
        <div className="mb-5 text-center">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-cyan-950 border border-cyan-800 text-cyan-400 mb-2 font-bold">
            M
          </div>
          <h2 className="text-xl font-bold text-white">
            {isForgotPassword ? 'Recuperar senha — MARISOFT IA' : isSignUp ? 'Criar conta — MARISOFT IA' : 'Acesso ao MARISOFT IA'}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {isForgotPassword
              ? 'Informe seu e-mail para receber um link de recuperação.'
              : isSignUp
                ? 'Cadastre seu nome, e-mail e senha para criar sua conta.'
                : 'Entre com seu e-mail e senha cadastrados.'}
          </p>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-300 text-xs">
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-3 rounded-lg bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs">
            {successMessage}
          </div>
        )}

        {!isForgotPassword && <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && <div>
            <label className="block text-xs text-slate-400 mb-1 font-medium">Nome completo</label>
            <input
              type="text"
              required
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="Seu nome"
              autoComplete="name"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
            />
          </div>}
          <div>
            <label className="block text-xs text-slate-400 mb-1 font-medium">E-mail</label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="seu.email@empresa.com"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1 font-medium">Senha</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-lg bg-cyan-600 hover:bg-cyan-500 font-medium text-white text-sm disabled:opacity-50 transition-colors shadow-lg shadow-cyan-950/40"
          >
            {loading ? 'Processando...' : isSignUp ? 'Cadastrar Usuário' : 'Entrar no Sistema'}
          </button>
        </form>}

        {isForgotPassword && <div className="space-y-3">
          <button type="button" onClick={() => void handleForgotPassword()} disabled={loading} className="w-full py-2.5 px-4 rounded-lg bg-cyan-600 hover:bg-cyan-500 font-medium text-white text-sm disabled:opacity-50">
            {loading ? 'Enviando...' : 'Enviar link de recuperação'}
          </button>
          <button type="button" onClick={() => { setIsForgotPassword(false); setErrorMessage(null); setSuccessMessage(null); }} className="w-full text-sm text-cyan-400 hover:text-cyan-300">Voltar para entrar</button>
        </div>}

        {!isForgotPassword && !isSignUp && <div className="mt-3 text-right">
          <button type="button" onClick={() => { setIsForgotPassword(true); setErrorMessage(null); setSuccessMessage(null); }} className="text-xs text-cyan-400 hover:text-cyan-300">Esqueci minha senha</button>
        </div>}

        {!isForgotPassword && <div className="mt-4 pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>{isSignUp ? 'Já possui login?' : 'Ainda não tem conta?'}</span>
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setIsForgotPassword(false);
              setErrorMessage(null);
              setSuccessMessage(null);
            }}
            className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
          >
            {isSignUp ? 'Ir para Login' : 'Criar uma conta'}
          </button>
        </div>
      </div>
    </div>
  );
};
