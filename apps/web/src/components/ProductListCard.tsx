import Link from 'next/link';
import { Product } from '../lib/api';

export interface ProductListCardProps {
  product: Product;
}

// Badge types
type BadgeType = 'super-price' | 'outlet' | 'bestseller' | 'new';

const badgeStyles: Record<BadgeType, string> = {
  'super-price': 'bg-primary-500 text-white',
  'outlet': 'bg-gray-500 text-white',
  'bestseller': 'bg-green-500 text-white',
  'new': 'bg-blue-500 text-white',
};

export default function ProductListCard({ product }: ProductListCardProps) {
  const mainImage = product.images?.[0]?.url || '/placeholder.jpg';
  const hasDiscount = product.compareAtPrice && Number(product.compareAtPrice) > Number(product.price);
  
  // Demo data for display
  const rating = product.rating || (Math.random() * 2 + 3).toFixed(1);
  const reviewCount = product.reviewCount || Math.floor(Math.random() * 500) + 10;
  const storeName = product.storeName || 'TopStore';
  const badge = product.badge as BadgeType | undefined;
  const hasSmart = product.hasSmart !== false;
  const deliveryInfo = product.deliveryInfo || 'dostawa jutro';

  return (
    <div className="group bg-white rounded-lg border border-gray-200 hover:shadow-lg transition-shadow duration-200 flex flex-col h-full">
      <Link href={`/products/${product.id}`} className="flex flex-col h-full">
        {/* Image */}
        <div className="relative aspect-square overflow-hidden rounded-t-lg bg-gray-50 p-4">
          <img
            src={mainImage}
            alt={product.name}
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
              ${Number(product.price).toFixed(2).replace('.', ',')}
            </span>
            {hasDiscount && (
              <span className="text-sm text-gray-400 line-through">
                ${Number(product.compareAtPrice).toFixed(2).replace('.', ',')}
              </span>
            )}
          </div>

          {/* Delivery Info */}
          <div className="flex items-center gap-2 mb-2 mt-auto">
            {hasSmart && (
              <span className="bg-green-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                SMART!
              </span>
            )}
            <span className="text-xs text-green-600">{deliveryInfo}</span>
          </div>

          {/* Store Name */}
          <p className="text-xs text-gray-400">{storeName}</p>
        </div>
      </Link>
    </div>
  );
}
