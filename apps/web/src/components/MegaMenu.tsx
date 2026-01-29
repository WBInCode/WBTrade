'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { CategoryWithChildren } from '../lib/api';
import { cleanCategoryName } from '../lib/categories';

interface MegaMenuProps {
  categories: CategoryWithChildren[];
  isOpen: boolean;
  onClose: () => void;
}

export default function MegaMenu({ categories, isOpen, onClose }: MegaMenuProps) {
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  const [mobileExpanded, setMobileExpanded] = useState<string | null>(null);
  const [mobileSubView, setMobileSubView] = useState<CategoryWithChildren | null>(null);
  const [mobileNavHistory, setMobileNavHistory] = useState<CategoryWithChildren[]>([]);
  const [mounted, setMounted] = useState(false);

  // For portal - need to wait for client mount
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen) return null;

  const activeCategory = categories.find(c => c.slug === hoveredCategory);

  // Handle back from subcategory view on mobile
  const handleMobileBack = () => {
    if (mobileNavHistory.length > 0) {
      // Go back to previous level
      const newHistory = [...mobileNavHistory];
      const previousCategory = newHistory.pop();
      setMobileNavHistory(newHistory);
      setMobileSubView(previousCategory || null);
    } else {
      // Go back to main menu
      setMobileSubView(null);
    }
  };

  // Handle category click on mobile - show subcategories or navigate
  const handleMobileCategoryClick = (category: CategoryWithChildren) => {
    if (category.children && category.children.length > 0) {
      if (mobileSubView) {
        // Save current view to history before navigating deeper
        setMobileNavHistory([...mobileNavHistory, mobileSubView]);
      }
      setMobileSubView(category);
    }
  };

  // Mobile menu content - stopPropagation prevents Header's handleClickOutside from closing it
  const mobileMenu = (
    <div 
      className="lg:hidden fixed inset-0 z-[9999] bg-white dark:bg-secondary-900 flex flex-col"
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex-shrink-0 bg-white dark:bg-secondary-900 border-b dark:border-secondary-700 px-4 py-4 flex items-center justify-between">
        {mobileSubView ? (
          <>
            <button 
              onClick={handleMobileBack}
              className="flex items-center gap-2 text-gray-700 dark:text-secondary-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="font-semibold text-lg">{cleanCategoryName(mobileSubView.name)}</span>
            </button>
          </>
        ) : (
          <span className="font-bold text-lg dark:text-secondary-100">Menu</span>
        )}
        <button 
          onClick={onClose} 
          className="p-2 -mr-2 hover:bg-gray-100 dark:hover:bg-secondary-800 rounded-full dark:text-secondary-200"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Content - scrollable */}
      <div className="flex-1 overflow-y-auto">
        {mobileSubView ? (
          /* Subcategory View */
          <nav className="py-2">
            {/* View all in category */}
            <Link
              href={`/products?category=${mobileSubView.slug}`}
              onClick={onClose}
              className="flex items-center justify-between px-4 py-4 border-b border-gray-100 dark:border-secondary-700 text-primary-600 dark:text-primary-400 font-medium"
            >
              <span>Zobacz wszystko w {cleanCategoryName(mobileSubView.name)}</span>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
            
            {mobileSubView.children?.map((sub) => {
              const hasSubChildren = sub.children && sub.children.length > 0;
              
              return hasSubChildren ? (
                <button
                  key={sub.slug}
                  onClick={() => handleMobileCategoryClick(sub)}
                  className="w-full flex items-center justify-between px-4 py-4 border-b border-gray-100 dark:border-secondary-700 text-gray-900 dark:text-secondary-100 hover:bg-gray-50 dark:hover:bg-secondary-800"
                >
                  <span>{cleanCategoryName(sub.name)}</span>
                  <div className="flex items-center gap-2 text-gray-400 dark:text-secondary-500">
                    <span className="text-sm">({sub.productCount || 0})</span>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              ) : (
                <Link
                  key={sub.slug}
                  href={`/products?category=${sub.slug}`}
                  onClick={onClose}
                  className="flex items-center justify-between px-4 py-4 border-b border-gray-100 dark:border-secondary-700 text-gray-900 dark:text-secondary-100 hover:bg-gray-50 dark:hover:bg-secondary-800"
                >
                  <span>{cleanCategoryName(sub.name)}</span>
                  <div className="flex items-center gap-2 text-gray-400 dark:text-secondary-500">
                    <span className="text-sm">({sub.productCount || 0})</span>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              );
            })}
          </nav>
        ) : (
          /* Main Categories View */
          <>
            <div className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-secondary-400 uppercase tracking-wider bg-gray-50 dark:bg-secondary-800">
              Kategorie
            </div>
            <nav>
              {categories.map((category) => {
                const hasChildren = category.children && category.children.length > 0;

                return hasChildren ? (
                  <button
                    key={category.slug}
                    onClick={() => handleMobileCategoryClick(category)}
                    className="w-full flex items-center justify-between px-4 py-4 border-b border-gray-100 dark:border-secondary-700 text-gray-900 dark:text-secondary-100 hover:bg-gray-50 dark:hover:bg-secondary-800"
                  >
                    <span className="font-medium">{cleanCategoryName(category.name)}</span>
                    <div className="flex items-center gap-2 text-gray-400 dark:text-secondary-500">
                      <span className="text-sm">({category.productCount || 0})</span>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </button>
                ) : (
                  <Link
                    key={category.slug}
                    href={`/products?category=${category.slug}`}
                    onClick={onClose}
                    className="flex items-center justify-between px-4 py-4 border-b border-gray-100 dark:border-secondary-700 text-gray-900 dark:text-secondary-100 hover:bg-gray-50 dark:hover:bg-secondary-800"
                  >
                    <span className="font-medium">{cleanCategoryName(category.name)}</span>
                    <div className="flex items-center gap-2 text-gray-400 dark:text-secondary-500">
                      <span className="text-sm">({category.productCount || 0})</span>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </Link>
                );
              })}
            </nav>

            {/* Help section */}
            <div className="mt-4 px-4 py-3 text-xs font-semibold text-gray-500 dark:text-secondary-400 uppercase tracking-wider bg-gray-50 dark:bg-secondary-800">
              Masz pytania?
            </div>
            <Link
              href="/help"
              onClick={onClose}
              className="flex items-center justify-between px-4 py-4 border-b border-gray-100 dark:border-secondary-700 text-gray-900 dark:text-secondary-100 hover:bg-gray-50 dark:hover:bg-secondary-800"
            >
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-gray-400 dark:text-secondary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-medium">Pomoc i kontakt</span>
              </div>
              <svg className="w-5 h-5 text-gray-400 dark:text-secondary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* ===== MOBILE MENU - Rendered via Portal to body ===== */}
      {mounted && createPortal(mobileMenu, document.body)}
      <div 
        className="hidden lg:block absolute top-full left-0 right-0 z-50 bg-white dark:bg-secondary-900 shadow-2xl dark:shadow-secondary-950/50 border-t dark:border-secondary-700"
        onMouseLeave={() => setHoveredCategory(null)}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="max-w-7xl mx-auto flex">
          {/* Left: Main categories */}
          <div className="w-72 bg-gray-50 dark:bg-secondary-800 border-r dark:border-secondary-700 max-h-[70vh] overflow-y-auto">
            {categories.map((category) => (
              <Link
                key={category.slug}
                href={`/products?category=${category.slug}`}
                className={`block px-5 py-3 border-b border-gray-100 dark:border-secondary-700 transition-colors ${
                  hoveredCategory === category.slug
                    ? 'bg-white dark:bg-secondary-900 text-primary-600 dark:text-primary-400 font-semibold'
                    : 'hover:bg-white dark:hover:bg-secondary-900 text-gray-800 dark:text-secondary-200'
                }`}
                onMouseEnter={() => setHoveredCategory(category.slug)}
              >
                <div className="flex items-center justify-between">
                  <span>{cleanCategoryName(category.name)}</span>
                  <span className="text-gray-400 dark:text-secondary-500 text-sm">({category.productCount || 0})</span>
                </div>
              </Link>
            ))}
          </div>

          {/* Right: Subcategories */}
          <div className="flex-1 p-6 max-h-[70vh] overflow-y-auto min-h-[400px] dark:bg-secondary-900">
            {activeCategory ? (
              <>
                <h3 className="text-xl font-bold text-gray-900 dark:text-secondary-100 mb-4 pb-2 border-b dark:border-secondary-700">
                  {cleanCategoryName(activeCategory.name)}
                </h3>

                {activeCategory.children && activeCategory.children.length > 0 ? (
                  <div className="grid grid-cols-3 gap-6">
                    {activeCategory.children.map((sub) => (
                      <div key={sub.slug}>
                        <Link
                          href={`/products?category=${sub.slug}`}
                          className="block font-semibold text-gray-900 dark:text-secondary-100 hover:text-primary-600 dark:hover:text-primary-400 mb-2"
                        >
                          {cleanCategoryName(sub.name)}
                          <span className="text-gray-400 dark:text-secondary-500 text-sm font-normal ml-2">({sub.productCount || 0})</span>
                        </Link>

                        {/* Third level */}
                        {sub.children && sub.children.length > 0 && (
                          <ul className="space-y-1">
                            {sub.children.slice(0, 5).map((third) => (
                              <li key={third.slug}>
                                <Link
                                  href={`/products?category=${third.slug}`}
                                  className="text-sm text-gray-600 dark:text-secondary-400 hover:text-primary-600 dark:hover:text-primary-400"
                                >
                                  {cleanCategoryName(third.name)}
                                </Link>
                              </li>
                            ))}
                            {sub.children.length > 5 && (
                              <li>
                                <Link
                                  href={`/products?category=${sub.slug}`}
                                  className="text-sm text-primary-600 hover:underline"
                                >
                                  więcej...
                                </Link>
                              </li>
                            )}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <p className="text-gray-500 dark:text-secondary-400 mb-4">
                      {activeCategory.productCount || 0} produktów w tej kategorii
                    </p>
                    <Link
                      href={`/products?category=${activeCategory.slug}`}
                      className="px-6 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 font-medium"
                    >
                      Zobacz produkty
                    </Link>
                  </div>
                )}

                {/* View all button */}
                {activeCategory.children && activeCategory.children.length > 0 && (
                  <div className="mt-6 pt-4 border-t dark:border-secondary-700">
                    <Link
                      href={`/products?category=${activeCategory.slug}`}
                      className="inline-flex items-center text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-500 font-medium"
                    >
                      Zobacz wszystko w {cleanCategoryName(activeCategory.name)}
                      <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400 dark:text-secondary-500">
                <p>Najedź na kategorię, aby zobaczyć podkategorie</p>
              </div>
            )}
          </div>
        </div>

        {/* Close on click outside */}
        <div 
          className="fixed inset-0 -z-10" 
          onClick={onClose}
        />
      </div>
    </>
  );
}
