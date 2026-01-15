'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Product } from '../lib/api';
import { useWishlist } from '../contexts/WishlistContext';

// Placeholder SVG as data URI
const PLACEHOLDER_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'%3E%3Crect fill='%23f3f4f6' width='400' height='400'/%3E%3Cpath fill='%23d1d5db' d='M160 150h80v100h-80z'/%3E%3Ccircle fill='%23d1d5db' cx='180' cy='130' r='20'/%3E%3Cpath fill='%23e5e7eb' d='M120 250l60-80 40 50 40-30 60 60v50H120z'/%3E%3C/svg%3E";

export interface ProductListCardProps {
  product: Product;
  showWishlist?: boolean;
  viewMode?: 'grid' | 'list';
}

// Badge types
type BadgeType = 'super-price' | 'outlet' | 'bestseller' | 'new';

const badgeStyles: Record<BadgeType, string> = {
  'super-price': 'bg-primary-500 text-white',
  'outlet': 'bg-gray-500 text-white',
  'bestseller': 'bg-green-500 text-white',
  'new': 'bg-blue-500 text-white',
};

export default function ProductListCard({ product, showWishlist = true, viewMode = 'grid' }: ProductListCardProps) {
  const [imgError, setImgError] = useState(false);
  const mainImage = imgError || !product.images?.[0]?.url ? PLACEHOLDER_IMAGE : product.images[0].url;
  const hasDiscount = product.compareAtPrice && Number(product.compareAtPrice) > Number(product.price);
  
  // Demo data for display
  const rating = product.rating || (Math.random() * 2 + 3).toFixed(1);
  const reviewCount = product.reviewCount || Math.floor(Math.random() * 500) + 10;
  const storeName = product.storeName || 'TopStore';
  const badge = product.badge as BadgeType | undefined;
  const deliveryInfo = product.deliveryInfo || 'błyskawiczna dostawa';

  const { isInWishlist, toggleWishlist } = useWishlist();
  const inWishlist = isInWishlist(product.id);

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

  // List view
  if (viewMode === 'list') {
    return (
      <div className="group bg-white rounded-lg border border-gray-200 hover:shadow-lg transition-shadow duration-200 relative">
        {/* Wishlist button */}
        {showWishlist && (
          <button
            onClick={handleWishlistClick}
            className={`absolute top-2 right-2 z-10 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200
              ${inWishlist 
                ? 'bg-red-50 text-red-500' 
                : 'bg-white/80 text-gray-400 opacity-0 group-hover:opacity-100 hover:text-red-500 hover:bg-red-50'
              }`}
            title={inWishlist ? 'Usuń z ulubionych' : 'Dodaj do ulubionych'}
          >
            <svg 
              className="w-5 h-5" 
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

        <Link href={`/products/${product.id}`} className="flex">
          {/* Image */}
          <div className="relative w-48 h-48 flex-shrink-0 overflow-hidden rounded-l-lg bg-gray-50 p-4">
            <img
              src={mainImage}
              alt={product.name}
              onError={() => setImgError(true)}
              className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
            />
            {badge && (
              <span className={`absolute top-2 left-2 text-xs font-bold px-2 py-1 rounded ${badgeStyles[badge]}`}>
                {badge === 'super-price' ? 'Super Cena' : 
                 badge === 'outlet' ? 'Outlet' : 
                 badge === 'bestseller' ? 'Bestseller' : 'Nowość'}
              </span>
            )}
          </div>

          {/* Info */}
          <div className="p-4 flex flex-col flex-grow">
            {/* Product Name */}
            <h3 className="text-base font-medium text-secondary-800 mb-2">
              {product.name}
            </h3>
            
            {/* Rating */}
            <div className="flex items-center gap-1 mb-2">
              <div className="flex items-center">
                {[...Array(5)].map((_, i) => (
                  <svg 
                    key={i} 
                    className={`w-4 h-4 ${i < Math.floor(Number(rating)) ? 'text-yellow-400' : 'text-gray-300'}`} 
                    fill="currentColor" 
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <span className="text-sm text-gray-500">({reviewCount} ocen)</span>
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-xl font-bold text-secondary-900">
                {Number(product.price).toFixed(2).replace('.', ',')} zł
              </span>
              {hasDiscount && (
                <span className="text-base text-gray-400 line-through">
                  {Number(product.compareAtPrice).toFixed(2).replace('.', ',')} zł
                </span>
              )}
            </div>

            {/* Delivery Info */}
            <div className="flex items-center gap-2 mt-auto">
              <span className="text-sm text-green-600">{deliveryInfo}</span>
            </div>
          </div>
        </Link>
      </div>
    );
  }

  // Grid view (default)

  return (
    <div className="group bg-white rounded-lg border border-gray-200 hover:shadow-lg transition-shadow duration-200 flex flex-col h-full relative">
      {/* Wishlist button */}
      {showWishlist && (
        <button
          onClick={handleWishlistClick}
          className={`absolute top-2 right-2 z-10 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200
            ${inWishlist 
              ? 'bg-red-50 text-red-500' 
              : 'bg-white/80 text-gray-400 opacity-0 group-hover:opacity-100 hover:text-red-500 hover:bg-red-50'
            }`}
          title={inWishlist ? 'Usuń z ulubionych' : 'Dodaj do ulubionych'}
        >
          <svg 
            className="w-5 h-5" 
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

      <Link href={`/products/${product.id}`} className="flex flex-col h-full">
        {/* Image */}
        <div className="relative aspect-square overflow-hidden rounded-t-lg bg-gray-50 p-4">
          <img
            src={mainImage}
            alt={product.name}
            onError={() => setImgError(true)}
            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
          />
          {badge && (
            <span className={`absolute top-2 left-2 text-xs font-bold px-2 py-1 rounded ${badgeStyles[badge]}`}>
              {badge === 'super-price' ? 'Super Cena' : 
               badge === 'outlet' ? 'Outlet' : 
               badge === 'bestseller' ? 'Bestseller' : 'Nowość'}
            </span>
          )}
        </div>

        {/* Info */}
        <div className="p-3 flex flex-col flex-grow">
          {/* Product Name */}
          <h3 className="text-sm text-secondary-800 line-clamp-2 mb-2 min-h-[2.5rem]">
            {product.name}
          </h3>
          
          {/* Rating */}
          <div className="flex items-center gap-1 mb-2">
            <div className="flex items-center">
              {[...Array(5)].map((_, i) => (
                <svg 
                  key={i} 
                  className={`w-3.5 h-3.5 ${i < Math.floor(Number(rating)) ? 'text-yellow-400' : 'text-gray-300'}`} 
                  fill="currentColor" 
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
            <span className="text-xs text-gray-400">({reviewCount})</span>
          </div>

          {/* Price */}
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-lg font-bold text-secondary-900">
              {Number(product.price).toFixed(2).replace('.', ',')} zł
            </span>
            {hasDiscount && (
              <span className="text-sm text-gray-400 line-through">
                {Number(product.compareAtPrice).toFixed(2).replace('.', ',')} zł
              </span>
            )}
          </div>

          {/* Delivery Info */}
          <div className="flex items-center gap-2 mb-2 mt-auto">
            <span className="text-xs text-green-600">{deliveryInfo}</span>
          </div>
        </div>
      </Link>
    </div>
  );
}
