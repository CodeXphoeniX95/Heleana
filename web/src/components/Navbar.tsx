import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store';
import { notificationsApi } from '../lib/api';
import { LayoutDashboard, Bell, User, LogOut, Users, UserCheck } from 'lucide-react';

export const Navbar: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const isPersonalMode = useAuthStore((state) => state.isPersonalMode);
  const togglePersonalMode = useAuthStore((state) => state.togglePersonalMode);
  const location = useLocation();
  const navigate = useNavigate();

  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    notificationsApi
      .list({ limit: 1 })
      .then((data) => setUnreadCount(data.unread_count))
      .catch(() => {});

    // Polling des notifications toutes les 15 secondes avec gestion silencieuse des baisses de réseau
    const interval = setInterval(() => {
      if (navigator.onLine) {
        notificationsApi
          .list({ limit: 1 })
          .then((data) => setUnreadCount(data.unread_count))
          .catch(() => {});
      }
    }, 15_000);

    return () => clearInterval(interval);
  }, [user]);

  if (!user) return null;

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="bg-[#1B4F72] text-white shadow-md border-b border-blue-900/40 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand with official Heleanaf logo.png */}
          <Link to="/" className="flex items-center space-x-2.5 group">
            <img
              src="/logo.png"
              alt="Heleanaf"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover shadow-md group-hover:scale-105 transition"
            />
            <span className="font-extrabold text-lg sm:text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-emerald-300">
              Heleanaf
            </span>
          </Link>

          {/* Navigation Links & Mode Switch */}
          <div className="flex items-center space-x-1 sm:space-x-2.5">
            <Link
              to="/"
              className={`flex items-center space-x-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl text-xs sm:text-sm font-medium transition ${
                isActive('/')
                  ? 'bg-emerald-500 text-white shadow'
                  : 'text-slate-200 hover:bg-blue-800/60 hover:text-white'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span className="hidden md:inline">Tableau de bord</span>
            </Link>

            <Link
              to="/notifications"
              className={`relative flex items-center space-x-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl text-xs sm:text-sm font-medium transition ${
                isActive('/notifications')
                  ? 'bg-emerald-500 text-white shadow'
                  : 'text-slate-200 hover:bg-blue-800/60 hover:text-white'
              }`}
            >
              <Bell className="w-4 h-4" />
              <span className="hidden md:inline">Notifications</span>
              {unreadCount > 0 && (
                <span className="bg-amber-400 text-slate-950 font-black text-[10px] px-1.5 py-0.5 rounded-full shadow-sm animate-pulse">
                  {unreadCount}
                </span>
              )}
            </Link>


            {/* Mode Switch Toggle Button (Personal vs Group mode) */}
            <button
              onClick={togglePersonalMode}
              title={
                isPersonalMode
                  ? 'Mode Personnel actif (Cliquez pour passer en Mode Groupe)'
                  : 'Mode Groupe actif (Cliquez pour afficher uniquement vos transactions)'
              }
              className={`flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl text-xs font-extrabold transition shadow-sm border ${
                isPersonalMode
                  ? 'bg-amber-400 text-slate-950 border-amber-300 ring-2 ring-amber-300/40'
                  : 'bg-white/10 text-slate-100 hover:bg-white/20 border-white/20'
              }`}
            >
              {isPersonalMode ? (
                <>
                  <UserCheck className="w-4 h-4 text-slate-950" />
                  <span className="hidden sm:inline">Mes Activités</span>
                </>
              ) : (
                <>
                  <Users className="w-4 h-4 text-emerald-300" />
                  <span className="hidden sm:inline">Vue Groupe</span>
                </>
              )}
            </button>

            <Link
              to="/profile"
              className={`flex items-center space-x-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl text-xs sm:text-sm font-medium transition ${
                isActive('/profile')
                  ? 'bg-emerald-500 text-white shadow'
                  : 'text-slate-200 hover:bg-blue-800/60 hover:text-white'
              }`}
            >
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.name}
                  className="w-5 h-5 rounded-full object-cover border border-emerald-300"
                />
              ) : (
                <User className="w-4 h-4" />
              )}
              <span className="hidden md:inline max-w-[90px] truncate">{user.name}</span>
            </Link>

            {/* Logout */}
            <button
              onClick={() => {
                logout();
                navigate('/login');
              }}
              title="Déconnexion"
              className="flex items-center space-x-1 text-slate-300 hover:text-red-300 hover:bg-red-500/20 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl text-xs sm:text-sm font-medium transition ml-0.5"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden md:inline">Déconnexion</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};
