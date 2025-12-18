'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { cartApi, Cart, CartItem } from '../lib/api';

interface CartContextType {
  cart: Cart | null;
  loading: boolean;
  error: string | null;
  itemCount: number;
  addToCart: (variantId: string, quantity?: number) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  removeFromCart: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  applyCoupon: (code: string) => Promise<void>;
  removeCoupon: () => Promise<void>;
  refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const itemCount = cart?.items.reduce((sum, item) => sum + item.quantity, 0) || 0;

  const refreshCart = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const cartData = await cartApi.getCart();
      setCart(cartData);
    } catch (err: any) {
      console.error('Failed to fetch cart:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshCart();
  }, [refreshCart]);

  const addToCart = useCallback(async (variantId: string, quantity: number = 1) => {
    try {
      setError(null);
      const updatedCart = await cartApi.addItem(variantId, quantity);
      setCart(updatedCart);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, []);

  const updateQuantity = useCallback(async (itemId: string, quantity: number) => {
    try {
      setError(null);
      const updatedCart = await cartApi.updateItem(itemId, quantity);
      setCart(updatedCart);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, []);

  const removeFromCart = useCallback(async (itemId: string) => {
    try {
      setError(null);
      const updatedCart = await cartApi.removeItem(itemId);
      setCart(updatedCart);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, []);

  const clearCart = useCallback(async () => {
    try {
      setError(null);
      const updatedCart = await cartApi.clearCart();
      setCart(updatedCart);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, []);

  const applyCoupon = useCallback(async (code: string) => {
    try {
      setError(null);
      const updatedCart = await cartApi.applyCoupon(code);
      setCart(updatedCart);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, []);

  const removeCoupon = useCallback(async () => {
    try {
      setError(null);
      const updatedCart = await cartApi.removeCoupon();
      setCart(updatedCart);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, []);

  return (
    <CartContext.Provider
      value={{
        cart,
        loading,
        error,
        itemCount,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        applyCoupon,
        removeCoupon,
        refreshCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
