'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CategoryWithChildren } from '../lib/api';
import { cleanCategoryName } from '../lib/categories';

interface MegaMenuProps {
  categories: CategoryWithChildren[];
  isOpen: boolean;
  onClose: () => void;
  currentCategorySlug?: string | null;
}

export default function MegaMenu({ categories, isOpen, onClose, currentCategorySlug }: MegaMenuProps) {
  const [hoveredCategorySlug, setHoveredCategorySlug] = useState<string | null>(null);
  const [selectedMobileCategory, setSelectedMobileCategory] = useState<string | null>(null);

  if (!isOpen) return null;

  // Get the hovered or selected category (desktop)
  const activeCategory = categories.find(
    (cat) => cat.slug === (hoveredCategorySlug || currentCategorySlug)
  );

  // Get selected mobile category
  const mobileCategoryData = selectedMobileCategory 
    ? categories.find(cat => cat.slug === selectedMobileCategory)
    : null;

  return (
    <>
      {/* Backdrop - only visible on desktop */}
      <div 
        className="hidden lg:block fixed inset-0 bg-black bg-opacity-20 z-40"
        onClick={onClose}
      />
      
      {/* Mobile Menu - includes its own backdrop */}
      <div className="lg:hidden fixed inset-0 z-40">
        {/* Mobile backdrop */}
        <div 
          className="absolute inset-0 bg-black bg-opacity-20"
          onClick={onClose}
        />
        
        {/* Mobile menu content */}
        <div 
          className="absolute inset-x-0 top-[120px] bottom-0 bg-white overflow-hidden flex flex-col"
        >
        {/* Mobile Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
          {selectedMobileCategory ? (
            <button 
              onClick={() => setSelectedMobileCategory(null)}
              className="flex items-center gap-2 text-sm font-medium text-gray-700"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Wstecz
            </button>
          ) : (
            <span className="text-sm font-semibold text-gray-900">Kategorie</span>
          )}
          <button 
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Mobile Categories List */}
        <div className="flex-1 overflow-y-auto">
          {!selectedMobileCategory ? (
            // Main categories list
            <div className="divide-y">
              {categories.map((category) => {
                // API already returns total productCount including children
                const totalProducts = category.productCount || 0;

                const hasChildren = category.children && category.children.length > 0;

                return (
                  <div key={category.slug}>
                    {hasChildren ? (
                      // Category with subcategories - click to expand
                      <button
                        onClick={() => setSelectedMobileCategory(category.slug)}
                        className="w-full flex items-center justify-between px-4 py-4 text-sm font-medium text-gray-900 hover:bg-gray-50 active:bg-gray-100"
                      >
                        <span>
                          {cleanCategoryName(category.name)}
                          {totalProducts > 0 && (
                            <span className="text-xs text-gray-500 ml-2">({totalProducts})</span>
                          )}
                        </span>
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    ) : (
                      // Category without subcategories - navigate directly
                      <Link
                        href={`/products?category=${category.slug}`}
                        className="w-full text-left block px-4 py-4 text-sm font-medium text-gray-900 hover:bg-gray-50 active:bg-gray-100"
                      >
                        {cleanCategoryName(category.name)}
                        {totalProducts > 0 && (
                          <span className="text-xs text-gray-500 ml-2">({totalProducts})</span>
                        )}
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
          ) : mobileCategoryData ? (
            // Subcategories list
            <div>
              {/* Category header - view all */}
              <Link
                href={`/products?category=${mobileCategoryData.slug}`}
                className="w-full flex items-center justify-between px-4 py-4 bg-primary-50 text-primary-600 font-semibold text-sm border-b hover:bg-primary-100 active:bg-primary-200"
              >
                <span>Zobacz wszystko w "{cleanCategoryName(mobileCategoryData.name)}"</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Link>
              
              {/* Subcategories */}
              <div className="divide-y">
                {mobileCategoryData.children?.map((subCategory) => {
                  const subProductCount = subCategory.productCount || 0;
                  
                  return (
                    <Link
                      key={subCategory.slug}
                      href={`/products?category=${subCategory.slug}`}
                      className="w-full flex items-center justify-between px-4 py-4 text-sm text-gray-900 hover:bg-gray-50 active:bg-gray-100"
                    >
                      <span>
                        {cleanCategoryName(subCategory.name)}
                        {subProductCount > 0 && (
                          <span className="text-xs text-gray-500 ml-2">({subProductCount})</span>
                        )}
                      </span>
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
        </div>
      </div>

      {/* Desktop Mega Menu Panel */}
      <div className="hidden lg:block absolute top-full left-0 right-0 bg-white border-t border-gray-200 shadow-2xl z-50">
        <div className="max-w-[1400px] mx-auto px-4">
          <div className="flex min-h-[400px]">
            {/* Left Sidebar - Main Categories */}
            <div className="w-80 bg-gray-50 border-r border-gray-200 py-4 max-h-[70vh] overflow-y-auto flex-shrink-0">
              {categories.map((category) => {
                const isHovered = hoveredCategorySlug === category.slug;
                const isActive = currentCategorySlug === category.slug;
                // API already returns total productCount including children
                const totalProducts = category.productCount || 0;

                return (
                  <Link
                    key={category.slug}
                    href={`/products?category=${category.slug}`}
                    className={`w-full text-left block px-6 py-3 text-sm font-medium transition-colors relative ${
                      isHovered || isActive
                        ? 'text-primary-600 bg-white border-r-3 border-primary-500'
                        : 'text-secondary-700 hover:text-primary-600 hover:bg-white'
                    }`}
                    onMouseEnter={() => setHoveredCategorySlug(category.slug)}
                  >
                    <div className="flex items-center justify-between">
                      <span>{cleanCategoryName(category.name)}</span>
                      {totalProducts > 0 && (
                        <span className="text-xs text-gray-500 ml-2">
                          ({totalProducts})
                        </span>
                      )}
                    </div>
                    {(isHovered || isActive) && (
                      <div className="absolute right-0 top-0 bottom-0 w-1 bg-primary-500" />
                    )}
                  </Link>
                );
              })}
            </div>

            {/* Right Panel - Subcategories */}
            <div className="flex-1 p-8 max-h-[70vh] overflow-y-auto min-w-[600px] bg-white">
              {activeCategory && activeCategory.children && activeCategory.children.length > 0 ? (
                <div>
                  <h3 className="text-lg font-bold text-secondary-900 mb-4">
                    {cleanCategoryName(activeCategory.name)}
                  </h3>
                  
                  {/* Grid of subcategories */}
                  <div className="grid grid-cols-3 gap-x-8 gap-y-6">
                    {activeCategory.children.map((subCategory) => {
                      const subProductCount = subCategory.productCount || 0;
                      
                      return (
                        <div key={subCategory.slug} className="space-y-2">
                          <Link
                            href={`/products?category=${subCategory.slug}`}
                            className="w-full text-left block font-semibold text-sm text-secondary-900 hover:text-primary-600 transition-colors"
                          >
                            <div className="flex items-center justify-between">
                              <span>{cleanCategoryName(subCategory.name)}</span>
                              {subProductCount > 0 && (
                                <span className="text-xs text-gray-500 ml-2">
                                  ({subProductCount})
                                </span>
                              )}
                            </div>
                          </Link>
                          
                          {/* Third level categories */}
                          {subCategory.children && subCategory.children.length > 0 && (
                            <ul className="space-y-1.5 pl-3 border-l-2 border-gray-200">
                              {subCategory.children.map((thirdLevel) => {
                                const thirdProductCount = thirdLevel.productCount || 0;
                                
                                return (
                                  <li key={thirdLevel.slug}>
                                    <Link
                                      href={`/products?category=${thirdLevel.slug}`}
                                      className="w-full text-left block text-xs text-secondary-600 hover:text-primary-600 transition-colors"
                                    >
                                      <div className="flex items-center justify-between">
                                        <span>{cleanCategoryName(thirdLevel.name)}</span>
                                        {thirdProductCount > 0 && (
                                          <span className="text-xs text-gray-400 ml-1">
                                            ({thirdProductCount})
                                          </span>
                                        )}
                                      </div>
                                    </Link>
                                  </li>
                                );
                              })}
                            </ul>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* View all link */}
                  <div className="mt-6 pt-4 border-t border-gray-200">
                    <Link
                      href={`/products?category=${activeCategory.slug}`}
                      className="inline-flex items-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors"
                    >
                      Zobacz wszystkie produkty w kategorii {cleanCategoryName(activeCategory.name)}
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                </div>
              ) : activeCategory ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                  <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                  <p className="text-lg font-semibold text-secondary-900 mb-2">
                    {cleanCategoryName(activeCategory.name)}
                  </p>
                  <p className="text-sm text-gray-500 mb-6">
                    {activeCategory.productCount || 0} produktów
                  </p>
                  <Link
                    href={`/products?category=${activeCategory.slug}`}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-primary-500 text-white font-medium rounded-lg hover:bg-primary-600 transition-colors"
                  >
                    Zobacz produkty
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400 py-12">
                  <div className="text-center">
                    <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                    </svg>
                    <p className="text-sm">Najedź na kategorię aby zobaczyć podkategorie</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
