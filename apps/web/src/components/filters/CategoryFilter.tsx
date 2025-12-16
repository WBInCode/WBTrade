'use client';

import { useState } from 'react';
import Link from 'next/link';

interface Category {
  name: string;
  slug: string;
  count?: number;
  children?: Category[];
}

interface CategoryFilterProps {
  categories: Category[];
  currentCategory?: string;
}

export default function CategoryFilter({ categories, currentCategory }: CategoryFilterProps) {
  const [expanded, setExpanded] = useState<string[]>(['laptops']);

  const toggleExpand = (slug: string) => {
    setExpanded(prev => 
      prev.includes(slug) 
        ? prev.filter(s => s !== slug) 
        : [...prev, slug]
    );
  };

  const renderCategory = (category: Category, level: number = 0) => {
    const hasChildren = category.children && category.children.length > 0;
    const isExpanded = expanded.includes(category.slug);
    const isActive = category.slug === currentCategory;

    return (
      <div key={category.slug}>
        <div 
          className={`flex items-center justify-between py-1.5 ${level > 0 ? 'pl-4' : ''}`}
        >
          <Link
            href={`/products?category=${category.slug}`}
            className={`text-sm hover:text-primary-500 transition-colors ${
              isActive ? 'text-primary-500 font-medium' : 'text-secondary-700'
            }`}
          >
            {category.name}
          </Link>
          {hasChildren && (
            <button 
              onClick={() => toggleExpand(category.slug)}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <svg 
                className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          )}
        </div>
        {hasChildren && isExpanded && (
          <div className="ml-2 border-l border-gray-200">
            {category.children!.map(child => renderCategory(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="mb-6">
      <h3 className="font-semibold text-secondary-900 mb-3">Kategorie</h3>
      <Link 
        href="/products?category=electronics" 
        className="flex items-center gap-2 text-sm text-primary-500 mb-2"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        All Electronics
      </Link>
      {categories.map(cat => renderCategory(cat))}
    </div>
  );
}
