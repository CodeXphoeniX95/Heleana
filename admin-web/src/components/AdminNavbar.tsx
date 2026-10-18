import React from 'react';
import { useAuthStore } from '../stores/auth.store';
import { ShieldCheck, LogOut, RefreshCw } from 'lucide-react';

interface AdminNavbarProps {
  onRefresh?: () => void;
}

export const AdminNavbar: React.FC<AdminNavbarProps> = ({ onRefresh }) => {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo Brand */}
          <div className="flex items-center space-x-3">
            <img
              src="/logo.png"
              alt="Heleanaf"
              className="w-10 h-10 rounded-full object-cover shadow-md border border-emerald-500/30"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg tracking-tight text-white">Heleanaf Admin</span>
                <span className="bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[10px] font-black uppercase px-2 py-0.5 rounded-full">
                  Super Admin
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">Control Center Tout-en-Un</p>
            </div>
          </div>

          {/* User info & Actions */}
          <div className="flex items-center space-x-3">
            {onRefresh && (
              <button
                onClick={onRefresh}
                title="Actualiser les données"
                className="p-2 sm:px-3 sm:py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
              >
                <RefreshCw className="w-4 h-4 text-emerald-400" />
                <span className="hidden sm:inline">Actualiser</span>
              </button>
            )}

            {user && (
              <div className="flex items-center space-x-2 bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-800">
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.name}
                    className="w-6 h-6 rounded-full object-cover border border-emerald-400"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="text-xs font-bold text-white max-w-[100px] truncate">{user.name}</span>
              </div>
            )}

            <button
              onClick={logout}
              title="Déconnexion"
              className="flex items-center gap-1.5 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/20 rounded-xl text-xs font-semibold transition"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Déconnexion</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
