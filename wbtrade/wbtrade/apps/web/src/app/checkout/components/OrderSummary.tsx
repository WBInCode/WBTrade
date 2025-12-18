'use client';

import React from 'react';
import { CheckoutData, AddressData, ShippingData, PaymentData } from '../page';

interface OrderSummaryProps {
  checkoutData: CheckoutData;
  cart: any;
  totals: {
    subtotal: number;
    shipping: number;
    paymentFee: number;
    total: number;
  };
  onEditStep: (step: number) => void;
  onTermsChange: (accepted: boolean) => void;
  onNewsletterChange: (accepted: boolean) => void;
  onPlaceOrder: () => void;
  isSubmitting: boolean;
}

const shippingMethodNames: Record<ShippingData['method'], string> = {
  inpost_paczkomat: 'InPost Paczkomat',
  inpost_kurier: 'Kurier InPost',
  dpd: 'Kurier DPD',
  pocztex: 'Pocztex Kurier48',
  dhl: 'Kurier DHL',
  gls: 'Kurier GLS',
};

const paymentMethodNames: Record<PaymentData['method'], string> = {
  blik: 'BLIK',
  card: 'Karta płatnicza',
  transfer: 'Przelew online',
  cod: 'Płatność przy odbiorze',
};

export default function OrderSummary({
  checkoutData,
  cart,
  totals,
  onEditStep,
  onTermsChange,
  onNewsletterChange,
  onPlaceOrder,
  isSubmitting,
}: OrderSummaryProps) {
  const { address, shipping, payment } = checkoutData;

  const formatAddress = (addr: AddressData, isBilling = false) => {
    if (isBilling && addr.differentBillingAddress) {
      return (
        <>
          {addr.billingStreet} {addr.billingApartment && `m. ${addr.billingApartment}`}
          <br />
          {addr.billingPostalCode} {addr.billingCity}
        </>
      );
    }
    return (
      <>
        {addr.firstName} {addr.lastName}
        <br />
        {addr.street} {addr.apartment && `m. ${addr.apartment}`}
        <br />
        {addr.postalCode} {addr.city}
        <br />
        Tel: {addr.phone}
      </>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-xl font-semibold mb-6">Podsumowanie zamówienia</h2>

      {/* Order items */}
      <div className="mb-6">
        <h3 className="font-medium text-gray-900 mb-3">Produkty ({cart?.items?.length || 0})</h3>
        <div className="space-y-3">
          {cart?.items?.map((item: any) => (
            <div key={item.id} className="flex gap-4 p-3 bg-gray-50 rounded-lg">
              <div className="w-16 h-16 bg-white rounded-lg flex-shrink-0 border">
                {item.variant?.product?.images?.[0] && (
                  <img
                    src={item.variant.product.images[0].url}
                    alt={item.variant.product.name}
                    className="w-full h-full object-cover rounded-lg"
                  />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">{item.variant?.product?.name}</p>
                {item.variant?.name && (
                  <p className="text-sm text-gray-500">{item.variant.name}</p>
                )}
                <div className="flex justify-between items-center mt-1">
                  <span className="text-sm text-gray-500">Ilość: {item.quantity}</span>
                  <span className="font-semibold text-orange-600">
                    {(item.variant?.price * item.quantity).toFixed(2)} zł
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Summary sections */}
      <div className="space-y-4 mb-6">
        {/* Delivery address */}
        <div className="flex justify-between items-start p-4 border rounded-lg">
          <div>
            <h4 className="font-medium text-gray-900 mb-1">📍 Adres dostawy</h4>
            <p className="text-sm text-gray-600">
              {formatAddress(address)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onEditStep(1)}
            className="text-sm text-orange-500 hover:text-orange-600 font-medium"
          >
            Zmień
          </button>
        </div>

        {/* Billing address (if different) */}
        {address.differentBillingAddress && (
          <div className="flex justify-between items-start p-4 border rounded-lg">
            <div>
              <h4 className="font-medium text-gray-900 mb-1">🧾 Adres do faktury</h4>
              <p className="text-sm text-gray-600">
                {formatAddress(address, true)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onEditStep(1)}
              className="text-sm text-orange-500 hover:text-orange-600 font-medium"
            >
              Zmień
            </button>
          </div>
        )}

        {/* Shipping method */}
        <div className="flex justify-between items-start p-4 border rounded-lg">
          <div>
            <h4 className="font-medium text-gray-900 mb-1">🚚 Dostawa</h4>
            <p className="text-sm text-gray-600">
              {shippingMethodNames[shipping.method]}
              {shipping.paczkomatCode && (
                <>
                  <br />
                  Paczkomat: {shipping.paczkomatCode}
                </>
              )}
            </p>
            <p className="text-sm font-medium mt-1">
              {shipping.price === 0 ? (
                <span className="text-green-600">GRATIS</span>
              ) : (
                <span>{shipping.price.toFixed(2)} zł</span>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onEditStep(2)}
            className="text-sm text-orange-500 hover:text-orange-600 font-medium"
          >
            Zmień
          </button>
        </div>

        {/* Payment method */}
        <div className="flex justify-between items-start p-4 border rounded-lg">
          <div>
            <h4 className="font-medium text-gray-900 mb-1">💳 Płatność</h4>
            <p className="text-sm text-gray-600">{paymentMethodNames[payment.method]}</p>
            {payment.extraFee > 0 && (
              <p className="text-sm text-gray-500 mt-1">
                Opłata: +{payment.extraFee.toFixed(2)} zł
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => onEditStep(3)}
            className="text-sm text-orange-500 hover:text-orange-600 font-medium"
          >
            Zmień
          </button>
        </div>
      </div>

      {/* Totals */}
      <div className="border-t pt-4 mb-6">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Produkty</span>
            <span>{totals.subtotal.toFixed(2)} zł</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Dostawa</span>
            <span>{totals.shipping === 0 ? 'GRATIS' : `${totals.shipping.toFixed(2)} zł`}</span>
          </div>
          {totals.paymentFee > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Opłata za płatność</span>
              <span>{totals.paymentFee.toFixed(2)} zł</span>
            </div>
          )}
          <div className="flex justify-between text-xl font-bold pt-3 border-t">
            <span>Do zapłaty</span>
            <span className="text-orange-600">{totals.total.toFixed(2)} zł</span>
          </div>
        </div>
      </div>

      {/* Terms and conditions */}
      <div className="space-y-3 mb-6">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={checkoutData.acceptTerms}
            onChange={(e) => onTermsChange(e.target.checked)}
            className="mt-1 h-4 w-4 text-orange-500 focus:ring-orange-500 border-gray-300 rounded"
          />
          <span className="text-sm text-gray-700">
            Akceptuję{' '}
            <a href="/regulamin" className="text-orange-500 hover:underline" target="_blank">
              regulamin sklepu
            </a>{' '}
            oraz{' '}
            <a href="/polityka-prywatnosci" className="text-orange-500 hover:underline" target="_blank">
              politykę prywatności
            </a>
            . Wyrażam zgodę na przetwarzanie danych osobowych w celu realizacji zamówienia. *
          </span>
        </label>

        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={checkoutData.acceptNewsletter}
            onChange={(e) => onNewsletterChange(e.target.checked)}
            className="mt-1 h-4 w-4 text-orange-500 focus:ring-orange-500 border-gray-300 rounded"
          />
          <span className="text-sm text-gray-700">
            Chcę otrzymywać informacje o promocjach i nowościach (opcjonalne)
          </span>
        </label>
      </div>

      {/* Place order button */}
      <button
        type="button"
        onClick={onPlaceOrder}
        disabled={isSubmitting || !checkoutData.acceptTerms}
        className={`
          w-full py-4 text-white font-bold text-lg rounded-lg transition-all
          flex items-center justify-center gap-2
          ${checkoutData.acceptTerms && !isSubmitting
            ? 'bg-orange-500 hover:bg-orange-600 focus:ring-4 focus:ring-orange-200'
            : 'bg-gray-300 cursor-not-allowed'
          }
        `}
      >
        {isSubmitting ? (
          <>
            <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Przetwarzanie...
          </>
        ) : (
          <>
            🛒 Zamawiam i płacę – {totals.total.toFixed(2)} zł
          </>
        )}
      </button>

      <p className="text-xs text-gray-500 text-center mt-3">
        Klikając przycisk powyżej, potwierdzasz zamówienie z obowiązkiem zapłaty.
      </p>
    </div>
  );
}
