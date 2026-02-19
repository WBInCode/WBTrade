import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { wishlistApi } from '../services/wishlist';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import type { WishlistItem } from '../services/types';

interface WishlistContextType {
  items: WishlistItem[];
  loading: boolean;
  count: number;
  /** Set of product IDs in the wishlist for quick O(1) lookup */
  wishlistIds: Set<string>;
  isInWishlist: (productId: string) => boolean;
  toggle: (productId: string) => Promise<void>;
  add: (productId: string) => Promise<void>;
  remove: (productId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { show: showToast } = useToast();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [wishlistIds, setWishlistIds] = useState<Set<string>>(new Set());

  const count = items.length;

  const refresh = useCallback(async () => {
    if (!user) {
      setItems([]);
      setWishlistIds(new Set());
      return;
    }
    try {
      setLoading(true);
      const data = await wishlistApi.getAll();
      setItems(data.items || []);
      setWishlistIds(new Set((data.items || []).map((i) => i.productId)));
    } catch {
      // silently fail — user might not be auth'd
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const isInWishlist = useCallback(
    (productId: string) => wishlistIds.has(productId),
    [wishlistIds]
  );

  const add = useCallback(
    async (productId: string) => {
      if (!user) return;
      // Optimistic update
      setWishlistIds((prev) => new Set(prev).add(productId));
      try {
        await wishlistApi.add(productId);
        await refresh();
        showToast('Dodano do ulubionych', 'success');
      } catch {
        // Revert on error
        setWishlistIds((prev) => {
          const next = new Set(prev);
          next.delete(productId);
          return next;
        });
      }
    },
    [user, refresh, showToast]
  );

  const remove = useCallback(
    async (productId: string) => {
      if (!user) return;
      // Optimistic update
      setWishlistIds((prev) => {
        const next = new Set(prev);
        next.delete(productId);
        return next;
      });
      setItems((prev) => prev.filter((i) => i.productId !== productId));
      try {
        await wishlistApi.remove(productId);
        showToast('Usunięto z ulubionych', 'info');
      } catch {
        // Revert on error
        await refresh();
      }
    },
    [user, refresh, showToast]
  );

  const toggle = useCallback(
    async (productId: string) => {
      if (isInWishlist(productId)) {
        await remove(productId);
      } else {
        await add(productId);
      }
    },
    [isInWishlist, add, remove]
  );

  return (
    <WishlistContext.Provider
      value={{
        items,
        loading,
        count,
        wishlistIds,
        isInWishlist,
        toggle,
        add,
        remove,
        refresh,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (context === undefined) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
}
