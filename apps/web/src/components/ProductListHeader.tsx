'use client';

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
}

export default function ProductListHeader({ 
  totalProducts, 
  onSortChange,
  onViewChange,
  activeTab = 'all',
  onTabChange,
  currentSort = 'popularity',
  currentView = 'grid'
}: ProductListHeaderProps) {
  const handleSortChange = (value: string) => {
    onSortChange?.(value);
  };

  const handleViewChange = (newView: 'grid' | 'list') => {
    onViewChange?.(newView);
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
