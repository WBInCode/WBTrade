import { Request, Response } from 'express';
import { wishlistService } from '../services/wishlist.service';

export class WishlistController {
  /**
   * GET /api/wishlist
   * Get user's wishlist
   */
  async getWishlist(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      
      if (!userId) {
        res.status(401).json({ error: 'Wymagane zalogowanie' });
        return;
      }

      const items = await wishlistService.getWishlist(userId);
      res.json({ items, count: items.length });
    } catch (error: any) {
      console.error('Get wishlist error:', error);
      res.status(500).json({ error: 'Błąd pobierania listy życzeń' });
    }
  }

  /**
   * POST /api/wishlist
   * Add product to wishlist
   */
  async addToWishlist(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      
      if (!userId) {
        res.status(401).json({ error: 'Wymagane zalogowanie' });
        return;
      }

      const { productId, variantId } = req.body;

      if (!productId) {
        res.status(400).json({ error: 'Wymagane productId' });
        return;
      }

      const item = await wishlistService.addToWishlist(userId, productId, variantId);
      res.status(201).json(item);
    } catch (error: any) {
      console.error('Add to wishlist error:', error);
      res.status(500).json({ error: error.message || 'Błąd dodawania do listy życzeń' });
    }
  }

  /**
   * DELETE /api/wishlist/:productId
   * Remove product from wishlist
   */
  async removeFromWishlist(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      
      if (!userId) {
        res.status(401).json({ error: 'Wymagane zalogowanie' });
        return;
      }

      const { productId } = req.params;

      await wishlistService.removeFromWishlist(userId, productId);
      res.status(204).send();
    } catch (error: any) {
      console.error('Remove from wishlist error:', error);
      res.status(500).json({ error: 'Błąd usuwania z listy życzeń' });
    }
  }

  /**
   * GET /api/wishlist/check/:productId
   * Check if product is in wishlist
   */
  async checkWishlist(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      
      if (!userId) {
        res.json({ inWishlist: false });
        return;
      }

      const { productId } = req.params;
      const inWishlist = await wishlistService.isInWishlist(userId, productId);
      res.json({ inWishlist });
    } catch (error: any) {
      console.error('Check wishlist error:', error);
      res.status(500).json({ error: 'Błąd sprawdzania listy życzeń' });
    }
  }

  /**
   * DELETE /api/wishlist
   * Clear wishlist
   */
  async clearWishlist(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      
      if (!userId) {
        res.status(401).json({ error: 'Wymagane zalogowanie' });
        return;
      }

      await wishlistService.clearWishlist(userId);
      res.status(204).send();
    } catch (error: any) {
      console.error('Clear wishlist error:', error);
      res.status(500).json({ error: 'Błąd czyszczenia listy życzeń' });
    }
  }

  /**
   * POST /api/wishlist/merge
   * Merge local wishlist with user's wishlist (called after login)
   */
  async mergeWishlist(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      
      if (!userId) {
        res.status(401).json({ error: 'Wymagane zalogowanie' });
        return;
      }

      const { items } = req.body;

      if (!Array.isArray(items)) {
        res.status(400).json({ error: 'Wymagana tablica items' });
        return;
      }

      const mergedItems = await wishlistService.mergeWishlist(userId, items);
      res.json({ items: mergedItems, count: mergedItems.length });
    } catch (error: any) {
      console.error('Merge wishlist error:', error);
      res.status(500).json({ error: 'Błąd łączenia list życzeń' });
    }
  }
}

export const wishlistController = new WishlistController();
