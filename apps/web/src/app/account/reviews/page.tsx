'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Header from '../../../components/Header';
import Footer from '../../../components/Footer';
import { useAuth } from '../../../contexts/AuthContext';
import { reviewsApi, UserReview } from '../../../lib/api';
import AccountSidebar from '../../../components/AccountSidebar';

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('pl-PL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

const PLACEHOLDER_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'%3E%3Crect fill='%23f3f4f6' width='400' height='400'/%3E%3Cpath fill='%23d1d5db' d='M160 150h80v100h-80z'/%3E%3Ccircle fill='%23d1d5db' cx='180' cy='130' r='20'/%3E%3Cpath fill='%23e5e7eb' d='M120 250l60-80 40 50 40-30 60 60v50H120z'/%3E%3C/svg%3E";

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<UserReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalReviews, setTotalReviews] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sort, setSort] = useState<'newest' | 'oldest' | 'highest' | 'lowest'>('newest');
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchReviews = async () => {
      setLoading(true);
      try {
        const response = await reviewsApi.getUserReviews({
          page: currentPage,
          limit: 10,
          sort,
        });
        setReviews(response.reviews);
        setTotalReviews(response.total);
        setTotalPages(response.totalPages);
      } catch (error) {
        console.error('Error fetching user reviews:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchReviews();
  }, [isAuthenticated, currentPage, sort]);

  const handleDeleteReview = async (reviewId: string) => {
    if (!confirm('Czy na pewno chcesz usunąć tę opinię?')) return;

    try {
      await reviewsApi.delete(reviewId);
      setReviews(prev => prev.filter(r => r.id !== reviewId));
      setTotalReviews(prev => prev - 1);
    } catch (error) {
      console.error('Error deleting review:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-secondary-900">
        <Header />
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-secondary-900">
      <Header />

      <main className="container-custom py-6 px-4">
        {/* Breadcrumb */}
        <nav className="hidden sm:flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-6">
          <Link href="/" className="hover:text-orange-500 transition-colors">Strona główna</Link>
          <span>/</span>
          <Link href="/account" className="hover:text-orange-500 transition-colors">Moje konto</Link>
          <span>/</span>
          <span className="text-gray-900 dark:text-white font-medium">Moje opinie</span>
        </nav>

        {/* Mobile back button */}
        <Link href="/account" className="sm:hidden flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-4 hover:text-orange-500 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Powrót do konta
        </Link>

        <div className="flex flex-col lg:flex-row gap-6">
          <AccountSidebar activeId="reviews" userName={user ? `${user.firstName} ${user.lastName}` : undefined} userEmail={user?.email} />

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Moje opinie</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {totalReviews} {totalReviews === 1 ? 'opinia' : 'opinii'}
                </p>
              </div>
              {totalReviews > 0 && (
                <select
                  value={sort}
                  onChange={(e) => { setSort(e.target.value as typeof sort); setCurrentPage(1); }}
                  className="px-3 py-2 text-sm border border-gray-300 dark:border-secondary-600 rounded-lg bg-white dark:bg-secondary-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="newest">Najnowsze</option>
                  <option value="oldest">Najstarsze</option>
                  <option value="highest">Najwyższa ocena</option>
                  <option value="lowest">Najniższa ocena</option>
                </select>
              )}
            </div>

            {/* Content */}
            {loading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="bg-white dark:bg-secondary-800 rounded-xl border border-gray-100 dark:border-secondary-700 p-4 animate-pulse">
                    <div className="flex gap-4">
                      <div className="w-16 h-16 bg-gray-200 dark:bg-secondary-700 rounded-lg"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-gray-200 dark:bg-secondary-700 rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-gray-200 dark:bg-secondary-700 rounded w-1/4 mb-3"></div>
                        <div className="h-3 bg-gray-200 dark:bg-secondary-700 rounded w-full"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : reviews.length === 0 ? (
              /* Empty State - x-kom style */
              <div className="bg-white dark:bg-secondary-800 rounded-xl border border-gray-100 dark:border-secondary-700 shadow-sm p-8 sm:p-12 text-center">
                <div className="max-w-sm mx-auto">
                  <div className="w-24 h-24 mx-auto mb-6 bg-gray-100 dark:bg-secondary-700 rounded-full flex items-center justify-center">
                    <svg className="w-12 h-12 text-gray-400 dark:text-secondary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                  </div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                    Oceń swój pierwszy produkt
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                    Kupuj produkty, wystawiaj opinię i pomóż innym wybrać!
                  </p>
                  <Link
                    href="/products"
                    className="inline-block bg-orange-500 text-white px-6 py-2.5 rounded-lg font-semibold text-sm hover:bg-orange-600 transition-colors"
                  >
                    Przejdź do zakupów
                  </Link>
                </div>
              </div>
            ) : (
              /* Reviews List */
              <div className="space-y-4">
                {reviews.map((review) => {
                  const productImage = review.product?.images?.[0]?.url || PLACEHOLDER_IMAGE;

                  return (
                    <div
                      key={review.id}
                      className="bg-white dark:bg-secondary-800 rounded-xl border border-gray-100 dark:border-secondary-700 shadow-sm overflow-hidden"
                    >
                      <div className="p-4 sm:p-5">
                        {/* Product info */}
                        <Link
                          href={`/products/${review.product?.id || review.productId}`}
                          className="flex items-start gap-3 sm:gap-4 mb-3 group"
                        >
                          <div className="w-14 h-14 sm:w-16 sm:h-16 flex-shrink-0 rounded-lg overflow-hidden bg-gray-50 dark:bg-secondary-700">
                            <img
                              src={productImage}
                              alt={review.product?.name || 'Produkt'}
                              className="w-full h-full object-contain"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2 group-hover:text-orange-500 transition-colors">
                              {review.product?.name || 'Produkt'}
                            </h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                              {formatDate(review.createdAt)}
                            </p>
                          </div>
                        </Link>

                        {/* Rating stars */}
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex items-center">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <svg
                                key={star}
                                className={`w-4 h-4 ${
                                  star <= review.rating
                                    ? 'text-orange-400'
                                    : 'text-gray-300 dark:text-secondary-600'
                                }`}
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                            ))}
                          </div>
                          {review.isVerifiedPurchase && (
                            <span className="text-[10px] sm:text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full font-medium">
                              Zweryfikowany zakup
                            </span>
                          )}
                        </div>

                        {/* Review title */}
                        {review.title && (
                          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                            {review.title}
                          </h4>
                        )}

                        {/* Review content */}
                        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                          {review.content}
                        </p>

                        {/* Review images */}
                        {review.images && review.images.length > 0 && (
                          <div className="flex gap-2 mt-3">
                            {review.images.map((img) => (
                              <div key={img.id} className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 dark:bg-secondary-700">
                                <img src={img.imageUrl} alt={img.altText || ''} className="w-full h-full object-cover" />
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Helpful count + actions */}
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-secondary-700">
                          <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                            {review.helpfulCount > 0 && (
                              <span>{review.helpfulCount} {review.helpfulCount === 1 ? 'osoba' : 'osób'} uznało za pomocne</span>
                            )}
                          </div>
                          <button
                            onClick={() => handleDeleteReview(review.id)}
                            className="text-xs text-red-500 hover:text-red-600 font-medium transition-colors"
                          >
                            Usuń
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex justify-center gap-2 mt-6">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-secondary-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-secondary-700 transition-colors"
                    >
                      Poprzednia
                    </button>
                    <span className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400">
                      {currentPage} z {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-secondary-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-secondary-700 transition-colors"
                    >
                      Następna
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
