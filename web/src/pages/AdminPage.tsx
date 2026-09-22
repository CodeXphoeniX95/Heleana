import React, { useEffect, useState, useMemo } from 'react';
import { adminApi, type AdminOverview } from '../lib/api';
import {
  ShieldCheck,
  Users,
  FolderKanban,
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  Search,
  RefreshCw,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  TrendingUp,
} from 'lucide-react';

export const AdminPage: React.FC = () => {
  const [data, setData] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'groups' | 'contributions' | 'withdrawals'>('overview');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchOverview = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.getOverview();
      setData(res);
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Erreur lors du chargement de la console admin');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      maximumFractionDigits: 0,
    }).format(val).replace('XOF', 'FCFA');
  };

  const formatDate = (isoStr: string) => {
    if (!isoStr) return '-';
    return new Date(isoStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Filtered lists based on search term
  const filteredUsers = useMemo(() => {
    if (!data?.users) return [];
    if (!searchTerm.trim()) return data.users;
    const q = searchTerm.toLowerCase();
    return data.users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.phone && u.phone.toLowerCase().includes(q)) ||
        u.id.toLowerCase().includes(q)
    );
  }, [data?.users, searchTerm]);

  const filteredGroups = useMemo(() => {
    if (!data?.groups) return [];
    if (!searchTerm.trim()) return data.groups;
    const q = searchTerm.toLowerCase();
    return data.groups.filter(
      (g) =>
        g.name.toLowerCase().includes(q) ||
        (g.creator_name && g.creator_name.toLowerCase().includes(q)) ||
        (g.invite_code && g.invite_code.toLowerCase().includes(q)) ||
        g.id.toLowerCase().includes(q)
    );
  }, [data?.groups, searchTerm]);

  const filteredContributions = useMemo(() => {
    if (!data?.contributions) return [];
    if (!searchTerm.trim()) return data.contributions;
    const q = searchTerm.toLowerCase();
    return data.contributions.filter(
      (c) =>
        c.member_name.toLowerCase().includes(q) ||
        c.group_name.toLowerCase().includes(q) ||
        (c.note && c.note.toLowerCase().includes(q)) ||
        (c.payment_method && c.payment_method.toLowerCase().includes(q)) ||
        c.amount.toString().includes(q)
    );
  }, [data?.contributions, searchTerm]);

  const filteredWithdrawals = useMemo(() => {
    if (!data?.withdrawals) return [];
    if (!searchTerm.trim()) return data.withdrawals;
    const q = searchTerm.toLowerCase();
    return data.withdrawals.filter(
      (w) =>
        w.requester_name.toLowerCase().includes(q) ||
        w.group_name.toLowerCase().includes(q) ||
        (w.reason && w.reason.toLowerCase().includes(q)) ||
        w.status.toLowerCase().includes(q) ||
        w.amount.toString().includes(q)
    );
  }, [data?.withdrawals, searchTerm]);

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center bg-slate-900 text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-400 mb-4"></div>
        <p className="text-slate-400 text-sm font-medium">Chargement de la console Admin Tout-en-Un...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-4xl mx-auto my-12 p-6 bg-slate-900 rounded-3xl border border-red-500/30 text-center">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-white mb-2">Erreur d'accès Admin</h2>
        <p className="text-slate-400 mb-6">{error}</p>
        <button
          onClick={fetchOverview}
          className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-medium transition inline-flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" /> Réessayer
        </button>
      </div>
    );
  }

  const { stats } = data;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-slate-900/80 backdrop-blur border border-slate-800 p-6 rounded-3xl shadow-2xl">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-emerald-500 flex items-center justify-center shadow-lg text-slate-950 font-black">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black tracking-tight text-white">Super Admin Control Center</h1>
                <span className="bg-amber-400/20 text-amber-300 border border-amber-400/30 font-extrabold text-[10px] uppercase px-2 py-0.5 rounded-full">
                  Accès Total
                </span>
              </div>
              <p className="text-slate-400 text-xs sm:text-sm mt-0.5">
                Supervision intégrale des utilisateurs, tontines, cotisations, retraits et trésorerie globale.
              </p>
            </div>
          </div>
          <button
            onClick={fetchOverview}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-2xl text-xs sm:text-sm font-semibold transition"
          >
            <RefreshCw className="w-4 h-4 text-emerald-400" />
            <span>Actualiser Données</span>
          </button>
        </div>

        {/* Global Key Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl shadow">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase">Utilisateurs</span>
              <Users className="w-4 h-4 text-blue-400" />
            </div>
            <p className="text-2xl font-black text-white mt-2">{stats.total_users}</p>
            <p className="text-[11px] text-slate-500 mt-1">Comptes inscrits</p>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl shadow">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase">Tontines / Groupes</span>
              <FolderKanban className="w-4 h-4 text-indigo-400" />
            </div>
            <p className="text-2xl font-black text-white mt-2">{stats.total_groups}</p>
            <p className="text-[11px] text-slate-500 mt-1">Groupes actifs</p>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl shadow">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase">Total Cotisé</span>
              <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-lg font-black text-emerald-400 mt-2 truncate">{formatCurrency(stats.total_contributed)}</p>
            <p className="text-[11px] text-slate-500 mt-1">Flux d'entrées</p>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl shadow">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase">Total Retiré</span>
              <ArrowUpRight className="w-4 h-4 text-amber-400" />
            </div>
            <p className="text-lg font-black text-amber-400 mt-2 truncate">{formatCurrency(stats.total_withdrawn)}</p>
            <p className="text-[11px] text-slate-500 mt-1">Flux de sorties</p>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl shadow">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase">Trésorerie Globale</span>
              <Wallet className="w-4 h-4 text-teal-400" />
            </div>
            <p className="text-lg font-black text-teal-300 mt-2 truncate">{formatCurrency(stats.global_balance)}</p>
            <p className="text-[11px] text-slate-500 mt-1">Solde net disponible</p>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl shadow">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase">En Attente</span>
              <Clock className="w-4 h-4 text-rose-400" />
            </div>
            <p className="text-2xl font-black text-rose-400 mt-2">{stats.pending_withdrawals_count}</p>
            <p className="text-[11px] text-slate-500 mt-1">Demandes de retrait</p>
          </div>
        </div>

        {/* Navigation Tabs & Global Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 sm:pb-0 scrollbar-none">
            {[
              { id: 'overview', label: "Vue d'ensemble", icon: TrendingUp },
              { id: 'users', label: `Utilisateurs (${data.users.length})`, icon: Users },
              { id: 'groups', label: `Groupes (${data.groups.length})`, icon: FolderKanban },
              { id: 'contributions', label: `Cotisations (${data.contributions.length})`, icon: ArrowDownLeft },
              { id: 'withdrawals', label: `Retraits (${data.withdrawals.length})`, icon: ArrowUpRight },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as any);
                    setSearchTerm('');
                  }}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold transition whitespace-nowrap ${
                    isActive
                      ? 'bg-emerald-500 text-slate-950 shadow-md font-bold'
                      : 'bg-slate-900/90 text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {activeTab !== 'overview' && (
            <div className="relative min-w-[240px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Rechercher par nom, email, ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          )}
        </div>

        {/* Tab 1: Overview */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Top Groups by Balance */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <FolderKanban className="w-5 h-5 text-emerald-400" />
                Groupes les plus actifs
              </h2>
              <div className="space-y-3">
                {data.groups.slice(0, 5).map((g) => (
                  <div
                    key={g.id}
                    className="flex items-center justify-between p-3.5 bg-slate-950/60 rounded-2xl border border-slate-800/80"
                  >
                    <div>
                      <p className="font-bold text-white text-sm">{g.name}</p>
                      <p className="text-xs text-slate-400">
                        Créateur: {g.creator_name || 'Inconnu'} • {g.member_count} membre(s)
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-extrabold text-emerald-400 text-sm">{formatCurrency(g.balance)}</p>
                      <p className="text-[10px] text-slate-500">{formatCurrency(g.total_contributions)} cotisés</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent System Activity */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-400" />
                Dernières Cotisations Plateforme
              </h2>
              <div className="space-y-3">
                {data.contributions.slice(0, 5).map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between p-3.5 bg-slate-950/60 rounded-2xl border border-slate-800/80"
                  >
                    <div>
                      <p className="font-bold text-white text-sm">{c.member_name}</p>
                      <p className="text-xs text-slate-400">
                        {c.group_name} • {formatDate(c.created_at)}
                      </p>
                    </div>
                    <p className="font-extrabold text-emerald-400 text-sm">+{formatCurrency(Number(c.amount))}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Users */}
        {activeTab === 'users' && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
            <div className="p-4 sm:p-6 border-b border-slate-800">
              <h2 className="text-lg font-bold text-white">Liste Complète des Utilisateurs ({filteredUsers.length})</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase font-semibold text-[11px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4 sm:px-6">Utilisateur</th>
                    <th className="py-3.5 px-4 sm:px-6">Email / Téléphone</th>
                    <th className="py-3.5 px-4 sm:px-6">Groupes</th>
                    <th className="py-3.5 px-4 sm:px-6">Total Cotisé</th>
                    <th className="py-3.5 px-4 sm:px-6">Inscrit le</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3.5 px-4 sm:px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold text-sm">
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-white">{u.name}</p>
                            <p className="text-[10px] text-slate-500 font-mono">ID: {u.id.substring(0, 8)}...</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 sm:px-6">
                        <p className="text-slate-200">{u.email || u.phone || 'Non renseigné'}</p>
                      </td>
                      <td className="py-3.5 px-4 sm:px-6">
                        <span className="bg-slate-800 text-slate-300 px-2.5 py-1 rounded-lg font-semibold text-xs border border-slate-700">
                          {u.groups_count} groupe(s)
                        </span>
                      </td>
                      <td className="py-3.5 px-4 sm:px-6 font-bold text-emerald-400">
                        {formatCurrency(u.total_contributed)}
                      </td>
                      <td className="py-3.5 px-4 sm:px-6 text-slate-400 text-xs">
                        {formatDate(u.created_at)}
                      </td>
                    </tr>
                  ))}
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-slate-500">
                        Aucun utilisateur trouvé pour cette recherche.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Groups */}
        {activeTab === 'groups' && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
            <div className="p-4 sm:p-6 border-b border-slate-800">
              <h2 className="text-lg font-bold text-white">Liste Complète des Groupes ({filteredGroups.length})</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase font-semibold text-[11px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4 sm:px-6">Groupe</th>
                    <th className="py-3.5 px-4 sm:px-6">Créateur</th>
                    <th className="py-3.5 px-4 sm:px-6">Membres</th>
                    <th className="py-3.5 px-4 sm:px-6">Solde Actuel</th>
                    <th className="py-3.5 px-4 sm:px-6">Cotisations / Retraits</th>
                    <th className="py-3.5 px-4 sm:px-6">Code d'invitation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredGroups.map((g) => (
                    <tr key={g.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3.5 px-4 sm:px-6">
                        <p className="font-bold text-white">{g.name}</p>
                        <p className="text-xs text-slate-400 truncate max-w-xs">{g.description || 'Pas de description'}</p>
                      </td>
                      <td className="py-3.5 px-4 sm:px-6 font-medium text-slate-300">
                        {g.creator_name || 'Créateur inconnu'}
                      </td>
                      <td className="py-3.5 px-4 sm:px-6">
                        <span className="bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2.5 py-1 rounded-lg font-semibold text-xs">
                          {g.member_count} membre(s)
                        </span>
                      </td>
                      <td className="py-3.5 px-4 sm:px-6 font-extrabold text-teal-300">
                        {formatCurrency(g.balance)}
                      </td>
                      <td className="py-3.5 px-4 sm:px-6">
                        <p className="text-emerald-400 text-xs font-semibold">+{formatCurrency(g.total_contributions)}</p>
                        <p className="text-amber-400 text-xs font-semibold">-{formatCurrency(g.total_withdrawals)}</p>
                      </td>
                      <td className="py-3.5 px-4 sm:px-6 font-mono text-amber-300 font-bold">
                        {g.invite_code || '-'}
                      </td>
                    </tr>
                  ))}
                  {filteredGroups.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-slate-500">
                        Aucun groupe trouvé pour cette recherche.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 4: Contributions */}
        {activeTab === 'contributions' && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
            <div className="p-4 sm:p-6 border-b border-slate-800">
              <h2 className="text-lg font-bold text-white">Toutes les Cotisations ({filteredContributions.length})</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase font-semibold text-[11px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4 sm:px-6">Membre</th>
                    <th className="py-3.5 px-4 sm:px-6">Groupe</th>
                    <th className="py-3.5 px-4 sm:px-6">Montant</th>
                    <th className="py-3.5 px-4 sm:px-6">Moyen de paiement</th>
                    <th className="py-3.5 px-4 sm:px-6">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredContributions.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3.5 px-4 sm:px-6 font-bold text-white">{c.member_name}</td>
                      <td className="py-3.5 px-4 sm:px-6 text-slate-300">{c.group_name}</td>
                      <td className="py-3.5 px-4 sm:px-6 font-black text-emerald-400">
                        +{formatCurrency(Number(c.amount))}
                      </td>
                      <td className="py-3.5 px-4 sm:px-6">
                        <span className="bg-slate-800 text-slate-300 px-2.5 py-1 rounded-lg text-xs font-medium">
                          {c.payment_method || 'Mobile Money'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 sm:px-6 text-slate-400 text-xs">{formatDate(c.created_at)}</td>
                    </tr>
                  ))}
                  {filteredContributions.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-slate-500">
                        Aucune cotisation enregistrée.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 5: Withdrawals */}
        {activeTab === 'withdrawals' && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
            <div className="p-4 sm:p-6 border-b border-slate-800">
              <h2 className="text-lg font-bold text-white">Toutes les Demandes de Retrait ({filteredWithdrawals.length})</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase font-semibold text-[11px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4 sm:px-6">Demandeur</th>
                    <th className="py-3.5 px-4 sm:px-6">Groupe</th>
                    <th className="py-3.5 px-4 sm:px-6">Montant</th>
                    <th className="py-3.5 px-4 sm:px-6">Statut</th>
                    <th className="py-3.5 px-4 sm:px-6">Motif</th>
                    <th className="py-3.5 px-4 sm:px-6">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredWithdrawals.map((w) => {
                    const statusConfig = {
                      paid: { label: 'Payé', bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30', icon: CheckCircle },
                      approved: { label: 'Approuvé', bg: 'bg-teal-500/20 text-teal-300 border-teal-500/30', icon: CheckCircle },
                      pending: { label: 'En attente', bg: 'bg-amber-500/20 text-amber-300 border-amber-500/30', icon: Clock },
                      rejected: { label: 'Rejeté', bg: 'bg-rose-500/20 text-rose-300 border-rose-500/30', icon: XCircle },
                    }[w.status] || { label: w.status, bg: 'bg-slate-800 text-slate-300', icon: Clock };

                    const StatusIcon = statusConfig.icon;

                    return (
                      <tr key={w.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-3.5 px-4 sm:px-6 font-bold text-white">{w.requester_name}</td>
                        <td className="py-3.5 px-4 sm:px-6 text-slate-300">{w.group_name}</td>
                        <td className="py-3.5 px-4 sm:px-6 font-black text-amber-400">
                          {formatCurrency(Number(w.amount))}
                        </td>
                        <td className="py-3.5 px-4 sm:px-6">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border ${statusConfig.bg}`}
                          >
                            <StatusIcon className="w-3.5 h-3.5" />
                            {statusConfig.label}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 sm:px-6 text-slate-300 max-w-xs truncate">
                          {w.reason || 'Aucun motif'}
                        </td>
                        <td className="py-3.5 px-4 sm:px-6 text-slate-400 text-xs">{formatDate(w.created_at)}</td>
                      </tr>
                    );
                  })}
                  {filteredWithdrawals.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-slate-500">
                        Aucune demande de retrait enregistrée.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPage;
