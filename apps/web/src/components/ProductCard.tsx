'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Product } from '../lib/api';
import { useWishlist } from '../contexts/WishlistContext';
import { useCart } from '../contexts/CartContext';

// Placeholder SVG as data URI
const PLACEHOLDER_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'%3E%3Crect fill='%23f3f4f6' width='400' height='400'/%3E%3Cpath fill='%23d1d5db' d='M160 150h80v100h-80z'/%3E%3Ccircle fill='%23d1d5db' cx='180' cy='130' r='20'/%3E%3Cpath fill='%23e5e7eb' d='M120 250l60-80 40 50 40-30 60 60v50H120z'/%3E%3C/svg%3E";

// Cart icon
const CartIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
  </svg>
);

// Location icon
const LocationIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

// Warehouse locations mapping
const WAREHOUSE_LOCATIONS: Record<string, string> = {
  'leker': 'Chynów',
  'hp': 'Zielona Góra',
  'btp': 'Chotów',
};

function getWarehouseLocation(product: Product): string | null {
  const blId = (product as any).baselinkerProductId?.toLowerCase() || '';
  if (blId.startsWith('leker-')) return WAREHOUSE_LOCATIONS['leker'];
  if (blId.startsWith('hp-')) return WAREHOUSE_LOCATIONS['hp'];
  if (blId.startsWith('btp-')) return WAREHOUSE_LOCATIONS['btp'];
  
  // Fallback to SKU prefix
  const sku = product.sku?.toUpperCase() || '';
  if (sku.startsWith('LEKER-')) return WAREHOUSE_LOCATIONS['leker'];
  if (sku.startsWith('HP-')) return WAREHOUSE_LOCATIONS['hp'];
  if (sku.startsWith('BTP-')) return WAREHOUSE_LOCATIONS['btp'];
  
  return null;
}

export interface ProductCardProps {
  product: Product;
  showDelivery?: boolean;
  showWishlist?: boolean;
  showAddToCart?: boolean;
}

export default function ProductCard({ product, showDelivery = false, showWishlist = true, showAddToCart = true }: ProductCardProps) {
  const [imgError, setImgError] = useState(false);
  const mainImage = imgError || !product.images?.[0]?.url ? PLACEHOLDER_IMAGE : product.images[0].url;
  const hasDiscount = product.compareAtPrice && Number(product.compareAtPrice) > Number(product.price);
  const discountPercent = hasDiscount 
    ? Math.round((1 - Number(product.price) / Number(product.compareAtPrice)) * 100)
    : 0;

  const { isInWishlist, toggleWishlist } = useWishlist();
  const { addToCart } = useCart();
  const inWishlist = isInWishlist(product.id);
  const warehouseLocation = getWarehouseLocation(product);

  const handleWishlistClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const firstVariant = product.variants?.[0];
    toggleWishlist({
      id: product.id,
      variantId: firstVariant?.id,
      name: product.name,
      price: String(product.price),
      compareAtPrice: product.compareAtPrice ? String(product.compareAtPrice) : undefined,
      image: mainImage,
    });
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const firstVariant = product.variants?.[0];
    if (firstVariant) {
      addToCart(
        firstVariant.id,
        1,
        {
          productId: product.id,
          name: product.name,
          price: String(product.price),
          image: mainImage,
          quantity: 1,
        }
      );
    }
  };

  return (
    <div className="group bg-white dark:bg-secondary-800 rounded-xl sm:rounded-2xl overflow-hidden relative h-full flex flex-col shadow-sm hover:shadow-lg dark:shadow-secondary-950/50 transition-all duration-200">
      {/* Wishlist button */}
      {showWishlist && (
        <button
          onClick={handleWishlistClick}
          className={`absolute top-1.5 right-1.5 sm:top-2.5 sm:right-2.5 z-10 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all duration-200
            ${inWishlist 
              ? 'bg-red-500 text-white' 
              : 'bg-white dark:bg-secondary-700 text-gray-400 dark:text-secondary-300 opacity-0 group-hover:opacity-100 hover:text-red-500 shadow-md'
            }`}
          title={inWishlist ? 'Usuń z ulubionych' : 'Dodaj do ulubionych'}
        >
          <svg 
            className="w-3.5 h-3.5 sm:w-4 sm:h-4" 
            fill={inWishlist ? 'currentColor' : 'none'} 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" 
            />
          </svg>
        </button>
      )}

      <Link href={`/products/${product.id}`} className="flex flex-col flex-grow">
        {/* Image */}
        <div className="relative aspect-square m-2 sm:m-3 rounded-xl sm:rounded-2xl overflow-hidden">
          <img
            src={mainImage}
            alt={product.name}
            onError={() => setImgError(true)}
            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
          />
          {/* Discount Badge */}
          {hasDiscount && (
            <div className="absolute top-1.5 left-1.5 sm:top-2.5 sm:left-2.5">
              <span className="bg-red-500 text-white text-[10px] sm:text-xs font-bold px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md sm:rounded-lg">
                -{discountPercent}%
              </span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-2 sm:p-3 flex flex-col flex-grow border-t border-gray-100 dark:border-secondary-700">
          {/* Product Name */}
          <h3 className="text-xs sm:text-sm leading-snug font-medium text-gray-800 dark:text-secondary-100 line-clamp-2 min-h-[2rem] sm:min-h-[2.5rem] group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
            {product.name}
          </h3>
          
          {/* Price Section */}
          <div className="mt-1.5 sm:mt-2">
            <div className="flex items-baseline gap-0.5 sm:gap-1">
              <span className="text-sm sm:text-lg font-bold text-gray-900 dark:text-secondary-100">
                {Number(product.price).toFixed(2)}
              </span>
              <span className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-secondary-100">zł</span>
            </div>
            {hasDiscount && (
              <span className="text-[10px] sm:text-xs text-gray-400 dark:text-secondary-500 line-through">
                {Number(product.compareAtPrice).toFixed(2)} zł
              </span>
            )}
          </div>

          {/* Delivery info */}
          <div className="flex flex-col gap-0.5 mt-1 sm:mt-1.5">
            <p className="text-[10px] sm:text-xs text-primary-600 dark:text-primary-400">
              Wysyłka 24-72h
            </p>
            {warehouseLocation && (
              <span className="text-[9px] sm:text-[10px] text-gray-500 dark:text-secondary-400 flex items-center gap-0.5">
                <LocationIcon className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                Magazyn {warehouseLocation}
              </span>
            )}
          </div>
        </div>
      </Link>

      {/* Add to cart button */}
      {showAddToCart && product.variants?.[0] && (
        <div className="px-2 pb-2 sm:px-3 sm:pb-3">
          <button
            onClick={handleAddToCart}
            className="w-full flex items-center justify-center gap-1.5 sm:gap-2 bg-primary-500 hover:bg-primary-600 text-white font-medium py-2 sm:py-2.5 rounded-lg sm:rounded-xl transition-colors"
          >
            <CartIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="text-xs sm:text-sm">Do koszyka</span>
          </button>
        </div>
      )}
    </div>
  );
}