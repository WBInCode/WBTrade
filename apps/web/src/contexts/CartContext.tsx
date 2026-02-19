'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { cartApi, Cart, CartItem } from '../lib/api';
import AddToCartModal from '../components/AddToCartModal';
import { trackAddToCart, trackRemoveFromCart, toGA4Item } from '../lib/analytics';

interface AddedProductInfo {
  name: string;
  image: string;
  price: string;
  quantity: number;
  productId?: string; // Added for same-warehouse recommendations
  sku?: string; // Product SKU for GA4 tracking consistency
}

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
  showAddToCartModal: (product: AddedProductInfo) => void;
  hideAddToCartModal: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [addedProduct, setAddedProduct] = useState<AddedProductInfo | null>(null);

  const itemCount = cart?.items.reduce((sum, item) => sum + item.quantity, 0) || 0;

  const showAddToCartModal = useCallback((product: AddedProductInfo) => {
    setAddedProduct(product);
    setIsModalOpen(true);
  }, []);

  const hideAddToCartModal = useCallback(() => {
    setIsModalOpen(false);
    setAddedProduct(null);
  }, []);

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

  const addToCart = useCallback(async (variantId: string, quantity: number = 1, productInfo?: AddedProductInfo) => {
    try {
      setError(null);
      const updatedCart = await cartApi.addItem(variantId, quantity);
      setCart(updatedCart);
      
      // Track add to cart event for analytics
      if (productInfo) {
        const priceNum = parseFloat(productInfo.price.replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
        const analyticsItem = toGA4Item({
          productSku: productInfo.sku || variantId,
          productName: productInfo.name,
          price: priceNum,
          quantity: quantity,
        });
        trackAddToCart(analyticsItem, priceNum * quantity);
        
        // Show modal
        showAddToCartModal(productInfo);
      }
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [showAddToCartModal]);

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
      // Track remove_from_cart before removing
      const removedItem = cart?.items.find(item => item.id === itemId);
      if (removedItem) {
        const price = removedItem.variant?.price || 0;
        const analyticsItem = toGA4Item({
          productSku: removedItem.variant?.sku || itemId,
          productName: removedItem.variant?.product?.name || 'Produkt',
          variantName: removedItem.variant?.name,
          price,
          quantity: removedItem.quantity,
        });
        trackRemoveFromCart(analyticsItem, price * removedItem.quantity);
      }
      const updatedCart = await cartApi.removeItem(itemId);
      setCart(updatedCart);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [cart?.items]);

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
        showAddToCartModal,
        hideAddToCartModal,
      }}
    >
      {children}
      <AddToCartModal
        isOpen={isModalOpen}
        product={addedProduct}
        onClose={hideAddToCartModal}
        onAddToCart={addToCart}
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
