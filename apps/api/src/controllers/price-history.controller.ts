/**
 * Price History Controller
 * 
 * Endpoints do audytu historii cen (Omnibus Directive compliance)
 */

import { Request, Response } from 'express';
import { priceHistoryService } from '../services/price-history.service';
import { PriceChangeSource } from '@prisma/client';

/**
 * GET /price-history/product/:productId
 * Pobiera historię cen dla produktu
 */
export async function getProductPriceHistory(req: Request, res: Response): Promise<void> {
  try {
    const { productId } = req.params;
    const { limit = '50', offset = '0' } = req.query;

    const history = await priceHistoryService.getProductPriceHistory(
      productId,
      parseInt(limit as string, 10),
      parseInt(offset as string, 10)
    );

    res.status(200).json({
      productId,
      history,
      pagination: {
        limit: parseInt(limit as string, 10),
        offset: parseInt(offset as string, 10),
      },
    });
  } catch (error) {
    console.error('Error fetching product price history:', error);
    res.status(500).json({ 
      message: 'Error fetching price history', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}

/**
 * GET /price-history/variant/:variantId
 * Pobiera historię cen dla wariantu
 */
export async function getVariantPriceHistory(req: Request, res: Response): Promise<void> {
  try {
    const { variantId } = req.params;
    const { limit = '50', offset = '0' } = req.query;

    const history = await priceHistoryService.getVariantPriceHistory(
      variantId,
      parseInt(limit as string, 10),
      parseInt(offset as string, 10)
    );

    res.status(200).json({
      variantId,
      history,
      pagination: {
        limit: parseInt(limit as string, 10),
        offset: parseInt(offset as string, 10),
      },
    });
  } catch (error) {
    console.error('Error fetching variant price history:', error);
    res.status(500).json({ 
      message: 'Error fetching price history',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * POST /price-history/product/:productId/update
 * Ręczna aktualizacja ceny produktu przez admina
 */
export async function updateProductPrice(req: Request, res: Response): Promise<void> {
  try {
    const { productId } = req.params;
    const { newPrice, reason } = req.body;

    if (typeof newPrice !== 'number' || newPrice < 0) {
      res.status(400).json({ message: 'newPrice must be a non-negative number' });
      return;
    }

    // Get user ID from auth middleware
    const userId = (req as any).user?.id;

    const result = await priceHistoryService.updateProductPrice({
      productId,
      newPrice,
      source: PriceChangeSource.ADMIN,
      changedBy: userId,
      reason: reason || 'Manual price update via admin API',
    });

    res.status(200).json({
      message: 'Price updated successfully',
      result,
    });
  } catch (error) {
    console.error('Error updating product price:', error);
    res.status(500).json({ 
      message: 'Error updating price',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * POST /price-history/variant/:variantId/update
 * Ręczna aktualizacja ceny wariantu przez admina
 */
export async function updateVariantPrice(req: Request, res: Response): Promise<void> {
  try {
    const { variantId } = req.params;
    const { newPrice, reason } = req.body;

    if (typeof newPrice !== 'number' || newPrice < 0) {
      res.status(400).json({ message: 'newPrice must be a non-negative number' });
      return;
    }

    const userId = (req as any).user?.id;

    const result = await priceHistoryService.updateVariantPrice({
      variantId,
      newPrice,
      source: PriceChangeSource.ADMIN,
      changedBy: userId,
      reason: reason || 'Manual price update via admin API',
    });

    res.status(200).json({
      message: 'Price updated successfully',
      result,
    });
  } catch (error) {
    console.error('Error updating variant price:', error);
    res.status(500).json({ 
      message: 'Error updating price',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * POST /price-history/recalculate
 * Przelicza lowestPrice30Days dla wszystkich produktów i wariantów
 * UWAGA: Może być wolne dla dużych katalogów
 */
export async function recalculateAllLowestPrices(req: Request, res: Response): Promise<void> {
  try {
    console.log('[PriceHistory] Starting full recalculation of lowestPrice30Days...');
    
    const productResults = await priceHistoryService.recalculateAllProducts();
    const variantResults = await priceHistoryService.recalculateAllVariants();

    res.status(200).json({
      message: 'Recalculation completed',
      products: productResults,
      variants: variantResults,
    });
  } catch (error) {
    console.error('Error recalculating lowest prices:', error);
    res.status(500).json({ 
      message: 'Error during recalculation',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * GET /price-history/audit/mismatches
 * Znajduje produkty gdzie zapisane lowestPrice30Days nie zgadza się z wyliczonym
 * Przydatne do audytu i debug'owania
 */
export async function findMismatches(req: Request, res: Response): Promise<void> {
  try {
    const { limit = '100' } = req.query;
    
    const mismatches = await priceHistoryService.findProductsWithMismatch(
      parseInt(limit as string, 10)
    );

    res.status(200).json({
      message: 'Mismatch check completed',
      count: mismatches.length,
      mismatches,
    });
  } catch (error) {
    console.error('Error checking mismatches:', error);
    res.status(500).json({ 
      message: 'Error checking mismatches',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
