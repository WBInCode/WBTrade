'use client';

interface ProductCardSkeletonProps {
  showDelivery?: boolean;
}

export default function ProductCardSkeleton({ showDelivery = false }: ProductCardSkeletonProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 animate-pulse">
      {/* Image skeleton */}
      <div className="aspect-square bg-gray-200 rounded-t-lg" />

      {/* Info skeleton */}
      <div className="p-3">
        {/* Delivery badge skeleton */}
        {showDelivery && (
          <div className="h-4 bg-gray-200 rounded w-32 mb-2" />
        )}

        {/* Product name skeleton - 2 lines */}
        <div className="space-y-2 mb-3">
          <div className="h-4 bg-gray-200 rounded w-full" />
          <div className="h-4 bg-gray-200 rounded w-3/4" />
        </div>
        
        {/* Price skeleton */}
        <div className="flex items-baseline gap-2">
          <div className="h-6 bg-gray-200 rounded w-20" />
          <div className="h-4 bg-gray-100 rounded w-14" />
        </div>
      </div>
    </div>
  );
}

// Grid skeleton for multiple products
interface ProductGridSkeletonProps {
  count?: number;
  columns?: 2 | 3 | 4 | 5 | 6;
  showDelivery?: boolean;
}

export function ProductGridSkeleton({ 
  count = 6, 
  columns = 6,
  showDelivery = false 
}: ProductGridSkeletonProps) {
  const gridClasses = {
    2: 'grid-cols-2',
    3: 'grid-cols-2 sm:grid-cols-3',
    4: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4',
    5: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5',
    6: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6',
  };

  return (
    <div className={`grid ${gridClasses[columns]} gap-4`}>
      {Array.from({ length: count }).map((_, index) => (
        <ProductCardSkeleton key={index} showDelivery={showDelivery} />
      ))}
    </div>
  );
}

// List card skeleton (for product list page)
export function ProductListCardSkeleton() {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse">
      <div className="flex gap-4">
        {/* Image skeleton */}
        <div className="w-32 h-32 bg-gray-200 rounded-lg flex-shrink-0" />
        
        {/* Content skeleton */}
        <div className="flex-1 min-w-0">
          {/* Title */}
          <div className="h-5 bg-gray-200 rounded w-3/4 mb-2" />
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-4" />
          
          {/* Rating */}
          <div className="flex items-center gap-2 mb-3">
            <div className="h-4 bg-gray-200 rounded w-24" />
            <div className="h-4 bg-gray-100 rounded w-16" />
          </div>
          
          {/* Price */}
          <div className="flex items-center gap-2">
            <div className="h-6 bg-gray-200 rounded w-24" />
            <div className="h-4 bg-gray-100 rounded w-16" />
          </div>
        </div>
      </div>
    </div>
  );
}

// Page skeleton for products page
export function ProductsPageSkeleton() {
  return (
    <div className="flex gap-6">
      {/* Sidebar skeleton */}
      <aside className="hidden lg:block w-64 flex-shrink-0">
        <div className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse">
          {/* Filter sections */}
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="mb-6">
              <div className="h-5 bg-gray-200 rounded w-24 mb-3" />
              <div className="space-y-2">
                <div className="h-4 bg-gray-100 rounded w-full" />
                <div className="h-4 bg-gray-100 rounded w-3/4" />
                <div className="h-4 bg-gray-100 rounded w-5/6" />
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* Main content skeleton */}
      <div className="flex-1">
        {/* Header skeleton */}
        <div className="flex items-center justify-between mb-4 animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-48" />
          <div className="h-10 bg-gray-200 rounded w-32" />
        </div>

        {/* Grid skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 12 }).map((_, index) => (
            <ProductCardSkeleton key={index} />
          ))}
        </div>
      </div>
    </div>
  );
}
