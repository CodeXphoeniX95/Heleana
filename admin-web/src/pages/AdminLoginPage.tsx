import React, { useState } from 'react';
import { adminApi } from '../lib/api';
import { useAuthStore } from '../stores/auth.store';
import { ShieldCheck, Eye, EyeOff, Lock, Mail } from 'lucide-react';

export const AdminLoginPage: React.FC = () => {
  const [emailOrPhone, setEmailOrPhone] = useState('goyitresor@gmail.com');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setAuth = useAuthStore((s) => s.setAuth);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const isEmail = emailOrPhone.includes('@');
      const payload = isEmail
        ? { email: emailOrPhone, password }
        : { phone: emailOrPhone, password };

      const res = await adminApi.login(payload);
      if (res.user.email?.toLowerCase() !== 'goyitresor@gmail.com') {
        setError('Accès refusé : Seul le compte Super Admin (goyitresor@gmail.com) est autorisé.');
        return;
      }
      setAuth(res.token, res.user);
    } catch (err: any) {
      setError(
        err?.response?.data?.error ||
          err?.message ||
          'Identifiants incorrects ou vous n\'avez pas accès.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Decorative Gradients */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl p-8 shadow-2xl backdrop-blur relative z-10">
        <div className="text-center mb-8">
          <img
            src="/logo.png"
            alt="Heleanaf"
            className="w-16 h-16 rounded-full object-cover shadow-xl mx-auto mb-4 border border-emerald-500/30 hover:scale-105 transition"
          />
          <h1 className="text-2xl font-black text-white tracking-tight">Super Admin Console</h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            Connexion sécurisée au portail d'administration Heleanaf
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/15 border border-red-500/30 rounded-2xl text-red-300 text-xs sm:text-sm font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Email ou Numéro de Téléphone
            </label>
            <div className="relative">
              <Mail className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                required
                placeholder="ex: goyitresor@gmail.com"
                value={emailOrPhone}
                onChange={(e) => setEmailOrPhone(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Mot de passe Admin
            </label>
            <div className="relative">
              <Lock className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="Votre mot de passe"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-11 pr-11 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-amber-400 hover:opacity-95 text-slate-950 font-black rounded-2xl text-sm transition shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <ShieldCheck className="w-5 h-5" /> Accéder à la Console Admin
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-800/80 text-center">
          <p className="text-slate-500 text-xs">
            Heleanaf Admin Panel &bull; ⚓ Blessed Forever 🤍
          </p>
        </div>
      </div>
    </div>
  );
};
