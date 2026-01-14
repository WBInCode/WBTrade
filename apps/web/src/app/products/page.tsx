'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import ProductListCard from '../../components/ProductListCard';
import ProductListHeader from '../../components/ProductListHeader';
import Pagination from '../../components/Pagination';
import Breadcrumb from '../../components/Breadcrumb';
import { CategoryFilter, PriceFilter, BrandFilter, SpecificationFilter } from '../../components/filters';
import { Product, productsApi, ProductFiltersResponse, categoriesApi } from '../../lib/api';
import { cleanCategoryName } from '../../lib/categories';

const ITEMS_PER_PAGE = 48;

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
  const sort = searchParams.get('sort') || 'newest';

  // State for products and filters
  const [products, setProducts] = useState<Product[]>([]);
  const [totalProducts, setTotalProducts] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<ProductFiltersResponse | null>(null);
  const [categoryPath, setCategoryPath] = useState<{ id: string; name: string; slug: string }[]>([]);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

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
      setLoading(true);
      try {
        // For discounted tab, we need to fetch more and filter client-side
        if (activeTab === 'discounted') {
          const response = await productsApi.getAll({
            page: 1,
            limit: 100,
            category: currentCategorySlug || undefined,
            minPrice: minPrice ? parseFloat(minPrice) : undefined,
            maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
            search: searchQuery || undefined,
            sort: sort as 'price_asc' | 'price_desc' | 'name_asc' | 'name_desc' | 'newest',
            brand: brand || undefined,
          });
          
          // Filter only discounted products
          const discountedProducts = response.products.filter(
            (p) => p.compareAtPrice && Number(p.compareAtPrice) > Number(p.price)
          );
          
          // Apply pagination client-side
          const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
          const paginatedProducts = discountedProducts.slice(startIndex, startIndex + ITEMS_PER_PAGE);
          
          setProducts(paginatedProducts);
          setTotalProducts(discountedProducts.length);
          setTotalPages(Math.ceil(discountedProducts.length / ITEMS_PER_PAGE));
        } else {
          // Use the sort value from URL params directly (already in API format)
          const sortValue = sort as 'price_asc' | 'price_desc' | 'name_asc' | 'name_desc' | 'newest';
          
          const response = await productsApi.getAll({
            page: currentPage,
            limit: ITEMS_PER_PAGE,
            category: currentCategorySlug || undefined,
            minPrice: minPrice ? parseFloat(minPrice) : undefined,
            maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
            search: searchQuery || undefined,
            sort: sortValue,
            brand: brand || undefined,
          });
          setProducts(response.products);
          setTotalProducts(response.total);
          setTotalPages(response.totalPages);
        }
      } catch (error) {
        console.error('Failed to fetch products:', error);
        setProducts([]);
        setTotalProducts(0);
        setTotalPages(1);
      } finally {
        setLoading(false);
      }
    }
    fetchProducts();
  }, [currentPage, currentCategorySlug, minPrice, maxPrice, searchQuery, sort, brand, activeTab]);

  // Handle tab change
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };

  // Handle sort change
  const handleSortChange = (value: string) => {
    // Map UI sort values to API sort values
    const sortMapping: Record<string, string> = {
      'relevance': 'newest',
      'price-asc': 'price_asc',
      'price-desc': 'price_desc',
      'newest': 'newest',
      'rating': 'newest', // API doesn't support rating sort, fallback to newest
    };
    const apiSort = sortMapping[value] || 'newest';
    
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
    'price_asc': 'price-asc',
    'price_desc': 'price-desc',
    'name_asc': 'relevance',
    'name_desc': 'relevance',
  };
  const uiSort = apiToUiSortMapping[sort] || 'newest';

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
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="container-custom py-6">
        {/* Breadcrumb */}
        <Breadcrumb items={breadcrumbItems} />
        
        {/* Page Title */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-secondary-900">
            {searchQuery ? (
              <>
                Wyniki dla "{searchQuery}"{' '}
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
            <div className="bg-white rounded-lg border border-gray-200 p-4 sticky top-24">
              <CategoryFilter />
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
          <div className="flex-1">
            {/* Header with Tabs, Sort, View Toggle */}
            <ProductListHeader 
              totalProducts={totalProducts} 
              activeTab={activeTab}
              onTabChange={handleTabChange}
              onSortChange={handleSortChange}
              onViewChange={handleViewChange}
              currentSort={uiSort}
              currentView={viewMode}
            />

            {/* Loading State */}
            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse">
                    <div className="bg-gray-200 h-48 rounded-lg mb-4"></div>
                    <div className="bg-gray-200 h-4 rounded w-3/4 mb-2"></div>
                    <div className="bg-gray-200 h-4 rounded w-1/2 mb-2"></div>
                    <div className="bg-gray-200 h-6 rounded w-1/3"></div>
                  </div>
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Brak wyników</h3>
                <p className="text-gray-500 mb-4">Nie znaleziono produktów pasujących do Twojego wyszukiwania.</p>
                <a href="/products" className="text-primary-500 hover:text-primary-600 font-medium">
                  Zobacz wszystkie produkty →
                </a>
              </div>
            ) : (
              <>
                {/* Product Grid/List */}
                <div className={viewMode === 'grid' 
                  ? "grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4"
                  : "flex flex-col gap-4"
                }>
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
              </>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    }>
      <ProductsContent />
    </Suspense>
  );
}
