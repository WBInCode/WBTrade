import { api } from './api';
import type { Address, AddressFormData } from './types';

export const addressesApi = {
  getAll: () =>
    api.get<Address[]>('/addresses'),

  getById: (id: string) =>
    api.get<Address>(`/addresses/${id}`),

  getDefault: () =>
    api.get<Address | null>('/addresses/default'),

  create: (data: AddressFormData) =>
    api.post<Address>('/addresses', data),

  update: (id: string, data: Partial<AddressFormData>) =>
    api.put<Address>(`/addresses/${id}`, data),

  delete: (id: string) =>
    api.delete<{ success: boolean; message: string }>(`/addresses/${id}`),

  setDefault: (id: string) =>
    api.post<Address>(`/addresses/${id}/default`),
};
