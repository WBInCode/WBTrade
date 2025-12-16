'use client';

import Link from 'next/link';
import { useState } from 'react';
import SearchBar from './SearchBar';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';

const categories = [
  'Elektronika',
  'Moda',
  'Dom i Ogród',
  'Supermarket',
  'Dziecko',
  'Uroda',
  'Motoryzacja',
];

export default function Header() {
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const { itemCount } = useCart();
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <header className="bg-white sticky top-0 z-50 shadow-sm">
      {/* Top Header */}
      <div className="border-b border-gray-100">
        <div className="container-custom">
          <div className="flex items-center justify-between h-16 gap-4">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 shrink-0">
              <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z"/>
                </svg>
              </div>
              <span className="text-xl font-bold text-secondary-900">
                WB<span className="text-primary-500">Trade</span>
              </span>
            </Link>

            {/* Category Dropdown */}
            <div className="hidden lg:block relative">
              <button
                onClick={() => setIsCategoryOpen(!isCategoryOpen)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-secondary-700 hover:bg-gray-50 rounded-lg border border-gray-200"
              >
                Wszystkie kategorie
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {isCategoryOpen && (
                <div className="absolute top-full left-0 mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg py-2 z-50">
                  {categories.map((category) => (
                    <Link
                      key={category}
                      href={`/products?category=${encodeURIComponent(category)}`}
                      className="block px-4 py-2 text-sm text-secondary-700 hover:bg-gray-50"
                      onClick={() => setIsCategoryOpen(false)}
                    >
                      {category}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Search */}
            <div className="hidden md:block flex-1 max-w-xl">
              <SearchBar />
            </div>

            {/* Right Icons */}
            <div className="flex items-center gap-1 sm:gap-4">
              {/* Favorites */}
              <Link href="/favorites" className="flex flex-col items-center p-2 text-secondary-600 hover:text-primary-500 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                <span className="text-xs mt-0.5 hidden sm:block">Ulubione</span>
              </Link>

              {/* Account */}
              <div className="relative">
                {isAuthenticated ? (
                  <>
                    <button
                      onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                      className="flex flex-col items-center p-2 text-secondary-600 hover:text-primary-500 transition-colors"
                    >
                      <div className="w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center text-white text-xs font-medium">
                        {user?.firstName?.[0]}{user?.lastName?.[0]}
                      </div>
                      <span className="text-xs mt-0.5 hidden sm:block">{user?.firstName}</span>
                    </button>
                    {isUserMenuOpen && (
                      <div className="absolute top-full right-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg py-2 z-50">
                        <div className="px-4 py-2 border-b border-gray-100">
                          <p className="text-sm font-medium text-gray-900">{user?.firstName} {user?.lastName}</p>
                          <p className="text-xs text-gray-500">{user?.email}</p>
                        </div>
                        <Link
                          href="/account"
                          className="block px-4 py-2 text-sm text-secondary-700 hover:bg-gray-50"
                          onClick={() => setIsUserMenuOpen(false)}
                        >
                          Moje konto
                        </Link>
                        <Link
                          href="/account/orders"
                          className="block px-4 py-2 text-sm text-secondary-700 hover:bg-gray-50"
                          onClick={() => setIsUserMenuOpen(false)}
                        >
                          Zamówienia
                        </Link>
                        <button
                          onClick={() => { logout(); setIsUserMenuOpen(false); }}
                          className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-50"
                        >
                          Wyloguj się
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <Link href="/login" className="flex flex-col items-center p-2 text-secondary-600 hover:text-primary-500 transition-colors">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span className="text-xs mt-0.5 hidden sm:block">Zaloguj</span>
                  </Link>
                )}
              </div>

              {/* Cart */}
              <Link href="/cart" className="flex flex-col items-center p-2 text-secondary-600 hover:text-primary-500 transition-colors relative">
                <div className="relative">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  {itemCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-primary-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-medium">
                      {itemCount > 99 ? '99+' : itemCount}
                    </span>
                  )}
                </div>
                <span className="text-xs mt-0.5 hidden sm:block">Koszyk</span>
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
      <div className="border-b border-gray-100 bg-white">
        <div className="container-custom">
          <div className="flex items-center justify-between">
            <nav className="flex items-center gap-1 overflow-x-auto scrollbar-hide py-2">
              <button
                onClick={() => setIsCategoryOpen(!isCategoryOpen)}
                className="lg:hidden flex items-center gap-2 px-3 py-2 text-sm font-medium text-secondary-700 hover:bg-gray-50 rounded-lg whitespace-nowrap"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                Kategorie
              </button>
              {/* Deals Link - Highlighted */}
              <Link
                href="/deals"
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-orange-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg whitespace-nowrap transition-colors"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 2a2 2 0 00-2 2v14l3.5-2 3.5 2 3.5-2 3.5 2V4a2 2 0 00-2-2H5zm2.5 3a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm6.207.293a1 1 0 00-1.414 0l-6 6a1 1 0 101.414 1.414l6-6a1 1 0 000-1.414zM12.5 10a1.5 1.5 0 100 3 1.5 1.5 0 000-3z" clipRule="evenodd" />
                </svg>
                Promocje
              </Link>
              {categories.map((category) => (
                <Link
                  key={category}
                  href={`/products?category=${encodeURIComponent(category)}`}
                  className="px-3 py-2 text-sm text-secondary-600 hover:text-secondary-900 hover:bg-gray-50 rounded-lg whitespace-nowrap transition-colors"
                >
                  {category}
                </Link>
              ))}
            </nav>
            <Link
              href="/sell"
              className="hidden md:flex items-center gap-1 px-4 py-2 text-sm font-medium text-primary-500 hover:text-primary-600 whitespace-nowrap"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
              </svg>
              Sprzedawaj
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}