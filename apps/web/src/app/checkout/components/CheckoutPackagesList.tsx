'use client';

import React, { useMemo, useState } from 'react';
import { CartItem } from '@/lib/api';
import { roundMoney } from '@/lib/currency';

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
  'HP': { name: 'Magazyn Zielona Góra', color: 'text-blue-700 dark:text-blue-400', bgColor: 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700', icon: '📍' },
  'Hurtownia Przemysłowa': { name: 'Magazyn Zielona Góra', color: 'text-blue-700 dark:text-blue-400', bgColor: 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700', icon: '📍' },
  'Ikonka': { name: 'Magazyn Białystok', color: 'text-purple-700 dark:text-purple-400', bgColor: 'bg-purple-50 dark:bg-purple-900/30 border-purple-200 dark:border-purple-700', icon: '📍' },
  'BTP': { name: 'Magazyn Chotów', color: 'text-green-700 dark:text-green-400', bgColor: 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700', icon: '📍' },
  'Leker': { name: 'Magazyn Chynów', color: 'text-red-700 dark:text-red-400', bgColor: 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700', icon: '📍' },
  'Gastro': { name: 'Magazyn Chotów', color: 'text-yellow-700 dark:text-yellow-400', bgColor: 'bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-700', icon: '📍' },
  'Horeca': { name: 'Magazyn Chotów', color: 'text-orange-700 dark:text-orange-400', bgColor: 'bg-orange-50 dark:bg-orange-900/30 border-orange-200 dark:border-orange-700', icon: '📍' },
  'Forcetop': { name: 'Magazyn Chotów', color: 'text-teal-700 dark:text-teal-400', bgColor: 'bg-teal-50 dark:bg-teal-900/30 border-teal-200 dark:border-teal-700', icon: '📍' },
  'default': { name: 'Magazyn Chynów', color: 'text-gray-700 dark:text-gray-300', bgColor: 'bg-gray-50 dark:bg-secondary-700 border-gray-200 dark:border-secondary-600', icon: '📍' },
};

function getWholesalerConfig(wholesaler: string | null | undefined) {
  if (!wholesaler) return WHOLESALER_CONFIG['default'];
  return WHOLESALER_CONFIG[wholesaler] || { name: wholesaler, color: 'text-gray-700 dark:text-gray-300', bgColor: 'bg-gray-50 dark:bg-secondary-700 border-gray-200 dark:border-secondary-600', icon: '📦' };
}

export default function CheckoutPackagesList({
  items,
  onRemoveItem,
  removingItemId,
  shippingPrices = {},
}: CheckoutPackagesListProps) {
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const [expandedPackages, setExpandedPackages] = useState<Set<number>>(new Set());

  const handleImageError = (itemId: string) => {
    setFailedImages(prev => new Set(prev).add(itemId));
  };
  
  const togglePackageExpand = (pkgIndex: number) => {
    setExpandedPackages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(pkgIndex)) {
        newSet.delete(pkgIndex);
      } else {
        newSet.add(pkgIndex);
      }
      return newSet;
    });
  };
  
  const MAX_VISIBLE_ITEMS = 3;

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
      const subtotal = roundMoney(packageItems.reduce((sum, item) => sum + (item.variant.price * item.quantity), 0));
      
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
            <span className="text-[11px] text-gray-500 dark:text-gray-400">
              {pkg.items.length} {pkg.items.length === 1 ? 'produkt' : 'produktów'}
            </span>
          </div>
          
          {/* Package Items */}
          <div className="bg-white dark:bg-secondary-800 px-3 py-2 space-y-2">
            {(() => {
              const isExpanded = expandedPackages.has(pkgIndex);
              const visibleItems = isExpanded ? pkg.items : pkg.items.slice(0, MAX_VISIBLE_ITEMS);
              const hiddenCount = pkg.items.length - MAX_VISIBLE_ITEMS;
              
              return (
                <>
                  {visibleItems.map((item: CartItem) => (
              <div key={item.id} className="flex gap-2 group relative">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-100 dark:bg-secondary-700 rounded-lg flex-shrink-0 relative overflow-hidden">
                  {item.variant?.product?.images?.[0] && (
                    <img
                      src={item.variant.product.images[0].url}
                      alt={item.variant.product.name}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium line-clamp-2 pr-5 leading-tight dark:text-white">
                    {item.variant?.product?.name}
                  </p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[10px] text-gray-500 dark:text-gray-400">
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
                  className="absolute top-0 right-0 w-5 h-5 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full transition-colors"
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
                  
                  {/* Show more/less button */}
                  {hiddenCount > 0 && (
                    <button
                      onClick={() => togglePackageExpand(pkgIndex)}
                      className="w-full py-1.5 text-xs text-orange-500 hover:text-orange-600 font-medium flex items-center justify-center gap-1 transition-colors"
                    >
                      {isExpanded ? (
                        <>
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                          </svg>
                          Zwiń
                        </>
                      ) : (
                        <>
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                          Pokaż więcej ({hiddenCount})
                        </>
                      )}
                    </button>
                  )}
                </>
              );
            })()}
          </div>
          
          {/* Package Subtotal */}
          <div className="bg-gray-50 dark:bg-secondary-700 px-3 py-1.5 border-t dark:border-secondary-600 flex items-center justify-between">
            <span className="text-[10px] text-gray-500 dark:text-gray-400">Wartość przesyłki:</span>
            <span className="text-xs font-semibold dark:text-white">{pkg.subtotal.toFixed(2)} zł</span>
          </div>
        </div>
      ))}
    </div>
  );
}
