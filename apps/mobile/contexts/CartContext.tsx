import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { cartApi } from '../services/cart';
import type { Cart } from '../services/types';
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
      const updatedCart = await cartApi.removeItem(itemId);
      setCart(updatedCart);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, []);

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
