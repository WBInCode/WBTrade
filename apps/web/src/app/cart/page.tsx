'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { useCart } from '../../contexts/CartContext';
import { productsApi, Product } from '../../lib/api';

export default function CartPage() {
  const { cart, loading, error, updateQuantity, removeFromCart, clearCart, applyCoupon, removeCoupon, addToCart } = useCart();
  const [couponInput, setCouponInput] = useState('');
  const [couponError, setCouponError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [suggestedProducts, setSuggestedProducts] = useState<Product[]>([]);

  // Fetch suggested products
  useEffect(() => {
    async function fetchSuggested() {
      try {
        const response = await productsApi.getAll({ limit: 6 });
        setSuggestedProducts(response.products || []);
      } catch (err) {
        console.error('Failed to fetch suggested products:', err);
      }
    }
    fetchSuggested();
  }, []);

  const handleQuantityChange = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    setUpdating(itemId);
    try {
      await updateQuantity(itemId, newQuantity);
    } catch (err) {
      console.error('Failed to update quantity:', err);
    } finally {
      setUpdating(null);
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    setUpdating(itemId);
    try {
      await removeFromCart(itemId);
    } catch (err) {
      console.error('Failed to remove item:', err);
    } finally {
      setUpdating(null);
    }
  };

  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) return;
    setCouponError(null);
    try {
      await applyCoupon(couponInput.trim().toUpperCase());
      setCouponInput('');
    } catch (err: any) {
      setCouponError(err.message);
    }
  };

  const handleRemoveCoupon = async () => {
    try {
      await removeCoupon();
    } catch (err) {
      console.error('Failed to remove coupon:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="container-custom py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-48 mb-8"></div>
            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-white rounded-lg p-4 flex gap-4">
                    <div className="w-24 h-24 bg-gray-200 rounded"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="bg-white rounded-lg p-6 h-64"></div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const isEmpty = !cart || cart.items.length === 0;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <main className="container-custom py-8 flex-1">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Koszyk</h1>
          {!isEmpty && (
            <button
              onClick={() => clearCart()}
              className="text-sm text-gray-500 hover:text-red-500 transition-colors"
            >
              Wyczyść koszyk
            </button>
          )}
        </div>

        {isEmpty ? (
          /* Empty Cart */
          <div className="bg-white rounded-lg p-12 text-center">
            <div className="w-24 h-24 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
              <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Twój koszyk jest pusty</h2>
            <p className="text-gray-500 mb-6">Dodaj produkty do koszyka, aby kontynuować zakupy.</p>
            <Link
              href="/products"
              className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              Przejdź do sklepu
            </Link>
          </div>
        ) : (
          /* Cart with items */
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {cart.items.map((item) => {
                const availableStock = item.variant.inventory.reduce(
                  (sum, inv) => sum + (inv.quantity - inv.reserved),
                  0
                );
                const isUpdating = updating === item.id;

                return (
                  <div
                    key={item.id}
                    className={`bg-white rounded-lg p-4 flex gap-4 transition-opacity ${isUpdating ? 'opacity-50' : ''}`}
                  >
                    {/* Product Image */}
                    <Link href={`/products/${item.variant.product.id}`} className="shrink-0">
                      <div className="w-24 h-24 rounded-lg overflow-hidden bg-gray-100">
                        {item.variant.product.images[0] ? (
                          <img
                            src={item.variant.product.images[0].url}
                            alt={item.variant.product.images[0].alt || item.variant.product.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}
                      </div>
                    </Link>

                    {/* Product Info */}
                    <div className="flex-1 min-w-0">
                      <Link href={`/products/${item.variant.product.id}`}>
                        <h3 className="font-medium text-gray-900 hover:text-orange-500 transition-colors line-clamp-2">
                          {item.variant.product.name}
                        </h3>
                      </Link>
                      <p className="text-sm text-gray-500 mt-1">{item.variant.name}</p>
                      
                      {/* Variant Attributes */}
                      {Object.keys(item.variant.attributes).length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {Object.entries(item.variant.attributes).map(([key, value]) => (
                            <span key={key} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                              {key}: {value}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Stock Info */}
                      <p className={`text-xs mt-2 ${availableStock > 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {availableStock > 0 ? `Dostępne: ${availableStock} szt.` : 'Brak w magazynie'}
                      </p>
                    </div>

                    {/* Quantity & Price */}
                    <div className="flex flex-col items-end gap-2">
                      {/* Price */}
                      <div className="text-right">
                        <p className="text-lg font-bold text-gray-900">
                          {(item.variant.price * item.quantity).toFixed(2)} zł
                        </p>
                        {item.variant.compareAtPrice && (
                          <p className="text-sm text-gray-400 line-through">
                            {(item.variant.compareAtPrice * item.quantity).toFixed(2)} zł
                          </p>
                        )}
                        <p className="text-xs text-gray-500">{item.variant.price.toFixed(2)} zł / szt.</p>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                          disabled={item.quantity <= 1 || isUpdating}
                          className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                          </svg>
                        </button>
                        <span className="w-12 text-center font-medium">{item.quantity}</span>
                        <button
                          onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                          disabled={item.quantity >= availableStock || isUpdating}
                          className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                        </button>
                      </div>

                      {/* Remove Button */}
                      <button
                        onClick={() => handleRemoveItem(item.id)}
                        disabled={isUpdating}
                        className="flex items-center gap-1 text-sm text-red-500 hover:text-red-600 hover:bg-red-50 px-2 py-1 rounded transition-colors mt-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Usuń
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg p-6 sticky top-24">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Podsumowanie zamówienia</h2>

                {/* Coupon Input */}
                <div className="mb-6">
                  <label className="block text-sm text-gray-600 mb-2">Kod rabatowy</label>
                  {cart.couponCode ? (
                    <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-4 py-3">
                      <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="font-medium text-green-700">{cart.couponCode}</span>
                      </div>
                      <button
                        onClick={handleRemoveCoupon}
                        className="text-green-600 hover:text-green-800 text-sm"
                      >
                        Usuń
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={couponInput}
                        onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                        placeholder="Wpisz kod"
                        className="flex-1 min-w-0 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                      <button
                        onClick={handleApplyCoupon}
                        className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors shrink-0"
                      >
                        Zastosuj
                      </button>
                    </div>
                  )}
                  {couponError && (
                    <p className="text-sm text-red-500 mt-2">{couponError}</p>
                  )}
                </div>

                {/* Order Details */}
                <div className="space-y-3 border-t pt-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Produkty ({cart.items.reduce((sum, item) => sum + item.quantity, 0)})</span>
                    <span className="text-gray-900">{cart.subtotal.toFixed(2)} zł</span>
                  </div>
                  {cart.discount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-green-600">Rabat</span>
                      <span className="text-green-600">-{cart.discount.toFixed(2)} zł</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Dostawa</span>
                    <span className="text-gray-900">Obliczona przy zamówieniu</span>
                  </div>
                </div>

                {/* Total */}
                <div className="border-t mt-4 pt-4">
                  <div className="flex justify-between items-baseline">
                    <span className="text-lg font-semibold text-gray-900">Razem</span>
                    <div className="text-right">
                      <span className="text-2xl font-bold text-gray-900">{cart.total.toFixed(2)} zł</span>
                      <p className="text-xs text-gray-500">w tym VAT</p>
                    </div>
                  </div>
                </div>

                {/* Checkout Button */}
                <Link
                  href="/checkout"
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-lg mt-6 transition-colors flex items-center justify-center gap-2"
                >
                  Przejdź do płatności
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Link>

                {/* Continue Shopping */}
                <Link
                  href="/products"
                  className="w-full border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium py-3 rounded-lg mt-3 transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
                  </svg>
                  Kontynuuj zakupy
                </Link>

                {/* Trust Badges */}
                <div className="mt-6 pt-6 border-t">
                  <div className="flex items-center gap-3 text-sm text-gray-500">
                    <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>Bezpieczne płatności</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-500 mt-2">
                    <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                      <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1v-5a1 1 0 00-.293-.707l-2-2A1 1 0 0015 7h-1z" />
                    </svg>
                    <span>Darmowa dostawa od 200 zł</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-500 mt-2">
                    <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                    </svg>
                    <span>30 dni na zwrot</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Suggested Products Section */}
        {suggestedProducts.length > 0 && (
          <div className="mt-16 bg-white rounded-xl p-8">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold text-gray-900">Może Cię zainteresować</h2>
              <Link href="/products" className="text-orange-500 hover:text-orange-600 font-medium flex items-center gap-1">
                Zobacz więcej
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
              {suggestedProducts.slice(0, 5).map((product) => (
                <div
                  key={product.id}
                  className="bg-gray-50 rounded-xl p-4 hover:shadow-lg transition-all hover:-translate-y-1 group"
                >
                  <Link href={`/products/${product.id}`}>
                    <div className="aspect-square rounded-lg overflow-hidden bg-white mb-4">
                      {product.images?.[0] ? (
                        <img
                          src={product.images[0].url}
                          alt={product.images[0].alt || product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <h3 className="text-base font-medium text-gray-900 line-clamp-2 group-hover:text-orange-500 transition-colors mb-3 min-h-[48px]">
                      {product.name}
                    </h3>
                  </Link>
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-lg font-bold text-gray-900">
                      {Number(product.price).toFixed(2)} zł
                    </span>
                    {product.compareAtPrice && Number(product.compareAtPrice) > Number(product.price) && (
                      <span className="text-sm text-gray-400 line-through">
                        {Number(product.compareAtPrice).toFixed(2)} zł
                      </span>
                    )}
                  </div>
                  <button 
                    onClick={() => {
                      if (product.variants?.[0]?.id) {
                        addToCart(product.variants[0].id, 1);
                      }
                    }}
                    className="w-full mt-4 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
                  >
                    Do koszyka
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Why WBTrade Section */}
        <div className="mt-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-10 text-white">
          <h2 className="text-2xl font-bold mb-8 text-center">Dlaczego warto kupić w WBTrade?</h2>
          <div className="grid md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold mb-2">Najniższe ceny</h3>
              <p className="text-white/80 text-sm">Gwarancja najlepszej ceny na rynku. Znajdziesz taniej? Zwrócimy różnicę!</p>
            </div>
            <div className="text-center">
              <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold mb-2">Błyskawiczna dostawa</h3>
              <p className="text-white/80 text-sm">Wysyłka nawet tego samego dnia. Darmowa dostawa od 200 zł</p>
            </div>
            <div className="text-center">
              <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold mb-2">Bezpieczne zakupy</h3>
              <p className="text-white/80 text-sm">Szyfrowane płatności SSL i pełna ochrona Twoich danych osobowych</p>
            </div>
            <div className="text-center">
              <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <h3 className="text-lg font-bold mb-2">Łatwy zwrot</h3>
              <p className="text-white/80 text-sm">30 dni na bezpłatny zwrot towaru. Bez podawania przyczyny</p>
            </div>
          </div>
        </div>
      </main>

      <Footer hideTrustBadges />
    </div>
  );
}