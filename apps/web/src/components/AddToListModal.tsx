'use client';

import { useState, useEffect, useCallback } from 'react';
import { shoppingListApi, ShoppingList } from '../lib/api';

interface AddToListModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  productName?: string;
  variantId?: string;
}

export default function AddToListModal({ isOpen, onClose, productId, productName, variantId }: AddToListModalProps) {
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewListInput, setShowNewListInput] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [creating, setCreating] = useState(false);
  const [addingToListId, setAddingToListId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchLists = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      const data = await shoppingListApi.getAll();
      setLists(data.lists || []);
    } catch {
      setErrorMessage('Nie udało się pobrać list');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchLists();
      setShowNewListInput(false);
      setNewListName('');
      setSuccessMessage(null);
      setErrorMessage(null);
    }
  }, [isOpen, fetchLists]);

  const handleAddToList = async (list: ShoppingList) => {
    try {
      setAddingToListId(list.id);
      setErrorMessage(null);
      await shoppingListApi.addItem(list.id, productId, variantId);
      setSuccessMessage(`Dodano do "${list.name}"`);
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      if (err?.response?.status === 409 || err?.message?.includes('already')) {
        setErrorMessage('Produkt jest już na tej liście');
      } else {
        setErrorMessage('Nie udało się dodać do listy');
      }
    } finally {
      setAddingToListId(null);
    }
  };

  const handleCreateAndAdd = async () => {
    if (!newListName.trim()) return;
    try {
      setCreating(true);
      setErrorMessage(null);
      const newList = await shoppingListApi.create(newListName.trim());
      await shoppingListApi.addItem(newList.id, productId, variantId);
      setSuccessMessage(`Dodano do "${newList.name}"`);
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch {
      setErrorMessage('Nie udało się utworzyć listy');
    } finally {
      setCreating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white dark:bg-secondary-800 rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Dodaj do listy zakupowej</h2>
            {productName && (
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 truncate max-w-[360px]">{productName}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-2 -mr-2 rounded-lg hover:bg-gray-100 dark:hover:bg-secondary-700"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="border-b border-gray-100 dark:border-secondary-700" />

        {/* Success message */}
        {successMessage && (
          <div className="mx-6 mt-5 flex items-center gap-3 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 px-5 py-4 rounded-xl text-sm font-medium">
            <svg className="w-6 h-6 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            {successMessage}
          </div>
        )}

        {/* Error message */}
        {errorMessage && (
          <div className="mx-6 mt-5 flex items-center gap-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 px-5 py-4 rounded-xl text-sm font-medium">
            <svg className="w-6 h-6 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {errorMessage}
          </div>
        )}

        {/* Lists */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <svg className="animate-spin w-8 h-8 text-orange-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
          ) : (
            <>
              {lists.length > 0 ? (
                <div className="space-y-3">
                  {lists.map((list) => {
                    const isAdding = addingToListId === list.id;
                    return (
                      <button
                        key={list.id}
                        onClick={() => handleAddToList(list)}
                        disabled={isAdding || !!successMessage}
                        className="w-full flex items-center justify-between px-4 py-4 rounded-xl border border-gray-200 dark:border-secondary-600 hover:border-orange-300 dark:hover:border-orange-500/50 hover:bg-orange-50/50 dark:hover:bg-orange-900/10 hover:shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                      >
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="w-11 h-11 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center flex-shrink-0">
                            <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                          </div>
                          <div className="text-left min-w-0">
                            <p className="text-base font-semibold text-gray-900 dark:text-white truncate">{list.name}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                              {list.itemCount} {list.itemCount === 1 ? 'produkt' : list.itemCount < 5 ? 'produkty' : 'produktów'}
                            </p>
                          </div>
                        </div>
                        {isAdding ? (
                          <svg className="animate-spin w-5 h-5 text-orange-500 flex-shrink-0 ml-3" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                        ) : (
                          <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-secondary-700 group-hover:bg-orange-100 dark:group-hover:bg-orange-900/30 flex items-center justify-center flex-shrink-0 ml-3 transition-colors">
                            <svg className="w-4 h-4 text-gray-400 group-hover:text-orange-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : !showNewListInput ? (
                <div className="flex flex-col items-center py-12 text-center">
                  <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-secondary-700 flex items-center justify-center mb-4">
                    <svg className="w-10 h-10 text-gray-300 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <p className="text-base font-medium text-gray-700 dark:text-gray-300">Nie masz jeszcze żadnych list</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5">Utwórz swoją pierwszą listę zakupową</p>
                </div>
              ) : null}
            </>
          )}
        </div>

        {/* Create new list section */}
        <div className="px-6 pb-6 border-t border-gray-100 dark:border-secondary-700 pt-5">
          {showNewListInput ? (
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Nazwa nowej listy..."
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newListName.trim()) handleCreateAndAdd();
                }}
                autoFocus
                maxLength={100}
                className="w-full px-4 py-3 border border-gray-300 dark:border-secondary-600 rounded-xl text-sm bg-white dark:bg-secondary-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowNewListInput(false);
                    setNewListName('');
                  }}
                  className="flex-1 py-3 px-4 rounded-xl border border-gray-300 dark:border-secondary-600 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-secondary-700 transition-colors"
                >
                  Anuluj
                </button>
                <button
                  onClick={handleCreateAndAdd}
                  disabled={!newListName.trim() || creating}
                  className="flex-1 py-3 px-4 rounded-xl bg-orange-500 text-white text-sm font-semibold hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {creating ? (
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  ) : (
                    'Utwórz i dodaj'
                  )}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowNewListInput(true)}
              disabled={!!successMessage}
              className="w-full flex items-center justify-center gap-2.5 py-3.5 px-4 rounded-xl border-2 border-dashed border-gray-300 dark:border-secondary-600 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:border-orange-400 dark:hover:border-orange-500/50 hover:text-orange-500 dark:hover:text-orange-400 hover:bg-orange-50/30 dark:hover:bg-orange-900/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Utwórz nową listę
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
