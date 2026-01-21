'use client';

import { useState } from 'react';
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

  if (!isOpen) return null;

  const activeCategory = categories.find(c => c.slug === hoveredCategory);

  return (
    <>
      {/* ===== MOBILE MENU ===== */}
      <div className="lg:hidden fixed inset-0 z-[100]">
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black/50" onClick={onClose} />
        
        {/* Sidebar */}
        <div className="absolute left-0 top-0 bottom-0 w-[85%] max-w-[320px] bg-white shadow-xl overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b px-4 py-3 flex items-center justify-between z-10">
            <span className="font-bold text-lg">Kategorie</span>
            <button onClick={onClose} className="p-2 -mr-2 hover:bg-gray-100 rounded-full">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Categories list */}
          <nav className="py-2">
            {categories.map((category) => {
              const hasChildren = category.children && category.children.length > 0;
              const isExpanded = mobileExpanded === category.slug;

              return (
                <div key={category.slug} className="border-b border-gray-100 last:border-0">
                  {hasChildren ? (
                    <>
                      {/* Category with children - expandable */}
                      <button
                        onClick={() => setMobileExpanded(isExpanded ? null : category.slug)}
                        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 active:bg-gray-100"
                      >
                        <span className="font-medium text-gray-900">
                          {cleanCategoryName(category.name)}
                          <span className="text-gray-400 text-sm ml-2">({category.productCount || 0})</span>
                        </span>
                        <svg 
                          className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
                          fill="none" stroke="currentColor" viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      {/* Subcategories */}
                      {isExpanded && (
                        <div className="bg-gray-50 py-2">
                          {/* View all in category */}
                          <Link
                            href={`/products?category=${category.slug}`}
                            className="block px-6 py-2 text-primary-600 font-medium hover:bg-gray-100"
                          >
                            Zobacz wszystko →
                          </Link>
                          
                          {category.children?.map((sub) => (
                            <Link
                              key={sub.slug}
                              href={`/products?category=${sub.slug}`}
                              className="block px-6 py-2 text-gray-700 hover:bg-gray-100 hover:text-primary-600"
                            >
                              {cleanCategoryName(sub.name)}
                              <span className="text-gray-400 text-sm ml-2">({sub.productCount || 0})</span>
                            </Link>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    /* Category without children - direct link */
                    <Link
                      href={`/products?category=${category.slug}`}
                      className="block px-4 py-3 font-medium text-gray-900 hover:bg-gray-50 active:bg-gray-100"
                    >
                      {cleanCategoryName(category.name)}
                      <span className="text-gray-400 text-sm ml-2">({category.productCount || 0})</span>
                    </Link>
                  )}
                </div>
              );
            })}
          </nav>
        </div>
      </div>

      {/* ===== DESKTOP MENU ===== */}
      <div 
        className="hidden lg:block absolute top-full left-0 right-0 z-50 bg-white shadow-2xl border-t"
        onMouseLeave={() => setHoveredCategory(null)}
      >
        <div className="max-w-7xl mx-auto flex">
          {/* Left: Main categories */}
          <div className="w-72 bg-gray-50 border-r max-h-[70vh] overflow-y-auto">
            {categories.map((category) => (
              <Link
                key={category.slug}
                href={`/products?category=${category.slug}`}
                className={`block px-5 py-3 border-b border-gray-100 transition-colors ${
                  hoveredCategory === category.slug
                    ? 'bg-white text-primary-600 font-semibold'
                    : 'hover:bg-white text-gray-800'
                }`}
                onMouseEnter={() => setHoveredCategory(category.slug)}
              >
                <div className="flex items-center justify-between">
                  <span>{cleanCategoryName(category.name)}</span>
                  <span className="text-gray-400 text-sm">({category.productCount || 0})</span>
                </div>
              </Link>
            ))}
          </div>

          {/* Right: Subcategories */}
          <div className="flex-1 p-6 max-h-[70vh] overflow-y-auto min-h-[400px]">
            {activeCategory ? (
              <>
                <h3 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b">
                  {cleanCategoryName(activeCategory.name)}
                </h3>

                {activeCategory.children && activeCategory.children.length > 0 ? (
                  <div className="grid grid-cols-3 gap-6">
                    {activeCategory.children.map((sub) => (
                      <div key={sub.slug}>
                        <Link
                          href={`/products?category=${sub.slug}`}
                          className="block font-semibold text-gray-900 hover:text-primary-600 mb-2"
                        >
                          {cleanCategoryName(sub.name)}
                          <span className="text-gray-400 text-sm font-normal ml-2">({sub.productCount || 0})</span>
                        </Link>

                        {/* Third level */}
                        {sub.children && sub.children.length > 0 && (
                          <ul className="space-y-1">
                            {sub.children.slice(0, 5).map((third) => (
                              <li key={third.slug}>
                                <Link
                                  href={`/products?category=${third.slug}`}
                                  className="text-sm text-gray-600 hover:text-primary-600"
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
                    <p className="text-gray-500 mb-4">
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
                  <div className="mt-6 pt-4 border-t">
                    <Link
                      href={`/products?category=${activeCategory.slug}`}
                      className="inline-flex items-center text-primary-600 hover:text-primary-700 font-medium"
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
              <div className="flex items-center justify-center h-full text-gray-400">
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
