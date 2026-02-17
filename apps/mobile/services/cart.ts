import { api } from './api';
import type { Cart } from './types';

export const cartApi = {
  getCart: () =>
    api.get<Cart>('/cart'),

  addItem: (variantId: string, quantity: number = 1) =>
    api.post<Cart>('/cart/items', { variantId, quantity }),

  updateItem: (itemId: string, quantity: number) =>
    api.patch<Cart>(`/cart/items/${itemId}`, { quantity }),

  removeItem: (itemId: string) =>
    api.delete<Cart>(`/cart/items/${itemId}`),

  clearCart: () =>
    api.delete<Cart>('/cart'),

  applyCoupon: (code: string) =>
    api.post<Cart>('/cart/coupon', { code }),

  removeCoupon: () =>
    api.delete<Cart>('/cart/coupon'),

  mergeCarts: (sessionId: string) =>
    api.post<Cart>('/cart/merge', { sessionId }),
};
