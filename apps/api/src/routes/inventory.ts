import { Router } from 'express';
import {
  getStock,
  getAvailableStock,
  reserveStock,
  releaseStock,
  receiveGoods,
  shipGoods,
  transferStock,
  adjustStock,
  getLowStock,
  getMovementHistory,
  setMinimumStock,
} from '../controllers/inventory.controller';
import { authGuard, warehouseAccess, optionalAuth } from '../middleware/auth.middleware';

const router = Router();

// Public routes (check stock availability)
router.get('/:variantId', optionalAuth, getStock);
router.get('/:variantId/available', getAvailableStock);

// Protected routes (warehouse operations)
router.get('/alerts/low-stock', authGuard, warehouseAccess, getLowStock);
router.get('/:variantId/movements', authGuard, warehouseAccess, getMovementHistory);

// Stock operations (require warehouse access)
router.post('/reserve', authGuard, warehouseAccess, reserveStock);
router.post('/release', authGuard, warehouseAccess, releaseStock);
router.post('/receive', authGuard, warehouseAccess, receiveGoods);
router.post('/ship', authGuard, warehouseAccess, shipGoods);
router.post('/transfer', authGuard, warehouseAccess, transferStock);
router.post('/adjust', authGuard, warehouseAccess, adjustStock);
router.post('/minimum', authGuard, warehouseAccess, setMinimumStock);

export default router;
