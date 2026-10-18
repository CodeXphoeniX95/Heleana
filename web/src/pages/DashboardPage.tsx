import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { dashboardApi, groupsApi, contributionsApi, withdrawalsApi } from '../lib/api';
import type { DashboardData } from '../lib/api';
import {
  formatRole,
  formatWithdrawalStatus,
  formatCurrency,
  formatPaymentMethod,
  getGreeting,
  PAYMENT_METHODS,
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
  Coins,
  PiggyBank,
  Sparkles,
  X,
  Check,
  Lock,
  ShieldCheck,
  Landmark,
  ArrowDownLeft,
  History,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const isPersonalMode = useAuthStore((state) => state.isPersonalMode);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showPersonalContribModal, setShowPersonalContribModal] = useState(false);
  const [showPersonalWithdrawModal, setShowPersonalWithdrawModal] = useState(false);
  const [showPersonalHistoryModal, setShowPersonalHistoryModal] = useState(false);
  const [personalHistoryData, setPersonalHistoryData] = useState<{ contributions: any[]; withdrawals: any[] } | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<'all' | 'deposits' | 'withdrawals'>('all');

  // Create Group Form
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [contributionRule, setContributionRule] = useState<'fixed' | 'free'>('fixed');
  const [fixedAmount, setFixedAmount] = useState('');
  const [frequency, setFrequency] = useState('monthly');
  const [isPersonalTontine, setIsPersonalTontine] = useState(false);

  // Join Group Form
  const [inviteCode, setInviteCode] = useState('');

  // Personal Contribution Form
  const [personalAmount, setPersonalAmount] = useState('');
  const [personalPaymentMethod, setPersonalPaymentMethod] = useState('cash');
  const [personalNote, setPersonalNote] = useState('');

  // Personal Withdrawal Form
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawReason, setWithdrawReason] = useState('');

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

  // Find strictly user's 1-member personal cashbox group
  const personalGroup: any = (data?.groups || []).find(
    (g: any) =>
      g.member_count === 1 ||
      g.name.toLowerCase().includes('caisse personnelle') ||
      g.name.toLowerCase().includes('épargne personnelle')
  );

  const getOrCreatePersonalGroup = async (): Promise<string> => {
    if (personalGroup) return personalGroup.id;
    const created = await groupsApi.create({
      name: 'Ma Caisse Personnelle',
      description: 'Coffre-fort d\'épargne individuelle et caisse personnelle privée',
      currency: 'Franc CFA',
      contribution_rule: 'free',
      frequency: 'free',
    });
    return created.id;
  };

  const openPersonalHistory = async () => {
    setShowPersonalHistoryModal(true);
    setLoadingHistory(true);
    try {
      const targetGroupId = await getOrCreatePersonalGroup();
      const detail = await groupsApi.detail(targetGroupId);
      setPersonalHistoryData({
        contributions: detail.contributions || [],
        withdrawals: detail.withdrawals || [],
      });
    } catch (err: any) {
      console.error('Erreur historique caisse:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const allPersonalTransactions = React.useMemo(() => {
    if (!personalHistoryData) return [];
    const list: { id: string; type: 'deposit' | 'withdrawal'; amount: string; date: string; methodOrReason: string; note?: string | null }[] = [];
    (personalHistoryData.contributions || []).forEach((c: any) => {
      list.push({
        id: c.id,
        type: 'deposit',
        amount: c.amount,
        date: c.created_at,
        methodOrReason: c.payment_method,
        note: c.note,
      });
    });
    (personalHistoryData.withdrawals || [])
      .filter((w: any) => w.status === 'paid' || w.status === 'approved')
      .forEach((w: any) => {
        list.push({
          id: w.id,
          type: 'withdrawal',
          amount: w.amount,
          date: w.created_at,
          methodOrReason: w.reason,
          note: w.reason,
        });
      });
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [personalHistoryData]);

  const displayedTransactions = React.useMemo(() => {
    if (historyFilter === 'deposits') return allPersonalTransactions.filter((t) => t.type === 'deposit');
    if (historyFilter === 'withdrawals') return allPersonalTransactions.filter((t) => t.type === 'withdrawal');
    return allPersonalTransactions;
  }, [allPersonalTransactions, historyFilter]);

  const togglePersonalType = (isPersonal: boolean) => {
    setIsPersonalTontine(isPersonal);
    if (isPersonal) {
      setName('Ma Caisse Personnelle');
      setDescription('Coffre-fort d\'épargne individuelle et caisse personnelle privée');
      setContributionRule('free');
      setFrequency('free');
    } else {
      setName('');
      setDescription('');
      setContributionRule('fixed');
      setFrequency('monthly');
    }
  };

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
      setIsPersonalTontine(false);
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

  const handlePersonalContribution = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    const amt = parseFloat(personalAmount);
    if (isNaN(amt) || amt <= 0) {
      setModalError('Veuillez saisir un montant supérieur à 0 FCFA');
      return;
    }

    setSubmitting(true);
    try {
      const targetGroupId = await getOrCreatePersonalGroup();
      await contributionsApi.record(targetGroupId, {
        user_id: user?.id || '',
        amount: amt,
        payment_method: personalPaymentMethod,
        note: personalNote.trim() || 'Versement dans ma caisse personnelle',
      });

      setShowPersonalContribModal(false);
      setPersonalAmount('');
      setPersonalNote('');
      setSuccessMsg(
        `Votre versement personnel de ${amt.toLocaleString()} Franc CFA a été déposé dans votre Caisse Personnelle !`
      );
      setTimeout(() => setSuccessMsg(null), 5000);
      fetchDashboard();
    } catch (err: any) {
      setModalError(err.message || 'Erreur lors de l\'enregistrement dans la caisse');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePersonalWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    const amt = parseFloat(withdrawAmount);
    if (isNaN(amt) || amt <= 0) {
      setModalError('Veuillez saisir un montant supérieur à 0 FCFA');
      return;
    }

    const availableBalance = personalGroup?.balance || 0;
    if (amt > availableBalance) {
      setModalError(`Solde insuffisant (${availableBalance.toLocaleString()} FCFA disponible).`);
      return;
    }

    setSubmitting(true);
    try {
      const targetGroupId = await getOrCreatePersonalGroup();
      await withdrawalsApi.request(targetGroupId, {
        amount: amt,
        reason: withdrawReason.trim() || 'Retrait personnel de ma caisse',
      });

      setShowPersonalWithdrawModal(false);
      setWithdrawAmount('');
      setWithdrawReason('');
      setSuccessMsg(
        `Retrait personnel de ${amt.toLocaleString()} Franc CFA effectué avec succès !`
      );
      setTimeout(() => setSuccessMsg(null), 5000);
      fetchDashboard();
    } catch (err: any) {
      setModalError(err.message || 'Erreur lors du retrait');
    } finally {
      setSubmitting(false);
    }
  };

  const addPresetAmount = (val: number) => {
    const current = parseFloat(personalAmount) || 0;
    setPersonalAmount((current + val).toString());
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto my-8 p-4 bg-red-50 text-red-700 rounded-xl border border-red-200 text-center text-xs">
        <p className="font-semibold">{error}</p>
        <button
          onClick={fetchDashboard}
          className="mt-3 bg-red-600 text-white font-bold px-3 py-1.5 rounded-lg text-xs"
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
    <div className="max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
      {/* Toast Notification Success */}
      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 px-4 py-3 rounded-xl shadow-sm flex items-center justify-between gap-3 text-xs animate-fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium">{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-500 hover:text-emerald-800 p-0.5">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-[#1B4F72] via-slate-800 to-teal-800 text-white rounded-xl py-2.5 px-3.5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="bg-emerald-500/20 text-emerald-300 font-bold text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider border border-emerald-400/30 flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5" /> Tableau de Bord
            </span>
            {isPersonalMode && (
              <span className="bg-amber-400/30 text-amber-300 font-bold text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider border border-amber-400/40 flex items-center gap-1">
                <UserCheck className="w-2.5 h-2.5" /> Mode Personnel
              </span>
            )}
          </div>
          <h1 className="text-sm sm:text-base font-bold tracking-tight">{greeting.greeting}</h1>
          <p className="text-amber-300 font-medium text-[11px]">{greeting.motto}</p>
        </div>

        {/* Global Personal Cumulated Savings */}
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-lg px-3 py-1.5 w-full sm:w-auto min-w-[160px] text-right sm:text-center flex sm:flex-col justify-between sm:justify-center items-center">
          <span className="text-[10px] text-slate-300 font-medium flex items-center gap-1">
            <PiggyBank className="w-3 h-3 text-emerald-400" /> Cotisations cumulées
          </span>
          <span className="text-sm sm:text-base font-black text-amber-300">
            {(data?.my_total || 0).toLocaleString()} FCFA
          </span>
        </div>
      </div>

      {/* 🏦 SECTION 1: MA CAISSE PERSONNELLE (100% INDIVIDUELLE) */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-emerald-950 text-white rounded-xl p-3 shadow-md border border-emerald-500/30 space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 flex items-center justify-center font-bold shadow-sm shrink-0">
              <Landmark className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-xs sm:text-sm font-bold tracking-tight text-white">Ma Caisse Personnelle</h2>
                <span className="bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 text-[8px] font-bold uppercase px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                  <Lock className="w-2 h-2" /> 100% Privée
                </span>
              </div>
              <p className="text-[10px] text-slate-400">Coffre-fort d'épargne individuelle et privée</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={openPersonalHistory}
              className="flex-1 sm:flex-initial bg-slate-800 hover:bg-slate-700 text-emerald-300 font-semibold px-2.5 py-1 rounded-lg text-[11px] transition border border-slate-700 flex items-center justify-center gap-1"
            >
              <History className="w-3 h-3 text-emerald-400" />
              Historique
            </button>
            <button
              onClick={() => setShowPersonalContribModal(true)}
              className="flex-1 sm:flex-initial bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-bold px-2.5 py-1 rounded-lg text-[11px] transition shadow-sm flex items-center justify-center gap-1 border border-emerald-400/50"
            >
              <Coins className="w-3 h-3" />
              + Cotiser
            </button>
            <button
              onClick={() => setShowPersonalWithdrawModal(true)}
              className="flex-1 sm:flex-initial bg-slate-800 hover:bg-slate-700 text-amber-300 font-semibold px-2.5 py-1 rounded-lg text-[11px] transition border border-slate-700 flex items-center justify-center gap-1"
            >
              <ArrowDownLeft className="w-3 h-3 text-amber-400" />
              Retirer
            </button>
          </div>
        </div>

        {/* Caisse Balance & Stats Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div className="bg-slate-800/80 backdrop-blur-md px-3 py-2 rounded-lg border border-slate-700/80 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 font-medium block">Solde Caisse</span>
              <span className="text-sm sm:text-base font-black text-amber-300 block">
                {(personalGroup?.balance || 0).toLocaleString()} FCFA
              </span>
            </div>
            <Wallet className="w-4 h-4 text-emerald-400 shrink-0" />
          </div>

          <div className="bg-slate-800/80 backdrop-blur-md px-3 py-2 rounded-lg border border-slate-700/80 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 font-medium block">Total Cotisé</span>
              <span className="text-xs sm:text-sm font-bold text-white block">
                {(personalGroup?.total_contributed || 0).toLocaleString()} FCFA
              </span>
            </div>
            <TrendingUp className="w-4 h-4 text-teal-400 shrink-0" />
          </div>

          <div className="bg-slate-800/80 backdrop-blur-md px-3 py-2 rounded-lg border border-slate-700/80 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 font-medium block">Sécurité</span>
              <span className="text-[11px] font-semibold text-emerald-300 block flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Accès libre 24/7
              </span>
            </div>
            <Coins className="w-4 h-4 text-amber-400 shrink-0" />
          </div>
        </div>
      </div>

      {/* 👥 SECTION 2: MES GROUPES & TONTINES COLLECTIVES */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-600" />
            Mes Tontines & Groupes Collectifs ({(data?.groups || []).length})
          </h2>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                togglePersonalType(false);
                setShowCreateModal(true);
              }}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold px-3 py-2 rounded-xl text-xs transition shadow-sm"
            >
              <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
              Nouveau Groupe Collectif
            </button>
            <button
              onClick={() => setShowJoinModal(true)}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold px-3 py-2 rounded-xl text-xs transition border border-slate-200"
            >
              <UserPlus className="w-3.5 h-3.5 text-slate-600" />
              Rejoindre par Code
            </button>
          </div>
        </div>

        {/* Groups Grid */}
        {(data?.groups || []).length === 0 ? (
          <div className="bg-white rounded-2xl p-6 text-center border border-slate-200 shadow-sm space-y-3">
            <Users className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="text-sm font-bold text-slate-800">Aucun groupe collectif rejoint</h3>
            <p className="text-slate-500 text-xs max-w-md mx-auto">
              Utilisez votre Caisse Personnelle ci-dessus ou rejoignez une tontine collective à plusieurs membres.
            </p>
            <button
              onClick={() => {
                togglePersonalType(false);
                setShowCreateModal(true);
              }}
              className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-xs transition"
            >
              Créer un groupe collectif
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {data?.groups.map((group) => (
              <Link
                key={group.id}
                to={`/groups/${group.id}`}
                className="bg-white rounded-2xl p-4 border border-slate-200 hover:border-emerald-400 hover:shadow-md transition group relative flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-extrabold text-sm sm:text-base text-slate-900 group-hover:text-emerald-600 transition">
                        {group.name}
                      </h3>
                      {group.description && (
                        <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{group.description}</p>
                      )}
                    </div>
                    <span
                      className={`text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                        group.role === 'admin'
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {formatRole(group.role)}
                    </span>
                  </div>

                  <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-500 block">
                        {isPersonalMode ? 'Vos Cotisations' : 'Solde Trésorerie'}
                      </span>
                      <span className="text-base font-black text-slate-900">
                        {(group.balance || 0).toLocaleString()} {formatCurrency(group.currency)}
                      </span>
                    </div>
                    <Wallet className="w-5 h-5 text-emerald-600 shrink-0" />
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <span className="flex items-center gap-1 font-semibold text-slate-700">
                    <Users className="w-3 h-3 text-slate-400" />
                    {group.member_count || 1} membre(s)
                  </span>
                  <span className="text-emerald-600 font-bold group-hover:translate-x-0.5 transition flex items-center gap-0.5">
                    Accéder <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Pending Withdrawals & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 pt-1">
        {/* Pending Withdrawals Section */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-500" />
              {isPersonalMode ? 'Vos Retraits en attente' : 'Demandes de Retrait en attente'}
            </h3>
            <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
              {filteredWithdrawals.length}
            </span>
          </div>

          {filteredWithdrawals.length === 0 ? (
            <p className="text-slate-500 text-xs py-3 text-center">
              {isPersonalMode ? 'Aucune demande de retrait personnelle en attente.' : 'Aucun retrait en attente.'}
            </p>
          ) : (
            <div className="space-y-2">
              {filteredWithdrawals.map((w) => (
                <button
                  key={w.id}
                  onClick={() => navigate(`/groups/${w.group_id}?tab=withdrawals`)}
                  className="w-full text-left p-3 rounded-xl bg-amber-50/50 border border-amber-200 hover:bg-amber-100/60 transition flex items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-900">{w.requester_name}</span>
                      <span className="text-[10px] text-amber-700 font-semibold bg-amber-100 px-1.5 py-0.5 rounded">
                        {formatWithdrawalStatus(w.status)}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">Motif : {w.reason}</p>
                    <span className="text-xs text-amber-800 font-bold block mt-0.5">
                      {parseFloat(w.amount).toLocaleString()} FCFA
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-white px-2.5 py-1 rounded-lg border border-amber-200 shadow-sm shrink-0">
                    {w.user_id === user?.id ? 'Détails' : 'Voter'} <ArrowUpRight className="w-3 h-3" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Recent Contributions Feed */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              {isPersonalMode ? 'Vos Dernières Cotisations' : 'Dernières Cotisations'}
            </h3>
            <button
              onClick={() => setShowPersonalContribModal(true)}
              className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
            >
              + Cotiser <Coins className="w-3 h-3" />
            </button>
          </div>

          {filteredContributions.length === 0 ? (
            <p className="text-slate-500 text-xs py-3 text-center">
              {isPersonalMode ? 'Aucune cotisation personnelle enregistrée.' : 'Aucune cotisation récente.'}
            </p>
          ) : (
            <div className="space-y-2">
              {filteredContributions.map((c) => (
                <div
                  key={c.id}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold shrink-0">
                      <CheckCircle className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="font-bold text-slate-900 block">{c.member_name}</span>
                      <span className="text-slate-500 text-[10px]">
                        {new Date(c.created_at).toLocaleDateString('fr-FR')} • {formatPaymentMethod(c.payment_method)}
                        {c.note ? ` • ${c.note}` : ''}
                      </span>
                    </div>
                  </div>
                  <span className="font-extrabold text-emerald-700 text-xs sm:text-sm shrink-0">
                    +{parseFloat(c.amount).toLocaleString()} FCFA
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* MODAL 1: COTISER DANS MA CAISSE PERSONNELLE (COMPACT) */}
      {showPersonalContribModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-4 sm:p-5 shadow-xl space-y-3.5 border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-black">
                  <Coins className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Cotiser dans ma Caisse Personnelle</h3>
                  <p className="text-[11px] text-slate-500">Versement individuel sur votre coffre-fort privé</p>
                </div>
              </div>
              <button
                onClick={() => setShowPersonalContribModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded-full"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {modalError && (
              <div className="bg-red-50 text-red-700 text-xs p-2.5 rounded-xl border border-red-200 font-semibold">
                {modalError}
              </div>
            )}

            <form onSubmit={handlePersonalContribution} className="space-y-3 text-xs">
              {/* Amount & Quick Presets */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-semibold text-slate-800">Montant du versement (Franc CFA) *</label>
                  <span className="text-[10px] text-emerald-600 font-bold">Raccourcis rapides</span>
                </div>
                <input
                  type="number"
                  required
                  min="100"
                  placeholder="ex: 10000"
                  value={personalAmount}
                  onChange={(e) => setPersonalAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none text-base font-bold text-slate-900"
                />

                {/* Quick Add Preset Buttons (Compact) */}
                <div className="flex flex-wrap items-center gap-1 mt-1.5">
                  {[5000, 10000, 25000, 50000, 100000].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => addPresetAmount(preset)}
                      className="px-2 py-0.5 bg-slate-100 hover:bg-emerald-100 hover:text-emerald-800 text-slate-700 text-[11px] font-semibold rounded-md border border-slate-200 transition"
                    >
                      +{preset.toLocaleString()} FCFA
                    </button>
                  ))}
                </div>
              </div>

              {/* Payment Method Selector */}
              <div>
                <label className="block font-semibold text-slate-800 mb-1">Moyen de paiement *</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {PAYMENT_METHODS.map((method) => {
                    const isSelected = personalPaymentMethod === method.value || personalPaymentMethod === method.label;
                    return (
                      <button
                        key={method.value}
                        type="button"
                        onClick={() => setPersonalPaymentMethod(method.value)}
                        className={`py-1.5 px-2 rounded-lg border text-xs font-semibold flex items-center justify-between transition ${
                          isSelected
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-900 ring-1 ring-emerald-500'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <span>{method.label}</span>
                        {isSelected && <Check className="w-3 h-3 text-emerald-600 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Note / Libellé */}
              <div>
                <label className="block font-semibold text-slate-800 mb-1">Motif / Libellé personnel (Optionnel)</label>
                <input
                  type="text"
                  placeholder="ex: Épargne mensuelle, Achat projet..."
                  value={personalNote}
                  onChange={(e) => setPersonalNote(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowPersonalContribModal(false)}
                  className="px-3 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold transition shadow flex items-center gap-1.5"
                >
                  <Coins className="w-3.5 h-3.5 text-amber-300" />
                  {submitting ? 'Validation...' : 'Valider mon Dépôt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: RETRAIT DE MA CAISSE PERSONNELLE (COMPACT) */}
      {showPersonalWithdrawModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-4 sm:p-5 shadow-xl space-y-3 border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-black">
                  <ArrowDownLeft className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Retrait Caisse Personnelle</h3>
                  <p className="text-[11px] text-slate-500">Retirez de votre solde personnel</p>
                </div>
              </div>
              <button
                onClick={() => setShowPersonalWithdrawModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">Solde Caisse Disponible :</span>
              <span className="font-black text-emerald-700">
                {(personalGroup?.balance || 0).toLocaleString()} FCFA
              </span>
            </div>

            {modalError && (
              <div className="bg-red-50 text-red-700 text-xs p-2.5 rounded-xl border border-red-200 font-semibold">
                {modalError}
              </div>
            )}

            <form onSubmit={handlePersonalWithdrawal} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-800 mb-1">Montant à retirer (Franc CFA) *</label>
                <input
                  type="number"
                  required
                  min="100"
                  max={personalGroup?.balance || 0}
                  placeholder="ex: 15000"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 focus:outline-none text-base font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-800 mb-1">Motif du retrait *</label>
                <input
                  type="text"
                  required
                  placeholder="ex: Dépense personnelle..."
                  value={withdrawReason}
                  onChange={(e) => setWithdrawReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowPersonalWithdrawModal(false)}
                  className="px-3 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold transition shadow"
                >
                  {submitting ? 'Traitement...' : 'Valider mon Retrait'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: HISTORIQUE DE MA CAISSE PERSONNELLE (COMPACT & EXHAUSTIF) */}
      {showPersonalHistoryModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-4 sm:p-5 shadow-xl space-y-3.5 border border-slate-100 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black">
                  <History className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Historique de ma Caisse Personnelle</h3>
                  <p className="text-[11px] text-slate-500">Toutes vos cotisations (dépôts) et vos retraits</p>
                </div>
              </div>
              <button
                onClick={() => setShowPersonalHistoryModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded-full"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center justify-between gap-1.5 shrink-0 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
              <button
                onClick={() => setHistoryFilter('all')}
                className={`flex-1 py-1 px-2 rounded-lg transition ${
                  historyFilter === 'all' ? 'bg-white text-slate-900 shadow-sm font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Tout ({allPersonalTransactions.length})
              </button>
              <button
                onClick={() => setHistoryFilter('deposits')}
                className={`flex-1 py-1 px-2 rounded-lg transition ${
                  historyFilter === 'deposits' ? 'bg-emerald-600 text-white shadow-sm font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Cotisations (+{(personalHistoryData?.contributions || []).length})
              </button>
              <button
                onClick={() => setHistoryFilter('withdrawals')}
                className={`flex-1 py-1 px-2 rounded-lg transition ${
                  historyFilter === 'withdrawals' ? 'bg-amber-500 text-slate-950 shadow-sm font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Retraits (-{(personalHistoryData?.withdrawals || []).filter((w: any) => w.status === 'paid' || w.status === 'approved').length})
              </button>
            </div>

            {/* Transactions Timeline */}
            <div className="overflow-y-auto space-y-2 pr-1 flex-1 min-h-[220px]">
              {loadingHistory ? (
                <div className="py-12 text-center text-slate-400 flex flex-col items-center gap-2 text-xs">
                  <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-emerald-600"></div>
                  <span>Chargement de l'historique...</span>
                </div>
              ) : displayedTransactions.length === 0 ? (
                <div className="py-10 text-center text-slate-400 text-xs">
                  Aucune transaction enregistrée dans votre Caisse Personnelle.
                </div>
              ) : (
                displayedTransactions.map((tx) => (
                  <div
                    key={`${tx.type}-${tx.id}`}
                    className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs transition ${
                      tx.type === 'deposit'
                        ? 'bg-emerald-50/40 border-emerald-200/80 hover:bg-emerald-50'
                        : 'bg-amber-50/40 border-amber-200/80 hover:bg-amber-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold ${
                          tx.type === 'deposit'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {tx.type === 'deposit' ? (
                          <Coins className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <ArrowDownLeft className="w-4 h-4 text-amber-600" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-slate-900 truncate">
                            {tx.type === 'deposit' ? 'Cotisation / Versement' : 'Retrait personnel'}
                          </span>
                          <span
                            className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-md ${
                              tx.type === 'deposit'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : 'bg-amber-100 text-amber-900 border border-amber-200'
                            }`}
                          >
                            {tx.type === 'deposit'
                              ? formatPaymentMethod(tx.methodOrReason)
                              : 'Effectué / Payé'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">
                          {tx.note ? tx.note : tx.methodOrReason}
                        </p>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          {new Date(tx.date).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span
                        className={`font-black text-xs sm:text-sm block ${
                          tx.type === 'deposit' ? 'text-emerald-700' : 'text-amber-800'
                        }`}
                      >
                        {tx.type === 'deposit' ? '+' : '-'}{parseFloat(tx.amount).toLocaleString()} FCFA
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 shrink-0">
              <span className="font-medium">Total opérations : {allPersonalTransactions.length}</span>
              <button
                type="button"
                onClick={() => setShowPersonalHistoryModal(false)}
                className="px-3.5 py-1.5 rounded-xl bg-slate-900 text-white hover:bg-slate-800 font-bold transition"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create Group */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-3 z-50">
          <div className="bg-white rounded-2xl max-w-sm w-full p-4 sm:p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-base font-bold text-slate-900">
                {isPersonalTontine ? 'Créer une Caisse Personnelle' : 'Créer un Groupe Collectif'}
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Type selector toggle */}
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => togglePersonalType(false)}
                className={`py-1.5 px-2 rounded-lg transition ${
                  !isPersonalTontine ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                👥 Groupe Collectif
              </button>
              <button
                type="button"
                onClick={() => togglePersonalType(true)}
                className={`py-1.5 px-2 rounded-lg transition ${
                  isPersonalTontine ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                👤 Caisse Personnelle
              </button>
            </div>

            {modalError && (
              <div className="bg-red-50 text-red-700 text-xs p-2.5 rounded-xl border border-red-200">
                {modalError}
              </div>
            )}
            <form onSubmit={handleCreateGroup} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {isPersonalTontine ? 'Nom de votre caisse personnelle *' : 'Nom du Groupe *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={isPersonalTontine ? 'ex: Mon Épargne Projet 2026' : 'ex: Tontine Solidaire 2026'}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  placeholder="Objectif financier..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {!isPersonalTontine && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Règle de Cotisation</label>
                    <select
                      value={contributionRule}
                      onChange={(e: any) => setContributionRule(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
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
                      className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    >
                      <option value="monthly">Mensuelle</option>
                      <option value="weekly">Hebdomadaire</option>
                      <option value="free">Libre</option>
                    </select>
                  </div>
                </div>
              )}

              {!isPersonalTontine && contributionRule === 'fixed' && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Montant fixe (Franc CFA)</label>
                  <input
                    type="number"
                    placeholder="ex: 10000"
                    value={fixedAmount}
                    onChange={(e) => setFixedAmount(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition shadow"
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-3 z-50">
          <div className="bg-white rounded-2xl max-w-sm w-full p-4 sm:p-5 shadow-xl space-y-3">
            <h3 className="text-base font-bold text-slate-900">Rejoindre un Groupe</h3>
            {modalError && (
              <div className="bg-red-50 text-red-700 text-xs p-2.5 rounded-xl border border-red-200">
                {modalError}
              </div>
            )}
            <form onSubmit={handleJoinGroup} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Code d'invitation *</label>
                <input
                  type="text"
                  required
                  placeholder="Entrez le code"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none uppercase font-mono tracking-widest text-center text-base"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowJoinModal(false)}
                  className="px-3 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-[#1B4F72] hover:bg-blue-900 text-white font-bold transition shadow"
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
