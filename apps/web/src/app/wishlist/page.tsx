'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useWishlist } from '../../contexts/WishlistContext';
import { useCart } from '../../contexts/CartContext';
import { productsApi } from '../../lib/api';
import { roundMoney } from '../../lib/currency';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import Breadcrumb from '../../components/Breadcrumb';

type SortOption = 'newest' | 'oldest' | 'price-asc' | 'price-desc' | 'name';
type ViewMode = 'grid' | 'list';

export default function WishlistPage() {
  const { items, removeFromWishlist, clearWishlist } = useWishlist();
  const { addToCart } = useCart();
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [addedToCartIds, setAddedToCartIds] = useState<Set<string>>(new Set());
  const [addingItemIds, setAddingItemIds] = useState<Set<string>>(new Set());
  const [addingAll, setAddingAll] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const sortedItems = useMemo(() => {
    const sorted = [...items];
    switch (sortBy) {
      case 'newest':
        return sorted.sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime());
      case 'oldest':
        return sorted.sort((a, b) => new Date(a.addedAt).getTime() - new Date(b.addedAt).getTime());
      case 'price-asc':
        return sorted.sort((a, b) => Number(a.price) - Number(b.price));
      case 'price-desc':
        return sorted.sort((a, b) => Number(b.price) - Number(a.price));
      case 'name':
        return sorted.sort((a, b) => a.name.localeCompare(b.name, 'pl'));
      default:
        return sorted;
    }
  }, [items, sortBy]);

  const handleRemove = async (id: string) => {
    setRemovingId(id);
    await new Promise(resolve => setTimeout(resolve, 300));
    removeFromWishlist(id);
    setRemovingId(null);
  };

  const handleAddToCart = async (item: typeof items[0]) => {
    // Prevent double-clicking
    if (addingItemIds.has(item.id)) return;
    
    setAddingItemIds(prev => new Set(prev).add(item.id));
    
    try {
      let variantId = item.variantId;
      
      // If no variantId stored, fetch product to get first variant
      if (!variantId) {
        const product = await productsApi.getById(item.id);
        if (product.variants && product.variants.length > 0) {
          // Use first variant
          variantId = product.variants[0].id;
        } else {
          console.error('Product has no variants:', item.id);
          setAddingItemIds(prev => {
            const next = new Set(prev);
            next.delete(item.id);
            return next;
          });
          return;
        }
      }
      
      await addToCart(variantId, 1, {
        name: item.name,
        image: item.image,
        price: item.price,
        quantity: 1,
        productId: item.id,
      });
      setAddedToCartIds(prev => new Set(prev).add(item.id));
      // Don't auto-remove for individual items unless not adding all
      if (!addingAll) {
        setTimeout(() => {
          setAddedToCartIds(prev => {
            const next = new Set(prev);
            next.delete(item.id);
            return next;
          });
        }, 2000);
      }
    } catch (error) {
      console.error('Failed to add to cart:', error);
    } finally {
      setAddingItemIds(prev => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }
  };

  const handleAddAllToCart = async () => {
    setAddingAll(true);
    setAddedToCartIds(new Set());
    
    for (const item of items) {
      await handleAddToCart(item);
    }
    
    // Keep "Dodano" state for 3 seconds after all items are added
    setTimeout(() => {
      setAddedToCartIds(new Set());
      setAddingAll(false);
    }, 3000);
  };

  const handleClearAll = () => {
    clearWishlist();
    setShowClearConfirm(false);
  };

  const totalValue = roundMoney(items.reduce((sum, item) => sum + Number(item.price), 0));

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-secondary-900">
      <Header />
      
      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          {/* Header section */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-red-400 to-pink-500 rounded-full flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Moje ulubione</h1>
                <p className="text-gray-500 dark:text-gray-400">
                  {items.length === 0 
                    ? 'Brak produktów' 
                    : `${items.length} ${items.length === 1 ? 'produkt' : items.length < 5 ? 'produkty' : 'produktów'}`}
                </p>
              </div>
            </div>

            {items.length > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-500 dark:text-gray-400">Łączna wartość:</span>
                <span className="text-xl font-bold text-primary-600">{totalValue.toFixed(2)} zł</span>
              </div>
            )}
          </div>

          {items.length === 0 ? (
            /* Empty state */
            <div className="bg-white dark:bg-secondary-800 rounded-2xl shadow-sm border border-gray-100 dark:border-secondary-700 p-12 text-center">
              <div className="w-24 h-24 bg-gray-100 dark:bg-secondary-700 rounded-full mx-auto mb-6 flex items-center justify-center">
                <svg className="w-12 h-12 text-gray-300 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Twoja lista ulubionych jest pusta</h2>
              <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md mx-auto">
                Przeglądaj produkty i klikaj serduszko, aby dodać je do ulubionych. 
                Dzięki temu łatwo do nich wrócisz.
              </p>
              <Link 
                href="/products"
                className="inline-flex items-center gap-2 bg-primary-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-700 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Przeglądaj produkty
              </Link>
            </div>
          ) : (
            <>
              {/* Controls */}
              <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-sm border border-gray-100 dark:border-secondary-700 p-4 mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center gap-4">
                    {/* Sort */}
                    <div className="flex items-center gap-2">
                      <label htmlFor="sort" className="text-sm text-gray-500 dark:text-gray-400 hidden sm:block">Sortuj:</label>
                      <select
                        id="sort"
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as SortOption)}
                        className="text-sm border border-gray-200 dark:border-secondary-600 rounded-lg px-3 py-2 bg-white dark:bg-secondary-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="newest">Ostatnio dodane</option>
                        <option value="oldest">Najstarsze</option>
                        <option value="price-asc">Cena: od najniższej</option>
                        <option value="price-desc">Cena: od najwyższej</option>
                        <option value="name">Nazwa A-Z</option>
                      </select>
                    </div>

                    {/* View mode */}
                    <div className="flex items-center border border-gray-200 dark:border-secondary-600 rounded-lg overflow-hidden">
                      <button
                        onClick={() => setViewMode('grid')}
                        className={`p-2 ${viewMode === 'grid' ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'}`}
                        title="Widok siatki"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setViewMode('list')}
                        className={`p-2 ${viewMode === 'list' ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'}`}
                        title="Widok listy"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Clear all */}
                  <button
                    onClick={() => setShowClearConfirm(true)}
                    className="text-sm text-red-500 hover:text-red-600 flex items-center gap-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Wyczyść listę
                  </button>
                </div>
              </div>

              {/* Products grid/list */}
              {viewMode === 'grid' ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {sortedItems.map((item) => (
                    <div 
                      key={item.id}
                      className={`bg-white dark:bg-secondary-800 rounded-xl shadow-sm border border-gray-100 dark:border-secondary-700 overflow-hidden group transition-all duration-300 ${
                        removingId === item.id ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
                      }`}
                    >
                      {/* Image */}
                      <Link href={`/products/${item.id}`} className="block relative aspect-square bg-gray-50 dark:bg-secondary-700">
                        <Image
                          src={item.image}
                          alt={item.name}
                          fill
                          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                          className="object-contain p-4 group-hover:scale-105 transition-transform duration-300"
                        />
                        {item.compareAtPrice && Number(item.compareAtPrice) > Number(item.price) && (
                          <span className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">
                            -{Math.round((1 - Number(item.price) / Number(item.compareAtPrice)) * 100)}%
                          </span>
                        )}
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            handleRemove(item.id);
                          }}
                          className="absolute top-2 right-2 w-8 h-8 bg-red-50 text-red-500 rounded-full flex items-center justify-center hover:bg-red-100 transition-colors"
                          title="Usuń z ulubionych"
                        >
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                          </svg>
                        </button>
                      </Link>

                      {/* Info */}
                      <div className="p-3">
                        <Link href={`/products/${item.id}`}>
                          <h3 className="text-sm text-gray-800 dark:text-gray-200 line-clamp-2 mb-2 min-h-[2.5rem] hover:text-primary-600 transition-colors">
                            {item.name}
                          </h3>
                        </Link>
                        <div className="flex items-baseline gap-2 mb-3">
                          <span className="text-lg font-bold text-primary-600 dark:text-primary-400">
                            {Number(item.price).toFixed(2)} zł
                          </span>
                          {item.compareAtPrice && Number(item.compareAtPrice) > Number(item.price) && (
                            <span className="text-sm text-gray-400 dark:text-secondary-500 line-through">
                              {Number(item.compareAtPrice).toFixed(2)} zł
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => handleAddToCart(item)}
                          disabled={addedToCartIds.has(item.id) || addingItemIds.has(item.id)}
                          className={`w-full py-2 px-4 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                            addedToCartIds.has(item.id)
                              ? 'bg-green-500 text-white'
                              : addingItemIds.has(item.id)
                                ? 'bg-primary-400 text-white cursor-wait'
                                : 'bg-primary-600 text-white hover:bg-primary-700'
                          }`}
                        >
                          {addedToCartIds.has(item.id) ? (
                            <>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Dodano!
                            </>
                          ) : addingItemIds.has(item.id) ? (
                            <>
                              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Dodawanie...
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                              </svg>
                              Do koszyka
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* List view */
                <div className="space-y-3">
                  {sortedItems.map((item) => (
                    <div 
                      key={item.id}
                      className={`bg-white dark:bg-secondary-800 rounded-xl shadow-sm border border-gray-100 dark:border-secondary-700 p-4 transition-all duration-300 ${
                        removingId === item.id ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0'
                      }`}
                    >
                      <div className="flex gap-4">
                        {/* Image */}
                        <Link href={`/products/${item.id}`} className="shrink-0">
                          <div className="w-24 h-24 sm:w-32 sm:h-32 bg-gray-50 dark:bg-secondary-700 rounded-lg overflow-hidden relative">
                            <Image
                              src={item.image}
                              alt={item.name}
                              fill
                              sizes="128px"
                              className="object-contain p-2"
                            />
                          </div>
                        </Link>

                        {/* Info */}
                        <div className="flex-grow min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <Link href={`/products/${item.id}`}>
                              <h3 className="text-base font-medium text-gray-800 dark:text-white hover:text-primary-600 transition-colors line-clamp-2">
                                {item.name}
                              </h3>
                            </Link>
                            <button
                              onClick={() => handleRemove(item.id)}
                              className="shrink-0 w-8 h-8 text-gray-400 hover:text-red-500 rounded-full hover:bg-red-50 flex items-center justify-center transition-colors"
                              title="Usuń z ulubionych"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                          
                          <div className="flex items-baseline gap-2 mt-2">
                            <span className="text-lg sm:text-xl font-bold text-primary-600 dark:text-primary-400">
                              {Number(item.price).toFixed(2)} zł
                            </span>
                            {item.compareAtPrice && Number(item.compareAtPrice) > Number(item.price) && (
                              <>
                                <span className="text-xs sm:text-sm text-gray-400 dark:text-secondary-500 line-through">
                                  {Number(item.compareAtPrice).toFixed(2)} zł
                                </span>
                                <span className="text-xs sm:text-sm text-red-500 font-medium">
                                  -{Math.round((1 - Number(item.price) / Number(item.compareAtPrice)) * 100)}%
                                </span>
                              </>
                            )}
                          </div>

                          <p className="text-xs text-gray-400 dark:text-secondary-500 mt-1">
                            Dodano: {new Date(item.addedAt).toLocaleDateString('pl-PL')}
                          </p>

                          <div className="flex flex-wrap gap-2 mt-3">
                            <button
                              onClick={() => handleAddToCart(item)}
                              disabled={addedToCartIds.has(item.id) || addingItemIds.has(item.id)}
                              className={`py-1.5 sm:py-2 px-3 sm:px-4 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 flex items-center gap-1.5 sm:gap-2 ${
                                addedToCartIds.has(item.id)
                                  ? 'bg-green-500 text-white'
                                  : addingItemIds.has(item.id)
                                    ? 'bg-primary-400 text-white cursor-wait'
                                    : 'bg-primary-600 text-white hover:bg-primary-700'
                              }`}
                            >
                              {addedToCartIds.has(item.id) ? (
                                <>
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                  Dodano!
                                </>
                              ) : addingItemIds.has(item.id) ? (
                                <>
                                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                  Dodawanie...
                                </>
                              ) : (
                                <>
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                                  </svg>
                                  Do koszyka
                                </>
                              )}
                            </button>
                            <Link
                              href={`/products/${item.id}`}
                              className="py-1.5 sm:py-2 px-3 sm:px-4 rounded-lg text-xs sm:text-sm font-medium border border-gray-200 dark:border-secondary-600 text-gray-600 dark:text-gray-300 hover:border-gray-300 hover:bg-gray-50 dark:hover:bg-secondary-700 transition-colors"
                            >
                              Zobacz szczegóły
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add all to cart */}
              {items.length > 1 && (
                <div className="mt-8 bg-gradient-to-r from-primary-50 to-orange-50 dark:from-primary-900/30 dark:to-orange-900/30 rounded-xl p-6 border border-primary-100 dark:border-primary-800">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Dodaj wszystkie do koszyka</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {items.length} produktów za łącznie {totalValue.toFixed(2)} zł
                      </p>
                    </div>
                    <button
                      onClick={handleAddAllToCart}
                      disabled={addingAll || addedToCartIds.size === items.length}
                      className={`px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
                        addedToCartIds.size === items.length
                          ? 'bg-green-500 text-white'
                          : addingAll
                            ? 'bg-primary-400 text-white cursor-wait'
                            : 'bg-primary-600 text-white hover:bg-primary-700'
                      }`}
                    >
                      {addedToCartIds.size === items.length ? (
                        <>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Dodano wszystko!
                        </>
                      ) : addingAll ? (
                        <>
                          <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Dodawanie... ({addedToCartIds.size}/{items.length})
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                          Dodaj wszystko
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Clear confirmation modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-secondary-800 rounded-2xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white text-center mb-2">
              Wyczyścić listę ulubionych?
            </h3>
            <p className="text-gray-500 dark:text-gray-400 text-center mb-6">
              Czy na pewno chcesz usunąć wszystkie {items.length} produktów z listy ulubionych? Tej operacji nie można cofnąć.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 py-2.5 px-4 rounded-lg border border-gray-200 dark:border-secondary-600 text-gray-600 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-secondary-700 transition-colors"
              >
                Anuluj
              </button>
              <button
                onClick={handleClearAll}
                className="flex-1 py-2.5 px-4 rounded-lg bg-red-500 text-white font-medium hover:bg-red-600 transition-colors"
              >
                Usuń wszystko
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
