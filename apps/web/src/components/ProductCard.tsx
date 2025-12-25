'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Product } from '../lib/api';
import { useWishlist } from '../contexts/WishlistContext';

// Placeholder SVG as data URI
const PLACEHOLDER_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'%3E%3Crect fill='%23f3f4f6' width='400' height='400'/%3E%3Cpath fill='%23d1d5db' d='M160 150h80v100h-80z'/%3E%3Ccircle fill='%23d1d5db' cx='180' cy='130' r='20'/%3E%3Cpath fill='%23e5e7eb' d='M120 250l60-80 40 50 40-30 60 60v50H120z'/%3E%3C/svg%3E";

export interface ProductCardProps {
  product: Product;
  showDelivery?: boolean;
  showWishlist?: boolean;
}

export default function ProductCard({ product, showDelivery = false, showWishlist = true }: ProductCardProps) {
  const [imgError, setImgError] = useState(false);
  const mainImage = imgError || !product.images?.[0]?.url ? PLACEHOLDER_IMAGE : product.images[0].url;
  const hasDiscount = product.compareAtPrice && Number(product.compareAtPrice) > Number(product.price);
  const discountPercent = hasDiscount 
    ? Math.round((1 - Number(product.price) / Number(product.compareAtPrice)) * 100)
    : 0;

  const { isInWishlist, toggleWishlist } = useWishlist();
  const inWishlist = isInWishlist(product.id);

  const handleWishlistClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Get the first variant ID if available
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

  return (
    <div className="group bg-white rounded-xl border border-gray-100 hover:border-primary-300 hover:shadow-xl transition-all duration-300 relative overflow-hidden">
      {/* Wishlist button */}
      {showWishlist && (
        <button
          onClick={handleWishlistClick}
          className={`absolute top-3 right-3 z-10 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 shadow-sm
            ${inWishlist 
              ? 'bg-red-500 text-white' 
              : 'bg-white text-gray-400 opacity-0 group-hover:opacity-100 hover:text-red-500 hover:bg-red-50 border border-gray-100'
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

      <Link href={`/products/${product.id}`}>
        {/* Image */}
        <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 rounded-t-xl">
          <img
            src={mainImage}
            alt={product.name}
            onError={() => setImgError(true)}
            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300 p-4"
          />
          {/* Discount Badge */}
          {hasDiscount && (
            <span className="absolute top-3 left-3 bg-gradient-to-r from-red-500 to-red-600 text-white text-xs font-bold px-2.5 py-1.5 rounded-lg shadow-sm">
              -{discountPercent}%
            </span>
          )}
        </div>

        {/* Info */}
        <div className="p-4">
          {/* Delivery Badge */}
          {showDelivery && (
            <div className="flex items-center gap-1.5 text-green-600 text-xs mb-2 bg-green-50 px-2 py-1 rounded-md w-fit">
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
              </svg>
              <span className="font-semibold">Darmowa dostawa</span>
            </div>
          )}

          {/* Product Name */}
          <h3 className="text-sm font-medium text-gray-800 line-clamp-2 mb-3 min-h-[2.5rem] group-hover:text-primary-600 transition-colors">
            {product.name}
          </h3>
          
          {/* Price Section */}
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold text-gray-900">
              {Number(product.price).toFixed(2)} zł
            </span>
            {hasDiscount && (
              <span className="text-sm text-gray-400 line-through">
                {Number(product.compareAtPrice).toFixed(2)} zł
              </span>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
}