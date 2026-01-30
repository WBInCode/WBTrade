/**
 * Baselinker Admin Routes
 * 
 * All routes require admin authentication
 * Prefix: /api/admin/baselinker
 */

import { Router } from 'express';
import { baselinkerController } from '../controllers/baselinker.controller';
import { authGuard, adminOnly } from '../middleware/auth.middleware';
import { orderStatusSyncService } from '../services/order-status-sync.service';

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

// Order status sync (Baselinker → Shop)
// Syncs order statuses from Baselinker (e.g., SHIPPED, DELIVERED)
router.post('/orders/sync-statuses', async (req, res) => {
  try {
    const hoursBack = parseInt(req.query.hours as string) || 24;
    const result = await orderStatusSyncService.syncOrderStatuses(hoursBack);
    res.json({ 
      success: true, 
      message: `Synced ${result.synced} orders, skipped ${result.skipped}`,
      ...result 
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get Baselinker status list (for mapping configuration)
router.get('/order-statuses', async (req, res) => {
  try {
    const statuses = await orderStatusSyncService.getBaselinkerStatuses();
    res.json({ success: true, statuses });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Manual order/stock sync endpoints (legacy/alternative)
router.post('/send-order/:orderId', baselinkerController.sendOrder);
router.post('/sync-stock/:variantId', baselinkerController.syncStock);
router.post('/sync-all-stock', baselinkerController.syncAllStock);

// Inventories list
router.get('/inventories', baselinkerController.getInventories);

export default router;
