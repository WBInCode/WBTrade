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
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

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
// Stock Sync Logs Endpoints
// ========================================

/**
 * GET /api/admin/baselinker/stock-sync-logs
 * Get stock synchronization logs with pagination
 */
router.get('/stock-sync-logs', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      prisma.baselinkerSyncLog.findMany({
        where: { type: 'STOCK' },
        orderBy: { startedAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          type: true,
          status: true,
          itemsProcessed: true,
          itemsChanged: true,
          errors: true,
          startedAt: true,
          completedAt: true,
        },
      }),
      prisma.baselinkerSyncLog.count({ where: { type: 'STOCK' } }),
    ]);

    res.json({
      success: true,
      logs,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: msg });
  }
});

/**
 * GET /api/admin/baselinker/stock-sync-logs/:id
 * Get single stock sync log with changed SKUs
 */
router.get('/stock-sync-logs/:id', async (req, res) => {
  try {
    const log = await prisma.baselinkerSyncLog.findUnique({
      where: { id: req.params.id },
    });

    if (!log) {
      return res.status(404).json({ success: false, error: 'Log not found' });
    }

    res.json({ success: true, log });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: msg });
  }
});

/**
 * GET /api/admin/baselinker/stock-sync-logs/:id/export
 * Export changed SKUs as CSV (Excel-compatible)
 */
router.get('/stock-sync-logs/:id/export', async (req, res) => {
  try {
    const log = await prisma.baselinkerSyncLog.findUnique({
      where: { id: req.params.id },
    });

    if (!log) {
      return res.status(404).json({ success: false, error: 'Log not found' });
    }

    const changedSkus = (log.changedSkus as any[]) || [];

    // BOM for Excel UTF-8 recognition
    const BOM = '\uFEFF';
    const header = 'SKU;Stary stan;Nowy stan;Magazyn';
    const rows = changedSkus.map(
      (s: any) => `${s.sku};${s.oldQty};${s.newQty};${s.inventory}`
    );
    const csv = BOM + [header, ...rows].join('\n');

    const date = log.startedAt.toISOString().slice(0, 10);
    const filename = `stock-sync-${date}-${log.id.slice(0, 8)}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: msg });
  }
});

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
