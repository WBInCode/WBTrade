import { Request, Response } from 'express';
import { shoppingListService } from '../services/shopping-list.service';

export class ShoppingListController {
  /**
   * GET /api/shopping-lists
   * Get all user's shopping lists
   */
  async getLists(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ error: 'Wymagane zalogowanie' });
        return;
      }

      const lists = await shoppingListService.getUserLists(userId);
      res.json({ lists });
    } catch (error: any) {
      console.error('Get shopping lists error:', error);
      res.status(500).json({ error: 'Błąd pobierania list zakupowych' });
    }
  }

  /**
   * GET /api/shopping-lists/:id
   * Get a single shopping list with items
   */
  async getList(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ error: 'Wymagane zalogowanie' });
        return;
      }

      const list = await shoppingListService.getList(userId, req.params.id);
      res.json(list);
    } catch (error: any) {
      console.error('Get shopping list error:', error);
      if (error.message === 'Lista nie została znaleziona') {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Błąd pobierania listy zakupowej' });
      }
    }
  }

  /**
   * POST /api/shopping-lists
   * Create a new shopping list
   */
  async createList(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ error: 'Wymagane zalogowanie' });
        return;
      }

      const { name, description } = req.body;
      if (!name || !name.trim()) {
        res.status(400).json({ error: 'Nazwa listy jest wymagana' });
        return;
      }

      const list = await shoppingListService.createList(userId, name.trim(), description?.trim());
      res.status(201).json(list);
    } catch (error: any) {
      console.error('Create shopping list error:', error);
      res.status(500).json({ error: 'Błąd tworzenia listy zakupowej' });
    }
  }

  /**
   * PUT /api/shopping-lists/:id
   * Update a shopping list
   */
  async updateList(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ error: 'Wymagane zalogowanie' });
        return;
      }

      const { name, description } = req.body;
      const list = await shoppingListService.updateList(userId, req.params.id, {
        name: name?.trim(),
        description: description?.trim(),
      });
      res.json(list);
    } catch (error: any) {
      console.error('Update shopping list error:', error);
      if (error.message === 'Lista nie została znaleziona') {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Błąd aktualizacji listy zakupowej' });
      }
    }
  }

  /**
   * DELETE /api/shopping-lists/:id
   * Delete a shopping list
   */
  async deleteList(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ error: 'Wymagane zalogowanie' });
        return;
      }

      await shoppingListService.deleteList(userId, req.params.id);
      res.status(204).send();
    } catch (error: any) {
      console.error('Delete shopping list error:', error);
      if (error.message === 'Lista nie została znaleziona') {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Błąd usuwania listy zakupowej' });
      }
    }
  }

  /**
   * POST /api/shopping-lists/:id/items
   * Add a product to a shopping list
   */
  async addItem(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ error: 'Wymagane zalogowanie' });
        return;
      }

      const { productId, variantId, quantity, note } = req.body;
      if (!productId) {
        res.status(400).json({ error: 'Wymagane productId' });
        return;
      }

      const item = await shoppingListService.addItem(
        userId,
        req.params.id,
        productId,
        variantId,
        quantity,
        note
      );
      res.status(201).json(item);
    } catch (error: any) {
      console.error('Add item to shopping list error:', error);
      if (error.message.includes('nie została znaleziona') || error.message.includes('nie został znaleziony')) {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Błąd dodawania do listy zakupowej' });
      }
    }
  }

  /**
   * DELETE /api/shopping-lists/:id/items/:itemId
   * Remove an item from a shopping list
   */
  async removeItem(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ error: 'Wymagane zalogowanie' });
        return;
      }

      await shoppingListService.removeItem(userId, req.params.id, req.params.itemId);
      res.status(204).send();
    } catch (error: any) {
      console.error('Remove item from shopping list error:', error);
      if (error.message === 'Lista nie została znaleziona') {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Błąd usuwania z listy zakupowej' });
      }
    }
  }

  /**
   * GET /api/shopping-lists/product/:productId
   * Get lists containing a specific product
   */
  async getListsForProduct(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.json({ lists: [] });
        return;
      }

      const lists = await shoppingListService.getListsContainingProduct(
        userId,
        req.params.productId
      );
      res.json({ lists });
    } catch (error: any) {
      console.error('Get lists for product error:', error);
      res.status(500).json({ error: 'Błąd pobierania list' });
    }
  }
}

export const shoppingListController = new ShoppingListController();
