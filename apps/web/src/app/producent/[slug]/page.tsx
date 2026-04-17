'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Header from '../../../components/Header';
import Footer from '../../../components/Footer';
import ProductListCard from '../../../components/ProductListCard';
import Breadcrumb from '../../../components/Breadcrumb';
import { Product, productsApi } from '../../../lib/api';

export default function ManufacturerPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [products, setProducts] = useState<Product[]>([]);
  const [brandName, setBrandName] = useState<string>('');
  const [totalProducts, setTotalProducts] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 48;

  const fetchData = useCallback(async (pageNum: number) => {
    setLoading(true);
    try {
      // Fetch brand info
      if (!brandName) {
        try {
          const brand = await productsApi.getBrandBySlug(slug);
          setBrandName(brand.name);
        } catch {
          // Brand not found
        }
      }

      // Fetch products for this brand
      const response = await productsApi.getAll({
        brand: brandName || slug,
        page: pageNum,
        limit,
        sort: 'popularity',
      });
      setProducts(response.products);
      setTotalProducts(response.total);
      setTotalPages(response.totalPages);
    } catch (error) {
      console.error('Failed to fetch manufacturer data:', error);
    } finally {
      setLoading(false);
    }
  }, [slug, brandName, limit]);

  // First: fetch brand info to get the actual brand name
  useEffect(() => {
    async function loadBrand() {
      try {
        const brand = await productsApi.getBrandBySlug(slug);
        setBrandName(brand.name);
      } catch {
        // Will try with slug directly
        setBrandName('');
      }
    }
    loadBrand();
  }, [slug]);

  // Then: fetch products when brand name is resolved
  useEffect(() => {
    if (brandName) {
      fetchProducts(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brandName]);

  async function fetchProducts(pageNum: number) {
    setLoading(true);
    try {
      const response = await productsApi.getAll({
        brand: brandName,
        page: pageNum,
        limit,
        sort: 'popularity',
      });
      setProducts(response.products);
      setTotalProducts(response.total);
      setTotalPages(response.totalPages);
      setPage(pageNum);
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setLoading(false);
    }
  }

  const breadcrumbItems = [
    { label: 'Strona główna', href: '/' },
    { label: 'Producenci', href: '/producent' },
    { label: brandName || slug },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-secondary-900">
      <Header />
      <main className="flex-grow">
        <div className="container-custom py-6">
          <Breadcrumb items={breadcrumbItems} />

          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-8 mb-8 text-white">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div>
                <h1 className="text-3xl font-bold">{brandName || slug}</h1>
                <p className="text-white/80 mt-1">
                  {totalProducts > 0
                    ? `${totalProducts} ${totalProducts === 1 ? 'produkt' : totalProducts < 5 ? 'produkty' : 'produktów'}`
                    : 'Produkty producenta'}
                </p>
              </div>
            </div>
          </div>

          {/* Products Grid */}
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {[...Array(20)].map((_, i) => (
                <div key={i} className="bg-white dark:bg-secondary-800 rounded-xl sm:rounded-2xl h-[320px] animate-pulse overflow-hidden" />
              ))}
            </div>
          ) : products.length > 0 ? (
            <>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Znaleziono {totalProducts} produktów
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {products.map((product) => (
                  <ProductListCard key={product.id} product={product} />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-8">
                  <button
                    onClick={() => fetchProducts(page - 1)}
                    disabled={page <= 1}
                    className="px-4 py-2 rounded-lg bg-white dark:bg-secondary-800 text-gray-700 dark:text-secondary-200 border border-gray-200 dark:border-secondary-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-secondary-700 transition-colors"
                  >
                    Poprzednia
                  </button>
                  <span className="text-gray-600 dark:text-secondary-400 px-4">
                    Strona {page} z {totalPages}
                  </span>
                  <button
                    onClick={() => fetchProducts(page + 1)}
                    disabled={page >= totalPages}
                    className="px-4 py-2 rounded-lg bg-white dark:bg-secondary-800 text-gray-700 dark:text-secondary-200 border border-gray-200 dark:border-secondary-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-secondary-700 transition-colors"
                  >
                    Następna
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-16">
              <p className="text-gray-500 text-lg">Brak produktów tego producenta</p>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
