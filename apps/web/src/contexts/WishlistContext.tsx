'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { wishlistApi, WishlistItem as ApiWishlistItem } from '../lib/api';
import { useAuth } from './AuthContext';

interface WishlistItem {
  id: string;
  variantId?: string;
  name: string;
  price: string;
  compareAtPrice?: string;
  image: string;
  addedAt: string;
}

interface WishlistContextType {
  items: WishlistItem[];
  itemCount: number;
  loading: boolean;
  isInWishlist: (productId: string) => boolean;
  addToWishlist: (product: { id: string; variantId?: string; name: string; price: string; compareAtPrice?: string; image: string }) => Promise<void>;
  removeFromWishlist: (productId: string) => Promise<void>;
  toggleWishlist: (product: { id: string; variantId?: string; name: string; price: string; compareAtPrice?: string; image: string }) => Promise<void>;
  clearWishlist: () => Promise<void>;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

const WISHLIST_STORAGE_KEY = 'wbtrade_wishlist';

// Convert API wishlist item to local format
function apiToLocal(item: ApiWishlistItem): WishlistItem {
  return {
    id: item.productId,
    variantId: item.variantId || undefined,
    name: item.product.name,
    price: String(item.variant?.price || item.product.price),
    compareAtPrice: item.variant?.compareAtPrice 
      ? String(item.variant.compareAtPrice) 
      : item.product.compareAtPrice 
        ? String(item.product.compareAtPrice) 
        : undefined,
    image: item.product.images[0]?.url || '',
    addedAt: item.createdAt,
  };
}

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const { isAuthenticated, user } = useAuth();

  // Load wishlist from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(WISHLIST_STORAGE_KEY);
      if (saved) {
        setItems(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Failed to load wishlist:', error);
    }
    setIsLoaded(true);
  }, []);

  // Save wishlist to localStorage when not authenticated
  useEffect(() => {
    if (isLoaded && !isAuthenticated) {
      localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(items));
    }
  }, [items, isLoaded, isAuthenticated]);

  // Sync with server when authenticated
  useEffect(() => {
    async function syncWithServer() {
      if (!isAuthenticated || !isLoaded) return;

      setLoading(true);
      try {
        // Get local items to merge
        const localItems = items.map(item => ({
          productId: item.id,
          variantId: item.variantId,
        }));

        // Merge local wishlist with server
        if (localItems.length > 0) {
          const response = await wishlistApi.mergeWishlist(localItems);
          setItems(response.items.map(apiToLocal));
          // Clear localStorage after successful merge
          localStorage.removeItem(WISHLIST_STORAGE_KEY);
        } else {
          // Just fetch from server
          const response = await wishlistApi.getWishlist();
          setItems(response.items.map(apiToLocal));
        }
      } catch (error) {
        console.error('Failed to sync wishlist:', error);
        // Keep local items on error
      } finally {
        setLoading(false);
      }
    }

    syncWithServer();
  }, [isAuthenticated, user?.id]); // Re-sync when auth state changes

  // Clear server wishlist data when logging out
  useEffect(() => {
    if (!isAuthenticated && isLoaded) {
      // User logged out - keep items in localStorage only
      localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(items));
    }
  }, [isAuthenticated]);

  const isInWishlist = useCallback((productId: string) => {
    return items.some(item => item.id === productId);
  }, [items]);

  const addToWishlist = useCallback(async (product: { 
    id: string; 
    variantId?: string;
    name: string; 
    price: string; 
    compareAtPrice?: string; 
    image: string 
  }) => {
    // Optimistically add to local state
    const newItem: WishlistItem = {
      ...product,
      addedAt: new Date().toISOString(),
    };

    setItems(prev => {
      if (prev.some(item => item.id === product.id)) {
        return prev;
      }
      return [...prev, newItem];
    });

    // If authenticated, also add to server
    if (isAuthenticated) {
      try {
        await wishlistApi.addToWishlist(product.id, product.variantId);
      } catch (error) {
        console.error('Failed to add to wishlist on server:', error);
        // Don't rollback - keep local state
      }
    }
  }, [isAuthenticated]);

  const removeFromWishlist = useCallback(async (productId: string) => {
    // Optimistically remove from local state
    setItems(prev => prev.filter(item => item.id !== productId));

    // If authenticated, also remove from server
    if (isAuthenticated) {
      try {
        await wishlistApi.removeFromWishlist(productId);
      } catch (error) {
        console.error('Failed to remove from wishlist on server:', error);
        // Don't rollback - keep local state
      }
    }
  }, [isAuthenticated]);

  const toggleWishlist = useCallback(async (product: { 
    id: string; 
    variantId?: string;
    name: string; 
    price: string; 
    compareAtPrice?: string; 
    image: string 
  }) => {
    if (isInWishlist(product.id)) {
      await removeFromWishlist(product.id);
    } else {
      await addToWishlist(product);
    }
  }, [isInWishlist, removeFromWishlist, addToWishlist]);

  const clearWishlist = useCallback(async () => {
    setItems([]);

    // If authenticated, also clear on server
    if (isAuthenticated) {
      try {
        await wishlistApi.clearWishlist();
      } catch (error) {
        console.error('Failed to clear wishlist on server:', error);
      }
    }
  }, [isAuthenticated]);

  return (
    <WishlistContext.Provider
      value={{
        items,
        itemCount: items.length,
        loading,
        isInWishlist,
        addToWishlist,
        removeFromWishlist,
        toggleWishlist,
        clearWishlist,
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
