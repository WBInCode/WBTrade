import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { cartApi } from '../services/cart';
import { getSessionId } from '../services/api';
import type { Cart } from '../services/types';
import { useAuth } from './AuthContext';
import AddToCartModal, { type AddedProductInfo } from '../components/AddToCartModal';

interface CartContextType {
  cart: Cart | null;
  loading: boolean;
  error: string | null;
  itemCount: number;
  addToCart: (variantId: string, quantity?: number, productInfo?: AddedProductInfo) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  removeFromCart: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  applyCoupon: (code: string) => Promise<void>;
  removeCoupon: () => Promise<void>;
  refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const prevUserRef = useRef<typeof user | undefined>(undefined);

  // Add-to-cart modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [addedProduct, setAddedProduct] = useState<AddedProductInfo | null>(null);

  const itemCount = (cart?.items || []).reduce((sum, item) => sum + item.quantity, 0);

  const refreshCart = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const cartData = await cartApi.getCart();
      setCart(cartData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshCart();
  }, [refreshCart]);

  // Merge guest cart into user cart after login/register, refresh after logout
  useEffect(() => {
    const prevUser = prevUserRef.current;
    prevUserRef.current = user;

    // Skip initial render (prevUser is undefined)
    if (prevUser === undefined) return;

    if (!prevUser && user) {
      // User just logged in or registered — merge guest cart, then refresh
      (async () => {
        try {
          const sessionId = await getSessionId();
          if (sessionId) {
            await cartApi.mergeCarts(sessionId);
          }
        } catch {
          // Merge may fail if no guest cart — that's OK
        }
        await refreshCart();
      })();
    } else if (prevUser && !user) {
      // User just logged out — refresh to get fresh guest cart
      refreshCart();
    }
  }, [user, refreshCart]);

  const addToCart = useCallback(async (variantId: string, quantity: number = 1, productInfo?: AddedProductInfo) => {
    try {
      setError(null);
      const updatedCart = await cartApi.addItem(variantId, quantity);
      setCart(updatedCart);
      // Show modal if product info provided
      if (productInfo) {
        setAddedProduct(productInfo);
        setModalVisible(true);
      }
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
      // Optimistic: remove item from state immediately
      setCart(prev => {
        if (!prev) return prev;
        const items = prev.items.filter(i => i.id !== itemId);
        const subtotal = items.reduce((sum, i) => sum + i.variant.price * i.quantity, 0);
        return { ...prev, items, subtotal, total: subtotal - (prev.discount || 0) };
      });
      const updatedCart = await cartApi.removeItem(itemId);
      setCart(updatedCart);
    } catch (err: any) {
      setError(err.message);
      // Refresh to get correct state
      await refreshCart();
    }
  }, [refreshCart]);

  const clearCartItems = useCallback(async () => {
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
        clearCart: clearCartItems,
        applyCoupon,
        removeCoupon,
        refreshCart,
      }}
    >
      {children}
      <AddToCartModal
        visible={modalVisible}
        product={addedProduct}
        onClose={() => setModalVisible(false)}
        addToCart={addToCart}
      />
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
