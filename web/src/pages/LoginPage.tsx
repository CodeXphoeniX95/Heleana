import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store';
import { Mail, Phone, Lock, AlertCircle, ArrowRight, Eye, EyeOff } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const login = useAuthStore((state) => state.login);
  const isLoading = useAuthStore((state) => state.isLoading);
  const navigate = useNavigate();

  const [loginMode, setLoginMode] = useState<'email' | 'phone'>('email');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!identifier.trim() || !password.trim()) {
      setError('Veuillez remplir tous les champs');
      return;
    }

    try {
      if (loginMode === 'email') {
        await login({ email: identifier.trim(), password });
      } else {
        await login({ phone: identifier.trim(), password });
      }
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Identifiants invalides');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        {/* Header with official logo */}
        <div className="text-center space-y-3">
          <img
            src="/logo.png"
            alt="Heleanaf"
            className="w-16 h-16 rounded-2xl mx-auto shadow-lg object-cover"
          />
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Connexion Heleanaf</h1>
          <p className="text-xs text-slate-500">Gérez vos tontines et épargnes collectives en toute sécurité</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 text-xs p-3.5 rounded-2xl border border-red-200 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Tab switch mode */}
        <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold text-slate-600">
          <button
            type="button"
            onClick={() => {
              setLoginMode('email');
              setIdentifier('');
            }}
            className={`flex-1 py-2 rounded-lg transition ${
              loginMode === 'email' ? 'bg-white text-slate-900 shadow-sm' : 'hover:text-slate-900'
            }`}
          >
            Email
          </button>
          <button
            type="button"
            onClick={() => {
              setLoginMode('phone');
              setIdentifier('');
            }}
            className={`flex-1 py-2 rounded-lg transition ${
              loginMode === 'phone' ? 'bg-white text-slate-900 shadow-sm' : 'hover:text-slate-900'
            }`}
          >
            Téléphone
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              {loginMode === 'email' ? 'Adresse Email' : 'Numéro de téléphone'}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                {loginMode === 'email' ? <Mail className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
              </div>
              <input
                type={loginMode === 'email' ? 'email' : 'tel'}
                required
                placeholder={loginMode === 'email' ? 'goyitresor@gmail.com' : '228 71705563'}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Mot de passe
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-10 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition"
                title={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#1B4F72] hover:bg-blue-900 text-white font-bold py-3.5 rounded-xl text-sm transition shadow-lg flex items-center justify-center space-x-2"
          >
            <span>{isLoading ? 'Connexion...' : 'Se connecter'}</span>
            {!isLoading && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>

        <div className="text-center pt-2 text-xs text-slate-500">
          Pas encore de compte ?{' '}
          <Link to="/register" className="font-bold text-emerald-600 hover:underline">
            S'inscrire
          </Link>
        </div>
      </div>
    </div>
  );
};
