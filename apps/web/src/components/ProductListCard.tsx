'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Product } from '../lib/api';
import { useWishlist } from '../contexts/WishlistContext';
import { useCart } from '../contexts/CartContext';

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
  const [isAdding, setIsAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const mainImage = imgError || !product.images?.[0]?.url ? PLACEHOLDER_IMAGE : product.images[0].url;
  const hasDiscount = product.compareAtPrice && Number(product.compareAtPrice) > Number(product.price);
  
  // Demo data for display
  const storeName = product.storeName || 'TopStore';
  const badge = product.badge as BadgeType | undefined;
  const deliveryInfo = product.deliveryInfo || 'Wysyłka w ciągu 24-72h';

  const { isInWishlist, toggleWishlist } = useWishlist();
  const { addToCart } = useCart();
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

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const firstVariant = product.variants?.[0];
    if (!firstVariant) return;
    
    setIsAdding(true);
    try {
      await addToCart(firstVariant.id, 1, {
        name: product.name,
        image: mainImage,
        price: String(product.price),
        quantity: 1,
        productId: product.id,
      });
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
    } catch (error) {
      console.error('Failed to add to cart:', error);
    } finally {
      setIsAdding(false);
    }
  };

  const canAddToCart = product.variants && product.variants.length > 0 && product.variants[0].stock > 0;

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

            {/* Add to Cart Button */}
            {canAddToCart && (
              <button
                onClick={handleAddToCart}
                disabled={isAdding || added}
                className={`mt-3 py-2 px-4 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 w-fit
                  ${added 
                    ? 'bg-green-500 text-white' 
                    : 'bg-primary-500 hover:bg-primary-600 text-white'
                  }
                  ${isAdding ? 'opacity-70 cursor-wait' : ''}
                `}
              >
                {isAdding ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Dodawanie...
                  </>
                ) : added ? (
                  <>
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Dodano!
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    Dodaj do koszyka
                  </>
                )}
              </button>
            )}
          </div>
        </Link>
      </div>
    );
  }

  // Grid view (default)

  return (
    <div className="group bg-white rounded-lg border border-gray-200 hover:shadow-lg transition-shadow duration-200 flex flex-col h-full relative overflow-hidden min-w-0">
      {/* Wishlist button */}
      {showWishlist && (
        <button
          onClick={handleWishlistClick}
          className={`absolute top-1 right-1 sm:top-2 sm:right-2 z-10 w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all duration-200
            ${inWishlist 
              ? 'bg-red-50 text-red-500' 
              : 'bg-white/80 text-gray-400 opacity-0 group-hover:opacity-100 hover:text-red-500 hover:bg-red-50'
            }`}
          title={inWishlist ? 'Usuń z ulubionych' : 'Dodaj do ulubionych'}
        >
          <svg 
            className="w-4 h-4 sm:w-5 sm:h-5" 
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
        <div className="relative aspect-square overflow-hidden rounded-t-lg bg-gray-50 p-2 sm:p-4">
          <img
            src={mainImage}
            alt={product.name}
            onError={() => setImgError(true)}
            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
          />
          {badge && (
            <span className={`absolute top-1 left-1 sm:top-2 sm:left-2 text-[10px] sm:text-xs font-bold px-1.5 sm:px-2 py-0.5 sm:py-1 rounded ${badgeStyles[badge]}`}>
              {badge === 'super-price' ? 'Super Cena' : 
               badge === 'outlet' ? 'Outlet' : 
               badge === 'bestseller' ? 'Bestseller' : 'Nowość'}
            </span>
          )}
        </div>

        {/* Info */}
        <div className="p-2 sm:p-3 flex flex-col flex-grow">
          {/* Product Name */}
          <h3 className="text-xs sm:text-sm text-secondary-800 line-clamp-2 mb-1 sm:mb-2 min-h-[2rem] sm:min-h-[2.5rem]">
            {product.name}
          </h3>

          {/* Price */}
          <div className="flex flex-wrap items-baseline gap-1 sm:gap-2 mb-1 sm:mb-2">
            <span className="text-sm sm:text-lg font-bold text-secondary-900">
              {Number(product.price).toFixed(2).replace('.', ',')} zł
            </span>
            {hasDiscount && (
              <span className="text-xs sm:text-sm text-gray-400 line-through">
                {Number(product.compareAtPrice).toFixed(2).replace('.', ',')} zł
              </span>
            )}
          </div>

          {/* Delivery Info */}
          <div className="flex items-center gap-2 mb-1 sm:mb-2 mt-auto">
            <span className="text-[10px] sm:text-xs text-green-600">{deliveryInfo}</span>
          </div>

          {/* Add to Cart Button */}
          {canAddToCart && (
            <button
              onClick={handleAddToCart}
              disabled={isAdding || added}
              className={`w-full py-1.5 sm:py-2 px-2 sm:px-3 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 flex items-center justify-center gap-1 sm:gap-2
                ${added 
                  ? 'bg-green-500 text-white' 
                  : 'bg-primary-500 hover:bg-primary-600 text-white'
                }
                ${isAdding ? 'opacity-70 cursor-wait' : ''}
              `}
            >
              {isAdding ? (
                <>
                  <svg className="animate-spin h-3 w-3 sm:h-4 sm:w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="hidden sm:inline">Dodawanie...</span>
                </>
              ) : added ? (
                <>
                  <svg className="h-3 w-3 sm:h-4 sm:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="hidden sm:inline">Dodano!</span>
                </>
              ) : (
                <>
                  <svg className="h-3 w-3 sm:h-4 sm:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  Do koszyka
                </>
              )}
            </button>
          )}
        </div>
      </Link>
    </div>
  );
}
