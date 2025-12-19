'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { checkoutApi, addressesApi } from '@/lib/api';
import CheckoutSteps from './components/CheckoutSteps';
import AddressForm from './components/AddressForm';
import ShippingMethod from './components/ShippingMethod';
import PaymentMethod from './components/PaymentMethod';
import OrderSummary from './components/OrderSummary';
import { useRouter as useNextRouter } from 'next/navigation';

export interface AddressData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  street: string;
  apartment: string;
  postalCode: string;
  city: string;
  differentBillingAddress: boolean;
  billingStreet?: string;
  billingApartment?: string;
  billingPostalCode?: string;
  billingCity?: string;
}

export interface ShippingData {
  method: 'inpost_paczkomat' | 'inpost_kurier' | 'dpd' | 'pocztex' | 'dhl' | 'gls';
  paczkomatCode?: string;
  paczkomatAddress?: string;
  price: number;
}

export interface PaymentData {
  method: 'card' | 'blik' | 'transfer' | 'cod';
  extraFee: number;
}

export interface CheckoutData {
  address: AddressData;
  shipping: ShippingData;
  payment: PaymentData;
  acceptTerms: boolean;
  acceptNewsletter: boolean;
}

const initialAddress: AddressData = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  street: '',
  apartment: '',
  postalCode: '',
  city: '',
  differentBillingAddress: false,
};

const initialShipping: ShippingData = {
  method: 'inpost_kurier',
  price: 14.99,
};

const initialPayment: PaymentData = {
  method: 'blik',
  extraFee: 0,
};

