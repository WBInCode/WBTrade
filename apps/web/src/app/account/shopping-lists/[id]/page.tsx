'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useParams } from 'next/navigation';
import Header from '../../../../components/Header';
import Footer from '../../../../components/Footer';
import AccountSidebar from '../../../../components/AccountSidebar';
import { useAuth } from '../../../../contexts/AuthContext';
import { useCart } from '../../../../contexts/CartContext';
import { shoppingListApi, ShoppingList, ShoppingListItem } from '../../../../lib/api';

function formatPrice(price: number | string): string {
  const n = typeof price === 'string' ? parseFloat(price) : price;
  return `${n.toFixed(2)} zł`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('pl-PL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function ShoppingListDetailPage() {
  const params = useParams();
  const listId = params.id as string;
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();
  const { addToCart } = useCart();

  const [list, setList] = useState<ShoppingList | null>(null);
  const [loading, setLoading] = useState(true);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [removingItemId, setRemovingItemId] = useState<string | null>(null);
  const [addingToCartId, setAddingToCartId] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  const fetchList = useCallback(async () => {
    if (!isAuthenticated || !listId) return;
    setLoading(true);
    try {
      const data = await shoppingListApi.getOne(listId);
      setList(data);
    } catch (error) {
      console.error('Error fetching shopping list:', error);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, listId]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const handleEditList = () => {
    if (!list) return;
    setEditName(list.name);
    setEditDescription(list.description || '');
    setEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editName.trim() || !listId) return;
    setSaving(true);
    try {
      await shoppingListApi.update(listId, {
        name: editName.trim(),
        description: editDescription.trim() || undefined,
      });
      setEditModalOpen(false);
      fetchList();
    } catch (error) {
      console.error('Error updating list:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteList = async () => {
    if (!confirm('Czy na pewno chcesz usunąć tę listę? Ta operacja jest nieodwracalna.')) return;
    try {
      await shoppingListApi.delete(listId);
      router.push('/account/shopping-lists');
    } catch (error) {
      console.error('Error deleting list:', error);
    }
  };

  const handleRemoveItem = async (item: ShoppingListItem) => {
    if (!confirm(`Usunąć "${item.product.name}" z listy?`)) return;
    setRemovingItemId(item.id);
    try {
      await shoppingListApi.removeItem(listId, item.id);
      fetchList();
    } catch (error) {
      console.error('Error removing item:', error);
    } finally {
      setRemovingItemId(null);
    }
  };

  const handleAddToCart = async (item: ShoppingListItem) => {
    setAddingToCartId(item.id);
    try {
      const variantId = item.variantId || item.variant?.id || item.productId;
      const price = item.variant?.price ?? item.product.price ?? 0;
      await addToCart(variantId, item.quantity || 1, {
        name: item.product.name,
        price: price.toFixed(2),
        image: item.product.images?.[0]?.url || '',
        quantity: item.quantity || 1,
      });
    } catch (error) {
      console.error('Error adding to cart:', error);
    } finally {
      setAddingToCartId(null);
    }
  };

  const handleAddAllToCart = async () => {
    if (!list?.items?.length) return;
    for (const item of list.items) {
      try {
        const variantId = item.variantId || item.variant?.id || item.productId;
        await addToCart(variantId, item.quantity || 1);
      } catch (error) {
        console.error('Error adding item to cart:', error);
      }
    }
  };

  if (isLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-secondary-900">
        <Header />
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-secondary-900 overflow-x-hidden">
      <Header />
      <main className="container-custom py-3 sm:py-6 px-3 sm:px-4 overflow-hidden">
        {/* Breadcrumb */}
        <nav className="text-sm text-gray-500 dark:text-gray-400 mb-4 sm:mb-6">
          <Link href="/" className="hover:text-orange-500 transition-colors">Strona główna</Link>
          <span className="mx-2">/</span>
          <Link href="/account" className="hover:text-orange-500 transition-colors">Moje konto</Link>
          <span className="mx-2">/</span>
          <Link href="/account/shopping-lists" className="hover:text-orange-500 transition-colors">Listy zakupowe</Link>
          <span className="mx-2">/</span>
          <span className="text-gray-900 dark:text-white">{list?.name || 'Lista'}</span>
        </nav>

        {/* Mobile back button */}
        <Link href="/account/shopping-lists" className="sm:hidden flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-4 hover:text-orange-500 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Powrót do list
        </Link>

        <div className="flex flex-col lg:flex-row gap-6">
          <AccountSidebar
            activeId="shopping-lists"
            userName={user ? `${user.firstName} ${user.lastName}` : undefined}
            userEmail={user?.email}
          />

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {!list ? (
              <div className="text-center py-16 bg-white dark:bg-secondary-800 rounded-xl border border-gray-100 dark:border-secondary-700">
                <div className="w-16 h-16 bg-gray-100 dark:bg-secondary-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Nie znaleziono listy</h3>
                <Link href="/account/shopping-lists" className="text-orange-500 hover:text-orange-600 font-medium text-sm">
                  Wróć do list zakupowych
                </Link>
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                  <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{list.name}</h1>
                    {list.description && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{list.description}</p>
                    )}
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      Utworzono {formatDate(list.createdAt)} &middot; {list.items?.length || 0} {(list.items?.length || 0) === 1 ? 'produkt' : 'produktów'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {list.items && list.items.length > 0 && (
                      <button
                        onClick={handleAddAllToCart}
                        className="bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
                        </svg>
                        Dodaj wszystko do koszyka
                      </button>
                    )}
                    <button
                      onClick={handleEditList}
                      className="p-2 text-gray-400 hover:text-orange-500 rounded-lg border border-gray-200 dark:border-secondary-600 hover:bg-gray-50 dark:hover:bg-secondary-700 transition-colors"
                      title="Edytuj listę"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={handleDeleteList}
                      className="p-2 text-gray-400 hover:text-red-500 rounded-lg border border-gray-200 dark:border-secondary-600 hover:bg-gray-50 dark:hover:bg-secondary-700 transition-colors"
                      title="Usuń listę"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Items */}
                {list.items && list.items.length > 0 ? (
                  <div className="space-y-3">
                    {list.items.map(item => {
                      const imageUrl = item.product.images?.[0]?.url;
                      const price = item.variant?.price ?? item.product.price ?? 0;
                      const compareAtPrice = item.variant?.compareAtPrice ?? item.product.compareAtPrice;
                      const isRemoving = removingItemId === item.id;
                      const isAddingToCart = addingToCartId === item.id;

                      return (
                        <div
                          key={item.id}
                          className={`bg-white dark:bg-secondary-800 rounded-xl border border-gray-100 dark:border-secondary-700 shadow-sm p-4 flex items-center gap-4 transition-opacity ${isRemoving ? 'opacity-50' : ''}`}
                        >
                          {/* Image */}
                          <Link href={`/products/${item.product.slug || item.productId}`} className="shrink-0">
                            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden bg-gray-100 dark:bg-secondary-700">
                              {imageUrl ? (
                                <Image
                                  src={imageUrl}
                                  alt={item.product.name}
                                  width={80}
                                  height={80}
                                  className="w-full h-full object-contain"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                </div>
                              )}
                            </div>
                          </Link>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <Link
                              href={`/products/${item.product.slug || item.productId}`}
                              className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white hover:text-orange-500 transition-colors line-clamp-2"
                            >
                              {item.product.name}
                            </Link>
                            {item.variant && item.variant.name && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{item.variant.name}</p>
                            )}
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-sm font-bold text-orange-600 dark:text-orange-400">
                                {formatPrice(price)}
                              </span>
                              {compareAtPrice && compareAtPrice > price && (
                                <span className="text-xs text-gray-400 line-through">
                                  {formatPrice(compareAtPrice)}
                                </span>
                              )}
                            </div>
                            {item.quantity > 1 && (
                              <p className="text-xs text-gray-400 mt-0.5">Ilość: {item.quantity}</p>
                            )}
                            {item.note && (
                              <p className="text-xs text-gray-400 mt-0.5 truncate">📝 {item.note}</p>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex flex-col gap-2 shrink-0">
                            <button
                              onClick={() => handleAddToCart(item)}
                              disabled={isAddingToCart}
                              className="w-9 h-9 bg-orange-500 text-white rounded-lg flex items-center justify-center hover:bg-orange-600 transition-colors disabled:opacity-50"
                              title="Dodaj do koszyka"
                            >
                              {isAddingToCart ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                              ) : (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
                                </svg>
                              )}
                            </button>
                            <button
                              onClick={() => handleRemoveItem(item)}
                              disabled={isRemoving}
                              className="w-9 h-9 border border-gray-200 dark:border-secondary-600 text-gray-400 hover:text-red-500 rounded-lg flex items-center justify-center hover:bg-gray-50 dark:hover:bg-secondary-700 transition-colors disabled:opacity-50"
                              title="Usuń z listy"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-16 bg-white dark:bg-secondary-800 rounded-xl border border-gray-100 dark:border-secondary-700">
                    <div className="w-16 h-16 bg-gray-100 dark:bg-secondary-700 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Lista jest pusta</h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-sm mx-auto">
                      Dodawaj produkty do tej listy ze strony produktu
                    </p>
                    <Link
                      href="/"
                      className="inline-block bg-orange-500 text-white px-6 py-2 rounded-lg font-medium hover:bg-orange-600 transition-colors"
                    >
                      Przeglądaj produkty
                    </Link>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>

      {/* Edit Modal */}
      {editModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setEditModalOpen(false)}>
          <div
            className="bg-white dark:bg-secondary-800 rounded-xl shadow-xl w-full max-w-md"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Edytuj listę</h2>
                <button onClick={() => setEditModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nazwa listy *</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="w-full border border-gray-300 dark:border-secondary-600 dark:bg-secondary-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Opis (opcjonalnie)</label>
                  <textarea
                    value={editDescription}
                    onChange={e => setEditDescription(e.target.value)}
                    className="w-full border border-gray-300 dark:border-secondary-600 dark:bg-secondary-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                    rows={3}
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleSaveEdit}
                  disabled={!editName.trim() || saving}
                  className="flex-1 bg-orange-500 text-white py-2 rounded-lg font-medium hover:bg-orange-600 transition-colors disabled:opacity-50"
                >
                  {saving ? 'Zapisywanie...' : 'Zapisz'}
                </button>
                <button
                  onClick={() => setEditModalOpen(false)}
                  className="flex-1 border border-gray-300 dark:border-secondary-600 text-gray-700 dark:text-gray-300 py-2 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-secondary-700 transition-colors"
                >
                  Anuluj
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
