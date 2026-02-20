'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import Header from '../../../components/Header';
import Footer from '../../../components/Footer';
import AccountSidebar from '../../../components/AccountSidebar';
import { useAuth } from '../../../contexts/AuthContext';
import { shoppingListApi, ShoppingList } from '../../../lib/api';

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('pl-PL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function ShoppingListsPage() {
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListDescription, setNewListDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [editingList, setEditingList] = useState<ShoppingList | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  const fetchLists = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const response = await shoppingListApi.getAll();
      setLists(response.lists || []);
    } catch (error) {
      console.error('Error fetching shopping lists:', error);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchLists();
  }, [fetchLists]);

  const handleCreate = async () => {
    if (!newListName.trim()) return;
    setCreating(true);
    try {
      await shoppingListApi.create(newListName.trim(), newListDescription.trim() || undefined);
      setNewListName('');
      setNewListDescription('');
      setShowCreateModal(false);
      fetchLists();
    } catch (error) {
      console.error('Error creating list:', error);
    } finally {
      setCreating(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingList || !editName.trim()) return;
    try {
      await shoppingListApi.update(editingList.id, {
        name: editName.trim(),
        description: editDescription.trim() || undefined,
      });
      setEditingList(null);
      fetchLists();
    } catch (error) {
      console.error('Error updating list:', error);
    }
  };

  const handleDelete = async (listId: string) => {
    if (!confirm('Czy na pewno chcesz usunąć tę listę zakupową?')) return;
    setDeletingId(listId);
    try {
      await shoppingListApi.delete(listId);
      setLists(prev => prev.filter(l => l.id !== listId));
    } catch (error) {
      console.error('Error deleting list:', error);
    } finally {
      setDeletingId(null);
    }
  };

  if (isLoading) {
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
          <span className="text-gray-900 dark:text-white">Listy zakupowe</span>
        </nav>

        {/* Mobile back button */}
        <Link href="/account" className="sm:hidden flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-4 hover:text-orange-500 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Powrót do konta
        </Link>

        <div className="flex flex-col lg:flex-row gap-6">
          <AccountSidebar
            activeId="shopping-lists"
            userName={user ? `${user.firstName} ${user.lastName}` : undefined}
            userEmail={user?.email}
          />

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Listy zakupowe</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {lists.length} {lists.length === 1 ? 'lista' : lists.length >= 2 && lists.length <= 4 ? 'listy' : 'list'}
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Nowa lista
              </button>
            </div>

            {/* Content */}
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
              </div>
            ) : lists.length > 0 ? (
              <div className="grid gap-4">
                {lists.map(list => (
                  <div
                    key={list.id}
                    className="bg-white dark:bg-secondary-800 rounded-xl border border-gray-100 dark:border-secondary-700 shadow-sm hover:shadow-md transition-all"
                  >
                    <div className="p-4 sm:p-5">
                      <div className="flex items-start justify-between">
                        <Link href={`/account/shopping-lists/${list.id}`} className="flex-1 min-w-0">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white hover:text-orange-500 transition-colors truncate">
                            {list.name}
                          </h3>
                          {list.description && (
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{list.description}</p>
                          )}
                          <div className="flex items-center gap-4 mt-3 text-xs text-gray-400 dark:text-gray-500">
                            <span className="flex items-center gap-1">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                              </svg>
                              {list.itemCount || 0} {(list.itemCount || 0) === 1 ? 'produkt' : 'produktów'}
                            </span>
                            <span className="flex items-center gap-1">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              {formatDate(list.createdAt)}
                            </span>
                          </div>
                        </Link>

                        {/* Actions */}
                        <div className="flex items-center gap-1 ml-4 shrink-0">
                          <button
                            onClick={() => {
                              setEditingList(list);
                              setEditName(list.name);
                              setEditDescription(list.description || '');
                            }}
                            className="p-2 text-gray-400 hover:text-orange-500 rounded-lg hover:bg-gray-50 dark:hover:bg-secondary-700 transition-colors"
                            title="Edytuj"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(list.id)}
                            disabled={deletingId === list.id}
                            className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-gray-50 dark:hover:bg-secondary-700 transition-colors disabled:opacity-50"
                            title="Usuń"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-white dark:bg-secondary-800 rounded-xl border border-gray-100 dark:border-secondary-700">
                <div className="w-16 h-16 bg-gray-100 dark:bg-secondary-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Brak list zakupowych</h3>
                <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-sm mx-auto">
                  Utwórz swoją pierwszą listę zakupową, aby łatwiej organizować zakupy!
                </p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-block bg-orange-500 text-white px-6 py-2 rounded-lg font-medium hover:bg-orange-600 transition-colors"
                >
                  Utwórz listę
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowCreateModal(false)}>
          <div
            className="bg-white dark:bg-secondary-800 rounded-xl shadow-xl w-full max-w-md"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Nowa lista zakupowa</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nazwa listy *</label>
                  <input
                    type="text"
                    value={newListName}
                    onChange={e => setNewListName(e.target.value)}
                    className="w-full border border-gray-300 dark:border-secondary-600 dark:bg-secondary-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="np. Zakupy na weekend"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Opis (opcjonalnie)</label>
                  <textarea
                    value={newListDescription}
                    onChange={e => setNewListDescription(e.target.value)}
                    className="w-full border border-gray-300 dark:border-secondary-600 dark:bg-secondary-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                    rows={3}
                    placeholder="Dodaj opis listy..."
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleCreate}
                  disabled={creating || !newListName.trim()}
                  className="flex-1 bg-orange-500 text-white py-2 rounded-lg font-medium hover:bg-orange-600 transition-colors disabled:opacity-50"
                >
                  {creating ? 'Tworzenie...' : 'Utwórz'}
                </button>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 border border-gray-300 dark:border-secondary-600 text-gray-700 dark:text-gray-300 py-2 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-secondary-700 transition-colors"
                >
                  Anuluj
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingList && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setEditingList(null)}>
          <div
            className="bg-white dark:bg-secondary-800 rounded-xl shadow-xl w-full max-w-md"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Edytuj listę</h2>
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
                  onClick={handleUpdate}
                  disabled={!editName.trim()}
                  className="flex-1 bg-orange-500 text-white py-2 rounded-lg font-medium hover:bg-orange-600 transition-colors disabled:opacity-50"
                >
                  Zapisz
                </button>
                <button
                  onClick={() => setEditingList(null)}
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
