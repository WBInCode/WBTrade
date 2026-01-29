'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import ProductListCard from '../../components/ProductListCard';
import Pagination from '../../components/Pagination';
import Breadcrumb from '../../components/Breadcrumb';
import { Product, productsApi, categoriesApi, CategoryWithChildren } from '../../lib/api';
import { cleanCategoryName } from '../../lib/categories';

const ITEMS_PER_PAGE = 12;

// Helper to calculate discount percentage
function getDiscountPercent(product: Product): number {
  if (!product.compareAtPrice) return 0;
  const originalPrice = Number(product.compareAtPrice);
  const currentPrice = Number(product.price);
  return Math.round(((originalPrice - currentPrice) / originalPrice) * 100);
}

// Category item with discount count
interface CategoryWithDiscountCount {
  id: string;
  name: string;
  slug: string;
  discountedCount: number;
}

function DealsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  const currentCategorySlug = searchParams.get('category') || '';
  const minPrice = searchParams.get('minPrice');
  const maxPrice = searchParams.get('maxPrice');
  const sort = searchParams.get('sort') || 'discount';

  // State
  const [allDiscountedProducts, setAllDiscountedProducts] = useState<Product[]>([]);
  const [displayProducts, setDisplayProducts] = useState<Product[]>([]);
  const [totalProducts, setTotalProducts] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<CategoryWithChildren[]>([]);
  const [categoriesWithCounts, setCategoriesWithCounts] = useState<CategoryWithDiscountCount[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [priceMin, setPriceMin] = useState(minPrice || '');
  const [priceMax, setPriceMax] = useState(maxPrice || '');

  // Fetch categories
  useEffect(() => {
    async function fetchCategories() {
      try {
        const response = await categoriesApi.getMain();
        setCategories(response.categories);
      } catch (error) {
        console.error('Failed to fetch categories:', error);
      }
    }
    fetchCategories();
  }, []);

  // Fetch ALL discounted products to calculate category counts
  useEffect(() => {
    async function fetchAllDiscountedProducts() {
      setLoading(true);
      try {
        // Fetch all products to filter discounted ones
        const response = await productsApi.getAll({
          page: 1,
          limit: 500,
        });

        // Filter only discounted products
        const discounted = response.products.filter(
          (p) => p.compareAtPrice && Number(p.compareAtPrice) > Number(p.price)
        );

        setAllDiscountedProducts(discounted);

        // Calculate category counts for discounted products
        const categoryCountMap = new Map<string, { name: string; slug: string; count: number }>();
        
        discounted.forEach((product) => {
          if (product.category) {
            const existing = categoryCountMap.get(product.category.id);
            if (existing) {
              existing.count++;
            } else {
              categoryCountMap.set(product.category.id, {
                name: cleanCategoryName(product.category.name),
                slug: product.category.slug,
                count: 1,
              });
            }
          }
        });

        const catCounts: CategoryWithDiscountCount[] = Array.from(categoryCountMap.entries()).map(
          ([id, data]) => ({
            id,
            name: data.name,
            slug: data.slug,
            discountedCount: data.count,
          })
        );

        // Sort by count descending
        catCounts.sort((a, b) => b.discountedCount - a.discountedCount);
        setCategoriesWithCounts(catCounts);

      } catch (error) {
        console.error('Failed to fetch discounted products:', error);
        setAllDiscountedProducts([]);
      }
    }
    fetchAllDiscountedProducts();
  }, []);

  // Filter and paginate discounted products
  useEffect(() => {
    if (allDiscountedProducts.length === 0 && loading) return;

    let filtered = [...allDiscountedProducts];

    // Filter by category
    if (currentCategorySlug) {
      filtered = filtered.filter((p) => p.category?.slug === currentCategorySlug);
    }

    // Filter by price
    if (minPrice) {
      filtered = filtered.filter((p) => Number(p.price) >= parseFloat(minPrice));
    }
    if (maxPrice) {
      filtered = filtered.filter((p) => Number(p.price) <= parseFloat(maxPrice));
    }

    // Sort
    if (sort === 'discount') {
      filtered.sort((a, b) => getDiscountPercent(b) - getDiscountPercent(a));
    } else if (sort === 'price_asc') {
      filtered.sort((a, b) => Number(a.price) - Number(b.price));
    } else if (sort === 'price_desc') {
      filtered.sort((a, b) => Number(b.price) - Number(a.price));
    } else if (sort === 'popularity') {
      // Sortowanie po popularności - używamy domyślnej kolejności z API (popularityScore)
      // Produkty są już posortowane po popularności z backendu
    }

    // Paginate
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginated = filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    setDisplayProducts(paginated);
    setTotalProducts(filtered.length);
    setTotalPages(Math.ceil(filtered.length / ITEMS_PER_PAGE));
    setLoading(false);
  }, [allDiscountedProducts, currentPage, currentCategorySlug, minPrice, maxPrice, sort, loading]);

  // Handle category filter
  const handleCategoryClick = (slug: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (slug) {
      params.set('category', slug);
    } else {
      params.delete('category');
    }
    params.set('page', '1');
    router.push(`/deals?${params.toString()}`);
  };

  // Handle price filter
  const handlePriceFilter = () => {
    const params = new URLSearchParams(searchParams.toString());
    if (priceMin) {
      params.set('minPrice', priceMin);
    } else {
      params.delete('minPrice');
    }
    if (priceMax) {
      params.set('maxPrice', priceMax);
    } else {
      params.delete('maxPrice');
    }
    params.set('page', '1');
    router.push(`/deals?${params.toString()}`);
  };

  // Handle sort change
  const handleSortChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('sort', value);
    params.set('page', '1');
    router.push(`/deals?${params.toString()}`);
  };

  // Breadcrumb items
  const breadcrumbItems = useMemo(() => {
    const items: { label: string; href?: string }[] = [
      { label: 'Strona główna', href: '/' },
      { label: 'Promocje' },
    ];
    
    if (currentCategorySlug) {
      const cat = categoriesWithCounts.find((c) => c.slug === currentCategorySlug);
      if (cat) {
        items[1] = { label: 'Promocje', href: '/deals' };
        items.push({ label: cleanCategoryName(cat.name) });
      }
    }
    
    return items;
  }, [currentCategorySlug, categoriesWithCounts]);

  // Current category name
  const currentCategoryName = currentCategorySlug
    ? cleanCategoryName(categoriesWithCounts.find((c) => c.slug === currentCategorySlug)?.name || '')
    : null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-secondary-900">
      <Header />

      <main className="container-custom py-6">
        {/* Breadcrumb */}
        <Breadcrumb items={breadcrumbItems} />

        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 2a2 2 0 00-2 2v14l3.5-2 3.5 2 3.5-2 3.5 2V4a2 2 0 00-2-2H5zm2.5 3a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm6.207.293a1 1 0 00-1.414 0l-6 6a1 1 0 101.414 1.414l6-6a1 1 0 000-1.414zM12.5 10a1.5 1.5 0 100 3 1.5 1.5 0 000-3z" clipRule="evenodd" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {currentCategoryName ? `Promocje: ${currentCategoryName}` : 'Wszystkie Promocje'}
            </h1>
          </div>
          <p className="text-gray-500 dark:text-gray-400">
            {totalProducts} {totalProducts === 1 ? 'produkt przeceniony' : totalProducts < 5 ? 'produkty przecenione' : 'produktów przecenionych'}
          </p>
        </div>

        <div className="flex gap-6">
          {/* Sidebar Filters */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <div className="bg-white dark:bg-secondary-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 sticky top-24 space-y-6">
              
              {/* Categories Filter - Only shows categories with discounted products */}
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                  </svg>
                  Kategorie w promocji
                </h3>
                <div className="space-y-2">
                  <button
                    onClick={() => handleCategoryClick('')}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      !currentCategorySlug
                        ? 'bg-primary-50 dark:bg-primary-900 text-primary-700 dark:text-primary-300 font-medium'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-secondary-700'
                    }`}
                  >
                    Wszystkie promocje
                    <span className="float-right text-gray-400">({allDiscountedProducts.length})</span>
                  </button>
                  {categoriesWithCounts.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => handleCategoryClick(cat.slug)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                        currentCategorySlug === cat.slug
                          ? 'bg-primary-50 dark:bg-primary-900 text-primary-700 dark:text-primary-300 font-medium'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-secondary-700'
                      }`}
                    >
                      {cleanCategoryName(cat.name)}
                      <span className="float-right text-gray-400">({cat.discountedCount})</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Price Filter */}
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Cena
                </h3>
                <div className="flex items-center gap-2 mb-3">
                  <input
                    type="number"
                    placeholder="Od"
                    value={priceMin}
                    onChange={(e) => setPriceMin(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 dark:bg-secondary-700 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                  <span className="text-gray-400">-</span>
                  <input
                    type="number"
                    placeholder="Do"
                    value={priceMax}
                    onChange={(e) => setPriceMax(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 dark:bg-secondary-700 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <button
                  onClick={handlePriceFilter}
                  className="w-full bg-primary-500 hover:bg-primary-600 text-white font-medium py-2 rounded-lg text-sm transition-colors"
                >
                  Zastosuj
                </button>
              </div>

              {/* Discount Info */}
              <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 2a2 2 0 00-2 2v14l3.5-2 3.5 2 3.5-2 3.5 2V4a2 2 0 00-2-2H5zm2.5 3a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm6.207.293a1 1 0 00-1.414 0l-6 6a1 1 0 101.414 1.414l6-6a1 1 0 000-1.414zM12.5 10a1.5 1.5 0 100 3 1.5 1.5 0 000-3z" clipRule="evenodd" />
                  </svg>
                  <span className="font-semibold text-red-700 dark:text-red-400">Tylko promocje!</span>
                </div>
                <p className="text-sm text-red-600 dark:text-red-400">
                  Ta strona pokazuje wyłącznie produkty z obniżoną ceną.
                </p>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <div className="flex-1">
            {/* Toolbar */}
            <div className="bg-white dark:bg-secondary-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-500 dark:text-gray-400">Sortuj:</span>
                <select
                  value={sort}
                  onChange={(e) => handleSortChange(e.target.value)}
                  className="border border-gray-200 dark:border-gray-700 dark:bg-secondary-700 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="discount">Największa zniżka</option>
                  <option value="popularity">Popularność</option>
                  <option value="price_asc">Cena: od najniższej</option>
                  <option value="price_desc">Cena: od najwyższej</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg ${viewMode === 'grid' ? 'bg-gray-100 dark:bg-secondary-700 text-gray-900 dark:text-white' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-gray-100 dark:bg-secondary-700 text-gray-900 dark:text-white' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Loading State */}
            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="bg-white dark:bg-secondary-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 animate-pulse">
                    <div className="bg-gray-200 dark:bg-secondary-700 h-48 rounded-lg mb-4"></div>
                    <div className="bg-gray-200 dark:bg-secondary-700 h-4 rounded w-3/4 mb-2"></div>
                    <div className="bg-gray-200 dark:bg-secondary-700 h-4 rounded w-1/2 mb-2"></div>
                    <div className="bg-gray-200 dark:bg-secondary-700 h-6 rounded w-1/3"></div>
                  </div>
                ))}
              </div>
            ) : displayProducts.length === 0 ? (
              <div className="bg-white dark:bg-secondary-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
                <svg className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Brak promocji w tej kategorii</h3>
                <p className="text-gray-500 dark:text-gray-400 mb-4">Nie znaleziono produktów przecenionych spełniających kryteria.</p>
                <button
                  onClick={() => handleCategoryClick('')}
                  className="text-primary-500 hover:text-primary-600 font-medium"
                >
                  Zobacz wszystkie promocje →
                </button>
              </div>
            ) : (
              <>
                {/* Product Grid/List */}
                <div className={viewMode === 'grid' 
                  ? "grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4"
                  : "flex flex-col gap-4"
                }>
                  {displayProducts.map((product) => (
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

        {/* CTA Section - Browse All Products */}
        <div className="mt-16 bg-gradient-to-r from-primary-500 to-primary-600 rounded-2xl p-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-3">
            Zapoznaj się z naszą całą ofertą
          </h2>
          <p className="text-primary-100 mb-6 max-w-xl mx-auto">
            Odkryj tysiące produktów w różnych kategoriach. Znajdź dokładnie to, czego szukasz!
          </p>
          <Link
            href="/products"
            className="inline-flex items-center gap-2 bg-white text-primary-600 font-semibold px-8 py-3 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Przeglądaj wszystkie produkty
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function DealsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 dark:bg-secondary-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    }>
      <DealsContent />
    </Suspense>
  );
}
