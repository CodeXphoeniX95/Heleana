import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';

// ── Config ────────────────────────────────────────────────────────────────────

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? 'https://heleana-backend.vercel.app';

export const TOKEN_KEY = 'heleana_jwt';

// ── Axios instance ────────────────────────────────────────────────────────────

export const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Request interceptor : injecte le JWT ──────────────────────────────────────

api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  try {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch {
    // SecureStore peut échouer sur web — on ignore silencieusement
  }
  return config;
});

// ── Response interceptor : normalise les erreurs ─────────────────────────────

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ error?: string; message?: string }>) => {
    const serverMessage =
      error.response?.data?.error ??
      error.response?.data?.message ??
      error.message ??
      'Erreur réseau';

    // Créer une vraie instance Error avec le message du serveur
    const enriched = new Error(serverMessage);
    (enriched as any).status = error.response?.status;
    return Promise.reject(enriched);
  }
);

// ── Types partagés ────────────────────────────────────────────────────────────

export interface UserProfile {
  id: string;
  email: string | null;
  phone: string | null;
  name: string;
  avatar_url: string | null;
  created_at: string;
}

export interface Group {
  id: string;
  name: string;
  description: string | null;
  currency: string;
  contribution_rule: 'fixed' | 'free';
  fixed_amount: string | null;
  frequency: string;
  validation_rule: string;
  validation_pct: number;
  invite_code: string;
  created_by: string;
  created_at: string;
  // Enriched
  role?: 'admin' | 'member';
  member_count?: number;
  total_contributed?: string;
}

export interface Member {
  id: string;
  group_id: string;
  user_id: string;
  role: 'admin' | 'member';
  joined_at: string;
  name: string;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
}

export interface Contribution {
  id: string;
  group_id: string;
  user_id: string;
  amount: string;
  payment_method: string;
  recorded_by: string;
  note: string | null;
  created_at: string;
  member_name: string;
  recorder_name: string;
}

export interface Withdrawal {
  id: string;
  group_id: string;
  user_id: string;
  amount: string;
  reason: string;
  desired_date: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  resolved_at: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
  requester_name: string;
  requester_phone: string | null;
  approve_count: number;
  reject_count: number;
  total_votes: number;
  member_count: number;
}

export interface Approval {
  id: string;
  withdrawal_id: string;
  user_id: string;
  decision: 'approve' | 'reject';
  comment: string | null;
  created_at: string;
  voter_name: string;
}

export interface NotificationItem {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string | null;
  entity_id: string | null;
  group_id?: string | null;
  is_read: boolean;
  created_at: string;
}

export interface GroupDashboard {
  total_contributed: string;
  total_withdrawn: string;
  balance: string;
}

export interface GroupStats {
  monthly: { month: string; total: number; count: number }[];
  top_members: { id: string; name: string; total: number; count: number; average: number }[];
  monthly_average: number;
  contribution_count: number;
  total_contributed: number;
  average_per_contribution: number;
  my_stats: {
    contribution_count: number;
    total_contributed: number;
    average_per_contribution: number;
    max_contribution: number;
    min_contribution: number;
    monthly: { month: string; total: number; count: number }[];
    rank: number | null;
    share_pct: number;
  } | null;
}

export interface GroupDetail {
  group: Group;
  dashboard: GroupDashboard;
  members: Member[];
  contributions: Contribution[];
  withdrawals: Withdrawal[];
  my_role: 'admin' | 'member';
}

// ── Dashboard endpoint (tout en un) ──────────────────────────────────────────

export interface DashboardData {
  groups: (Group & { balance: number; total_contributed: number; total_withdrawn: number })[];
  recent_contributions: Contribution[];
  pending_withdrawals: Withdrawal[];
  my_total: number;
}

export const dashboardApi = {
  get: () =>
    api.get<DashboardData>('/dashboard').then((r) => r.data),
};

// ── Auth endpoints ────────────────────────────────────────────────────────────

