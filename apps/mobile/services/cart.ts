import * as Crypto from 'expo-crypto';
import { api, saveSessionId, getSessionId } from './api';
import type { Cart } from './types';

// API wraps cart in { success, data, message? } — unwrap it
interface CartResponse {
  success: boolean;
  data: Cart;
  message?: string;
}

// Unwrap and save session ID from cart response body
const unwrap = async (res: CartResponse): Promise<Cart> => {
  const cart = res.data;
  // API returns sessionId in the cart object body (not in headers!)
  if (cart?.sessionId) {
    await saveSessionId(cart.sessionId);
  }
  return cart;
};

// Generate a session ID if none exists yet (same pattern as web app)
async function ensureSessionId(): Promise<void> {
  const existing = await getSessionId();
  if (!existing) {
    const id = 'sess_' + Crypto.randomUUID();
    await saveSessionId(id);
  }
}

export const cartApi = {
  getCart: async () => {
    await ensureSessionId();
    return api.get<CartResponse>('/cart').then(unwrap);
  },

  addItem: async (variantId: string, quantity: number = 1) => {
    await ensureSessionId();
    return api.post<CartResponse>('/cart/items', { variantId, quantity }).then(unwrap);
  },

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
