'use client';

import React, { useMemo, useState } from 'react';
import { CartItem } from '@/lib/api';

// Placeholder SVG for failed images
const PLACEHOLDER_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'%3E%3Crect fill='%23f3f4f6' width='400' height='400'/%3E%3Cpath fill='%23d1d5db' d='M160 150h80v100h-80z'/%3E%3Ccircle fill='%23d1d5db' cx='180' cy='130' r='20'/%3E%3Cpath fill='%23e5e7eb' d='M120 250l60-80 40 50 40-30 60 60v50H120z'/%3E%3C/svg%3E";

interface CheckoutPackagesListProps {
  items: CartItem[];
  onRemoveItem: (itemId: string) => void;
  removingItemId: string | null;
  shippingPrices?: Record<string, number>;
}

// Warehouse display names (by city) and colors - don't expose wholesaler names
const WHOLESALER_CONFIG: Record<string, { name: string; color: string; bgColor: string; icon: string }> = {
  'HP': { name: 'Magazyn Zielona Góra', color: 'text-blue-700', bgColor: 'bg-blue-50 border-blue-200', icon: '📍' },
  'Hurtownia Przemysłowa': { name: 'Magazyn Zielona Góra', color: 'text-blue-700', bgColor: 'bg-blue-50 border-blue-200', icon: '📍' },
  'Ikonka': { name: 'Magazyn Białystok', color: 'text-purple-700', bgColor: 'bg-purple-50 border-purple-200', icon: '📍' },
  'BTP': { name: 'Magazyn Chotów', color: 'text-green-700', bgColor: 'bg-green-50 border-green-200', icon: '📍' },
  'Leker': { name: 'Magazyn Chynów', color: 'text-red-700', bgColor: 'bg-red-50 border-red-200', icon: '📍' },
  'Gastro': { name: 'Magazyn Centralny', color: 'text-yellow-700', bgColor: 'bg-yellow-50 border-yellow-200', icon: '📍' },
  'Horeca': { name: 'Magazyn Centralny', color: 'text-orange-700', bgColor: 'bg-orange-50 border-orange-200', icon: '📍' },
  'Forcetop': { name: 'Magazyn Centralny', color: 'text-teal-700', bgColor: 'bg-teal-50 border-teal-200', icon: '📍' },
  'default': { name: 'Magazyn WB Trade', color: 'text-gray-700', bgColor: 'bg-gray-50 border-gray-200', icon: '📍' },
};

function getWholesalerConfig(wholesaler: string | null | undefined) {
  if (!wholesaler) return WHOLESALER_CONFIG['default'];
  return WHOLESALER_CONFIG[wholesaler] || { name: wholesaler, color: 'text-gray-700', bgColor: 'bg-gray-50 border-gray-200', icon: '📦' };
}

export default function CheckoutPackagesList({
  items,
  onRemoveItem,
  removingItemId,
  shippingPrices = {},
}: CheckoutPackagesListProps) {
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

  const handleImageError = (itemId: string) => {
    setFailedImages(prev => new Set(prev).add(itemId));
  };

  // Group items by wholesaler
  const packages = useMemo(() => {
    const grouped: Record<string, CartItem[]> = {};
    
    for (const item of items) {
      const wholesaler = item.variant?.product?.wholesaler || 'default';
      if (!grouped[wholesaler]) {
        grouped[wholesaler] = [];
      }
      grouped[wholesaler].push(item);
    }

    return Object.entries(grouped).map(([wholesaler, packageItems], index) => {
      const config = getWholesalerConfig(wholesaler);
      const subtotal = packageItems.reduce((sum, item) => sum + (item.variant.price * item.quantity), 0);
      
      return {
        id: `pkg-${index}`,
        wholesaler,
        wholesalerDisplay: config.name,
        icon: config.icon,
        color: config.color,
        bgColor: config.bgColor,
        items: packageItems,
        subtotal,
        shippingPrice: shippingPrices[wholesaler] || 0,
      };
    });
  }, [items, shippingPrices]);

  if (packages.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3 mb-4">
      {packages.map((pkg, pkgIndex) => (
        <div key={pkg.id} className={`rounded-lg border overflow-hidden ${pkg.bgColor}`}>
          {/* Package Header */}
          <div className="px-3 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm">{pkg.icon}</span>
              <span className={`text-xs font-medium ${pkg.color}`}>
                {pkg.wholesalerDisplay}
              </span>
            </div>
            <span className="text-[11px] text-gray-500">
              {pkg.items.length} {pkg.items.length === 1 ? 'produkt' : 'produktów'}
            </span>
          </div>
          
          {/* Package Items */}
          <div className="bg-white px-3 py-2 space-y-2">
            {pkg.items.map((item: CartItem) => (
              <div key={item.id} className="flex gap-2 group relative">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-100 rounded-lg flex-shrink-0 relative overflow-hidden">
                  {item.variant?.product?.images?.[0] && (
                    <img
                      src={item.variant.product.images[0].url}
                      alt={item.variant.product.name}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium line-clamp-2 pr-5 leading-tight">
                    {item.variant?.product?.name}
                  </p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[10px] text-gray-500">
                      {item.quantity} szt.
                    </span>
                    <span className="text-xs font-semibold text-orange-600">
                      {(item.variant?.price * item.quantity).toFixed(2)} zł
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => onRemoveItem(item.id)}
                  disabled={removingItemId === item.id}
                  className="absolute top-0 right-0 w-5 h-5 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                  title="Usuń z koszyka"
                >
                  {removingItemId === item.id ? (
                    <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                </button>
              </div>
            ))}
          </div>
          
          {/* Package Subtotal */}
          <div className="bg-gray-50 px-3 py-1.5 border-t flex items-center justify-between">
            <span className="text-[10px] text-gray-500">Wartość przesyłki:</span>
            <span className="text-xs font-semibold">{pkg.subtotal.toFixed(2)} zł</span>
          </div>
        </div>
      ))}
    </div>
  );
}
