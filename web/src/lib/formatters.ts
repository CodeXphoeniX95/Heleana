/**
 * Helper functions to format backend strings into clear, professional French terms.
 */

export function formatContributionRule(rule: string | undefined | null): string {
  if (!rule) return 'Cotisation libre';
  const lower = rule.toLowerCase();
  if (lower === 'fixed') return 'Cotisation fixe';
  if (lower === 'free') return 'Cotisation libre';
  return rule;
}

export function formatFrequency(freq: string | undefined | null): string {
  if (!freq) return 'Mensuelle';
  const lower = freq.toLowerCase();
  if (lower === 'monthly') return 'Mensuelle';
  if (lower === 'weekly') return 'Hebdomadaire';
  if (lower === 'free') return 'Libre';
  return freq;
}

export function formatWithdrawalStatus(status: string | undefined | null): string {
  if (!status) return 'En attente';
  const lower = status.toLowerCase();
  if (lower === 'pending') return 'En attente';
  if (lower === 'approved') return 'Approuvé';
  if (lower === 'rejected') return 'Rejeté';
  if (lower === 'paid') return 'Payé';
  return status;
}

export function formatRole(role: string | undefined | null): string {
  if (!role) return 'Membre';
  const lower = role.toLowerCase();
  if (lower === 'admin') return 'Administrateur';
  if (lower === 'member') return 'Membre Simple';
  return role;
}

export function formatCurrency(currency: string | undefined | null): string {
  if (!currency || currency === 'XOF' || currency === 'FCFA') return 'Franc CFA';
  return currency;
}

export const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'tmoney', label: 'T-Money' },
  { value: 'flooz', label: 'Flooz' },
  { value: 'bank', label: 'Banque' },
  { value: 'wave', label: 'Wave' },
  { value: 'orange_money', label: 'Orange Money' },
  { value: 'free_money', label: 'Free Money' },
];

export function formatPaymentMethod(method: string | undefined | null): string {
  if (!method) return 'Cash';
  const lower = method.toLowerCase();
  if (lower === 'cash' || lower === 'espèces') return 'Cash';
  if (lower === 'tmoney' || lower === 't-money') return 'T-Money';
  if (lower === 'flooz') return 'Flooz';
  if (lower === 'bank' || lower === 'banque' || lower.includes('virement') || lower.includes('carte')) return 'Banque';
  if (lower === 'wave') return 'Wave';
  if (lower === 'orange_money' || lower === 'orange money' || lower === 'orange') return 'Orange Money';
  if (lower === 'free_money' || lower === 'free money' || lower === 'free') return 'Free Money';
  return method;
}

export function getGreeting(userName: string | undefined | null): { greeting: string; motto: string } {
  const name = userName ? userName.trim() : 'Utilisateur';
  const hour = new Date().getHours();
  let greeting = '';
  if (hour >= 5 && hour < 12) {
    greeting = `Salu ${name}`;
  } else if (hour >= 12 && hour < 18) {
    greeting = `Bon apres midi ${name}`;
  } else {
    greeting = `Bonne soiree ${name}`;
  }
  return {
    greeting,
    motto: '⚓ Blessed Forever 🤍',
  };
}