export const authApi = {
  register: (data: { name: string; email?: string; phone?: string; password: string }) =>
    api.post<{ token: string; user: UserProfile }>('/auth/register', data).then((r) => r.data),

  login: (data: { email?: string; phone?: string; password: string }) =>
    api.post<{ token: string; user: UserProfile }>('/auth/login', data).then((r) => r.data),

  me: () =>
    api.get<{ user: UserProfile }>('/auth/me').then((r) => r.data.user),

  updateMe: (data: { name?: string; phone?: string; avatar_url?: string }) =>
    api.patch<{ user: UserProfile }>('/auth/me', data).then((r) => r.data.user),

  search: (q: string) =>
    api.get<{ users: UserProfile[] }>('/auth/search', { params: { q } }).then((r) => r.data.users),
};

// ── Groups endpoints ──────────────────────────────────────────────────────────

export const groupsApi = {
  list: () =>
    api.get<{ groups: Group[] }>('/groups').then((r) => r.data.groups),

  create: (data: {
    name: string;
    description?: string;
    currency?: string;
    contribution_rule?: 'fixed' | 'free';
    fixed_amount?: number;
    frequency?: string;
    validation_rule?: string;
    validation_pct?: number;
  }) =>
    api.post<{ group: Group }>('/groups', data).then((r) => r.data.group),

  get: (groupId: string) =>
    api.get<{ group: Group }>(`/groups/${groupId}`).then((r) => r.data.group),

  detail: (groupId: string) =>
    api.get<GroupDetail>(`/groups/${groupId}/detail`).then((r) => r.data),

  dashboard: (groupId: string) =>
    api.get<{ dashboard: GroupDashboard }>(`/groups/${groupId}/dashboard`).then((r) => r.data.dashboard),

  update: (groupId: string, data: Partial<Group>) =>
    api.patch<{ group: Group }>(`/groups/${groupId}`, data).then((r) => r.data.group),

  delete: (groupId: string) =>
    api.delete(`/groups/${groupId}`),

  join: (invite_code: string) =>
    api.post<{ group: Group }>('/groups/join', { invite_code }).then((r) => r.data.group),
};

// ── Members endpoints ─────────────────────────────────────────────────────────

export const membersApi = {
  list: (groupId: string) =>
    api.get<{ members: Member[] }>(`/groups/${groupId}/members`).then((r) => r.data.members),

  add: (groupId: string, user_id: string, role?: 'admin' | 'member') =>
    api.post<{ member: Member }>(`/groups/${groupId}/members`, { user_id, role }).then((r) => r.data.member),

  remove: (groupId: string, userId: string) =>
    api.delete(`/groups/${groupId}/members/${userId}`),

  changeRole: (groupId: string, userId: string, role: 'admin' | 'member') =>
    api.patch<{ member: Member }>(`/groups/${groupId}/members/${userId}/role`, { role }).then((r) => r.data.member),
};

// ── Contributions endpoints ───────────────────────────────────────────────────

export const contributionsApi = {
  list: (groupId: string, params?: { user_id?: string; limit?: number; offset?: number }) =>
    api
      .get<{ contributions: Contribution[] }>(`/groups/${groupId}/contributions`, { params })
      .then((r) => r.data.contributions),

  summary: (groupId: string) =>
    api
      .get<{ summary: { user_id: string; name: string; total: string; count: number }[] }>(
        `/groups/${groupId}/contributions/summary`
      )
      .then((r) => r.data.summary),

  record: (
    groupId: string,
    data: { user_id: string; amount: number; payment_method?: string; note?: string }
  ) =>
    api
      .post<{ contribution: Contribution }>(`/groups/${groupId}/contributions`, data)
      .then((r) => r.data.contribution),

  update: (groupId: string, contributionId: string, data: { amount?: number; payment_method?: string; note?: string }) =>
    api
      .patch<{ contribution: Contribution }>(`/groups/${groupId}/contributions/${contributionId}`, data)
      .then((r) => r.data.contribution),

  delete: (groupId: string, contributionId: string) =>
    api.delete(`/groups/${groupId}/contributions/${contributionId}`),

  stats: (groupId: string) =>
    api.get<{ stats: GroupStats }>(`/groups/${groupId}/stats`).then((r) => r.data.stats),
};

