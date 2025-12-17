'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// Mock data - w przyszłości zastąpione API
const mockProducts = [
  { id: '1', name: 'iPhone 15 Pro Max 256GB', slug: 'iphone-15-pro-max', price: 5999, image: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=100', category: 'Smartfony' },
  { id: '2', name: 'iPhone 15 Pro 128GB', slug: 'iphone-15-pro', price: 5199, image: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=100', category: 'Smartfony' },
  { id: '3', name: 'iPhone 14 128GB', slug: 'iphone-14', price: 3999, image: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=100', category: 'Smartfony' },
  { id: '4', name: 'Samsung Galaxy S24 Ultra', slug: 'samsung-galaxy-s24-ultra', price: 5499, image: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=100', category: 'Smartfony' },
  { id: '5', name: 'MacBook Pro 14" M3', slug: 'macbook-pro-14-m3', price: 8999, image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=100', category: 'Laptopy' },
  { id: '6', name: 'MacBook Air 13" M2', slug: 'macbook-air-13-m2', price: 5499, image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=100', category: 'Laptopy' },
  { id: '7', name: 'AirPods Pro 2', slug: 'airpods-pro-2', price: 1199, image: 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=100', category: 'Słuchawki' },
  { id: '8', name: 'Sony WH-1000XM5', slug: 'sony-wh-1000xm5', price: 1599, image: 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=100', category: 'Słuchawki' },
  { id: '9', name: 'Apple Watch Series 9', slug: 'apple-watch-series-9', price: 1999, image: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=100', category: 'Smartwatche' },
  { id: '10', name: 'iPad Pro 12.9" M2', slug: 'ipad-pro-12-9-m2', price: 5999, image: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=100', category: 'Tablety' },
  { id: '11', name: 'Dell XPS 15', slug: 'dell-xps-15', price: 7499, image: 'https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=100', category: 'Laptopy' },
  { id: '12', name: 'Słuchawki gamingowe Razer', slug: 'razer-headset', price: 499, image: 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=100', category: 'Słuchawki' },
];

const popularSearches = [
  'iPhone 15',
  'Laptopy gamingowe',
  'Słuchawki bezprzewodowe',
  'Black Friday',
  'Apple Watch',
];

const RECENT_SEARCHES_KEY = 'wbtrade_recent_searches';
const MAX_RECENT_SEARCHES = 5;

interface SearchResult {
  id: string;
  name: string;
  slug: string;
  price: number;
  image: string;
  category: string;
}

export default function SearchBar() {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(RECENT_SEARCHES_KEY);
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse recent searches');
      }
    }
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

  // Search function with debounce
  const searchProducts = useCallback((searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    
    // Simulate API delay
    setTimeout(() => {
      const query = searchQuery.toLowerCase();
      const filtered = mockProducts.filter(product => 
        product.name.toLowerCase().includes(query) ||
        product.category.toLowerCase().includes(query)
      ).slice(0, 6);
      
      setResults(filtered);
      setIsLoading(false);
    }, 150);
  }, []);

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

  // Close dropdown when clicking outside
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
      setIsOpen(false);
      router.push(`/products?search=${encodeURIComponent(query.trim())}`);
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
    setIsOpen(false);
    router.push(`/products?search=${encodeURIComponent(search)}`);
  };

  const handlePopularSearchClick = (search: string) => {
    setQuery(search);
    saveRecentSearch(search);
    setIsOpen(false);
    router.push(`/products?search=${encodeURIComponent(search)}`);
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
          placeholder="Czego szukasz..."
          className="flex-1 h-11 rounded-l-lg border border-r-0 border-gray-300 bg-white px-4 py-2 
                     text-sm placeholder:text-gray-400 
                     focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          autoComplete="off"
        />
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
          className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden"
        >
          {/* Loading state */}
          {isLoading && query.trim() && (
            <div className="p-4 flex items-center justify-center gap-2 text-gray-500">
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
              <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Produkty
              </div>
              {results.map((product, index) => (
                <button
                  key={product.id}
                  onClick={() => handleProductClick(product)}
                  className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left ${
                    selectedIndex === index ? 'bg-gray-50' : ''
                  }`}
                >
                  <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                    <img 
                      src={product.image} 
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{product.name}</p>
                    <p className="text-xs text-gray-500">{product.category}</p>
                  </div>
                  <div className="text-sm font-semibold text-primary-600">
                    {formatPrice(product.price)}
                  </div>
                </button>
              ))}
              <Link 
                href={`/products?search=${encodeURIComponent(query)}`}
                onClick={() => {
                  saveRecentSearch(query);
                  setIsOpen(false);
                }}
                className="block px-4 py-3 text-center text-sm font-medium text-primary-600 hover:bg-primary-50 border-t border-gray-100"
              >
                Zobacz wszystkie wyniki dla "{query}"
              </Link>
            </div>
          )}

          {/* No results */}
          {!isLoading && query.trim() && results.length === 0 && (
            <div className="p-6 text-center">
              <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <p className="text-sm text-gray-500">Nie znaleziono produktów dla "{query}"</p>
              <p className="text-xs text-gray-400 mt-1">Spróbuj innych słów kluczowych</p>
            </div>
          )}

          {/* Recent & Popular searches (when no query) */}
          {!query.trim() && (
            <>
              {/* Recent searches */}
              {recentSearches.length > 0 && (
                <div className="py-2 border-b border-gray-100">
                  <div className="px-4 py-2 flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Ostatnio szukane
                    </span>
                    <button 
                      onClick={clearRecentSearches}
                      className="text-xs text-gray-400 hover:text-gray-600"
                    >
                      Wyczyść
                    </button>
                  </div>
                  {recentSearches.map((search, index) => (
                    <button
                      key={index}
                      onClick={() => handleRecentSearchClick(search)}
                      className={`w-full px-4 py-2.5 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left ${
                        selectedIndex === index ? 'bg-gray-50' : ''
                      }`}
                    >
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-sm text-gray-700">{search}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Popular searches */}
              <div className="py-2">
                <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  🔥 Popularne wyszukiwania
                </div>
                {popularSearches.map((search, index) => (
                  <button
                    key={index}
                    onClick={() => handlePopularSearchClick(search)}
                    className={`w-full px-4 py-2.5 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left ${
                      selectedIndex === recentSearches.length + index ? 'bg-gray-50' : ''
                    }`}
                  >
                    <svg className="w-4 h-4 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                    <span className="text-sm text-gray-700">{search}</span>
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