/**
 * Price History Routes
 * 
 * Endpoints do zarządzania historią cen (Omnibus Directive compliance)
 */

import { Router } from 'express';
import { 
  getProductPriceHistory,
  getVariantPriceHistory,
  updateProductPrice,
  updateVariantPrice,
  recalculateAllLowestPrices,
  findMismatches
} from '../controllers/price-history.controller';
import { authGuard, adminOnly } from '../middleware/auth.middleware';

const router = Router();

// ========================================
// ADMIN ROUTES - Require admin authentication
// All price history endpoints are admin-only for security and audit purposes
// ========================================

// Get price history for a product
router.get('/product/:productId', authGuard, adminOnly, getProductPriceHistory);

// Get price history for a variant
router.get('/variant/:variantId', authGuard, adminOnly, getVariantPriceHistory);

// Update product price with history tracking
router.post('/product/:productId/update', authGuard, adminOnly, updateProductPrice);

// Update variant price with history tracking
router.post('/variant/:variantId/update', authGuard, adminOnly, updateVariantPrice);

// Recalculate all lowest prices (admin maintenance task)
router.post('/recalculate', authGuard, adminOnly, recalculateAllLowestPrices);

// Find mismatches between stored and calculated lowestPrice30Days (audit)
router.get('/audit/mismatches', authGuard, adminOnly, findMismatches);

export default router;
