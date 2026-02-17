import { api } from './api';
import type { Cart } from './types';

// API wraps cart in { success, data, message? } — unwrap it
interface CartResponse {
  success: boolean;
  data: Cart;
  message?: string;
}

const unwrap = (res: CartResponse): Cart => res.data;

export const cartApi = {
  getCart: () =>
    api.get<CartResponse>('/cart').then(unwrap),

  addItem: (variantId: string, quantity: number = 1) =>
    api.post<CartResponse>('/cart/items', { variantId, quantity }).then(unwrap),

  updateItem: (itemId: string, quantity: number) =>
    api.patch<CartResponse>(`/cart/items/${itemId}`, { quantity }).then(unwrap),

  removeItem: (itemId: string) =>
    api.delete<CartResponse>(`/cart/items/${itemId}`).then(unwrap),

  clearCart: () =>
    api.delete<CartResponse>('/cart').then(unwrap),

  applyCoupon: (code: string) =>
    api.post<CartResponse>('/cart/coupon', { code }).then(unwrap),

  removeCoupon: () =>
    api.delete<CartResponse>('/cart/coupon').then(unwrap),

  mergeCarts: (sessionId: string) =>
    api.post<CartResponse>('/cart/merge', { sessionId }).then(unwrap),
};
