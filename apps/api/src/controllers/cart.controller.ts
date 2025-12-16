import { Request, Response } from 'express';
import { cartService } from '../services/cart.service';

export class CartController {
  /**
   * Get current cart
   * GET /api/cart
   */
  async getCart(req: Request, res: Response) {
    try {
      const userId = req.headers['x-user-id'] as string | undefined;
      const sessionId = req.headers['x-session-id'] as string | undefined;

      if (!userId && !sessionId) {
        return res.status(400).json({
          success: false,
          message: 'Wymagany userId lub sessionId',
        });
      }

      const cart = await cartService.getOrCreateCart(userId, sessionId);

      res.json({
        success: true,
        data: cart,
      });
    } catch (error) {
      console.error('Get cart error:', error);
      res.status(500).json({
        success: false,
        message: 'Błąd podczas pobierania koszyka',
      });
    }
  }

  /**
   * Add item to cart
   * POST /api/cart/items
   */
  async addItem(req: Request, res: Response) {
    try {
      const userId = req.headers['x-user-id'] as string | undefined;
      const sessionId = req.headers['x-session-id'] as string | undefined;
      const { variantId, quantity = 1 } = req.body;

      if (!variantId) {
        return res.status(400).json({
          success: false,
          message: 'Wymagany variantId',
        });
      }

      // Get or create cart
      const cart = await cartService.getOrCreateCart(userId, sessionId);

      // Add item
      const updatedCart = await cartService.addItem(cart.id, variantId, quantity);

      res.json({
        success: true,
        data: updatedCart,
        message: 'Produkt dodany do koszyka',
      });
    } catch (error) {
      console.error('Add to cart error:', error);
      res.status(500).json({
        success: false,
        message: 'Błąd podczas dodawania do koszyka',
      });
    }
  }

  /**
   * Update item quantity
   * PATCH /api/cart/items/:itemId
   */
  async updateItem(req: Request, res: Response) {
    try {
      const userId = req.headers['x-user-id'] as string | undefined;
      const sessionId = req.headers['x-session-id'] as string | undefined;
      const { itemId } = req.params;
      const { quantity } = req.body;

      if (quantity === undefined) {
        return res.status(400).json({
          success: false,
          message: 'Wymagana ilość (quantity)',
        });
      }

      const cart = await cartService.getOrCreateCart(userId, sessionId);
      const updatedCart = await cartService.updateItemQuantity(cart.id, itemId, quantity);

      res.json({
        success: true,
        data: updatedCart,
      });
    } catch (error) {
      console.error('Update cart item error:', error);
      res.status(500).json({
        success: false,
        message: 'Błąd podczas aktualizacji koszyka',
      });
    }
  }

  /**
   * Remove item from cart
   * DELETE /api/cart/items/:itemId
   */
  async removeItem(req: Request, res: Response) {
    try {
      const userId = req.headers['x-user-id'] as string | undefined;
      const sessionId = req.headers['x-session-id'] as string | undefined;
      const { itemId } = req.params;

      const cart = await cartService.getOrCreateCart(userId, sessionId);
      const updatedCart = await cartService.removeItem(cart.id, itemId);

      res.json({
        success: true,
        data: updatedCart,
        message: 'Produkt usunięty z koszyka',
      });
    } catch (error) {
      console.error('Remove cart item error:', error);
      res.status(500).json({
        success: false,
        message: 'Błąd podczas usuwania z koszyka',
      });
    }
  }

  /**
   * Clear cart
   * DELETE /api/cart
   */
  async clearCart(req: Request, res: Response) {
    try {
      const userId = req.headers['x-user-id'] as string | undefined;
      const sessionId = req.headers['x-session-id'] as string | undefined;

      const cart = await cartService.getOrCreateCart(userId, sessionId);
      const updatedCart = await cartService.clearCart(cart.id);

      res.json({
        success: true,
        data: updatedCart,
        message: 'Koszyk wyczyszczony',
      });
    } catch (error) {
      console.error('Clear cart error:', error);
      res.status(500).json({
        success: false,
        message: 'Błąd podczas czyszczenia koszyka',
      });
    }
  }

  /**
   * Apply coupon
   * POST /api/cart/coupon
   */
  async applyCoupon(req: Request, res: Response) {
    try {
      const userId = req.headers['x-user-id'] as string | undefined;
      const sessionId = req.headers['x-session-id'] as string | undefined;
      const { code } = req.body;

      if (!code) {
        return res.status(400).json({
          success: false,
          message: 'Wymagany kod kuponu',
        });
      }

      const cart = await cartService.getOrCreateCart(userId, sessionId);
      const updatedCart = await cartService.applyCoupon(cart.id, code);

      res.json({
        success: true,
        data: updatedCart,
        message: 'Kupon zastosowany',
      });
    } catch (error: any) {
      console.error('Apply coupon error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Błąd podczas stosowania kuponu',
      });
    }
  }

  /**
   * Remove coupon
   * DELETE /api/cart/coupon
   */
  async removeCoupon(req: Request, res: Response) {
    try {
      const userId = req.headers['x-user-id'] as string | undefined;
      const sessionId = req.headers['x-session-id'] as string | undefined;

      const cart = await cartService.getOrCreateCart(userId, sessionId);
      const updatedCart = await cartService.removeCoupon(cart.id);

      res.json({
        success: true,
        data: updatedCart,
        message: 'Kupon usunięty',
      });
    } catch (error) {
      console.error('Remove coupon error:', error);
      res.status(500).json({
        success: false,
        message: 'Błąd podczas usuwania kuponu',
      });
    }
  }

  /**
   * Merge guest cart after login
   * POST /api/cart/merge
   */
  async mergeCarts(req: Request, res: Response) {
    try {
      const userId = req.headers['x-user-id'] as string;
      const { sessionId } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Wymagane zalogowanie',
        });
      }

      if (!sessionId) {
        return res.status(400).json({
          success: false,
          message: 'Wymagany sessionId',
        });
      }

      const cart = await cartService.mergeCarts(userId, sessionId);

      res.json({
        success: true,
        data: cart,
        message: 'Koszyki połączone',
      });
    } catch (error) {
      console.error('Merge carts error:', error);
      res.status(500).json({
        success: false,
        message: 'Błąd podczas łączenia koszyków',
      });
    }
  }
}

export const cartController = new CartController();
