'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { cartApi, Cart, CartItem } from '../lib/api';
import AddToCartModal from '../components/AddToCartModal';

interface AddedProductInfo {
  name: string;
  image: string;
  price: string;
  quantity: number;
  productId?: string; // Added for same-warehouse recommendations
}

interface CartContextType {
  cart: Cart | null;
  loading: boolean;
  error: string | null;
  itemCount: number;
  selectedItems: Set<string>;
  selectedCart: Cart | null; // Cart with only selected items
  addToCart: (variantId: string, quantity?: number, productInfo?: AddedProductInfo) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  removeFromCart: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  applyCoupon: (code: string) => Promise<void>;
  removeCoupon: () => Promise<void>;
  refreshCart: () => Promise<void>;
  showAddToCartModal: (product: AddedProductInfo) => void;
  hideAddToCartModal: () => void;
  toggleItemSelection: (itemId: string) => void;
  setItemSelection: (itemId: string, selected: boolean) => void;
  selectAllItems: () => void;
  deselectAllItems: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [addedProduct, setAddedProduct] = useState<AddedProductInfo | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  const itemCount = cart?.items.reduce((sum, item) => sum + item.quantity, 0) || 0;
  
  // Create a filtered cart with only selected items
  const selectedCart = React.useMemo(() => {
    if (!cart) return null;
    const selectedCartItems = cart.items.filter(item => selectedItems.has(item.id));
    return {
      ...cart,
      items: selectedCartItems,
    };
  }, [cart, selectedItems]);

  // Load selected items from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('cart_selected_items');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setSelectedItems(new Set(parsed));
        }
      }
    } catch (e) {
      console.error('Failed to load selected items from localStorage:', e);
    }
  }, []);

  // Save selected items to localStorage when they change
  useEffect(() => {
    try {
      localStorage.setItem('cart_selected_items', JSON.stringify(Array.from(selectedItems)));
    } catch (e) {
      console.error('Failed to save selected items to localStorage:', e);
    }
  }, [selectedItems]);

  // When cart changes, select all new items by default and remove items that are no longer in cart
  useEffect(() => {
    if (cart?.items) {
      setSelectedItems(prev => {
        const cartItemIds = new Set(cart.items.map(item => item.id));
        const newSelected = new Set<string>();
        
        // Keep previously selected items that still exist in cart
        prev.forEach(id => {
          if (cartItemIds.has(id)) {
            newSelected.add(id);
          }
        });
        
        // Select new items by default
        cart.items.forEach(item => {
          if (!prev.has(item.id) && !newSelected.has(item.id)) {
            // This is a new item, select it by default
            newSelected.add(item.id);
          }
        });
        
        return newSelected;
      });
    }
  }, [cart?.items]);

  const toggleItemSelection = useCallback((itemId: string) => {
    setSelectedItems(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  }, []);

  const setItemSelection = useCallback((itemId: string, selected: boolean) => {
    setSelectedItems(prev => {
      const next = new Set(prev);
      if (selected) {
        next.add(itemId);
      } else {
        next.delete(itemId);
      }
      return next;
    });
  }, []);

  const selectAllItems = useCallback(() => {
    if (cart?.items) {
      setSelectedItems(new Set(cart.items.map(item => item.id)));
    }
  }, [cart?.items]);

  const deselectAllItems = useCallback(() => {
    setSelectedItems(new Set());
  }, []);

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
      
      // Show modal if product info is provided
      if (productInfo) {
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
        selectedItems,
        selectedCart,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        applyCoupon,
        removeCoupon,
        refreshCart,
        showAddToCartModal,
        hideAddToCartModal,
        toggleItemSelection,
        setItemSelection,
        selectAllItems,
        deselectAllItems,
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
