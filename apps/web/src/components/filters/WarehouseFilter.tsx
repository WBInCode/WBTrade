'use client';

import { useCallback, useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';

const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api').replace(/\/$/, '');

// Dynamic warehouse config loaded from API
interface WarehouseInfo {
  id: string;
  location: string;
}

// Fallback used until API responds
const FALLBACK_WAREHOUSES: WarehouseInfo[] = [
  { id: 'leker', location: 'Chynów' },
  { id: 'hp', location: 'Zielona Góra' },
  { id: 'btp', location: 'Chotów' },
  { id: 'dofirmy', location: 'Koszalin' },
  { id: 'outlet', location: 'Rzeszów' },
  { id: 'hurtownia-kuchenna', location: 'Hurtownia Kuchenna' },
];

let _warehouseCache: WarehouseInfo[] | null = null;
let _cacheTime = 0;

async function fetchWarehouses(): Promise<WarehouseInfo[]> {
  if (_warehouseCache && Date.now() - _cacheTime < 30 * 1000) return _warehouseCache;
  try {
    const res = await fetch(`${API_URL}/wholesalers/config`, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      _warehouseCache = data
        .filter((w: any) => w.prefix && w.location)
        .map((w: any) => ({ id: w.key, location: w.location }));
      _cacheTime = Date.now();
      return _warehouseCache!;
    }
  } catch {}
  return FALLBACK_WAREHOUSES;
}

export type WarehouseId = string;

interface WarehouseFilterProps {
  warehouseCounts?: Record<string, number>;
}

function WarehouseFilterContent({ warehouseCounts }: WarehouseFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [warehouses, setWarehouses] = useState<WarehouseInfo[]>(FALLBACK_WAREHOUSES);
  
  useEffect(() => {
    fetchWarehouses().then(setWarehouses);
  }, []);
  
  // Get selected warehouses from URL
  const selectedWarehouses = searchParams.get('warehouse')?.split(',').filter(Boolean) || [];

  const toggleWarehouse = useCallback((warehouseId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    const currentWarehouses = params.get('warehouse')?.split(',').filter(Boolean) || [];
    
    let newWarehouses: string[];
    if (currentWarehouses.includes(warehouseId)) {
      newWarehouses = currentWarehouses.filter(w => w !== warehouseId);
    } else {
      newWarehouses = [...currentWarehouses, warehouseId];
    }
    
    if (newWarehouses.length > 0) {
      params.set('warehouse', newWarehouses.join(','));
    } else {
      params.delete('warehouse');
    }
    
    // Reset to page 1 when filtering
    params.delete('page');
    
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }, [pathname, router, searchParams]);

  return (
    <div className="mb-6">
      <h3 className="font-semibold text-secondary-900 dark:text-white mb-3 flex items-center gap-2">
        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        Lokalizacja magazynu
      </h3>

      <div className="space-y-2">
        {warehouses.map(warehouse => {
          const isChecked = selectedWarehouses.includes(warehouse.id);
          const count = warehouseCounts?.[warehouse.id];
          
          return (
            <label 
              key={warehouse.id} 
              className="flex items-center justify-between cursor-pointer group"
            >
              <div className="flex items-center gap-2">
                <div 
                  onClick={() => toggleWarehouse(warehouse.id)}
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
                  onClick={() => toggleWarehouse(warehouse.id)}
                  className={`text-sm cursor-pointer ${
                    isChecked ? 'text-primary-600 dark:text-primary-400 font-medium' : 'text-secondary-700 dark:text-secondary-300 group-hover:text-primary-500'
                  }`}
                >
                  {warehouse.location}
                </span>
              </div>
              {count !== undefined && (
                <span className="text-xs text-gray-400 dark:text-secondary-500">
                  ({count.toLocaleString()})
                </span>
              )}
            </label>
          );
        })}
      </div>
    </div>
  );
}

export default function WarehouseFilter(props: WarehouseFilterProps) {
  return (
    <Suspense fallback={
      <div className="mb-6 animate-pulse">
        <div className="h-5 bg-gray-200 dark:bg-secondary-700 rounded w-1/2 mb-3"></div>
        <div className="space-y-2">
          {[1, 2, 3].map(i => <div key={i} className="h-6 bg-gray-200 dark:bg-secondary-700 rounded w-3/4"></div>)}
        </div>
      </div>
    }>
      <WarehouseFilterContent {...props} />
    </Suspense>
  );
}
