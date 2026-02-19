import { api } from './api';
import type { ShoppingList, ShoppingListsResponse, ShoppingListItem } from './types';

export const shoppingListApi = {
  /** Get all user's shopping lists */
  getAll: async (): Promise<ShoppingListsResponse> => {
    return api.get<ShoppingListsResponse>('/shopping-lists');
  },

  /** Get a single shopping list with items */
  getOne: async (listId: string): Promise<ShoppingList> => {
    return api.get<ShoppingList>(`/shopping-lists/${listId}`);
  },

  /** Create a new shopping list */
  create: async (name: string, description?: string): Promise<ShoppingList> => {
    return api.post<ShoppingList>('/shopping-lists', { name, description });
  },

  /** Update a shopping list */
  update: async (listId: string, data: { name?: string; description?: string }): Promise<ShoppingList> => {
    return api.put<ShoppingList>(`/shopping-lists/${listId}`, data);
  },

  /** Delete a shopping list */
  delete: async (listId: string): Promise<void> => {
    await api.delete(`/shopping-lists/${listId}`);
  },

  /** Add product to a shopping list */
  addItem: async (
    listId: string,
    productId: string,
    variantId?: string,
    quantity?: number,
    note?: string
  ): Promise<ShoppingListItem> => {
    return api.post<ShoppingListItem>(`/shopping-lists/${listId}/items`, {
      productId,
      variantId,
      quantity,
      note,
    });
  },

  /** Remove item from a shopping list */
  removeItem: async (listId: string, itemId: string): Promise<void> => {
    await api.delete(`/shopping-lists/${listId}/items/${itemId}`);
  },

  /** Get lists that contain a specific product */
  getListsForProduct: async (productId: string): Promise<{ lists: { listId: string; listName: string }[] }> => {
    return api.get<{ lists: { listId: string; listName: string }[] }>(`/shopping-lists/product/${productId}`);
  },
};