// ── Withdrawals endpoints ─────────────────────────────────────────────────────

export const withdrawalsApi = {
  list: (groupId: string, status?: string) =>
    api
      .get<{ withdrawals: Withdrawal[] }>(`/groups/${groupId}/withdrawals`, {
        params: status ? { status } : undefined,
      })
      .then((r) => r.data.withdrawals),

  get: (groupId: string, withdrawalId: string) =>
    api
      .get<{ withdrawal: Withdrawal }>(`/groups/${groupId}/withdrawals/${withdrawalId}`)
      .then((r) => r.data.withdrawal),

  request: (
    groupId: string,
    data: { amount: number; reason: string; desired_date?: string }
  ) =>
    api
      .post<{ withdrawal: Withdrawal }>(`/groups/${groupId}/withdrawals`, data)
      .then((r) => r.data.withdrawal),

  markPaid: (groupId: string, withdrawalId: string) =>
    api
      .patch<{ withdrawal: Withdrawal }>(`/groups/${groupId}/withdrawals/${withdrawalId}/pay`, {})
      .then((r) => r.data.withdrawal),
};

// ── Approvals endpoints ───────────────────────────────────────────────────────

export const approvalsApi = {
  list: (withdrawalId: string) =>
    api
      .get<{ approvals: Approval[] }>(`/withdrawals/${withdrawalId}/approvals`)
      .then((r) => r.data.approvals),

  vote: (
    withdrawalId: string,
    data: { decision: 'approve' | 'reject'; comment?: string }
  ) =>
    api
      .post<{ approval: Approval; withdrawal: Withdrawal }>(
        `/withdrawals/${withdrawalId}/approvals`,
        data
      )
      .then((r) => r.data),
};

// ── Notifications endpoints ───────────────────────────────────────────────────

export const notificationsApi = {
  list: (params?: { limit?: number; offset?: number }) =>
    api
      .get<{ notifications: NotificationItem[]; unread_count: number }>('/notifications', { params })
      .then((r) => r.data),

  markRead: (ids?: string[]) =>
    api.patch('/notifications/read', ids ? { ids } : {}),
};

export interface Objective {
  id: string;
  group_id: string;
  title: string;
  description: string | null;
  budget: string | null;
  target_date: string | null;
  is_achieved: boolean;
  achieved_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  creator_name?: string;
}

// ── Objectives endpoints ──────────────────────────────────────────────────────

export const objectivesApi = {
  list: (groupId: string) =>
    api.get<{ objectives: Objective[] }>(`/groups/${groupId}/objectives`).then((r) => r.data.objectives),

  create: (groupId: string, data: { title: string; description?: string; budget: number; target_date?: string }) =>
    api.post<{ objective: Objective }>(`/groups/${groupId}/objectives`, data).then((r) => r.data.objective),

  update: (groupId: string, objectiveId: string, data: Partial<{ title: string; description: string; budget: number; target_date: string }>) =>
    api.patch<{ objective: Objective }>(`/groups/${groupId}/objectives/${objectiveId}`, data).then((r) => r.data.objective),

  toggle: (groupId: string, objectiveId: string) =>
    api.patch<{ objective: Objective }>(`/groups/${groupId}/objectives/${objectiveId}/toggle`, {}).then((r) => r.data.objective),

  delete: (groupId: string, objectiveId: string) =>
    api.delete(`/groups/${groupId}/objectives/${objectiveId}`),
};

export const devicesApi = {
  register: (fcm_token: string, platform: 'android' | 'ios' = 'android') =>
    api.post('/devices', { fcm_token, platform }),

  delete: (fcm_token: string) =>
    api.delete(`/devices/${encodeURIComponent(fcm_token)}`),
};
