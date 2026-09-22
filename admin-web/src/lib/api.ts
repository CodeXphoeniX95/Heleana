import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'https://heleana-backend.vercel.app/api';

export const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token') || localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface UserProfile {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface Group {
  id: string;
  name: string;
  description: string | null;
  currency: string;
  invite_code: string;
  created_by: string;
  created_at: string;
}

export interface Contribution {
  id: string;
  group_id: string;
  user_id: string;
  amount: number;
  payment_method: string | null;
  note: string | null;
  created_at: string;
}

export interface Withdrawal {
  id: string;
  group_id: string;
  user_id: string;
  amount: number;
  reason: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  created_at: string;
}

export interface AdminOverview {
  stats: {
    total_users: number;
    total_groups: number;
    total_contributed: number;
    total_withdrawn: number;
    global_balance: number;
    pending_withdrawals_count: number;
  };
  users: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    avatar_url: string | null;
    created_at: string;
    groups_count: number;
    total_contributed: number;
  }[];
  groups: (Group & {
    creator_name: string;
    member_count: number;
    total_contributions: number;
    total_withdrawals: number;
    balance: number;
  })[];
  contributions: (Contribution & { member_name: string; group_name: string })[];
  withdrawals: (Withdrawal & { requester_name: string; group_name: string })[];
}

export const adminApi = {
  login: (data: { email?: string; phone?: string; password: string }) =>
    api.post<{ token: string; user: UserProfile }>('/auth/login', data).then((r) => r.data),

  getOverview: () => api.get<AdminOverview>('/admin/overview').then((r) => r.data),
};
