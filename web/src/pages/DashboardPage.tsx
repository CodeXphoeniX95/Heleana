import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { dashboardApi, groupsApi } from '../lib/api';
import type { DashboardData } from '../lib/api';
import {
  formatRole,
  formatWithdrawalStatus,
  formatCurrency,
  formatPaymentMethod,
  getGreeting,
} from '../lib/formatters';
import { useAuthStore } from '../stores/auth.store';
import {
  Users,
  Wallet,
  PlusCircle,
  UserPlus,
  ArrowUpRight,
  TrendingUp,
  Clock,
  ChevronRight,
  CheckCircle,
  UserCheck,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const isPersonalMode = useAuthStore((state) => state.isPersonalMode);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);

  // Create Group Form
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [contributionRule, setContributionRule] = useState<'fixed' | 'free'>('fixed');
  const [fixedAmount, setFixedAmount] = useState('');
  const [frequency, setFrequency] = useState('monthly');

  // Join Group Form
  const [inviteCode, setInviteCode] = useState('');
  const [modalError, setModalError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await dashboardApi.get();
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    if (!name.trim()) {
      setModalError('Le nom du groupe est obligatoire');
      return;
    }

    setSubmitting(true);
    try {
      const newGroup = await groupsApi.create({
        name: name.trim(),
        description: description.trim() || undefined,
        currency: 'Franc CFA',
        contribution_rule: contributionRule,
        fixed_amount: contributionRule === 'fixed' && fixedAmount ? parseFloat(fixedAmount) : undefined,
        frequency,
      });
      setShowCreateModal(false);
      setName('');
      setDescription('');
      setFixedAmount('');
      navigate(`/groups/${newGroup.id}`);
    } catch (err: any) {
      setModalError(err.message || 'Erreur de création');
    } finally {
      setSubmitting(false);
    }
  };

  const handleJoinGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    if (!inviteCode.trim()) {
      setModalError('Le code d\'invitation est requis');
      return;
    }

    setSubmitting(true);
    try {
      const joinedGroup = await groupsApi.join(inviteCode.trim());
      setShowJoinModal(false);
      setInviteCode('');
      navigate(`/groups/${joinedGroup.id}`);
    } catch (err: any) {
      setModalError(err.message || 'Code d\'invitation invalide');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto my-12 p-6 bg-red-50 text-red-700 rounded-2xl border border-red-200 text-center">
        <p className="font-semibold text-lg">{error}</p>
        <button
          onClick={fetchDashboard}
          className="mt-4 bg-red-600 text-white font-bold px-4 py-2 rounded-xl text-sm"
        >
          Réessayer
        </button>
      </div>
    );
  }

  const greeting = getGreeting(user?.name);

  const filteredContributions = isPersonalMode
    ? (data?.recent_contributions || []).filter(
        (c) => c.user_id === user?.id || c.member_name?.toLowerCase() === user?.name?.toLowerCase()
      )
    : data?.recent_contributions || [];

  const filteredWithdrawals = isPersonalMode
    ? (data?.pending_withdrawals || []).filter(
        (w) => w.user_id === user?.id || w.requester_name?.toLowerCase() === user?.name?.toLowerCase()
      )
    : data?.pending_withdrawals || [];

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
      {/* Welcome Banner / Overview Stats */}
      <div className="bg-gradient-to-r from-[#1B4F72] via-slate-800 to-teal-800 text-white rounded-3xl p-5 sm:p-8 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="bg-emerald-500/20 text-emerald-300 font-extrabold text-xs px-3 py-1 rounded-full uppercase tracking-wider border border-emerald-400/30">
              Tableau de Bord
            </span>
            {isPersonalMode && (
              <span className="bg-amber-400/30 text-amber-300 font-extrabold text-xs px-3 py-1 rounded-full uppercase tracking-wider border border-amber-400/40 flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5" />
                Mode Personnel Activé
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">{greeting.greeting}</h1>
          <p className="text-amber-300 font-bold text-xs sm:text-sm">{greeting.motto}</p>
          <p className="text-slate-300 text-xs sm:text-sm max-w-xl">
            {isPersonalMode
              ? 'Mode personnel actif : vous visualisez uniquement vos propres transactions, cotisations et retraits.'
              : 'Suivez la santé financière de vos groupes, vos cotisations et participez aux décisions de retrait.'}
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 sm:p-5 w-full md:w-auto min-w-[240px] text-center">
          <span className="text-xs text-slate-300 block font-medium">Vos cotisations cumulées</span>
          <span className="text-2xl sm:text-3xl font-black text-amber-300 block mt-1">
            {(data?.my_total || 0).toLocaleString()} Franc CFA
          </span>
        </div>
      </div>

      {/* Quick Action Buttons */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
          <Users className="w-5 h-5 text-emerald-600" />
          Mes Groupes ({(data?.groups || []).length})
        </h2>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => setShowJoinModal(true)}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold px-3.5 py-2.5 rounded-xl text-xs sm:text-sm transition border border-slate-200"
          >
            <UserPlus className="w-4 h-4 text-slate-600" />
            Rejoindre avec un code
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3.5 py-2.5 rounded-xl text-xs sm:text-sm transition shadow-md"
          >
            <PlusCircle className="w-4 h-4" />
            Nouveau Groupe
          </button>
        </div>
      </div>

      {/* Groups Grid */}
      {(data?.groups || []).length === 0 ? (
        <div className="bg-white rounded-3xl p-8 sm:p-12 text-center border border-slate-200 shadow-sm space-y-4">
          <Users className="w-16 h-16 text-slate-300 mx-auto" />
          <h3 className="text-lg font-bold text-slate-800">Vous n'avez rejoint aucun groupe</h3>
          <p className="text-slate-500 text-sm max-w-md mx-auto">
            Créez votre propre groupe de tontine ou demandez un code d'invitation à un administrateur pour commencer.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition"
          >
            Créer un groupe
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {data?.groups.map((group) => (
            <Link
              key={group.id}
              to={`/groups/${group.id}`}
              className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 hover:border-emerald-400 hover:shadow-xl transition group relative flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-extrabold text-base sm:text-lg text-slate-900 group-hover:text-emerald-600 transition">
                      {group.name}
                    </h3>
                    {group.description && (
                      <p className="text-xs text-slate-500 line-clamp-2 mt-1">{group.description}</p>
                    )}
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-full shrink-0 ${
                      group.role === 'admin'
                        ? 'bg-amber-100 text-amber-800 border border-amber-300'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {formatRole(group.role)}
                  </span>
                </div>

                {/* Balance display */}
                <div className="mt-5 p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-slate-500 block">
                      {isPersonalMode ? 'Vos Cotisations' : 'Solde Trésorerie'}
                    </span>
                    <span className="text-lg sm:text-xl font-black text-slate-900">
                      {(group.balance || 0).toLocaleString()} {formatCurrency(group.currency)}
                    </span>
                  </div>
                  <Wallet className="w-6 h-6 text-emerald-600 shrink-0" />
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span className="flex items-center gap-1 font-semibold text-slate-700">
                  <Users className="w-3.5 h-3.5 text-slate-400" />
                  {group.member_count || 1} membre(s)
                </span>
                <span className="text-emerald-600 font-bold group-hover:translate-x-1 transition flex items-center gap-1">
                  Accéder <ChevronRight className="w-4 h-4" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Pending Withdrawals & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 pt-2">
        {/* Pending Withdrawals Section */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-base sm:text-lg flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-500" />
              {isPersonalMode ? 'Vos Retraits en attente' : 'Demandes de Retrait en attente'}
            </h3>
            <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
              {filteredWithdrawals.length}
            </span>
          </div>

          {filteredWithdrawals.length === 0 ? (
            <p className="text-slate-500 text-xs py-4 text-center">
              {isPersonalMode ? 'Aucune demande de retrait personnelle en attente.' : 'Aucun retrait en attente de vote.'}
            </p>
          ) : (
            <div className="space-y-3">
              {filteredWithdrawals.map((w) => (
                <button
                  key={w.id}
                  onClick={() => navigate(`/groups/${w.group_id}?tab=withdrawals`)}
                  className="w-full text-left p-4 rounded-2xl bg-amber-50/50 border border-amber-200 hover:bg-amber-100/60 transition flex items-center justify-between gap-4"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">{w.requester_name}</span>
                      <span className="text-xs text-amber-700 font-semibold bg-amber-100 px-2 py-0.5 rounded">
                        {formatWithdrawalStatus(w.status)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Motif : {w.reason}</p>
                    <span className="text-xs text-amber-800 font-bold block mt-1">
                      {parseFloat(w.amount).toLocaleString()} Franc CFA
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-white px-3 py-1.5 rounded-xl border border-amber-200 shadow-sm shrink-0">
                    {w.user_id === user?.id ? 'Détails' : 'Voter'} <ArrowUpRight className="w-3.5 h-3.5" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Recent Contributions Feed */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-900 text-base sm:text-lg flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
            {isPersonalMode ? 'Vos Dernières Cotisations' : 'Dernières Cotisations'}
          </h3>

          {filteredContributions.length === 0 ? (
            <p className="text-slate-500 text-xs py-4 text-center">
              {isPersonalMode ? 'Aucune cotisation personnelle enregistrée.' : 'Aucune cotisation récente.'}
            </p>
          ) : (
            <div className="space-y-3">
              {filteredContributions.map((c) => (
                <div
                  key={c.id}
                  className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold shrink-0">
                      <CheckCircle className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-slate-900 block">{c.member_name}</span>
                      <span className="text-slate-500 text-[11px]">
                        {new Date(c.created_at).toLocaleDateString('fr-FR')} • {formatPaymentMethod(c.payment_method)}
                      </span>
                    </div>
                  </div>
                  <span className="font-extrabold text-emerald-700 text-sm shrink-0">
                    +{parseFloat(c.amount).toLocaleString()} Franc CFA
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal: Create Group */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-xl font-bold text-slate-900">Créer un nouveau Groupe</h3>
            {modalError && (
              <div className="bg-red-50 text-red-700 text-xs p-3 rounded-xl border border-red-200">
                {modalError}
              </div>
            )}
            <form onSubmit={handleCreateGroup} className="space-y-4 text-sm">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nom du Groupe *</label>
                <input
                  type="text"
                  required
                  placeholder="ex: Tontine Solidaire 2026"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  placeholder="Objectif du groupe..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Règle de Cotisation</label>
                  <select
                    value={contributionRule}
                    onChange={(e: any) => setContributionRule(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="fixed">Cotisation fixe</option>
                    <option value="free">Cotisation libre</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Fréquence</label>
                  <select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="monthly">Mensuelle</option>
                    <option value="weekly">Hebdomadaire</option>
                    <option value="free">Libre</option>
                  </select>
                </div>
              </div>

              {contributionRule === 'fixed' && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Montant fixe (Franc CFA)</label>
                  <input
                    type="number"
                    placeholder="ex: 10000"
                    value={fixedAmount}
                    onChange={(e) => setFixedAmount(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition shadow-md"
                >
                  {submitting ? 'Création...' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Join Group */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-xl font-bold text-slate-900">Rejoindre un Groupe</h3>
            {modalError && (
              <div className="bg-red-50 text-red-700 text-xs p-3 rounded-xl border border-red-200">
                {modalError}
              </div>
            )}
            <form onSubmit={handleJoinGroup} className="space-y-4 text-sm">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Code d'invitation *</label>
                <input
                  type="text"
                  required
                  placeholder="Entrez le code à 6-8 caractères"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none uppercase font-mono tracking-widest text-center text-lg"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowJoinModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-[#1B4F72] hover:bg-blue-900 text-white font-bold transition shadow-md"
                >
                  {submitting ? 'Validation...' : 'Rejoindre'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
