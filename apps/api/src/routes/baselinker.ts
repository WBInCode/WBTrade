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
import { paymentReminderService } from '../services/payment-reminder.service';

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

// ========================================
// Payment Reminder Admin Endpoints
// ========================================

/**
 * POST /api/admin/baselinker/payment-reminders/trigger
 * Manually trigger payment reminder processing
 * Useful for testing or immediate processing
 */
router.post('/payment-reminders/trigger', async (req, res) => {
  try {
    console.log('[Admin] Manually triggering payment reminder processing');
    const result = await paymentReminderService.processUnpaidOrders();
    res.json({ 
      success: true, 
      message: `Processed ${result.processed} orders: ${result.remindersSent} reminders sent, ${result.ordersCancelled} cancelled`,
      ...result 
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Admin] Payment reminder trigger error:', error);
    res.status(500).json({ success: false, error: errorMessage });
  }
});

export default router;
