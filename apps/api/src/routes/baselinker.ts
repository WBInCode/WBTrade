/**
 * Baselinker Admin Routes
 * 
 * All routes require admin authentication
 * Prefix: /api/admin/baselinker
 */

import { Router } from 'express';
import { baselinkerController } from '../controllers/baselinker.controller';
import { authGuard, adminOnly } from '../middleware/auth.middleware';

const router = Router();

// Apply auth middleware to all routes
router.use(authGuard);
router.use(adminOnly);

// Configuration endpoints
router.post('/config', baselinkerController.saveConfig);
router.get('/config', baselinkerController.getConfig);
router.delete('/config', baselinkerController.deleteConfig);

// Connection test
router.post('/test', baselinkerController.testConnection);

// Product sync endpoints (Baselinker → Shop)
router.post('/sync', baselinkerController.triggerSync);
router.get('/status', baselinkerController.getStatus);
router.delete('/sync/:id', baselinkerController.cancelSync);

// Order sync endpoints (Shop → Baselinker)
// Orders are synced after payment to decrease stock in Baselinker
router.post('/orders/sync', baselinkerController.syncPendingOrders);
router.post('/orders/:orderId/sync', baselinkerController.syncOrder);

// Inventories list
router.get('/inventories', baselinkerController.getInventories);

export default router;
