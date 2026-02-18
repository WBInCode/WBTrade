'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { dashboardApi, categoriesApi, CategoryWithChildren } from '../lib/api';
import { cleanCategoryName } from '../lib/categories';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// Default popular searches (fallback)
const defaultPopularSearches = [
  'Zabawki',
  'Przytulanka',
  'Dekoracje',
  'Kuchnia',
  'Akcesoria',
];

const RECENT_SEARCHES_KEY = 'wbtrade_recent_searches';
const MAX_RECENT_SEARCHES = 5;

interface SearchProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  image: string | null;
  categoryName: string | null;
  type: 'product';
}

interface SearchCategory {
  id: string;
  name: string;
  slug: string;
  type: 'category';
}

interface SuggestResponse {
  products: SearchProduct[];
  categories: SearchCategory[];
  processingTimeMs?: number;
}

interface SearchResult {
  id: string;
  name: string;
  slug: string;
  price: number;
  image: string | null;
  category: string;
}

export default function SearchBar() {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [popularSearches, setPopularSearches] = useState<string[]>(defaultPopularSearches);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [categories, setCategories] = useState<CategoryWithChildren[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<{ slug: string; name: string } | null>(null);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Load recent searches from localStorage and fetch popular searches
  useEffect(() => {
    const saved = localStorage.getItem(RECENT_SEARCHES_KEY);
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse recent searches');
      }
    }
    
    // Fetch popular searches from API
    const fetchPopularSearches = async () => {
      try {
        const response = await fetch(`${API_URL}/search/popular?limit=5&days=30`);
        if (response.ok) {
          const data = await response.json();
          if (data.searches && data.searches.length > 0) {
            setPopularSearches(data.searches);
          }
        }
      } catch (e) {
        console.error('Failed to fetch popular searches');
      }
    };
    
    fetchPopularSearches();
    
    // Fetch categories for dropdown
    const fetchCategories = async () => {
      try {
        const response = await categoriesApi.getMain();
        setCategories(response.categories);
      } catch (e) {
        console.error('Failed to fetch categories');
      }
    };
    fetchCategories();
  }, []);

  // Save recent search
  const saveRecentSearch = useCallback((searchQuery: string) => {
    const trimmed = searchQuery.trim();
    if (!trimmed) return;
    
    setRecentSearches(prev => {
      const filtered = prev.filter(s => s.toLowerCase() !== trimmed.toLowerCase());
      const updated = [trimmed, ...filtered].slice(0, MAX_RECENT_SEARCHES);
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Clear recent searches
  const clearRecentSearches = useCallback(() => {
    setRecentSearches([]);
    localStorage.removeItem(RECENT_SEARCHES_KEY);
  }, []);

  // Search function using Meilisearch API
  const searchProducts = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    
    try {
      const categoryParam = selectedCategory ? `&category=${encodeURIComponent(selectedCategory.slug)}` : '';
      const response = await fetch(
        `${API_URL}/search/suggest?query=${encodeURIComponent(searchQuery.trim())}${categoryParam}`
      );
      
      if (!response.ok) {
        throw new Error('Wyszukiwanie nie powiodło się');
      }
      
      const data: SuggestResponse = await response.json();
      
      const mapped: SearchResult[] = data.products.map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        price: p.price,
        image: p.image,
        category: p.categoryName || '',
      }));
      
      setResults(mapped);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedCategory]);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (query.trim()) {
      setIsLoading(true);
      debounceRef.current = setTimeout(() => {
        searchProducts(query);
      }, 300);
    } else {
      setResults([]);
      setIsLoading(false);
    }

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, searchProducts]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
      if (
        categoryDropdownRef.current &&
        !categoryDropdownRef.current.contains(event.target as Node)
      ) {
        setIsCategoryDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const totalItems = results.length + (query ? 0 : recentSearches.length + popularSearches.length);
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < totalItems - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : totalItems - 1));
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      if (results.length > 0 && selectedIndex < results.length) {
        handleProductClick(results[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    if (query.trim()) {
      saveRecentSearch(query);
      // Record search for personalized recommendations
      dashboardApi.recordSearch(query.trim(), undefined, results.length).catch(() => {
        // Silently ignore errors - this is optional functionality
      });
      setIsOpen(false);
      const categoryParam = selectedCategory ? `&category=${encodeURIComponent(selectedCategory.slug)}` : '';
      router.push(`/products?search=${encodeURIComponent(query.trim())}${categoryParam}`);
    }
  };

  const handleProductClick = (product: SearchResult) => {
    saveRecentSearch(product.name);
    setIsOpen(false);
    setQuery('');
    router.push(`/products/${product.slug}`);
  };

  const handleRecentSearchClick = (search: string) => {
    setQuery(search);
    saveRecentSearch(search);
    // Record search for personalized recommendations
    dashboardApi.recordSearch(search).catch(() => {});
    setIsOpen(false);
    const categoryParam = selectedCategory ? `&category=${encodeURIComponent(selectedCategory.slug)}` : '';
    router.push(`/products?search=${encodeURIComponent(search)}${categoryParam}`);
  };

  const handlePopularSearchClick = (search: string) => {
    setQuery(search);
    saveRecentSearch(search);
    // Record search for personalized recommendations
    dashboardApi.recordSearch(search).catch(() => {});
    setIsOpen(false);
    const categoryParam = selectedCategory ? `&category=${encodeURIComponent(selectedCategory.slug)}` : '';
    router.push(`/products?search=${encodeURIComponent(search)}${categoryParam}`);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pl-PL', { 
      style: 'currency', 
      currency: 'PLN',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const showDropdown = isOpen && (query.trim() || recentSearches.length > 0 || popularSearches.length > 0);

  return (
    <div className="relative w-full">
      <form onSubmit={handleSearch} className="relative w-full flex">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={selectedCategory ? `Szukaj w: ${cleanCategoryName(selectedCategory.name)}...` : 'Czego szukasz...'}
          className="flex-1 h-11 rounded-l-lg border border-r-0 border-gray-300 dark:border-secondary-600 bg-white dark:bg-secondary-800 px-4 py-2 
                     text-sm text-secondary-900 dark:text-secondary-100 placeholder:text-gray-400 dark:placeholder:text-secondary-500
                     focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          autoComplete="off"
        />

        {/* Category dropdown button - right side, between input and search button */}
        <div ref={categoryDropdownRef} className="relative hidden md:block">
          <button
            type="button"
            onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
            className={`h-11 px-3 border-y border-l border-gray-300 dark:border-secondary-600
                       text-sm transition-colors flex items-center gap-1.5 whitespace-nowrap
                       ${selectedCategory 
                         ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400' 
                         : 'bg-gray-50 dark:bg-secondary-700 text-secondary-500 dark:text-secondary-400 hover:bg-gray-100 dark:hover:bg-secondary-600'
                       }`}
          >
            <span className="truncate max-w-[150px]">{selectedCategory ? cleanCategoryName(selectedCategory.name) : 'Kategorie'}</span>
            {selectedCategory ? (
              <span
                role="button"
                tabIndex={-1}
                onClick={(e) => { e.stopPropagation(); setSelectedCategory(null); }}
                className="ml-0.5 p-0.5 rounded-full hover:bg-primary-200 dark:hover:bg-primary-800 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </span>
            ) : (
              <svg className={`w-3.5 h-3.5 flex-shrink-0 transition-transform ${isCategoryDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            )}
          </button>

          {/* Category dropdown list */}
          {isCategoryDropdownOpen && (
            <div className="absolute top-full right-0 mt-1 w-72 bg-white dark:bg-secondary-800 rounded-lg shadow-xl dark:shadow-secondary-950/50 border border-gray-200 dark:border-secondary-700 z-[60] max-h-[400px] overflow-y-auto">
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory(null);
                  setIsCategoryDropdownOpen(false);
                }}
                className={`w-full px-4 py-2.5 text-left text-sm transition-colors flex items-center gap-2 ${
                  !selectedCategory 
                    ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 font-medium' 
                    : 'text-secondary-700 dark:text-secondary-200 hover:bg-gray-50 dark:hover:bg-secondary-700'
                }`}
              >
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
                Wszystkie kategorie
              </button>
              {categories.map((category) => (
                <button
                  key={category.slug}
                  type="button"
                  onClick={() => {
                    setSelectedCategory({ slug: category.slug, name: category.name });
                    setIsCategoryDropdownOpen(false);
                    inputRef.current?.focus();
                  }}
                  className={`w-full px-4 py-2.5 text-left text-sm transition-colors ${
                    selectedCategory?.slug === category.slug 
                      ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 font-medium' 
                      : 'text-secondary-700 dark:text-secondary-200 hover:bg-gray-50 dark:hover:bg-secondary-700'
                  }`}
                >
                  {cleanCategoryName(category.name)}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          type="submit"
          className="px-6 h-11 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-r-lg transition-colors flex items-center gap-2"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <span className="hidden sm:inline">Szukaj</span>
        </button>
      </form>

      {/* Dropdown */}
      {showDropdown && (
        <div 
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-secondary-800 rounded-lg shadow-xl dark:shadow-secondary-950/50 border border-gray-200 dark:border-secondary-700 z-50 overflow-hidden"
        >
          {/* Loading state */}
          {isLoading && query.trim() && (
            <div className="p-4 flex items-center justify-center gap-2 text-gray-500 dark:text-secondary-400">
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="text-sm">Szukam...</span>
            </div>
          )}

          {/* Search results */}
          {!isLoading && query.trim() && results.length > 0 && (
            <div className="py-2">
              <div className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-secondary-400 uppercase tracking-wide">
                Produkty
              </div>
              {results.map((product, index) => (
                <button
                  key={product.id}
                  onClick={() => handleProductClick(product)}
                  className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-secondary-700 transition-colors text-left ${
                    selectedIndex === index ? 'bg-gray-50 dark:bg-secondary-700' : ''
                  }`}
                >
                  <div className="w-12 h-12 bg-gray-100 dark:bg-secondary-700 rounded-lg overflow-hidden flex-shrink-0 relative">
                    {product.image ? (
                      <Image 
                        src={product.image} 
                        alt={product.name}
                        fill
                        sizes="48px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-secondary-500">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-secondary-100 truncate">{product.name}</p>
                    <p className="text-xs text-gray-500 dark:text-secondary-400">{product.category}</p>
                  </div>
                  <div className="text-sm font-semibold text-primary-600 dark:text-primary-400">
                    {formatPrice(product.price)}
                  </div>
                </button>
              ))}
              <Link 
                href={`/products?search=${encodeURIComponent(query)}${selectedCategory ? `&category=${encodeURIComponent(selectedCategory.slug)}` : ''}`}
                onClick={() => {
                  saveRecentSearch(query);
                  setIsOpen(false);
                }}
                className="block px-4 py-3 text-center text-sm font-medium text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/30 border-t border-gray-100 dark:border-secondary-700"
              >
                Zobacz wszystkie wyniki dla "{query}"
              </Link>
            </div>
          )}

          {/* No results */}
          {!isLoading && query.trim() && results.length === 0 && (
            <div className="p-6 text-center">
              <svg className="w-12 h-12 text-gray-300 dark:text-secondary-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <p className="text-sm text-gray-500 dark:text-secondary-400">Nie znaleziono produktów dla "{query}"</p>
              <p className="text-xs text-gray-400 dark:text-secondary-500 mt-1">Spróbuj innych słów kluczowych</p>
            </div>
          )}

          {/* Recent & Popular searches (when no query) */}
          {!query.trim() && (
            <>
              {/* Recent searches */}
              {recentSearches.length > 0 && (
                <div className="py-2 border-b border-gray-100 dark:border-secondary-700">
                  <div className="px-4 py-2 flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-500 dark:text-secondary-400 uppercase tracking-wide">
                      Ostatnio szukane
                    </span>
                    <button 
                      onClick={clearRecentSearches}
                      className="text-xs text-gray-400 dark:text-secondary-500 hover:text-gray-600 dark:hover:text-secondary-300"
                    >
                      Wyczyść
                    </button>
                  </div>
                  {recentSearches.map((search, index) => (
                    <button
                      key={index}
                      onClick={() => handleRecentSearchClick(search)}
                      className={`w-full px-4 py-2.5 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-secondary-700 transition-colors text-left ${
                        selectedIndex === index ? 'bg-gray-50 dark:bg-secondary-700' : ''
                      }`}
                    >
                      <svg className="w-4 h-4 text-gray-400 dark:text-secondary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-sm text-gray-700 dark:text-secondary-200">{search}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Popular searches */}
              <div className="py-2">
                <div className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-secondary-400 uppercase tracking-wide">
                  🔥 Popularne wyszukiwania
                </div>
                {popularSearches.map((search, index) => (
                  <button
                    key={index}
                    onClick={() => handlePopularSearchClick(search)}
                    className={`w-full px-4 py-2.5 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-secondary-700 transition-colors text-left ${
                      selectedIndex === recentSearches.length + index ? 'bg-gray-50 dark:bg-secondary-700' : ''
                    }`}
                  >
                    <svg className="w-4 h-4 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                    <span className="text-sm text-gray-700 dark:text-secondary-200">{search}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}