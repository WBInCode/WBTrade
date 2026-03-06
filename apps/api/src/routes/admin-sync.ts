import { Router } from 'express';
import { prisma } from '../db';
import { authGuard, adminOnly } from '../middleware/auth.middleware';
import path from 'path';

const router = Router();

// All routes require admin auth
router.use(authGuard, adminOnly);

// Root dir of the api package (one level up from src/routes → apps/api)
const SCRIPTS_DIR = path.resolve(__dirname, '../..');  // apps/api/src/routes → apps/api

const XML_SOURCES: Record<string, string> = {
  leker: 'https://b2b.leker.pl/xml/drop_pln_pl_light.xml',
  btp: 'https://ext.btp.link/Gateway/ExportData/InventoryReport?Format=Xml&u=7C93A576-737A-4E62-B0AD-C2CB40FAB893&uc=A694FB15-1C0E-4A1C-81B8-6423BB43547A',
};

/**
 * POST /api/admin/sync/prices-xml
 * Ręczne uruchomienie synchronizacji cen z XML
 * Body: { warehouse: 'leker' | 'btp' | 'all' }
 */
router.post('/prices-xml', async (req, res) => {
  const warehouse = (req.body?.warehouse as string) || 'all';

  if (!['leker', 'btp', 'all'].includes(warehouse)) {
    return res.status(400).json({ message: 'Nieprawidłowy warehouse. Dozwolone: leker, btp, all' });
  }

  try {
    // Try BullMQ first (requires Redis)
    const { triggerImmediatePriceXmlSync } = await import('../workers/baselinker-sync.worker');
    const jobId = await triggerImmediatePriceXmlSync(warehouse as 'leker' | 'btp' | 'all');
    return res.json({ success: true, jobId, status: 'queued', warehouse });
  } catch {
    // Fallback: run sync directly in-process if BullMQ / Redis unavailable
    console.warn('[AdminSync] BullMQ unavailable, running sync directly');
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { syncLekerXmlPrices } = require(path.join(SCRIPTS_DIR, 'sync-leker-xml-prices.js')) as { syncLekerXmlPrices: () => Promise<unknown> };
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { syncBtpXmlPrices } = require(path.join(SCRIPTS_DIR, 'sync-btp-xml-prices.js')) as { syncBtpXmlPrices: () => Promise<unknown> };

      let lekerResult: unknown = null;
      let btpResult: unknown = null;

      if (warehouse === 'leker' || warehouse === 'all') lekerResult = await syncLekerXmlPrices();
      if (warehouse === 'btp' || warehouse === 'all') btpResult = await syncBtpXmlPrices();

      return res.json({ success: true, status: 'completed', warehouse, result: { leker: lekerResult, btp: btpResult } });
    } catch (syncErr) {
      const msg = syncErr instanceof Error ? syncErr.message : String(syncErr);
      console.error('[AdminSync] Direct sync failed:', syncErr);
      return res.status(500).json({ message: 'Błąd synchronizacji: ' + msg });
    }
  }
});

/**
 * GET /api/admin/sync/prices-xml/status
 * Zwraca daty ostatnich synchronizacji XML
 */
router.get('/prices-xml/status', async (_req, res) => {
  try {
    const [lekerSetting, btpSetting] = await Promise.all([
      prisma.settings.findUnique({ where: { key: 'last_sync_leker_xml' } }),
      prisma.settings.findUnique({ where: { key: 'last_sync_btp_xml' } }),
    ]);

    return res.json({
      leker: {
        lastSync: lekerSetting?.value || null,
        xmlUrl: XML_SOURCES.leker,
      },
      btp: {
        lastSync: btpSetting?.value || null,
        xmlUrl: XML_SOURCES.btp,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[AdminSync] Error fetching sync status:', err);
    return res.status(500).json({ message: 'Błąd pobierania statusu synchronizacji: ' + msg });
  }
});

export default router;
