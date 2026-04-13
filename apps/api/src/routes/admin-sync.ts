import { Router } from 'express';
import { prisma } from '../db';
import { authGuard, adminOnly } from '../middleware/auth.middleware';

const router = Router();

// All routes require admin auth
router.use(authGuard, adminOnly);

/**
 * POST /api/admin/sync/prices
 * Ręczne uruchomienie synchronizacji cen z Baselinker API
 */
router.post('/prices', async (req, res) => {
  try {
    // Try BullMQ first (requires Redis)
    const { triggerImmediatePriceSync } = await import('../workers/baselinker-sync.worker');
    const jobId = await triggerImmediatePriceSync();
    return res.json({ success: true, jobId, status: 'queued' });
  } catch {
    // Fallback: run sync directly in-process if BullMQ / Redis unavailable
    console.warn('[AdminSync] BullMQ unavailable, running price sync directly');
    try {
      const { BaselinkerService } = await import('../services/baselinker.service');
      const baselinkerService = new BaselinkerService();
      const result = await baselinkerService.runPriceSyncDirect();
      return res.json({ success: true, status: 'completed', result });
    } catch (syncErr) {
      const msg = syncErr instanceof Error ? syncErr.message : String(syncErr);
      console.error('[AdminSync] Direct price sync failed:', syncErr);
      return res.status(500).json({ message: 'Błąd synchronizacji cen: ' + msg });
    }
  }
});

/**
 * GET /api/admin/sync/prices/status
 * Zwraca datę ostatniej synchronizacji cen z Baselinker
 */
router.get('/prices/status', async (_req, res) => {
  try {
    const lastSync = await prisma.baselinkerSyncLog.findFirst({
      where: { type: 'PRICE' },
      orderBy: { startedAt: 'desc' },
      select: { startedAt: true, completedAt: true, status: true, itemsProcessed: true, itemsChanged: true },
    });

    return res.json({
      source: 'baselinker-api',
      lastSync: lastSync || null,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[AdminSync] Error fetching sync status:', err);
    return res.status(500).json({ message: 'Błąd pobierania statusu synchronizacji: ' + msg });
  }
});

export default router;
