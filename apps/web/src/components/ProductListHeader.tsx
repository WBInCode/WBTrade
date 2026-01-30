'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';

// Warehouse configuration
const WAREHOUSES = [
  { id: 'leker', location: 'Chynów' },
  { id: 'hp', location: 'Zielona Góra' },
  { id: 'btp', location: 'Chotów' },
] as const;

interface SortOption {
  value: string;
  label: string;
}

const sortOptions: SortOption[] = [
  { value: 'popularity', label: 'Popularność' },
  { value: 'price-asc', label: 'Cena: od najniższej' },
  { value: 'price-desc', label: 'Cena: od najwyższej' },
  { value: 'newest', label: 'Najnowsze' },
];

interface ProductListHeaderProps {
  totalProducts: number;
  onSortChange?: (value: string) => void;
  onViewChange?: (view: 'grid' | 'list') => void;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  currentSort?: string;
  currentView?: 'grid' | 'list';
  warehouseCounts?: Record<string, number>;
}

export default function ProductListHeader({ 
  totalProducts, 
  onSortChange,
  onViewChange,
  activeTab = 'all',
  onTabChange,
  currentSort = 'popularity',
  currentView = 'grid',
  warehouseCounts
}: ProductListHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  // Get selected warehouse from URL
  const selectedWarehouse = searchParams.get('warehouse') || '';

  const handleSortChange = (value: string) => {
    onSortChange?.(value);
  };

  const handleViewChange = (newView: 'grid' | 'list') => {
    onViewChange?.(newView);
  };

  const handleWarehouseChange = (warehouseId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (warehouseId) {
      params.set('warehouse', warehouseId);
    } else {
      params.delete('warehouse');
    }
    
    // Reset to page 1 when filtering
    params.delete('page');
    
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const tabs = [
    { id: 'all', label: 'Wszystkie' },
    { id: 'bestsellers', label: 'Bestsellery' },
    { id: 'discounted', label: 'Przecenione' },
    { id: 'new', label: 'Nowości' },
  ];

  return (
    <div className="flex flex-col gap-4 mb-6">
      {/* Tabs - scrollable on mobile */}
      <div className="overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-secondary-800 rounded-lg p-1 w-max sm:w-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => onTabChange?.(tab.id)}
              className={`px-3 sm:px-4 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-white dark:bg-secondary-700 text-secondary-900 dark:text-white shadow-sm'
                  : 'text-secondary-500 dark:text-secondary-400 hover:text-secondary-700 dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Mobile Warehouse Filter - visible only on mobile (lg:hidden) */}
      <div className="lg:hidden flex items-center gap-2">
        <svg className="w-4 h-4 text-gray-500 dark:text-secondary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <span className="text-sm text-secondary-500 dark:text-secondary-400">Magazyn:</span>
        <select
          value={selectedWarehouse}
          onChange={(e) => handleWarehouseChange(e.target.value)}
          className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-secondary-600 rounded-lg bg-white dark:bg-secondary-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        >
          <option value="">Wszystkie magazyny</option>
          {WAREHOUSES.map(warehouse => {
            const count = warehouseCounts?.[warehouse.id];
            return (
              <option key={warehouse.id} value={warehouse.id}>
                {warehouse.location}{count !== undefined ? ` (${count.toLocaleString()})` : ''}
              </option>
            );
          })}
        </select>
      </div>

      {/* Sort & View */}
      <div className="flex items-center justify-between sm:justify-end gap-4">
        {/* Sort */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-secondary-500 dark:text-secondary-400">Sortuj:</span>
          <select
            value={currentSort}
            onChange={(e) => handleSortChange(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 dark:border-secondary-600 rounded-lg bg-white dark:bg-secondary-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            {sortOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* View Toggle */}
        <div className="flex items-center border border-gray-300 dark:border-secondary-600 rounded-lg overflow-hidden">
          <button
            onClick={() => handleViewChange('grid')}
            className={`p-2 transition-colors ${
              currentView === 'grid' ? 'bg-primary-500 text-white' : 'bg-white dark:bg-secondary-700 text-secondary-500 dark:text-secondary-300 hover:bg-gray-50 dark:hover:bg-secondary-600'
            }`}
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </button>
          <button
            onClick={() => handleViewChange('list')}
            className={`p-2 transition-colors ${
              currentView === 'list' ? 'bg-primary-500 text-white' : 'bg-white dark:bg-secondary-700 text-secondary-500 dark:text-secondary-300 hover:bg-gray-50 dark:hover:bg-secondary-600'
            }`}
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
