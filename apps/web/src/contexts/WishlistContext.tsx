'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

interface WishlistItem {
  id: string;
  name: string;
  price: string;
  compareAtPrice?: string;
  image: string;
  addedAt: string;
}

interface WishlistContextType {
  items: WishlistItem[];
  itemCount: number;
  isInWishlist: (productId: string) => boolean;
  addToWishlist: (product: { id: string; name: string; price: string; compareAtPrice?: string; image: string }) => void;
  removeFromWishlist: (productId: string) => void;
  toggleWishlist: (product: { id: string; name: string; price: string; compareAtPrice?: string; image: string }) => void;
  clearWishlist: () => void;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

const WISHLIST_STORAGE_KEY = 'wbtrade_wishlist';

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load wishlist from localStorage
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

  // Save wishlist to localStorage
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(items));
    }
  }, [items, isLoaded]);

  const isInWishlist = useCallback((productId: string) => {
    return items.some(item => item.id === productId);
  }, [items]);

  const addToWishlist = useCallback((product: { 
    id: string; 
    name: string; 
    price: string; 
    compareAtPrice?: string; 
    image: string 
  }) => {
    setItems(prev => {
      if (prev.some(item => item.id === product.id)) {
        return prev;
      }
      return [...prev, {
        ...product,
        addedAt: new Date().toISOString(),
      }];
    });
  }, []);

  const removeFromWishlist = useCallback((productId: string) => {
    setItems(prev => prev.filter(item => item.id !== productId));
  }, []);

  const toggleWishlist = useCallback((product: { 
    id: string; 
    name: string; 
    price: string; 
    compareAtPrice?: string; 
    image: string 
  }) => {
    if (isInWishlist(product.id)) {
      removeFromWishlist(product.id);
    } else {
      addToWishlist(product);
    }
  }, [isInWishlist, removeFromWishlist, addToWishlist]);

  const clearWishlist = useCallback(() => {
    setItems([]);
  }, []);

  return (
    <WishlistContext.Provider
      value={{
        items,
        itemCount: items.length,
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
