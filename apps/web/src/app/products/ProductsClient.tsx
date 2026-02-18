'use client';

import { useState, useEffect, useMemo, Suspense, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import ProductListCard from '../../components/ProductListCard';
import ProductListHeader from '../../components/ProductListHeader';
import Pagination from '../../components/Pagination';
import Breadcrumb from '../../components/Breadcrumb';
import { CategoryFilter, PriceFilter, BrandFilter, SpecificationFilter, WarehouseFilter } from '../../components/filters';
import { Product, productsApi, ProductFiltersResponse, categoriesApi } from '../../lib/api';
import { cleanCategoryName } from '../../lib/categories';

const ITEMS_PER_PAGE = 48;

// Generate or retrieve session seed for consistent random sorting
function getSessionSeed(): number {
  if (typeof window === 'undefined') return Date.now();
  
  const storageKey = 'wbtrade_session_seed';
  const stored = sessionStorage.getItem(storageKey);
  
  if (stored) {
    return parseInt(stored, 10);
  }
  
  const newSeed = Date.now();
  sessionStorage.setItem(storageKey, newSeed.toString());
  return newSeed;
}

// Spec labels in Polish
const specLabels: Record<string, { label: string; unit?: string }> = {
  ram: { label: 'Pamięć RAM', unit: 'GB' },
  storage: { label: 'Dysk', unit: 'GB' },
  processor: { label: 'Procesor' },
  screenSize: { label: 'Przekątna ekranu', unit: '"' },
  graphicsCard: { label: 'Karta graficzna' },
  resolution: { label: 'Rozdzielczość' },
  panelType: { label: 'Typ matrycy' },
  batteryCapacity: { label: 'Bateria', unit: 'mAh' },
  type: { label: 'Typ' },
  connectivity: { label: 'Łączność' },
  noiseCancellation: { label: 'Redukcja szumów' },
  size: { label: 'Rozmiar' },
  material: { label: 'Materiał' },
  color: { label: 'Kolor' },
  powerConsumption: { label: 'Pobór mocy', unit: 'W' },
  energyClass: { label: 'Klasa energetyczna' },
  capacity: { label: 'Pojemność', unit: 'L' },
};

function ProductsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  const searchQuery = searchParams.get('search') || '';
  const currentCategorySlug = searchParams.get('category') || '';
  const minPrice = searchParams.get('minPrice');
  const maxPrice = searchParams.get('maxPrice');
  const brand = searchParams.get('brand');
  const warehouse = searchParams.get('warehouse');
  const sort = searchParams.get('sort') || 'popularity';
  const tabFromUrl = searchParams.get('tab') || 'all';

  // Session seed for consistent random sorting - generated once per session
  const sessionSeedRef = useRef<number | null>(null);
  if (sessionSeedRef.current === null && typeof window !== 'undefined') {
    sessionSeedRef.current = getSessionSeed();
  }

  // State for products and filters
  const [products, setProducts] = useState<Product[]>([]);
  const [totalProducts, setTotalProducts] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [transitioning, setTransitioning] = useState(false);
  const [filters, setFilters] = useState<ProductFiltersResponse | null>(null);
  const [categoryPath, setCategoryPath] = useState<{ id: string; name: string; slug: string }[]>([]);
  const [activeTab, setActiveTab] = useState<string>(tabFromUrl);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Track whether we already have products (for transition vs skeleton decision)
  const hasProductsRef = useRef(false);
  useEffect(() => {
    hasProductsRef.current = products.length > 0;
  }, [products]);

  // Sync activeTab with URL param
  useEffect(() => {
    setActiveTab(tabFromUrl);
  }, [tabFromUrl]);

  // Fetch filters when category changes
  useEffect(() => {
    async function fetchFilters() {
      try {
        const response = await productsApi.getFilters(currentCategorySlug || undefined);
        setFilters(response);
      } catch (error) {
        console.error('Failed to fetch filters:', error);
      }
    }
    fetchFilters();
  }, [currentCategorySlug]);

  // Fetch category path for breadcrumb
  useEffect(() => {
    async function fetchCategoryPath() {
      if (currentCategorySlug) {
        try {
          const response = await categoriesApi.getPath(currentCategorySlug);
          setCategoryPath(response.path);
        } catch (error) {
          console.error('Failed to fetch category path:', error);
          setCategoryPath([]);
        }
      } else {
        setCategoryPath([]);
      }
    }
    fetchCategoryPath();
  }, [currentCategorySlug]);

  // Fetch products when filters or tab change
  useEffect(() => {
    async function fetchProducts() {
      // Show skeleton only on initial load; keep old products visible during transitions
      if (hasProductsRef.current) {
        setTransitioning(true);
      } else {
        setLoading(true);
      }
      try {
        // All tabs use the same getAll endpoint with category context
        // Tabs only change the sort order or add filters
        
        if (activeTab === 'bestsellers') {
          // Bestsellers: products from current category sorted by sales_count (actual sold units)
          const response = await productsApi.getAll({
            page: currentPage,
            limit: ITEMS_PER_PAGE,
            category: currentCategorySlug || undefined,
            minPrice: minPrice ? parseFloat(minPrice) : undefined,
            maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
            search: searchQuery || undefined,
            sort: 'popularity',
            brand: brand || undefined,
            warehouse: warehouse || undefined,
          });
          
          setProducts(response.products);
          setTotalProducts(response.total);
          setTotalPages(response.totalPages);
        }
        else if (activeTab === 'new') {
          // Nowości: products from current category sorted by newest first
          const response = await productsApi.getAll({
            page: currentPage,
            limit: ITEMS_PER_PAGE,
            category: currentCategorySlug || undefined,
            minPrice: minPrice ? parseFloat(minPrice) : undefined,
            maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
            search: searchQuery || undefined,
            sort: 'newest',
            brand: brand || undefined,
            warehouse: warehouse || undefined,
          });
          
          setProducts(response.products);
          setTotalProducts(response.total);
          setTotalPages(response.totalPages);
        }
        else if (activeTab === 'discounted') {
          // Przecenione: only discounted products from current category (server-side filter)
          const response = await productsApi.getAll({
            page: currentPage,
            limit: ITEMS_PER_PAGE,
            category: currentCategorySlug || undefined,
            minPrice: minPrice ? parseFloat(minPrice) : undefined,
            maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
            search: searchQuery || undefined,
            sort: sort as 'price_asc' | 'price_desc' | 'price-asc' | 'price-desc' | 'name_asc' | 'name_desc' | 'newest',
            brand: brand || undefined,
            warehouse: warehouse || undefined,
            discounted: true,
          });
          
          setProducts(response.products);
          setTotalProducts(response.total);
          setTotalPages(response.totalPages);
        } else {
          // "All" tab - show all products with filters
          // Use popularity sort by default for better discovery
          const sortValue = sort as 'price-asc' | 'price-desc' | 'newest' | 'relevance' | 'popularity';
          
          const response = await productsApi.getAll({
            page: currentPage,
            limit: ITEMS_PER_PAGE,
            category: currentCategorySlug || undefined,
            minPrice: minPrice ? parseFloat(minPrice) : undefined,
            maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
            search: searchQuery || undefined,
            sort: sortValue,
            brand: brand || undefined,
            warehouse: warehouse || undefined,
            // Pass session seed for consistent random sorting (relevance)
            sessionSeed: sortValue === 'relevance' ? sessionSeedRef.current || undefined : undefined,
          });
          setProducts(response.products);
          setTotalProducts(response.total);
          setTotalPages(response.totalPages);
        }
      } catch (error) {
        console.error('[ProductsPage] Failed to fetch products:', error);
        setProducts([]);
        setTotalProducts(0);
        setTotalPages(1);
      } finally {
        setLoading(false);
        setTransitioning(false);
      }
    }
    fetchProducts();
  }, [currentPage, currentCategorySlug, minPrice, maxPrice, searchQuery, sort, brand, warehouse, activeTab]);

  // Handle tab change
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    // Update URL with tab parameter
    const params = new URLSearchParams(searchParams.toString());
    if (tab === 'all') {
      params.delete('tab');
    } else {
      params.set('tab', tab);
    }
    params.set('page', '1'); // Reset to first page when tab changes
    router.push(`?${params.toString()}`);
  };

  // Handle sort change
  const handleSortChange = (value: string) => {
    // Map UI sort values to API sort values
    const sortMapping: Record<string, string> = {
      'relevance': 'relevance',
      'popularity': 'popularity',
      'price-asc': 'price-asc',
      'price-desc': 'price-desc',
      'newest': 'newest',
    };
    const apiSort = sortMapping[value] || 'newest';
    
    // If changing to 'relevance' from another sort, generate new session seed
    // This ensures a fresh random order when user explicitly selects "Trafność"
    if (apiSort === 'relevance' && sort !== 'relevance' && typeof window !== 'undefined') {
      const newSeed = Date.now();
      sessionStorage.setItem('wbtrade_session_seed', newSeed.toString());
      sessionSeedRef.current = newSeed;
    }
    
    const params = new URLSearchParams(searchParams.toString());
    params.set('sort', apiSort);
    params.set('page', '1'); // Reset to first page when sorting changes
    router.push(`?${params.toString()}`);
  };

  // Handle view change
  const handleViewChange = (view: 'grid' | 'list') => {
    setViewMode(view);
  };

  // Map API sort values back to UI sort values for dropdown display
  const apiToUiSortMapping: Record<string, string> = {
    'newest': 'newest',
    'relevance': 'relevance',
    'popularity': 'popularity',
    'price-asc': 'price-asc',
    'price-desc': 'price-desc',
    'price_asc': 'price-asc',
    'price_desc': 'price-desc',
  };
  const uiSort = apiToUiSortMapping[sort] || 'popularity';

  // Build breadcrumb dynamically based on category path
  const breadcrumbItems = useMemo(() => {
    const items: { label: string; href?: string }[] = [
      { label: 'Strona główna', href: '/' },
    ];
    
    if (categoryPath.length > 0) {
      categoryPath.forEach((cat, index) => {
        if (index === categoryPath.length - 1) {
          items.push({ label: cleanCategoryName(cat.name) });
        } else {
          items.push({ label: cleanCategoryName(cat.name), href: `/products?category=${cat.slug}` });
        }
      });
    } else if (searchQuery) {
      items.push({ label: `Wyniki dla "${searchQuery}"` });
    } else {
      items.push({ label: 'Wszystkie produkty' });
    }
    
    return items;
  }, [categoryPath, searchQuery]);

  // Get current category name for title
  const currentCategoryName = categoryPath.length > 0 
    ? cleanCategoryName(categoryPath[categoryPath.length - 1].name)
    : null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-secondary-900 overflow-x-hidden">
      <main className="container-custom py-6 overflow-hidden">
        {/* Breadcrumb */}
        <Breadcrumb items={breadcrumbItems} />
        
        {/* Page Title */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-secondary-900 dark:text-white">
            {searchQuery ? (
              <>
                Wyniki dla &quot;{searchQuery}&quot;{' '}
                <span className="text-secondary-400 font-normal text-lg">
                  ({totalProducts.toLocaleString()} {totalProducts === 1 ? 'oferta' : totalProducts < 5 ? 'oferty' : 'ofert'})
                </span>
              </>
            ) : (
              <>
                {currentCategoryName || 'Wszystkie produkty'}{' '}
                <span className="text-secondary-400 font-normal text-lg">
                  ({totalProducts.toLocaleString()} ofert)
                </span>
              </>
            )}
          </h1>
        </div>

        <div className="flex gap-6">
          {/* Sidebar Filters */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <div className="bg-white dark:bg-secondary-800 rounded-lg border border-gray-200 dark:border-secondary-700 p-4 sticky top-24">
              <CategoryFilter />
              <WarehouseFilter warehouseCounts={filters?.warehouseCounts} />
              <PriceFilter priceRange={filters?.priceRange} />
              <BrandFilter brands={filters?.brands || []} />
              
              {/* Dynamic specification filters */}
              {filters?.specifications && Object.entries(filters.specifications).map(([specKey, options]) => {
                const config = specLabels[specKey] || { label: specKey };
                return (
                  <SpecificationFilter
                    key={specKey}
                    specKey={specKey}
                    label={config.label}
                    options={options}
                    unit={config.unit}
                  />
                );
              })}
            </div>
          </aside>

          {/* Main Content */}
          <div className="flex-1 min-w-0 overflow-hidden">
            {/* Header with Tabs, Sort, View Toggle */}
            <ProductListHeader 
              totalProducts={totalProducts} 
              activeTab={activeTab}
              onTabChange={handleTabChange}
              onSortChange={handleSortChange}
              onViewChange={handleViewChange}
              currentSort={uiSort}
              currentView={viewMode}
              warehouseCounts={filters?.warehouseCounts}
            />

            {/* Loading State */}
            {loading && products.length === 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="bg-white dark:bg-secondary-800 rounded-lg border border-gray-200 dark:border-secondary-700 p-2 sm:p-4 animate-pulse">
                    <div className="bg-gray-200 dark:bg-secondary-700 aspect-square rounded-lg mb-2 sm:mb-4"></div>
                    <div className="bg-gray-200 dark:bg-secondary-700 h-4 rounded w-3/4 mb-2"></div>
                    <div className="bg-gray-200 dark:bg-secondary-700 h-4 rounded w-1/2 mb-2"></div>
                    <div className="bg-gray-200 dark:bg-secondary-700 h-6 rounded w-1/3"></div>
                  </div>
                ))}
              </div>
            ) : !loading && !transitioning && products.length === 0 ? (
              <div className="bg-white dark:bg-secondary-800 rounded-lg border border-gray-200 dark:border-secondary-700 p-12 text-center">
                <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Brak wyników</h3>
                <p className="text-gray-500 dark:text-gray-400 mb-4">Nie znaleziono produktów pasujących do Twojego wyszukiwania.</p>
                <a href="/products" className="text-primary-500 hover:text-primary-600 font-medium">
                  Zobacz wszystkie produkty →
                </a>
              </div>
            ) : (
              <div className="relative">
                {/* Transition progress bar — professional indeterminate bar at top */}
                {transitioning && (
                  <div className="absolute top-0 left-0 right-0 z-10 h-1 overflow-hidden rounded-t-lg bg-primary-100 dark:bg-primary-900/30">
                    <div className="h-full w-1/2 rounded-full bg-primary-500 progress-bar-indeterminate" />
                  </div>
                )}

                {/* Product Grid/List */}
                <div className={`transition-opacity duration-200 ${transitioning ? 'opacity-40 pointer-events-none' : 'opacity-100'} ${viewMode === 'grid' 
                  ? "grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-4"
                  : "flex flex-col gap-2 sm:gap-4"
                }`}>
                  {products.map((product) => (
                    <ProductListCard key={product.id} product={product} viewMode={viewMode} />
                  ))}
                </div>

                {/* Pagination */}
                <Pagination 
                  currentPage={currentPage} 
                  totalPages={totalPages} 
                  totalItems={totalProducts}
                  itemsPerPage={ITEMS_PER_PAGE}
                />
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function ProductsClient() {
  return (
    <>
      <Header />
      <Suspense fallback={
        <div className="min-h-screen bg-gray-50 dark:bg-secondary-900 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
        </div>
      }>
        <ProductsContent />
      </Suspense>
    </>
  );
}
