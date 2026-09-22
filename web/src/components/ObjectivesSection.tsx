import React, { useState } from 'react';
import { objectivesApi } from '../lib/api';
import type { Objective } from '../lib/api';
import { Target, CheckCircle2, Circle, Trash2, Plus, AlertTriangle, ShieldAlert } from 'lucide-react';

interface ObjectivesSectionProps {
  groupId: string;
  objectives: Objective[];
  groupBalance: number;
  currency: string;
  isAdmin: boolean;
  onRefresh: () => void;
}

export const ObjectivesSection: React.FC<ObjectivesSectionProps> = ({
  groupId,
  objectives,
  groupBalance,
  currency,
  isAdmin,
  onRefresh,
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [budgetStr, setBudgetStr] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Toggle confirmation modal state
  const [toggleConfirmObj, setToggleConfirmObj] = useState<Objective | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const budgetNum = parseFloat(budgetStr);
    if (!title.trim()) {
      setError('Le titre est requis.');
      return;
    }
    if (isNaN(budgetNum) || budgetNum <= 0) {
      setError('Un budget positif (> 0) est obligatoire pour chaque objectif.');
      return;
    }

    setLoading(true);
    try {
      await objectivesApi.create(groupId, {
        title: title.trim(),
        description: description.trim() || undefined,
        budget: budgetNum,
        target_date: targetDate || undefined,
      });
      setShowCreateModal(false);
      setTitle('');
      setDescription('');
      setBudgetStr('');
      setTargetDate('');
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la création de l\'objectif');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmToggle = async () => {
    if (!toggleConfirmObj) return;
    setLoading(true);
    try {
      await objectivesApi.toggle(groupId, toggleConfirmObj.id);
      setToggleConfirmObj(null);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la modification de l\'objectif');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (objective: Objective) => {
    if (objective.is_achieved) {
      alert('Impossible de supprimer un objectif déjà accompli !');
      return;
    }
    if (!confirm(`Supprimer l'objectif "${objective.title}" ?`)) return;

    try {
      await objectivesApi.delete(groupId, objective.id);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la suppression');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Target className="w-5 h-5 text-emerald-600" />
            Objectifs du Groupe
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Définissez les cibles financières et suivez leur accomplissement.
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm px-4 py-2 rounded-xl shadow-md transition"
          >
            <Plus className="w-4 h-4" />
            Nouvel Objectif
          </button>
        )}
      </div>

      {objectives.length === 0 ? (
        <div className="bg-slate-50 rounded-2xl p-8 text-center border border-dashed border-slate-300">
          <Target className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <p className="text-slate-600 font-medium">Aucun objectif défini pour ce groupe.</p>
          {isAdmin && (
            <p className="text-xs text-slate-500 mt-1">
              Cliquez sur "Nouvel Objectif" pour fixer une cible budgétaire.
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {objectives.map((obj) => {
            const budgetVal = parseFloat(obj.budget || '0');
            const isReachable = !obj.is_achieved && groupBalance >= budgetVal && budgetVal > 0;

            return (
              <div
                key={obj.id}
                className={`relative rounded-2xl p-5 border transition shadow-sm ${
                  obj.is_achieved
                    ? 'bg-slate-50 border-slate-200 opacity-90'
                    : isReachable
                    ? 'bg-emerald-50/80 border-emerald-400 ring-2 ring-emerald-300 shadow-md'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* Header status */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <button
                      disabled={!isAdmin}
                      onClick={() => {
                        if (!isAdmin) return;
                        setToggleConfirmObj(obj);
                      }}
                      title={
                        !isAdmin
                          ? 'Seul un administrateur peut modifier le statut'
                          : obj.is_achieved
                          ? 'Rouvrir cet objectif'
                          : 'Marquer comme accompli'
                      }
                      className={`mt-0.5 rounded-full transition ${
                        !isAdmin ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:scale-110'
                      }`}
                    >
                      {obj.is_achieved ? (
                        <CheckCircle2 className="w-6 h-6 text-emerald-600 fill-emerald-100" />
                      ) : (
                        <Circle className="w-6 h-6 text-slate-400 hover:text-emerald-500" />
                      )}
                    </button>
                    <div>
                      <h3
                        className={`font-bold text-base ${
                          obj.is_achieved ? 'line-through text-slate-500' : 'text-slate-900'
                        }`}
                      >
                        {obj.title}
                      </h3>
                      {obj.description && (
                        <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                          {obj.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Reachable Tag */}
                  {isReachable && (
                    <span className="bg-emerald-600 text-white font-bold text-[10px] uppercase tracking-wide px-2.5 py-1 rounded-full shadow-sm flex items-center gap-1">
                      Atteignable !
                    </span>
                  )}
                </div>

                {/* Budget & Details */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-sm">
                  <div>
                    <span className="text-xs text-slate-500 block">Budget requis</span>
                    <span className="font-extrabold text-slate-900 text-base">
                      {budgetVal.toLocaleString()} {currency}
                    </span>
                  </div>

                  {obj.target_date && (
                    <div className="text-right">
                      <span className="text-xs text-slate-500 block">Échéance</span>
                      <span className="font-medium text-slate-700 text-xs">
                        {new Date(obj.target_date).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                  )}
                </div>

                {/* Footer status & Actions */}
                <div className="mt-3 flex items-center justify-between text-xs">
                  {obj.is_achieved ? (
                    <span className="text-emerald-700 font-semibold bg-emerald-100/80 px-2.5 py-0.5 rounded-md">
                      Accompli le {new Date(obj.achieved_at!).toLocaleDateString('fr-FR')}
                    </span>
                  ) : (
                    <span className="text-slate-500">En cours</span>
                  )}

                  {/* Delete action allowed ONLY if NOT achieved & isAdmin */}
                  {isAdmin && !obj.is_achieved && (
                    <button
                      onClick={() => handleDelete(obj)}
                      className="text-slate-400 hover:text-red-600 transition p-1"
                      title="Supprimer l'objectif"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation Modal for Toggling Accomplishment */}
      {toggleConfirmObj && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100 space-y-4">
            <div className="flex items-center gap-3 text-amber-600">
              <ShieldAlert className="w-7 h-7" />
              <h3 className="font-bold text-lg text-slate-900">Confirmation Admin</h3>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              {toggleConfirmObj.is_achieved
                ? `Voulez-vous rouvrir l'objectif "${toggleConfirmObj.title}" ? Le budget de ${parseFloat(toggleConfirmObj.budget || '0').toLocaleString()} ${currency} sera réintégré dans le solde disponible.`
                : `Voulez-vous marquer l'objectif "${toggleConfirmObj.title}" comme ACCOMPLI ? Le budget de ${parseFloat(toggleConfirmObj.budget || '0').toLocaleString()} ${currency} sera déduit du solde net disponible du groupe.`}
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setToggleConfirmObj(null)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-sm font-semibold transition"
              >
                Annuler
              </button>
              <button
                disabled={loading}
                onClick={handleConfirmToggle}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition shadow-md"
              >
                {loading ? 'Validation...' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Objective Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100 space-y-4">
            <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
              <Target className="w-5 h-5 text-emerald-600" />
              Créer un nouvel objectif
            </h3>

            {error && (
              <div className="bg-red-50 text-red-700 text-xs p-3 rounded-xl border border-red-200 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4 text-sm">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Titre de l'objectif *</label>
                <input
                  type="text"
                  required
                  placeholder="ex: Achat terrain commercial"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description (optionnelle)</label>
                <textarea
                  placeholder="Détails du projet ou conditions..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Budget requis ({currency}) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  step="any"
                  placeholder="ex: 500000"
                  value={budgetStr}
                  onChange={(e) => setBudgetStr(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Le budget est obligatoire (&gt; 0). Il sera mis en évidence lorsque la trésorerie l'atteindra.
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Date cible (optionnelle)</label>
                <input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition shadow-md"
                >
                  {loading ? 'Création...' : 'Créer l\'objectif'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
