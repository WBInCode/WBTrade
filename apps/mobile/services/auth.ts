import { api, apiFetch } from './api';
import type { User, RegisterData, AuthResponse } from './types';

export const authApi = {
  login: (email: string, password: string) =>
    apiFetch<AuthResponse>('/auth/login', { method: 'POST', body: { email, password }, skipAuth: true }),

  register: (data: RegisterData) =>
    apiFetch<AuthResponse>('/auth/register', { method: 'POST', body: data, skipAuth: true }),

  logout: (refreshToken: string) =>
    api.post('/auth/logout', { refreshToken }),

  getProfile: () =>
    api.get<{ user: User }>('/auth/me'),

  updateProfile: (data: Partial<User>) =>
    api.patch<{ user: User }>('/auth/profile', data),

  changePassword: (currentPassword: string, newPassword: string) =>
    api.post('/auth/change-password', { currentPassword, newPassword }),

  forgotPassword: (email: string) =>
    api.post('/auth/forgot-password', { email }),

  resetPassword: (token: string, password: string) =>
    api.post('/auth/reset-password', { token, password }),

  deleteAccount: (password: string) =>
    api.delete('/auth/delete-account', { password }),
};
