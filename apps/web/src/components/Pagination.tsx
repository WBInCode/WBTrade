'use client';

import Link from 'next/link';
import { useSearchParams, usePathname } from 'next/navigation';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems?: number;
  itemsPerPage?: number;
  onPageChange?: (page: number) => void;
  baseUrl?: string;
  showInfo?: boolean;
}

export default function Pagination({ 
  currentPage, 
  totalPages, 
  totalItems,
  itemsPerPage = 12,
  onPageChange,
  baseUrl,
  showInfo = true
}: PaginationProps) {
  const searchParams = useSearchParams();
  const pathname = usePathname();

  // Build URL with page parameter (preserves other query params)
  const buildPageUrl = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (page === 1) {
      params.delete('page');
    } else {
      params.set('page', page.toString());
    }
    const queryString = params.toString();
    const base = baseUrl || pathname;
    return queryString ? `${base}?${queryString}` : base;
  };

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }
    
    return pages;
  };

  const pages = getPageNumbers();

  // Calculate displayed items range
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems || totalPages * itemsPerPage);

  const handlePageClick = (page: number) => {
    if (onPageChange) {
      onPageChange(page);
    }
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (totalPages <= 1) return null;

  return (
    <div className="mt-8 space-y-4">
      {/* Pagination info */}
      {showInfo && totalItems && (
        <p className="text-center text-sm text-gray-500">
          Wyświetlanie {startItem}-{endItem} z {totalItems.toLocaleString()} produktów
        </p>
      )}

      <div className="flex items-center justify-center gap-1">
        {/* First Page */}
        {currentPage > 2 && (
          <Link
            href={buildPageUrl(1)}
            onClick={() => handlePageClick(1)}
            className="p-2 rounded-lg text-secondary-500 hover:bg-gray-100 transition-colors hidden sm:flex"
            title="Pierwsza strona"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </Link>
        )}

        {/* Previous */}
        {currentPage > 1 ? (
          <Link
            href={buildPageUrl(currentPage - 1)}
            onClick={() => handlePageClick(currentPage - 1)}
            className="p-2 rounded-lg text-secondary-500 hover:bg-gray-100 transition-colors flex items-center gap-1"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="hidden sm:inline text-sm font-medium">Poprzednia</span>
          </Link>
        ) : (
          <span className="p-2 rounded-lg text-gray-300 cursor-not-allowed flex items-center gap-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="hidden sm:inline text-sm font-medium">Poprzednia</span>
          </span>
        )}

        {/* Page Numbers */}
        <div className="flex items-center gap-1 mx-2">
          {pages.map((page, index) => (
            typeof page === 'number' ? (
              currentPage === page ? (
                <span
                  key={index}
                  className="w-10 h-10 rounded-lg text-sm font-medium bg-primary-500 text-white flex items-center justify-center"
                >
                  {page}
                </span>
              ) : (
                <Link
                  key={index}
                  href={buildPageUrl(page)}
                  onClick={() => handlePageClick(page)}
                  className="w-10 h-10 rounded-lg text-sm font-medium text-secondary-700 hover:bg-gray-100 transition-colors flex items-center justify-center"
                >
                  {page}
                </Link>
              )
            ) : (
              <span key={index} className="px-2 text-gray-400 select-none">
                {page}
              </span>
            )
          ))}
        </div>

        {/* Next */}
        {currentPage < totalPages ? (
          <Link
            href={buildPageUrl(currentPage + 1)}
            onClick={() => handlePageClick(currentPage + 1)}
            className="p-2 rounded-lg text-secondary-500 hover:bg-gray-100 transition-colors flex items-center gap-1"
          >
            <span className="hidden sm:inline text-sm font-medium">Następna</span>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        ) : (
          <span className="p-2 rounded-lg text-gray-300 cursor-not-allowed flex items-center gap-1">
            <span className="hidden sm:inline text-sm font-medium">Następna</span>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </span>
        )}

        {/* Last Page */}
        {currentPage < totalPages - 1 && (
          <Link
            href={buildPageUrl(totalPages)}
            onClick={() => handlePageClick(totalPages)}
            className="p-2 rounded-lg text-secondary-500 hover:bg-gray-100 transition-colors hidden sm:flex"
            title="Ostatnia strona"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            </svg>
          </Link>
        )}
      </div>

      {/* Quick page jump (for many pages) */}
      {totalPages > 10 && (
        <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
          <span>Przejdź do strony:</span>
          <select
            value={currentPage}
            onChange={(e) => {
              const page = parseInt(e.target.value);
              handlePageClick(page);
              window.location.href = buildPageUrl(page);
            }}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <option key={page} value={page}>
                {page}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