export default function CheckoutPage() {
  const router = useRouter();
  const { cart, itemCount, loading: cartLoading, removeFromCart, updateQuantity } = useCart();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [removingItemId, setRemovingItemId] = useState<string | null>(null);
  const [checkoutData, setCheckoutData] = useState<CheckoutData>({
    address: initialAddress,
    shipping: initialShipping,
    payment: initialPayment,
    acceptTerms: false,
    acceptNewsletter: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Pre-fill address if user is logged in
  useEffect(() => {
    if (isAuthenticated && user) {
      setCheckoutData(prev => ({
        ...prev,
        address: {
          ...prev.address,
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          email: user.email || '',
        }
      }));
    }
  }, [isAuthenticated, user]);

  // Show message if cart is empty
  const displayCart = cart;
  const isCartEmpty = !cartLoading && itemCount === 0;

  const handleAddressSubmit = (address: AddressData) => {
    setCheckoutData(prev => ({ ...prev, address }));
    setCurrentStep(2);
    window.scrollTo(0, 0);
  };

  const handleShippingSubmit = (shipping: ShippingData) => {
    setCheckoutData(prev => ({ ...prev, shipping }));
    setCurrentStep(3);
    window.scrollTo(0, 0);
  };

  const handlePaymentSubmit = (payment: PaymentData) => {
    setCheckoutData(prev => ({ ...prev, payment }));
    setCurrentStep(4);
    window.scrollTo(0, 0);
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(1, prev - 1));
    window.scrollTo(0, 0);
  };

  const handleRemoveItem = async (itemId: string) => {
    setRemovingItemId(itemId);
    try {
      await removeFromCart(itemId);
    } catch (err) {
      console.error('Failed to remove item:', err);
    } finally {
      setRemovingItemId(null);
    }
  };

  const handleEditStep = (step: number) => {
    setCurrentStep(step);
    window.scrollTo(0, 0);
  };

  const calculateTotal = () => {
    const subtotal = cart?.items?.reduce((sum: number, item: any) => {
      const price = item.variant?.price || 0;
      return sum + price * item.quantity;
    }, 0) || 0;
    
    const shipping = checkoutData.shipping.price;
    const paymentFee = checkoutData.payment.extraFee;
    
    return {
      subtotal,
      shipping,
      paymentFee,
      total: subtotal + shipping + paymentFee,
    };
  };

  const handlePlaceOrder = async () => {
    if (!checkoutData.acceptTerms) {
      setError('Musisz zaakceptować regulamin i politykę prywatności');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      // First, create or get shipping address
      const addressData = {
        firstName: checkoutData.address.firstName,
        lastName: checkoutData.address.lastName,
        street: checkoutData.address.street + (checkoutData.address.apartment ? ` ${checkoutData.address.apartment}` : ''),
        city: checkoutData.address.city,
        postalCode: checkoutData.address.postalCode,
        country: 'PL',
        phone: checkoutData.address.phone,
        isDefault: false,
        label: 'Zamówienie',
        type: 'SHIPPING' as const,
      };

      // Create address
      const shippingAddress = await addressesApi.create(addressData);

      // Create checkout/order
      const checkoutResponse = await checkoutApi.createCheckout({
        shippingAddressId: shippingAddress.id,
        shippingMethod: checkoutData.shipping.method,
        pickupPointCode: checkoutData.shipping.paczkomatCode,
        pickupPointAddress: checkoutData.shipping.paczkomatAddress,
        paymentMethod: checkoutData.payment.method,
        customerNotes: '',
        acceptTerms: checkoutData.acceptTerms,
      });

      // If payment URL is provided, redirect to payment gateway
      if (checkoutResponse.paymentUrl) {
        window.location.href = checkoutResponse.paymentUrl;
        return;
      }

      // Otherwise redirect to order confirmation
      router.push(`/order/${checkoutResponse.orderId}/confirmation`);
    } catch (err) {
      console.error('Checkout error:', err);
      setError(err instanceof Error ? err.message : 'Wystąpił błąd podczas składania zamówienia');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show loading while checking auth or cart
  if (cartLoading || authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (isCartEmpty) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <Link href="/" className="text-2xl font-bold text-orange-500">
              WBTrade
            </Link>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <div className="text-6xl mb-4">🛒</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Twój koszyk jest pusty</h1>
          <p className="text-gray-600 mb-8">Dodaj produkty do koszyka, aby kontynuować zamówienie.</p>
          <Link
            href="/products"
            className="inline-flex items-center px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 font-medium"
          >
            Przeglądaj produkty
          </Link>
        </main>
      </div>
    );
  }

  // Check if user is logged in - required for checkout
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <Link href="/" className="text-2xl font-bold text-orange-500">
              WBTrade
            </Link>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="max-w-md mx-auto bg-white rounded-xl shadow-sm p-8 text-center">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-3">Zaloguj się, aby złożyć zamówienie</h1>
            <p className="text-gray-600 mb-8">
              Aby kontynuować składanie zamówienia, musisz być zalogowany na swoje konto. Dzięki temu możesz śledzić status zamówienia i mieć dostęp do historii zakupów.
            </p>
            <div className="space-y-3">
              <Link
                href="/login?redirect=/checkout"
                className="block w-full px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 font-medium transition-colors"
              >
                Zaloguj się
              </Link>
              <Link
                href="/register?redirect=/checkout"
                className="block w-full px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
              >
                Utwórz konto
              </Link>
            </div>
            <div className="mt-6 pt-6 border-t border-gray-200">
              <Link href="/cart" className="text-sm text-gray-500 hover:text-orange-500">
                ← Wróć do koszyka
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const totals = calculateTotal();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-2xl font-bold text-orange-500">
              WBTrade
            </Link>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-500">
                Bezpieczne zakupy 🔒
              </span>
              <Link href="/cart" className="text-sm text-gray-600 hover:text-orange-500">
                ← Wróć do koszyka
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Steps indicator */}
        <CheckoutSteps currentStep={currentStep} />

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main form area */}
          <div className="lg:col-span-2">
            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            {currentStep === 1 && (
              <AddressForm
                initialData={checkoutData.address}
                onSubmit={handleAddressSubmit}
              />
            )}

            {currentStep === 2 && (
              <ShippingMethod
                initialData={checkoutData.shipping}
                onSubmit={handleShippingSubmit}
                onBack={handleBack}
              />
            )}

            {currentStep === 3 && (
              <PaymentMethod
                initialData={checkoutData.payment}
                onSubmit={handlePaymentSubmit}
                onBack={handleBack}
              />
            )}

            {currentStep === 4 && (
              <OrderSummary
                checkoutData={checkoutData}
                cart={displayCart}
                totals={totals}
                onEditStep={handleEditStep}
                onTermsChange={(acceptTerms) => 
                  setCheckoutData(prev => ({ ...prev, acceptTerms }))
                }
                onNewsletterChange={(acceptNewsletter) =>
                  setCheckoutData(prev => ({ ...prev, acceptNewsletter }))
                }
                onPlaceOrder={handlePlaceOrder}
                isSubmitting={isSubmitting}
              />
            )}
          </div>

          {/* Order summary sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6 sticky top-4">
              <h3 className="text-lg font-semibold mb-4">Twoje zamówienie</h3>
              
              <div className="space-y-3 mb-4">
                {displayCart?.items?.map((item: any) => (
                  <div key={item.id} className="flex gap-3 group relative">
                    <div className="w-16 h-16 bg-gray-100 rounded-lg flex-shrink-0 relative">
                      {item.variant?.product?.images?.[0] && (
                        <img
                          src={item.variant.product.images[0].url}
                          alt={item.variant.product.name}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate pr-6">
                        {item.variant?.product?.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        Ilość: {item.quantity}
                      </p>
                      <p className="text-sm font-semibold text-orange-600">
                        {(item.variant?.price * item.quantity).toFixed(2)} zł
                      </p>
                    </div>
                    <button
                      onClick={() => handleRemoveItem(item.id)}
                      disabled={removingItemId === item.id}
                      className="absolute top-0 right-0 w-6 h-6 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                      title="Usuń z koszyka"
                    >
                      {removingItemId === item.id ? (
                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                    </button>
                  </div>
                ))}
              </div>

              {isCartEmpty && (
                <div className="text-center py-4">
                  <p className="text-gray-500 text-sm mb-3">Twój koszyk jest pusty</p>
                  <Link href="/" className="text-orange-500 hover:text-orange-600 text-sm font-medium">
                    Kontynuuj zakupy
                  </Link>
                </div>
              )}

              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Produkty</span>
                  <span>{totals.subtotal.toFixed(2)} zł</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Dostawa</span>
                  <span>{totals.shipping.toFixed(2)} zł</span>
                </div>
                {totals.paymentFee > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Opłata za płatność</span>
                    <span>{totals.paymentFee.toFixed(2)} zł</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold pt-2 border-t">
                  <span>Razem</span>
                  <span className="text-orange-600">{totals.total.toFixed(2)} zł</span>
                </div>
              </div>

              {/* Trust badges */}
              <div className="mt-6 pt-4 border-t">
                <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                  <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Bezpieczne płatności
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                  <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  14 dni na zwrot
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Ochrona danych SSL
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
