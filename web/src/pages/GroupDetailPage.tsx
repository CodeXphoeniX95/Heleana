import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import {
  groupsApi,
  contributionsApi,
  withdrawalsApi,
  membersApi,
  approvalsApi,
  authApi,
  objectivesApi,
} from '../lib/api';
import type { GroupDetail, GroupStats, Objective, UserProfile } from '../lib/api';
import {
  formatContributionRule,
  formatFrequency,
  formatWithdrawalStatus,
  formatRole,
  formatCurrency,
  PAYMENT_METHODS,
  formatPaymentMethod,
} from '../lib/formatters';
import { useAuthStore } from '../stores/auth.store';
import { ObjectivesSection } from '../components/ObjectivesSection';
import {
  Users,
  ArrowUpRight,
  TrendingUp,
  Target,
  BarChart3,
  Copy,
  Check,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  FileText,
} from 'lucide-react';

export const GroupDetailPage: React.FC = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const isPersonalMode = useAuthStore((state) => state.isPersonalMode);

  const activeTab = searchParams.get('tab') || 'overview';

  const [detail, setDetail] = useState<GroupDetail | null>(null);
  const [stats, setStats] = useState<GroupStats | null>(null);
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Modals state
  const [showRecordContribModal, setShowRecordContribModal] = useState(false);
  const [showReqWithdrawalModal, setShowReqWithdrawalModal] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);

  // Record Contribution Form
  const [contribUserId, setContribUserId] = useState('');
  const [contribAmount, setContribAmount] = useState('');
  const [contribMethod, setContribMethod] = useState('cash');
  const [contribNote, setContribNote] = useState('');

  // Request Withdrawal Form
  const [withdrawalAmount, setWithdrawalAmount] = useState('');
  const [withdrawalReason, setWithdrawalReason] = useState('');

  // Add Member Form
  const [userQuery, setUserQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [memberRole, setMemberRole] = useState<'admin' | 'member'>('member');

  const [actionError, setActionError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchGroupData = async () => {
    if (!groupId) return;
    try {
      setLoading(true);
      const [detailRes, objectivesRes] = await Promise.all([
        groupsApi.detail(groupId),
        objectivesApi.list(groupId).catch(() => []),
      ]);
      setDetail(detailRes);
      setObjectives(objectivesRes || []);

      contributionsApi
        .stats(groupId)
        .then((s) => setStats(s))
        .catch(() => {});
    } catch (err: any) {
      setError(err.message || 'Erreur de chargement du groupe');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroupData();
  }, [groupId]);

  const setTab = (tab: string) => {
    setSearchParams({ tab });
  };

  const copyInviteCode = () => {
    if (!detail?.group.invite_code) return;
    navigator.clipboard.writeText(detail.group.invite_code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleRecordContribution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupId) return;
    setActionError(null);

    const amt = parseFloat(contribAmount);
    if (isNaN(amt) || amt <= 0) {
      setActionError('Le montant doit être supérieur à 0');
      return;
    }
    const targetUserId = isAdmin ? contribUserId : (user?.id || '');
    if (!targetUserId) {
      setActionError('Veuillez sélectionner un membre');
      return;
    }

    setSubmitting(true);
    try {
      await contributionsApi.record(groupId, {
        user_id: targetUserId,
        amount: amt,
        payment_method: contribMethod,
        note: contribNote.trim() || undefined,
      });
      setShowRecordContribModal(false);
      setContribAmount('');
      setContribNote('');
      fetchGroupData();
    } catch (err: any) {
      setActionError(err.message || 'Erreur lors de l\'enregistrement');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupId) return;
    setActionError(null);

    const amt = parseFloat(withdrawalAmount);
    if (isNaN(amt) || amt <= 0) {
      setActionError('Le montant doit être supérieur à 0');
      return;
    }
    if (!withdrawalReason.trim()) {
      setActionError('Le motif du retrait est obligatoire');
      return;
    }

    setSubmitting(true);
    try {
      await withdrawalsApi.request(groupId, {
        amount: amt,
        reason: withdrawalReason.trim(),
      });
      setShowReqWithdrawalModal(false);
      setWithdrawalAmount('');
      setWithdrawalReason('');
      fetchGroupData();
    } catch (err: any) {
      setActionError(err.message || 'Erreur de demande de retrait');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVote = async (withdrawalId: string, decision: 'approve' | 'reject') => {
    try {
      await approvalsApi.vote(withdrawalId, { decision });
      fetchGroupData();
    } catch (err: any) {
      alert(err.message || 'Erreur de vote');
    }
  };

  const handleMarkPaid = async (withdrawalId: string) => {
    if (!groupId) return;
    if (!confirm('Confirmer le versement effectif de ce retrait ?')) return;

    try {
      await withdrawalsApi.markPaid(groupId, withdrawalId);
      fetchGroupData();
    } catch (err: any) {
      alert(err.message || 'Erreur de paiement');
    }
  };

  const handleSearchUser = async () => {
    if (!userQuery.trim()) return;
    try {
      const res = await authApi.search(userQuery.trim());
      setSearchResults(res || []);
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleAddMember = async () => {
    if (!groupId || !selectedUser) return;
    setActionError(null);
    setSubmitting(true);
    try {
      await membersApi.add(groupId, selectedUser.id, memberRole);
      setShowAddMemberModal(false);
      setSelectedUser(null);
      setUserQuery('');
      setSearchResults([]);
      fetchGroupData();
    } catch (err: any) {
      setActionError(err.message || 'Erreur d\'ajout du membre');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveMember = async (userId: string, name: string) => {
    if (!groupId) return;
    if (!confirm(`Retirer ${name} du groupe ?`)) return;

    try {
      await membersApi.remove(groupId, userId);
      fetchGroupData();
    } catch (err: any) {
      alert(err.message || 'Erreur de suppression');
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="max-w-4xl mx-auto my-12 p-6 bg-red-50 text-red-700 rounded-2xl border border-red-200 text-center">
        <p className="font-semibold text-lg">{error || 'Groupe introuvable'}</p>
        <button
          onClick={() => navigate('/')}
          className="mt-4 bg-[#1B4F72] text-white font-bold px-4 py-2 rounded-xl text-sm"
        >
          Retour au tableau de bord
        </button>
      </div>
    );
  }

  const { group, dashboard, members = [], contributions = [], withdrawals = [], my_role } = detail;
  const isAdmin = my_role === 'admin';
  const groupBalance = parseFloat(dashboard?.balance || '0');
  const currency = formatCurrency(group.currency);

  const displayContributions = isPersonalMode
    ? contributions.filter(
        (c) => c.user_id === user?.id || c.member_name?.toLowerCase() === user?.name?.toLowerCase()
      )
    : contributions;

  const displayWithdrawals = isPersonalMode
    ? withdrawals.filter(
        (w) => w.user_id === user?.id || w.requester_name?.toLowerCase() === user?.name?.toLowerCase()
      )
    : withdrawals;

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#1B4F72] via-slate-800 to-teal-800 text-white rounded-3xl p-5 sm:p-8 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-black">{group.name}</h1>
              <span
                className={`text-[10px] sm:text-xs font-bold uppercase px-2.5 py-1 rounded-full ${
                  isAdmin ? 'bg-amber-400 text-slate-950' : 'bg-slate-700 text-slate-200'
                }`}
              >
                {formatRole(my_role)}
              </span>
              {isPersonalMode && (
                <span className="text-[10px] sm:text-xs font-bold uppercase px-2.5 py-1 rounded-full bg-amber-400/30 text-amber-300 border border-amber-400/40">
                  Mode Personnel
                </span>
              )}
            </div>
            {group.description && <p className="text-slate-300 text-xs sm:text-sm mt-1">{group.description}</p>}
          </div>

          {/* Invite Code button */}
          <button
            onClick={copyInviteCode}
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 px-3.5 py-2 rounded-xl text-xs font-mono font-bold transition shrink-0"
          >
            {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            Code: {group.invite_code}
          </button>
        </div>

        {/* Dashboard summary pills */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 pt-4 border-t border-white/10">
          <div className="bg-white/10 p-4 rounded-2xl border border-white/10">
            <span className="text-[11px] text-slate-300 block font-medium">Solde Trésorerie</span>
            <span className="text-2xl font-black text-amber-300">
              {groupBalance.toLocaleString()} {currency}
            </span>
          </div>
          <div className="bg-white/10 p-4 rounded-2xl border border-white/10">
            <span className="text-[11px] text-slate-300 block font-medium">Total des Cotisations</span>
            <span className="text-xl font-bold text-white">
              {parseFloat(dashboard?.total_contributed || '0').toLocaleString()} {currency}
            </span>
          </div>
          <div className="bg-white/10 p-4 rounded-2xl border border-white/10">
            <span className="text-[11px] text-slate-300 block font-medium">Total des Retraits</span>
            <span className="text-xl font-bold text-white">
              {parseFloat(dashboard?.total_withdrawn || '0').toLocaleString()} {currency}
            </span>
          </div>
        </div>
      </div>

      {/* Action Toolbar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        {/* Mobile scrollable tabs */}
        <div className="flex bg-slate-100 p-1.5 rounded-2xl text-xs font-bold text-slate-600 overflow-x-auto no-scrollbar scroll-smooth">
          {[
            { id: 'overview', label: 'Vue d\'ensemble', icon: FileText },
            { id: 'members', label: `Membres (${members.length})`, icon: Users },
            { id: 'contributions', label: `Cotisations (${displayContributions.length})`, icon: TrendingUp },
            { id: 'withdrawals', label: `Retraits (${displayWithdrawals.length})`, icon: ArrowUpRight },
            { id: 'objectives', label: `Objectifs (${objectives.length})`, icon: Target },
            { id: 'stats', label: 'Statistiques', icon: BarChart3 },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setTab(tab.id)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-white text-emerald-700 shadow-sm font-extrabold'
                    : 'hover:text-slate-900'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            onClick={() => setShowReqWithdrawalModal(true)}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-3.5 py-2.5 rounded-xl text-xs transition shadow-sm"
          >
            <ArrowUpRight className="w-4 h-4" />
            Demander un retrait
          </button>

          {isAdmin && (
            <button
              onClick={() => {
                setContribUserId(user?.id || members[0]?.user_id || '');
                setShowRecordContribModal(true);
              }}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3.5 py-2.5 rounded-xl text-xs transition shadow-md"
            >
              <Plus className="w-4 h-4" />
              Enregistrer cotisation
            </button>
          )}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
          {/* Group details card */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 text-base sm:text-lg">Informations du Groupe</h3>
            <div className="space-y-3 text-xs sm:text-sm divide-y divide-slate-100">
              <div className="pt-2 flex justify-between">
                <span className="text-slate-500">Règle de cotisation</span>
                <span className="font-semibold text-slate-900">{formatContributionRule(group.contribution_rule)}</span>
              </div>
              {group.fixed_amount && (
                <div className="pt-2 flex justify-between">
                  <span className="text-slate-500">Montant fixe exigé</span>
                  <span className="font-bold text-slate-900">
                    {parseFloat(group.fixed_amount).toLocaleString()} {currency}
                  </span>
                </div>
              )}
              <div className="pt-2 flex justify-between">
                <span className="text-slate-500">Fréquence</span>
                <span className="font-semibold text-slate-900">{formatFrequency(group.frequency)}</span>
              </div>
              <div className="pt-2 flex justify-between">
                <span className="text-slate-500">Règle de validation retrait</span>
                <span className="font-semibold text-slate-900">{group.validation_pct}% d'approbation</span>
              </div>
            </div>
          </div>

          {/* Quick Objectives Preview */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-base sm:text-lg flex items-center gap-2">
                <Target className="w-5 h-5 text-emerald-600" />
                Objectifs
              </h3>
              <button
                onClick={() => setTab('objectives')}
                className="text-xs font-bold text-emerald-600 hover:underline"
              >
                Voir tout ({objectives.length})
              </button>
            </div>
            {objectives.length === 0 ? (
              <p className="text-slate-500 text-xs py-4 text-center">Aucun objectif configuré.</p>
            ) : (
              <div className="space-y-3">
                {objectives.slice(0, 3).map((obj) => (
                  <div
                    key={obj.id}
                    className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className={`font-bold block ${obj.is_achieved ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                        {obj.title}
                      </span>
                      <span className="text-slate-500">
                        {parseFloat(obj.budget || '0').toLocaleString()} {currency}
                      </span>
                    </div>
                    {obj.is_achieved ? (
                      <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded">
                        Accompli
                      </span>
                    ) : (
                      <span className="text-slate-500 font-medium">En cours</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'members' && (
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-base sm:text-lg">Membres du groupe</h3>
            {isAdmin && (
              <button
                onClick={() => setShowAddMemberModal(true)}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Ajouter un membre
              </button>
            )}
          </div>

          <div className="divide-y divide-slate-100">
            {members.map((m) => (
              <div key={m.id} className="py-3.5 flex items-center justify-between gap-4 text-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 shrink-0">
                    {m.avatar_url ? (
                      <img src={m.avatar_url} alt={m.name} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      (m.name || 'M').substring(0, 2).toUpperCase()
                    )}
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 block text-xs sm:text-sm">{m.name}</span>
                    <span className="text-[11px] text-slate-500">{m.email || m.phone || 'Aucun contact'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <span
                    className={`text-[10px] sm:text-xs font-bold px-2.5 py-1 rounded-full ${
                      m.role === 'admin'
                        ? 'bg-amber-100 text-amber-800 border border-amber-300'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {formatRole(m.role)}
                  </span>

                  {isAdmin && m.user_id !== user?.id && (
                    <button
                      onClick={() => handleRemoveMember(m.user_id, m.name)}
                      className="text-slate-400 hover:text-red-600 p-1 transition"
                      title="Retirer le membre"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'contributions' && (
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-base sm:text-lg">Historique des Cotisations</h3>
            {isAdmin && (
              <button
                onClick={() => {
                  setContribUserId(user?.id || members[0]?.user_id || '');
                  setShowRecordContribModal(true);
                }}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition shadow-md"
              >
                <Plus className="w-4 h-4" />
                Nouvelle Cotisation
              </button>
            )}
          </div>

          {displayContributions.length === 0 ? (
            <p className="text-slate-500 text-xs py-8 text-center">
              {isPersonalMode ? 'Aucune cotisation personnelle enregistrée dans ce groupe.' : 'Aucune cotisation enregistrée.'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold">
                    <th className="py-3 px-3 sm:px-4">Membre</th>
                    <th className="py-3 px-3 sm:px-4">Montant</th>
                    <th className="py-3 px-3 sm:px-4">Moyen de paiement</th>
                    <th className="py-3 px-3 sm:px-4">Date</th>
                    <th className="py-3 px-3 sm:px-4">Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {displayContributions.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50">
                      <td className="py-3.5 px-3 sm:px-4 font-bold text-slate-900">{c.member_name}</td>
                      <td className="py-3.5 px-3 sm:px-4 font-extrabold text-emerald-700">
                        {parseFloat(c.amount || '0').toLocaleString()} {currency}
                      </td>
                      <td className="py-3.5 px-3 sm:px-4 text-slate-600">{formatPaymentMethod(c.payment_method)}</td>
                      <td className="py-3.5 px-3 sm:px-4 text-slate-500">
                        {new Date(c.created_at).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="py-3.5 px-3 sm:px-4 text-slate-500">{c.note || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'withdrawals' && (
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-base sm:text-lg">Demandes de Retrait & Votes</h3>
            <button
              onClick={() => setShowReqWithdrawalModal(true)}
              className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs px-3.5 py-2 rounded-xl transition shadow-sm"
            >
              <ArrowUpRight className="w-4 h-4" />
              Nouveau Retrait
            </button>
          </div>

          {displayWithdrawals.length === 0 ? (
            <p className="text-slate-500 text-xs py-8 text-center">
              {isPersonalMode ? 'Aucune demande de retrait personnelle dans ce groupe.' : 'Aucune demande de retrait.'}
            </p>
          ) : (
            <div className="space-y-4">
              {displayWithdrawals.map((w) => {
                const isPending = w.status === 'pending';
                const isApproved = w.status === 'approved';
                const isPaid = w.status === 'paid';

                return (
                  <div
                    key={w.id}
                    className="p-4 sm:p-5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-slate-900 text-base">{w.requester_name}</span>
                          <span
                            className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                              isPaid
                                ? 'bg-emerald-100 text-emerald-800'
                                : isApproved
                                ? 'bg-blue-100 text-blue-800'
                                : w.status === 'rejected'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {formatWithdrawalStatus(w.status)}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-1">Motif : {w.reason}</p>
                      </div>

                      <div className="text-left sm:text-right">
                        <span className="text-[11px] text-slate-500 block">Montant demandé</span>
                        <span className="text-lg sm:text-xl font-black text-slate-900">
                          {parseFloat(w.amount || '0').toLocaleString()} {currency}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs pt-3 border-t border-slate-200 text-slate-500">
                      <span>
                        Votes: {w.approve_count || 0} Pour / {w.reject_count || 0} Contre ({w.total_votes || 0}/{w.member_count || 0}{' '}
                        votants)
                      </span>

                      {/* Vote Buttons if pending */}
                      {isPending && (
                        <div className="flex items-center gap-2 w-full sm:w-auto pt-1 sm:pt-0">
                          {w.user_id === user?.id ? (
                            <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                              (Votre demande)
                            </span>
                          ) : (
                            <>
                              <button
                                onClick={() => handleVote(w.id, 'approve')}
                                className="flex-1 sm:flex-initial flex items-center justify-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-lg transition"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" /> Pour
                              </button>
                              <button
                                onClick={() => handleVote(w.id, 'reject')}
                                className="flex-1 sm:flex-initial flex items-center justify-center gap-1 bg-red-600 hover:bg-red-700 text-white font-bold px-3 py-1.5 rounded-lg transition"
                              >
                                <XCircle className="w-3.5 h-3.5" /> Contre
                              </button>
                            </>
                          )}
                        </div>
                      )}

                      {/* Mark Paid button if approved & isAdmin */}
                      {isApproved && isAdmin && (
                        <button
                          onClick={() => handleMarkPaid(w.id)}
                          className="w-full sm:w-auto bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-3.5 py-1.5 rounded-lg transition shadow-sm"
                        >
                          Marquer Payé
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'objectives' && (
        <ObjectivesSection
          groupId={group.id}
          objectives={objectives}
          groupBalance={groupBalance}
          currency={currency}
          isAdmin={isAdmin}
          onRefresh={fetchGroupData}
        />
      )}

      {activeTab === 'stats' && (
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-6">
          <h3 className="font-bold text-slate-900 text-base sm:text-lg flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-600" />
            Statistiques & Classement
          </h3>

          {!stats ? (
            <p className="text-slate-500 text-xs py-8 text-center">Statistiques non disponibles.</p>
          ) : (
            <div className="space-y-6">
              {/* Personal stats card */}
              {stats.my_stats && (
                <div className="bg-emerald-50 rounded-2xl p-4 sm:p-5 border border-emerald-200 space-y-2">
                  <span className="text-xs font-bold text-emerald-800 uppercase tracking-wide">
                    Vos Performances
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs pt-2">
                    <div>
                      <span className="text-slate-500 block">Total Cotisé</span>
                      <span className="font-extrabold text-emerald-900 text-sm sm:text-base">
                        {(stats.my_stats.total_contributed ?? 0).toLocaleString()} {currency}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Rang dans le groupe</span>
                      <span className="font-extrabold text-slate-900 text-sm sm:text-base">
                        #{stats.my_stats.rank || '-'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Part du solde</span>
                      <span className="font-extrabold text-slate-900 text-sm sm:text-base">
                        {stats.my_stats.share_pct ?? 0}%
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Nb Cotisations</span>
                      <span className="font-bold text-slate-900 text-sm sm:text-base">
                        {stats.my_stats.contribution_count ?? 0}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Top members list */}
              <div>
                <h4 className="font-bold text-slate-800 text-sm mb-3">Top Contributeurs</h4>
                {(stats.top_members || []).length === 0 ? (
                  <p className="text-slate-500 text-xs py-4">Aucune cotisation enregistrée pour le moment.</p>
                ) : (
                  <div className="space-y-2">
                    {(stats.top_members || []).map((m, idx) => (
                      <div
                        key={m.id}
                        className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-slate-400 w-5 text-center">#{idx + 1}</span>
                          <span className="font-bold text-slate-900">{m.name}</span>
                        </div>
                        <span className="font-extrabold text-slate-900">
                          {(m.total ?? 0).toLocaleString()} {currency}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal: Record Contribution */}
      {showRecordContribModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-xl font-bold text-slate-900">Enregistrer une Cotisation</h3>
            {actionError && (
              <div className="bg-red-50 text-red-700 text-xs p-3 rounded-xl border border-red-200">
                {actionError}
              </div>
            )}
            <form onSubmit={handleRecordContribution} className="space-y-4 text-sm">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Membre *</label>
                <select
                  disabled={!isAdmin}
                  value={contribUserId}
                  onChange={(e) => setContribUserId(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none ${
                    !isAdmin ? 'bg-slate-100 text-slate-600 cursor-not-allowed' : ''
                  }`}
                >
                  {members.map((m) => (
                    <option key={m.user_id} value={m.user_id}>
                      {m.name} {m.user_id === user?.id ? '(Moi)' : ''}
                    </option>
                  ))}
                </select>
                {!isAdmin && (
                  <p className="text-[11px] text-slate-500 mt-1">
                    En tant que membre simple, vous enregistrez une cotisation pour votre propre compte.
                  </p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-semibold text-slate-700">Montant ({currency}) *</label>
                  <span className="text-[11px] text-emerald-600 font-bold">Raccourcis rapides</span>
                </div>
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="ex: 10000"
                  value={contribAmount}
                  onChange={(e) => setContribAmount(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  {[5000, 10000, 25000, 50000].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        const cur = parseFloat(contribAmount) || 0;
                        setContribAmount((cur + preset).toString());
                      }}
                      className="px-2 py-0.5 bg-slate-100 hover:bg-emerald-100 hover:text-emerald-800 text-slate-700 text-xs font-bold rounded-lg border border-slate-200 transition"
                    >
                      +{preset.toLocaleString()} FCFA
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Moyen de paiement</label>
                <select
                  value={contribMethod}
                  onChange={(e) => setContribMethod(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Note (Optionnelle)</label>
                <input
                  type="text"
                  placeholder="ex: Mois de Mars"
                  value={contribNote}
                  onChange={(e) => setContribNote(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowRecordContribModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition shadow-md"
                >
                  {submitting ? 'Enregistrement...' : 'Valider'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Request Withdrawal */}
      {showReqWithdrawalModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-xl font-bold text-slate-900">Demander un Retrait</h3>
            {actionError && (
              <div className="bg-red-50 text-red-700 text-xs p-3 rounded-xl border border-red-200">
                {actionError}
              </div>
            )}
            <form onSubmit={handleRequestWithdrawal} className="space-y-4 text-sm">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Montant souhaité ({currency}) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="ex: 50000"
                  value={withdrawalAmount}
                  onChange={(e) => setWithdrawalAmount(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Motif / Justification *</label>
                <textarea
                  required
                  placeholder="ex: Achat d'équipements ou urgence médicale"
                  value={withdrawalReason}
                  onChange={(e) => setWithdrawalReason(e.target.value)}
                  rows={3}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowReqWithdrawalModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold transition shadow-md"
                >
                  {submitting ? 'Envoi...' : 'Soumettre la demande'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Member */}
      {showAddMemberModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-xl font-bold text-slate-900">Ajouter un Membre</h3>
            {actionError && (
              <div className="bg-red-50 text-red-700 text-xs p-3 rounded-xl border border-red-200">
                {actionError}
              </div>
            )}

            <div className="space-y-3 text-sm">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Rechercher un utilisateur</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Nom, email ou téléphone..."
                    value={userQuery}
                    onChange={(e) => setUserQuery(e.target.value)}
                    className="flex-1 px-3.5 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                  <button
                    onClick={handleSearchUser}
                    className="bg-slate-800 text-white font-bold px-4 py-2 rounded-xl hover:bg-slate-900 transition"
                  >
                    Chercher
                  </button>
                </div>
              </div>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="max-h-40 overflow-y-auto divide-y divide-slate-100 border rounded-xl p-2 bg-slate-50">
                  {searchResults.map((u) => (
                    <div
                      key={u.id}
                      onClick={() => setSelectedUser(u)}
                      className={`p-2 rounded-lg cursor-pointer flex items-center justify-between text-xs ${
                        selectedUser?.id === u.id ? 'bg-emerald-100 border border-emerald-300 font-bold' : 'hover:bg-slate-100'
                      }`}
                    >
                      <div>
                        <span className="block font-bold text-slate-900">{u.name}</span>
                        <span className="text-slate-500">{u.email || u.phone}</span>
                      </div>
                      {selectedUser?.id === u.id && <Check className="w-4 h-4 text-emerald-600" />}
                    </div>
                  ))}
                </div>
              )}

              {selectedUser && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Rôle attribué</label>
                  <select
                    value={memberRole}
                    onChange={(e: any) => setMemberRole(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="member">Membre Simple</option>
                    <option value="admin">Administrateur</option>
                  </select>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddMemberModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  Annuler
                </button>
                <button
                  onClick={handleAddMember}
                  disabled={!selectedUser || submitting}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition shadow-md disabled:opacity-50"
                >
                  {submitting ? 'Ajout...' : 'Confirmer l\'ajout'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
