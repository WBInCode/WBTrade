import Link from 'next/link';
import { Product } from '../lib/api';

export interface ProductCardProps {
  product: Product;
  showDelivery?: boolean;
}

export default function ProductCard({ product, showDelivery = false }: ProductCardProps) {
  const mainImage = product.images?.[0]?.url || '/placeholder.jpg';
  const hasDiscount = product.compareAtPrice && Number(product.compareAtPrice) > Number(product.price);
  const discountPercent = hasDiscount 
    ? Math.round((1 - Number(product.price) / Number(product.compareAtPrice)) * 100)
    : 0;

  return (
    <div className="group bg-white rounded-lg border border-gray-200 hover:shadow-lg transition-shadow duration-200">
      <Link href={`/products/${product.id}`}>
        {/* Image */}
        <div className="relative aspect-square overflow-hidden rounded-t-lg bg-gray-50">
          <img
            src={mainImage}
            alt={product.name}
            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300 p-4"
          />
          {hasDiscount && (
            <span className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">
              -{discountPercent}%
            </span>
          )}
        </div>

        {/* Info */}
        <div className="p-3">
          {/* Delivery Badge */}
          {showDelivery && (
            <div className="flex items-center gap-1 text-green-600 text-xs mb-2">
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
              </svg>
              <span className="font-medium">Darmowa dostawa Smart!</span>
            </div>
          )}

          {/* Product Name */}
          <h3 className="text-sm text-secondary-800 line-clamp-2 mb-2 min-h-[2.5rem]">
            {product.name}
          </h3>
          
          {/* Price */}
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold text-secondary-900">
              {Number(product.price).toFixed(2)} $
            </span>
            {hasDiscount && (
              <span className="text-sm text-gray-400 line-through">
                {Number(product.compareAtPrice).toFixed(2)} $
              </span>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
}