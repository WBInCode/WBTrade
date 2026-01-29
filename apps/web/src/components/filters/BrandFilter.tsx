'use client';

import { useState, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';

interface Brand {
  name: string;
  count: number;
}

interface BrandFilterProps {
  brands: Brand[];
}

function BrandFilterContent({ brands = [] }: BrandFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const [searchQuery, setSearchQuery] = useState('');
  
  // Get selected brands from URL
  const selectedBrands = searchParams.get('brand')?.split(',').filter(Boolean) || [];

  const toggleBrand = useCallback((brandName: string) => {
    const params = new URLSearchParams(searchParams.toString());
    const currentBrands = params.get('brand')?.split(',').filter(Boolean) || [];
    
    let newBrands: string[];
    if (currentBrands.includes(brandName)) {
      newBrands = currentBrands.filter(b => b !== brandName);
    } else {
      newBrands = [...currentBrands, brandName];
    }
    
    if (newBrands.length > 0) {
      params.set('brand', newBrands.join(','));
    } else {
      params.delete('brand');
    }
    
    // Reset to page 1 when filtering
    params.delete('page');
    
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }, [pathname, router, searchParams]);

  const filteredBrands = brands.filter(brand => 
    brand.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (brands.length === 0) {
    return null;
  }

  return (
    <div className="mb-6">
      <h3 className="font-semibold text-secondary-900 dark:text-white mb-3">Marki</h3>
      
      {/* Search */}
      {brands.length > 5 && (
        <div className="relative mb-3">
          <input
            type="text"
            placeholder="Szukaj marek..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-secondary-600 dark:bg-secondary-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent pl-9"
          />
          <svg 
            className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      )}

      {/* Brand list */}
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {filteredBrands.map(brand => {
          const isChecked = selectedBrands.includes(brand.name);
          return (
            <label key={brand.name} className="flex items-center justify-between cursor-pointer group">
              <div className="flex items-center gap-2">
                <div 
                  onClick={() => toggleBrand(brand.name)}
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors cursor-pointer ${
                    isChecked 
                      ? 'bg-primary-500 border-primary-500' 
                      : 'border-gray-300 dark:border-secondary-600 group-hover:border-primary-400'
                  }`}
                >
                  {isChecked && (
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span 
                  className="text-sm text-secondary-700 dark:text-secondary-300 cursor-pointer"
                  onClick={() => toggleBrand(brand.name)}
                >
                  {brand.name}
                </span>
              </div>
              <span className="text-xs text-gray-400 dark:text-secondary-500">({brand.count})</span>
            </label>
          );
        })}
      </div>
      
      {filteredBrands.length === 0 && searchQuery && (
        <p className="text-sm text-gray-500 dark:text-gray-400">Brak wyników dla "{searchQuery}"</p>
      )}
    </div>
  );
}

export default function BrandFilter(props: BrandFilterProps) {
  return (
    <Suspense fallback={<div className="mb-6 animate-pulse"><div className="h-6 bg-gray-200 dark:bg-secondary-700 rounded w-1/4 mb-3"></div><div className="h-24 bg-gray-200 dark:bg-secondary-700 rounded"></div></div>}>
      <BrandFilterContent {...props} />
    </Suspense>
  );
}
