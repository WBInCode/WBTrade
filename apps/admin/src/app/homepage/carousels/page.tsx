'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, Plus, X, GripVertical, Save, Trash2, Eye, Star, Flame, Gift, Snowflake, Sparkles } from 'lucide-react';
import Image from 'next/image';
import { getAuthToken } from '@/lib/api';

interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  images?: { url: string }[];
  category?: { name: string };
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface CarouselConfig {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  productIds: string[];
  isAutomatic: boolean;
  categorySlug?: string; // filter automatic products by category
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
const MAX_PRODUCTS_PER_CAROUSEL = 20;

export default function CarouselsPage() {
  const [carousels, setCarousels] = useState<CarouselConfig[]>([
    {
      id: 'featured',
      name: 'Polecane dla Ciebie',
      description: 'Ręcznie wybrane produkty wyświetlane na górze strony głównej',
      icon: <Star className="w-5 h-5" />,
      color: 'from-violet-600 to-purple-700',
      productIds: [],
      isAutomatic: false,
    },
    {
      id: 'bestsellers',
      name: 'Bestsellery',
      description: 'Automatycznie: najczęściej kupowane produkty z ostatnich 90 dni. Możesz ręcznie nadpisać.',
      icon: <Flame className="w-5 h-5" />,
      color: 'from-orange-500 to-red-600',
      productIds: [],
      isAutomatic: true,
    },
    {
      id: 'newProducts',
      name: 'Nowości',
      description: 'Automatycznie: produkty dodane w ostatnich 2 tygodniach. Po 2 tygodniach znikają. Możesz ręcznie nadpisać.',
      icon: <Sparkles className="w-5 h-5" />,
      color: 'from-emerald-500 to-teal-600',
      productIds: [],
      isAutomatic: true,
    },
    {
      id: 'toys',
      name: 'Zabawki',
      description: 'Automatycznie: bestsellery z kategorii Zabawki. Możesz ręcznie nadpisać.',
      icon: <Gift className="w-5 h-5" />,
      color: 'from-pink-500 to-rose-600',
      productIds: [],
      isAutomatic: true,
    },
    {
      id: 'seasonal',
      name: 'Zimowa Wyprzedaż',
      description: 'Produkty sezonowe - zimowe. Automatycznie lub ręcznie wybrane.',
      icon: <Snowflake className="w-5 h-5" />,
      color: 'from-blue-500 to-cyan-600',
      productIds: [],
      isAutomatic: true,
    },
  ]);

  const [selectedCarousel, setSelectedCarousel] = useState<string>('featured');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
  const [excludedProducts, setExcludedProducts] = useState<Product[]>([]);
  const [excludedProductIds, setExcludedProductIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showExclusions, setShowExclusions] = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);

  // Refs for AbortController and debounce
  const abortControllerRef = useRef<AbortController | null>(null);
  const searchAbortRef = useRef<AbortController | null>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentCarousel = carousels.find(c => c.id === selectedCarousel);

  // ─── Effect 1: Load settings + categories on mount ───
  useEffect(() => {
    loadSettings();
    loadCategories();
    return () => {
      // Cleanup on unmount
      if (abortControllerRef.current) abortControllerRef.current.abort();
      if (searchAbortRef.current) searchAbortRef.current.abort();
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, []);

  // ─── Effect 2: Load products when carousel changes OR settings finish loading ───
  useEffect(() => {
    // Immediately clear old products and search so user never sees stale data
    setSelectedProducts([]);
    setSearchQuery('');
    setSearchResults([]);

    const carousel = carousels.find(c => c.id === selectedCarousel);
    if (carousel && carousel.productIds.length > 0) {
      loadSelectedProducts(carousel.productIds);
    }

    // Load initial product suggestions for new carousel (no search query)
    // Use a small delay to let selectedProducts clear first
    const timer = setTimeout(() => searchProducts(''), 100);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCarousel, settingsLoaded]);

  const loadSettings = async () => {
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_URL}/admin/settings/carousels`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });
      if (response.ok) {
        const data = await response.json();
        if (data.carousels) {
          setCarousels(prev => prev.map(c => ({
            ...c,
            // Always deduplicate IDs on load to prevent stale duplicates
            productIds: [...new Set(data.carousels[c.id]?.productIds || [])] as string[],
            isAutomatic: data.carousels[c.id]?.isAutomatic ?? c.isAutomatic,
            categorySlug: data.carousels[c.id]?.categorySlug || c.categorySlug,
          })));
          // Use real state (not ref) to trigger Effect 2 re-run
          setSettingsLoaded(true);
        }
        // Load excluded products
        if (data.excludedProductIds && data.excludedProductIds.length > 0) {
          setExcludedProductIds(data.excludedProductIds);
          loadExcludedProducts(data.excludedProductIds);
        }
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const loadExcludedProducts = async (productIds: string[]) => {
    if (productIds.length === 0) {
      setExcludedProducts([]);
      return;
    }
    
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_URL}/products/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({ ids: productIds }),
      });
      if (response.ok) {
        const data = await response.json();
        setExcludedProducts(data.products || []);
      }
    } catch (error) {
      console.error('Error loading excluded products:', error);
    }
  };

  const loadSelectedProducts = async (productIds: string[]) => {
    if (productIds.length === 0) {
      setSelectedProducts([]);
      setLoadingProducts(false);
      return;
    }

    // Cancel any previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoadingProducts(true);

    try {
      // Deduplicate IDs
      const uniqueIds = [...new Set(productIds)];
      const token = getAuthToken();
      
      // Batch fetch
      const response = await fetch(`${API_URL}/products/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({ ids: uniqueIds }),
        signal: controller.signal,
      });

      if (controller.signal.aborted) return;

      if (response.ok) {
        const data = await response.json();
        // Preserve the order from productIds
        const productMap = new Map(data.products.map((p: Product) => [p.id, p]));
        const orderedProducts = uniqueIds
          .map(id => productMap.get(id))
          .filter(Boolean) as Product[];
        
        if (controller.signal.aborted) return;
        
        setSelectedProducts(orderedProducts);
        
        // Sync: if some IDs resolved to fewer products (stale/deleted),
        // update carousels state to match reality
        if (orderedProducts.length !== uniqueIds.length) {
          const validIds = orderedProducts.map(p => p.id);
          setCarousels(prev => prev.map(c =>
            c.id === selectedCarousel
              ? { ...c, productIds: validIds }
              : c
          ));
        }
      }
    } catch (error: any) {
      if (error?.name === 'AbortError') return;
      console.error('Error loading products:', error);
    } finally {
      if (!controller.signal.aborted) {
        setLoadingProducts(false);
      }
    }
  };

  const searchProducts = async (query: string) => {
    // Cancel previous search
    if (searchAbortRef.current) {
      searchAbortRef.current.abort();
    }
    const controller = new AbortController();
    searchAbortRef.current = controller;

    setLoading(true);
    try {
      let url = `${API_URL}/products?limit=30`;
      if (query.length >= 2) {
        url += `&search=${encodeURIComponent(query)}`;
      }
      
      const token = getAuthToken();
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        signal: controller.signal,
      });
      
      if (controller.signal.aborted) return;

      if (response.ok) {
        const data = await response.json();
        let results = data.products;
        
        if (query.length >= 2) {
          const queryLower = query.toLowerCase();
          results = results.sort((a: Product, b: Product) => {
            const aSkuExact = a.sku?.toLowerCase() === queryLower;
            const bSkuExact = b.sku?.toLowerCase() === queryLower;
            const aSkuPartial = a.sku?.toLowerCase().includes(queryLower);
            const bSkuPartial = b.sku?.toLowerCase().includes(queryLower);
            
            if (aSkuExact && !bSkuExact) return -1;
            if (bSkuExact && !aSkuExact) return 1;
            if (aSkuPartial && !bSkuPartial) return -1;
            if (bSkuPartial && !aSkuPartial) return 1;
            return 0;
          });
        }
        
        // Filter out already selected products AND excluded products
        const filtered = results.filter(
          (p: Product) => !selectedProducts.some(sp => sp.id === p.id) && !excludedProductIds.includes(p.id)
        );
        
        setSearchResults(filtered);
      }
    } catch (error: any) {
      if (error?.name === 'AbortError') return;
      console.error('Error searching products:', error);
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  };

  const loadCategories = async () => {
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_URL}/categories`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });
      if (response.ok) {
        const data = await response.json();
        setCategories(Array.isArray(data) ? data : data.categories || []);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const addProduct = (product: Product) => {
    // BUG FIX: Check if product already exists (prevent duplicates)
    if (selectedProducts.some(p => p.id === product.id)) {
      return;
    }
    // Check if limit reached
    if (selectedProducts.length >= MAX_PRODUCTS_PER_CAROUSEL) {
      setMessage({ type: 'error', text: `Maksymalna liczba produktów w karuzeli to ${MAX_PRODUCTS_PER_CAROUSEL}` });
      setTimeout(() => setMessage(null), 3000);
      return;
    }
    
    setSelectedProducts(prev => [...prev, product]);
    setSearchResults(prev => prev.filter(p => p.id !== product.id));
    setCarousels(prev => prev.map(c => 
      c.id === selectedCarousel 
        ? { ...c, productIds: [...new Set([...c.productIds, product.id])], isAutomatic: false }
        : c
    ));
  };

  const removeProduct = (productId: string) => {
    // Re-add the removed product back to search results
    const removedProduct = selectedProducts.find(p => p.id === productId);
    if (removedProduct) {
      setSearchResults(prev => [removedProduct, ...prev]);
    }
    setSelectedProducts(prev => prev.filter(p => p.id !== productId));
    setCarousels(prev => prev.map(c => 
      c.id === selectedCarousel 
        ? { ...c, productIds: c.productIds.filter(id => id !== productId) }
        : c
    ));
  };

  const excludeProduct = (product: Product) => {
    if (excludedProductIds.includes(product.id)) return;
    setExcludedProductIds(prev => [...prev, product.id]);
    setExcludedProducts(prev => [...prev, product]);
    // Also remove from search results
    setSearchResults(prev => prev.filter(p => p.id !== product.id));
  };

  const removeExclusion = (productId: string) => {
    setExcludedProductIds(prev => prev.filter(id => id !== productId));
    setExcludedProducts(prev => prev.filter(p => p.id !== productId));
  };

  const moveProduct = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= selectedProducts.length) return;

    const newProducts = [...selectedProducts];
    [newProducts[index], newProducts[newIndex]] = [newProducts[newIndex], newProducts[index]];
    setSelectedProducts(newProducts);
    
    setCarousels(prev => prev.map(c => 
      c.id === selectedCarousel 
        ? { ...c, productIds: newProducts.map(p => p.id) }
        : c
    ));
  };

  const resetToAutomatic = () => {
    setSelectedProducts([]);
    setCarousels(prev => prev.map(c => 
      c.id === selectedCarousel 
        ? { ...c, productIds: [], isAutomatic: true }
        : c
    ));
  };

  const saveSettings = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const carouselData = carousels.reduce((acc, c) => ({
        ...acc,
        [c.id]: { productIds: c.productIds, isAutomatic: c.isAutomatic, categorySlug: c.categorySlug || undefined }
      }), {});

      const token = getAuthToken();
      const response = await fetch(`${API_URL}/admin/settings/carousels`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({ 
          carousels: carouselData,
          excludedProductIds: excludedProductIds,
        }),
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Ustawienia zapisane pomyślnie!' });
      } else {
        throw new Error('Failed to save');
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Błąd podczas zapisywania ustawień' });
      console.error('Error saving settings:', error);
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Karuzele produktów</h1>
          <p className="text-slate-400 mt-1">
            Zarządzaj produktami wyświetlanymi na stronie głównej
          </p>
        </div>
        <button
          onClick={saveSettings}
          disabled={saving}
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Zapisuję...' : 'Zapisz zmiany'}
        </button>
      </div>

      {/* Message */}
      {message && (
        <div className={`mb-4 p-4 rounded-lg ${
          message.type === 'success' 
            ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
            : 'bg-red-500/20 text-red-400 border border-red-500/30'
        }`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-12 gap-6">
        {/* Carousel Selection */}
        <div className="col-span-4">
          <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
            <div className="p-4 border-b border-slate-700">
              <h2 className="font-semibold text-white">Wybierz karuzelę</h2>
            </div>
            <div className="p-2">
              {carousels.map((carousel) => (
                <button
                  key={carousel.id}
                  onClick={() => setSelectedCarousel(carousel.id)}
                  className={`w-full text-left p-3 rounded-lg mb-1 transition-colors ${
                    selectedCarousel === carousel.id
                      ? 'bg-slate-700 border border-slate-600'
                      : 'hover:bg-slate-700/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-r ${carousel.color} flex items-center justify-center text-white`}>
                      {carousel.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-white">{carousel.name}</div>
                      <div className="text-xs text-slate-400 truncate">
                        {(() => {
                          const isSelected = carousel.id === selectedCarousel;
                          const uniqueIds = [...new Set(carousel.productIds)].length;
                          if (isSelected && loadingProducts && uniqueIds > 0) {
                            return `Ładowanie ${uniqueIds} produktów...`;
                          }
                          if (isSelected && selectedProducts.length > 0) {
                            return `${selectedProducts.length} produktów (ręcznie)`;
                          }
                          if (uniqueIds > 0) {
                            return `${uniqueIds} produktów (ręcznie)`;
                          }
                          return carousel.isAutomatic ? 'Automatycznie' : 'Brak produktów';
                        })()}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
          
          {/* Exclusions Section */}
          <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden mt-4">
            <button
              onClick={() => setShowExclusions(!showExclusions)}
              className="w-full p-4 flex items-center justify-between hover:bg-slate-700/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-red-600 to-red-700 flex items-center justify-center text-white">
                  <X className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <div className="font-medium text-white">Wykluczone produkty</div>
                  <div className="text-xs text-slate-400">
                    {excludedProductIds.length > 0 
                      ? `${excludedProductIds.length} produktów wykluczonych`
                      : 'Brak wykluczeń'
                    }
                  </div>
                </div>
              </div>
              <div className={`transform transition-transform ${showExclusions ? 'rotate-180' : ''}`}>
                <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>
            
            {showExclusions && (
              <div className="p-4 border-t border-slate-700">
                <p className="text-sm text-slate-400 mb-3">
                  Wykluczone produkty nie będą pokazywane w żadnej automatycznej karuzeli.
                </p>
                {excludedProducts.length === 0 ? (
                  <p className="text-center text-slate-500 py-4">
                    Brak wykluczonych produktów. Użyj ikony 🚫 przy produkcie w wyszukiwarce.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {excludedProducts.map((product) => (
                      <div key={product.id} className="flex items-center gap-2 p-2 bg-slate-900 rounded-lg">
                        <div className="w-8 h-8 bg-slate-700 rounded overflow-hidden flex-shrink-0">
                          {product.images?.[0]?.url ? (
                            <img src={product.images[0].url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-500">
                              <Eye className="w-4 h-4" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-white truncate">{product.name}</div>
                        </div>
                        <button
                          onClick={() => removeExclusion(product.id)}
                          className="p-1 text-green-400 hover:text-green-300"
                          title="Usuń z wykluczeń"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Carousel Editor */}
        <div className="col-span-8">
          {currentCarousel && (
            <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
              {/* Carousel Header */}
              <div className={`p-4 bg-gradient-to-r ${currentCarousel.color}`}>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-white">
                    {currentCarousel.icon}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">{currentCarousel.name}</h2>
                    <p className="text-white/80 text-sm">{currentCarousel.description}</p>
                  </div>
                </div>
              </div>

              {/* Category Filter for Automatic Carousels */}
              {currentCarousel.isAutomatic && (
                <div className="p-4 border-b border-slate-700 bg-slate-800/50">
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-slate-300 mb-1.5">
                        Filtruj automatycznie po kategorii
                      </label>
                      <select
                        value={currentCarousel.categorySlug || ''}
                        onChange={(e) => {
                          const value = e.target.value || undefined;
                          setCarousels(prev => prev.map(c =>
                            c.id === selectedCarousel
                              ? { ...c, categorySlug: value }
                              : c
                          ));
                        }}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-orange-500 appearance-none cursor-pointer"
                      >
                        <option value="">Wszystkie kategorie (domyślnie)</option>
                        {categories.map(cat => (
                          <option key={cat.id} value={cat.slug}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    {currentCarousel.categorySlug && (
                      <button
                        onClick={() => {
                          setCarousels(prev => prev.map(c =>
                            c.id === selectedCarousel
                              ? { ...c, categorySlug: undefined }
                              : c
                          ));
                        }}
                        className="mt-6 p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                        title="Wyczyść filtr kategorii"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1.5">
                    Gdy ustawisz kategorię, automatyczna karuzela pokaże tylko produkty z wybranej kategorii.
                  </p>
                </div>
              )}

              {/* Search */}
              <div className="p-4 border-b border-slate-700">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Szukaj produktu po nazwie lub SKU..."
                    value={searchQuery}
                    onChange={(e) => {
                      const value = e.target.value;
                      setSearchQuery(value);
                      // Debounce search input
                      if (searchDebounceRef.current) {
                        clearTimeout(searchDebounceRef.current);
                      }
                      searchDebounceRef.current = setTimeout(() => {
                        searchProducts(value);
                      }, 300);
                    }}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-orange-500"
                  />
                </div>

                {/* Available Products */}
                <div className="mt-3">
                  <div className="text-sm text-slate-400 mb-2">
                    {loading ? 'Ładowanie...' : `Dostępne produkty (${searchResults.length}) - kliknij + aby dodać, 🚫 aby wykluczyć:`}
                  </div>
                  <div className="max-h-60 overflow-y-auto bg-slate-900 rounded-lg border border-slate-600">
                    {searchResults.length === 0 && !loading ? (
                      <div className="p-4 text-center text-slate-400">
                        Brak produktów do wyświetlenia
                      </div>
                    ) : (
                      searchResults.map((product) => (
                        <div
                          key={product.id}
                          className="flex items-center gap-3 p-3 hover:bg-slate-800 transition-colors border-b border-slate-700 last:border-0"
                        >
                          <div className="w-12 h-12 bg-slate-700 rounded-lg overflow-hidden flex-shrink-0">
                            {product.images?.[0]?.url ? (
                              <img
                                src={product.images[0].url}
                                alt={product.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-500">
                              <Eye className="w-5 h-5" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 text-left min-w-0">
                          <div className="text-white text-sm font-medium truncate">{product.name}</div>
                          <div className="text-slate-400 text-xs">
                            SKU: {product.sku} • {Number(product.price).toFixed(2)} zł
                          </div>
                        </div>
                        <button
                          onClick={() => addProduct(product)}
                          className="p-2 text-green-400 hover:text-green-300 hover:bg-green-400/10 rounded-lg transition-colors"
                          title="Dodaj do karuzeli"
                        >
                          <Plus className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => excludeProduct(product)}
                          className="p-2 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-lg transition-colors"
                          title="Wyklucz z karuzel"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    ))
                  )}
                  </div>
                </div>
              </div>

              {/* Selected Products */}
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <h3 className="font-medium text-white">
                      Wybrane produkty ({selectedProducts.length}/{MAX_PRODUCTS_PER_CAROUSEL})
                    </h3>
                    {selectedProducts.length >= MAX_PRODUCTS_PER_CAROUSEL && (
                      <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-1 rounded">
                        Limit osiągnięty
                      </span>
                    )}
                  </div>
                  {(selectedProducts.length > 0 || (currentCarousel && currentCarousel.productIds.length > 0)) && (
                    <button
                      onClick={resetToAutomatic}
                      className="text-sm text-slate-400 hover:text-white flex items-center gap-1"
                    >
                      <Trash2 className="w-4 h-4" />
                      Resetuj do automatycznych
                    </button>
                  )}
                </div>

                {loadingProducts ? (
                  <div className="text-center py-8">
                    <div className="inline-block w-8 h-8 border-2 border-slate-600 border-t-orange-500 rounded-full animate-spin mb-3"></div>
                    <p className="text-slate-400">Ładowanie produktów...</p>
                  </div>
                ) : selectedProducts.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    {currentCarousel.isAutomatic ? (
                      <p>Karuzela działa automatycznie. Dodaj produkty, aby nadpisać.</p>
                    ) : (
                      <p>Brak wybranych produktów. Wyszukaj i dodaj produkty powyżej.</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {selectedProducts.map((product, index) => (
                      <div
                        key={`${product.id}-${index}`}
                        className="flex items-center gap-3 p-3 bg-slate-900 rounded-lg border border-slate-700"
                      >
                        <div className="flex flex-col gap-1">
                          <button
                            onClick={() => moveProduct(index, 'up')}
                            disabled={index === 0}
                            className="p-1 hover:bg-slate-700 rounded disabled:opacity-30"
                          >
                            <GripVertical className="w-4 h-4 text-slate-400" />
                          </button>
                        </div>
                        <div className="w-12 h-12 bg-slate-700 rounded-lg overflow-hidden flex-shrink-0">
                          {product.images?.[0]?.url ? (
                            <img
                              src={product.images[0].url}
                              alt={product.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-500">
                              <Eye className="w-5 h-5" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-white text-sm font-medium truncate">{product.name}</div>
                          <div className="text-slate-400 text-xs">
                            {product.category?.name} • {Number(product.price).toFixed(2)} zł
                          </div>
                        </div>
                        <div className="text-slate-500 text-sm font-medium">
                          #{index + 1}
                        </div>
                        <button
                          onClick={() => removeProduct(product.id)}
                          className="p-2 hover:bg-red-500/20 rounded-lg text-red-400 hover:text-red-300 transition-colors"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
