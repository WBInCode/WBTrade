'use client';

import Link from 'next/link';
import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, usePathname } from 'next/navigation';
import SearchBar from './SearchBar';
import MegaMenu from './MegaMenu';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { useWishlist } from '../contexts/WishlistContext';
import { categoriesApi, CategoryWithChildren } from '../lib/api';
import { cleanCategoryName } from '../lib/categories';
import Image from 'next/image';

function HeaderContent() {
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [categories, setCategories] = useState<CategoryWithChildren[]>([]);
  const [categoryPath, setCategoryPath] = useState<{ id: string; name: string; slug: string }[]>([]);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const { itemCount } = useCart();
  const { user, isAuthenticated, logout } = useAuth();
  const { itemCount: wishlistCount } = useWishlist();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const categoryDropdownRef = useRef<HTMLDivElement>(null);
  const categoryNavRef = useRef<HTMLElement>(null);
  const megaMenuRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  
  // Get current category from URL
  const currentCategorySlug = searchParams.get('category');
  const isOnProductsPage = pathname === '/products';
  
  // Fetch main categories
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

  // Fetch category path when slug changes
  useEffect(() => {
    async function fetchPath() {
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
    fetchPath();
  }, [currentCategorySlug]);

  // Get current main category from path
  const currentMainCategory = categoryPath.length > 0 ? categoryPath[0] : null;

  // Check scroll position for category nav arrows
  const checkScrollPosition = () => {
    const nav = categoryNavRef.current;
    if (nav) {
      setShowLeftArrow(nav.scrollLeft > 0);
      setShowRightArrow(nav.scrollLeft < nav.scrollWidth - nav.clientWidth - 10);
    }
  };

  // Scroll category nav
  const scrollCategories = (direction: 'left' | 'right') => {
    const nav = categoryNavRef.current;
    if (nav) {
      const scrollAmount = 200;
      nav.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
    }
  };

  // Initialize scroll check
  useEffect(() => {
    checkScrollPosition();
    window.addEventListener('resize', checkScrollPosition);
    return () => window.removeEventListener('resize', checkScrollPosition);
  }, [categories]);

  // Handle header visibility on scroll
  useEffect(() => {
    let lastScrollY = window.scrollY;
    let isVisible = true;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Show header when scrolling up (any amount) or at top
      if (currentScrollY < lastScrollY || currentScrollY < 50) {
        if (!isVisible) {
          isVisible = true;
          setIsHeaderVisible(true);
        }
      } 
      // Hide header when scrolling down after passing threshold
      else if (currentScrollY > lastScrollY && currentScrollY > 100) {
        if (isVisible) {
          isVisible = false;
          setIsHeaderVisible(false);
          // Close mega menu when hiding header
          setIsCategoryOpen(false);
        }
      }
      
      lastScrollY = currentScrollY;
    };

    // Use 'scroll' event on document for broader compatibility
    document.addEventListener('scroll', handleScroll, { passive: true });
    return () => document.removeEventListener('scroll', handleScroll);
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      // Don't close category menu if clicking inside dropdown button OR inside mega menu
      const clickedInsideDropdown = categoryDropdownRef.current?.contains(event.target as Node);
      const clickedInsideMegaMenu = megaMenuRef.current?.contains(event.target as Node);
      
      if (!clickedInsideDropdown && !clickedInsideMegaMenu) {
        setIsCategoryOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close dropdowns on route change
  useEffect(() => {
    setIsCategoryOpen(false);
    setIsUserMenuOpen(false);
  }, [pathname, searchParams]);

  return (
    <header className={`bg-white dark:bg-secondary-900 sticky top-0 z-50 shadow-sm dark:shadow-secondary-950/50 relative transition-transform duration-300 ${isHeaderVisible ? 'translate-y-0' : '-translate-y-full'}`}>
      {/* Top Header */}
      <div className="border-b border-gray-100 dark:border-secondary-700">
        <div className="container-custom">
          <div className="flex items-center justify-between h-16 sm:h-20 gap-2 sm:gap-4">
            {/* Logo */}
            <Link href="/" className="flex items-center shrink-0">
              <Image 
                src="/images/WB-TRADE-logo.png" 
                alt="WB Trade" 
                width={200} 
                height={120} 
                className="h-12 sm:h-14 lg:h-16 w-auto object-contain"
                priority
              />
            </Link>

            {/* Category Dropdown - Mega Menu */}
            <div className="hidden lg:block relative" ref={categoryDropdownRef}>
              <button
                onClick={() => setIsCategoryOpen(!isCategoryOpen)}
                className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg border-2 transition-all shadow-sm hover:shadow ${
                  isCategoryOpen
                    ? 'text-white bg-primary-500 border-primary-500'
                    : isOnProductsPage && currentMainCategory
                    ? 'text-primary-600 dark:text-primary-400 border-primary-400 bg-primary-50 dark:bg-primary-900/30 hover:bg-primary-100 dark:hover:bg-primary-900/50'
                    : 'text-secondary-800 dark:text-secondary-200 border-gray-300 dark:border-secondary-600 bg-white dark:bg-secondary-800 hover:bg-gray-50 dark:hover:bg-secondary-700 hover:border-gray-400 dark:hover:border-secondary-500'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                {isOnProductsPage && currentMainCategory ? cleanCategoryName(currentMainCategory.name) : 'Kategorie'}
                <svg className={`w-4 h-4 transition-transform ${isCategoryOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>

            {/* Search */}
            <div className="hidden md:block flex-1 max-w-xl">
              <SearchBar />
            </div>

            {/* Right Icons */}
            <div className="flex items-center gap-1 sm:gap-2 md:gap-6">
              {/* Favorites */}
              <Link href="/wishlist" className="flex flex-col items-center p-1.5 sm:p-2 text-secondary-700 dark:text-secondary-300 hover:text-primary-500 transition-colors relative group">
                <div className="relative">
                  <svg className="w-6 h-6 sm:w-7 sm:h-7 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  {wishlistCount > 0 && (
                    <span className={`absolute -top-1 -right-1 bg-red-500 text-white text-xs h-4 sm:h-5 rounded-full flex items-center justify-center font-bold shadow-sm ${wishlistCount > 99 ? 'w-6 sm:w-7 px-1' : 'w-4 sm:w-5'}`}>
                      {wishlistCount > 99 ? '99+' : wishlistCount}
                    </span>
                  )}
                </div>
                <span className="text-xs font-medium mt-1 hidden sm:block">Ulubione</span>
              </Link>

              {/* Account */}
              <div className="relative" ref={userMenuRef}>
                {isAuthenticated ? (
                  <>
                    <button
                      onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                      className="flex flex-col items-center p-1.5 sm:p-2 text-secondary-700 dark:text-secondary-300 hover:text-primary-500 transition-colors group"
                    >
                      <div className="w-6 h-6 sm:w-7 sm:h-7 bg-primary-500 rounded-full flex items-center justify-center text-white text-xs sm:text-sm font-bold group-hover:scale-110 transition-transform shadow-sm">
                        {user?.firstName?.[0]}{user?.lastName?.[0]}
                      </div>
                      <span className="text-xs font-medium mt-1 hidden sm:block">{user?.firstName}</span>
                    </button>
                    {isUserMenuOpen && (
                      <div className="absolute top-full right-0 mt-1 w-56 bg-white dark:bg-secondary-800 border border-gray-200 dark:border-secondary-600 rounded-lg shadow-lg py-2 z-50">
                        <div className="px-4 py-2 border-b border-gray-100 dark:border-secondary-700">
                          <p className="text-sm font-medium text-gray-900 dark:text-secondary-100 truncate">{user?.firstName} {user?.lastName}</p>
                          <p className="text-xs text-gray-500 dark:text-secondary-400 truncate" title={user?.email}>{user?.email}</p>
                        </div>
                        <Link
                          href="/account"
                          className="block px-4 py-2 text-sm text-secondary-700 dark:text-secondary-300 hover:bg-gray-50 dark:hover:bg-secondary-700"
                          onClick={() => setIsUserMenuOpen(false)}
                        >
                          Moje konto
                        </Link>
                        <Link
                          href="/account/orders"
                          className="block px-4 py-2 text-sm text-secondary-700 dark:text-secondary-300 hover:bg-gray-50 dark:hover:bg-secondary-700"
                          onClick={() => setIsUserMenuOpen(false)}
                        >
                          Zamówienia
                        </Link>
                        <button
                          onClick={() => { logout(); setIsUserMenuOpen(false); }}
                          className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-50 dark:hover:bg-secondary-700"
                        >
                          Wyloguj się
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <Link href="/login" className="flex flex-col items-center p-1.5 sm:p-2 text-secondary-700 dark:text-secondary-300 hover:text-primary-500 transition-colors group">
                    <svg className="w-6 h-6 sm:w-7 sm:h-7 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span className="text-xs font-medium mt-1 hidden sm:block">Zaloguj</span>
                  </Link>
                )}
              </div>

              {/* Cart */}
              <Link href="/cart" className="flex flex-col items-center p-1.5 sm:p-2 text-secondary-700 dark:text-secondary-300 hover:text-primary-500 transition-colors relative group">
                <div className="relative">
                  <svg className="w-6 h-6 sm:w-7 sm:h-7 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  {itemCount > 0 && (
                    <span className={`absolute -top-2 -right-2 bg-primary-500 text-white text-xs h-4 sm:h-5 rounded-full flex items-center justify-center font-bold shadow-sm ${itemCount > 99 ? 'w-6 sm:w-7 px-1' : 'w-4 sm:w-5'}`}>
                      {itemCount > 99 ? '99+' : itemCount}
                    </span>
                  )}
                </div>
                <span className="text-xs font-medium mt-1 hidden sm:block">Koszyk</span>
              </Link>
            </div>
          </div>

          {/* Mobile Search */}
          <div className="md:hidden pb-3">
            <SearchBar />
          </div>
        </div>
      </div>

      {/* Category Navigation Bar */}
      <div className="border-b border-gray-200 dark:border-secondary-700 bg-primary-500 dark:bg-primary-600">
        <div className="container-custom overflow-visible">
          <div className="flex items-center justify-between relative">
            {/* Left Arrow */}
            {showLeftArrow && (
              <button
                onClick={() => scrollCategories('left')}
                className="absolute left-0 z-10 h-full px-2 bg-gradient-to-r from-primary-500 via-primary-500 to-transparent flex items-center"
                aria-label="Przewiń w lewo"
              >
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            
            <nav 
              ref={categoryNavRef}
              onScroll={checkScrollPosition}
              className="flex items-center gap-1 overflow-x-auto scrollbar-hide py-2 px-1"
            >
              <button
                onClick={() => setIsCategoryOpen(!isCategoryOpen)}
                className="lg:hidden flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-600 rounded-lg whitespace-nowrap transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                Kategorie
              </button>
              {/* All Products button */}
              <Link
                href="/products"
                className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
                  isOnProductsPage && !currentCategorySlug
                    ? 'text-primary-500 bg-white'
                    : 'text-white hover:bg-primary-600'
                }`}
              >
                Wszystkie produkty
              </Link>
              {categories.map((category) => {
                const isActive = isOnProductsPage && currentMainCategory?.slug === category.slug;
                return (
                  <Link
                    key={category.slug}
                    href={`/products?category=${category.slug}`}
                    className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
                      isActive
                        ? 'text-primary-500 bg-white'
                        : 'text-white hover:bg-primary-600'
                    }`}
                  >
                    {cleanCategoryName(category.name)}
                  </Link>
                );
              })}
            </nav>
            
            {/* Right Arrow */}
            {showRightArrow && (
              <button
                onClick={() => scrollCategories('right')}
                className="absolute right-0 z-10 h-full pl-4 pr-1 bg-gradient-to-l from-primary-500 from-60% to-transparent flex items-center"
                aria-label="Przewiń w prawo"
              >
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mega Menu - works for both mobile and desktop */}
      <div ref={megaMenuRef}>
        <MegaMenu
          categories={categories}
          isOpen={isCategoryOpen}
          onClose={() => setIsCategoryOpen(false)}
        />
      </div>
    </header>
  );
}

export default function Header() {
  return (
    <Suspense fallback={
      <header className="bg-white dark:bg-secondary-900 shadow-sm border-b border-gray-100 dark:border-secondary-700 sticky top-0 z-50">
        <div className="container-custom h-16 flex items-center justify-center">
          <div className="animate-pulse bg-gray-200 dark:bg-secondary-700 h-8 w-32 rounded"></div>
        </div>
      </header>
    }>
      <HeaderContent />
    </Suspense>
  );
}