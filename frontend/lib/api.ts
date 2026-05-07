import axios, { AxiosError, AxiosResponse } from 'axios';
import Cookies from 'js-cookie';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = Cookies.get('auth_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res: AxiosResponse) => res,
  (error: AxiosError<any>) => {
    if (error.response?.status === 401) {
      Cookies.remove('auth_token');
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

// ── Auth ──────────────────────────────────────────────────────────────────────

export const authApi = {
  register: (data: { username: string; email: string; password: string; password_confirmation: string }) =>
    api.post('/api/register', data),
  login: (data: { identifier: string; password: string }) =>
    api.post('/api/login', data),
  logout: () =>
    api.post('/api/logout'),
  forgotPassword: (email: string) =>
    api.post('/api/password/forgot', { email }),
  resetPassword: (data: { token: string; email: string; password: string; password_confirmation: string }) =>
    api.post('/api/password/reset', data),
};

// ── Users ─────────────────────────────────────────────────────────────────────

export const usersApi = {
  list: (params?: Record<string, any>) =>
    api.get('/api/users', { params }),
  get: (id: number) =>
    api.get(`/api/users/${id}`),
  create: (data: any) =>
    api.post('/api/users', data),
  update: (id: number, data: any) =>
    api.put(`/api/users/${id}`, data),
  delete: (id: number) =>
    api.delete(`/api/users/${id}`),
  block: (id: number) =>
    api.post(`/api/users/${id}/block`),
  unblock: (id: number) =>
    api.post(`/api/users/${id}/unblock`),
  massCreate: (data: { users: Array<{ username: string; password: string; email?: string }> }) =>
    api.post('/api/users/mass', data),
};

// ── Wallet ────────────────────────────────────────────────────────────────────

export const walletApi = {
  getBalance: (userId: number) =>
    api.get(`/api/users/${userId}/balance`),
  addBalance: (userId: number, data: { amount: string; reason: string }) =>
    api.post(`/api/admin/users/${userId}/balance/add`, data),
  removeBalance: (userId: number, data: { amount: string; reason: string }) =>
    api.post(`/api/admin/users/${userId}/balance/remove`, data),
};

// ── Transactions ──────────────────────────────────────────────────────────────

export const transactionsApi = {
  adminList: (params?: Record<string, any>) =>
    api.get('/api/admin/transactions', { params }),
  myTransactions: (params?: Record<string, any>) =>
    api.get('/api/transactions/my', { params }),
};

// ── Admin ─────────────────────────────────────────────────────────────────────

export const adminApi = {
  stats:     () => api.get('/api/admin/stats'),
  chartData: () => api.get('/api/admin/stats/chart'),
};

// ── Games ─────────────────────────────────────────────────────────────────────

export const gamesApi = {
  list:    (params?: Record<string, any>) => api.get('/api/games', { params }),
  get:     (id: number)                   => api.get(`/api/games/${id}`),
  create:  (data: any)                    => api.post('/api/games', data),
  update:  (id: number, data: any)        => api.patch(`/api/games/${id}`, data),
  disable: (id: number)                   => api.patch(`/api/games/${id}/disable`),
};

// ── Sessions ──────────────────────────────────────────────────────────────────

export const sessionsApi = {
  start:          (data: { gameId: number; transferAmount: number })   => api.post('/api/sessions/start', data),
  end:            (sessionId: string, reason?: string)                  => api.post(`/api/sessions/${sessionId}/end`, { reason }),
  spin:           (sessionId: string, betAmount: number, idempotencyKey: string) =>
    api.post(`/api/sessions/${sessionId}/spin`, { betAmount, idempotencyKey }),
  get:            (sessionId: string)  => api.get(`/api/sessions/${sessionId}`),
  spins:          (sessionId: string)  => api.get(`/api/sessions/${sessionId}/spins`),
  active:         ()                   => api.get('/api/sessions'),
  history:        ()                   => api.get('/api/sessions/history/all'),
};
