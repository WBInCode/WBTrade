import { api } from './api';
import type { WishlistResponse, WishlistItem } from './types';

export const wishlistApi = {
  getAll: async (): Promise<WishlistResponse> => {
    return api.get<WishlistResponse>('/wishlist');
  },

  add: async (productId: string, variantId?: string): Promise<WishlistItem> => {
    return api.post<WishlistItem>('/wishlist', { productId, variantId });
  },

  remove: async (productId: string): Promise<void> => {
    await api.delete(`/wishlist/${productId}`);
  },

  check: async (productId: string): Promise<boolean> => {
    const res = await api.get<{ inWishlist: boolean }>(`/wishlist/check/${productId}`);
    return res.inWishlist;
  },

  clearAll: async (): Promise<void> => {
    await api.delete('/wishlist');
  },

  merge: async (items: { productId: string; variantId?: string }[]): Promise<WishlistResponse> => {
    return api.post<WishlistResponse>('/wishlist/merge', { items });
  },
};
