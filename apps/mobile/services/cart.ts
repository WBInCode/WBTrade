import * as Crypto from 'expo-crypto';
import { api, saveSessionId, getSessionId } from './api';
import type { Cart } from './types';

// In-memory cache for cart ID (avoids async storage reads on every request)
let cachedCartId: string | null = null;

// API wraps cart in { success, data, message? } — unwrap it
interface CartResponse {
  success: boolean;
  data: Cart;
  message?: string;
}

// Unwrap and save session ID + cart ID from cart response body
const unwrap = async (res: CartResponse): Promise<Cart> => {
  const cart = res.data;
  if (cart?.sessionId) {
    await saveSessionId(cart.sessionId);
  }
  // Cache cart ID in memory for faster subsequent requests
  if (cart?.id) {
    cachedCartId = cart.id;
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

// Helper to build extra headers with cached cart ID
function cartHeaders(): Record<string, string> | undefined {
  return cachedCartId ? { 'X-Cart-Id': cachedCartId } : undefined;
}

export const cartApi = {
  getCart: async () => {
    await ensureSessionId();
    return api.get<CartResponse>('/cart', undefined, cartHeaders()).then(unwrap);
  },

  addItem: async (variantId: string, quantity: number = 1) => {
    await ensureSessionId();
    return api.post<CartResponse>('/cart/items', { variantId, quantity }, cartHeaders()).then(unwrap);
  },

  updateItem: (itemId: string, quantity: number) =>
    api.patch<CartResponse>(`/cart/items/${itemId}`, { quantity }, cartHeaders()).then(unwrap),

  removeItem: (itemId: string) =>
    api.delete<CartResponse>(`/cart/items/${itemId}`, undefined, cartHeaders()).then(unwrap),

  clearCart: () =>
    api.delete<CartResponse>('/cart', undefined, cartHeaders()).then(unwrap),

  applyCoupon: (code: string) =>
    api.post<CartResponse>('/cart/coupon', { code }, cartHeaders()).then(unwrap),

  removeCoupon: () =>
    api.delete<CartResponse>('/cart/coupon', undefined, cartHeaders()).then(unwrap),

  mergeCarts: (sessionId: string) =>
    api.post<CartResponse>('/cart/merge', { sessionId }, cartHeaders()).then(unwrap),
};
