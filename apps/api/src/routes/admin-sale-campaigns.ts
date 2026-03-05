import { Router, Request, Response } from 'express';
import { authGuard, adminOnly } from '../middleware/auth.middleware';
import { saleCampaignService } from '../services/sale-campaign.service';

const router = Router();

// All sale campaign routes require auth + admin
router.use(authGuard, adminOnly);

/**
 * GET /api/admin/sale-campaigns
 * List all sale campaigns with filters
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { page = '1', limit = '20', status, search } = req.query;
    const result = await saleCampaignService.getCampaigns({
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      status: status as any,
      search: search as string,
    });
    res.json(result);
  } catch (error) {
    console.error('Error fetching sale campaigns:', error);
    res.status(500).json({ message: 'Błąd podczas pobierania kampanii' });
  }
});

/**
 * GET /api/admin/sale-campaigns/stats
 * Get sale campaign statistics
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const stats = await saleCampaignService.getStats();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching sale campaign stats:', error);
    res.status(500).json({ message: 'Błąd podczas pobierania statystyk' });
  }
});

/**
 * GET /api/admin/sale-campaigns/affected-products
 * Preview which products will be affected by a scope
 */
router.get('/affected-products', async (req: Request, res: Response) => {
  try {
    const { scope = 'ALL', scopeValue, limit = '50' } = req.query;
    const scopeValueArr = scopeValue ? (scopeValue as string).split(',') : [];
    const result = await saleCampaignService.getAffectedProducts(
      scope as any,
      scopeValueArr,
      parseInt(limit as string)
    );
    res.json(result);
  } catch (error) {
    console.error('Error fetching affected products:', error);
    res.status(500).json({ message: 'Błąd podczas pobierania produktów' });
  }
});

/**
 * GET /api/admin/sale-campaigns/:id
 * Get single campaign with details
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const campaign = await saleCampaignService.getCampaignById(req.params.id);
    if (!campaign) {
      res.status(404).json({ message: 'Kampania nie znaleziona' });
      return;
    }
    res.json(campaign);
  } catch (error) {
    console.error('Error fetching sale campaign:', error);
    res.status(500).json({ message: 'Błąd podczas pobierania kampanii' });
  }
});

/**
 * POST /api/admin/sale-campaigns
 * Create a new sale campaign
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, description, discountType, discountValue, roundTo99, startsAt, endsAt, scope, scopeValue, stackableWithCoupons } = req.body;

    if (!name || discountValue === undefined || discountValue === null) {
      res.status(400).json({ message: 'Nazwa i wartość rabatu są wymagane' });
      return;
    }

    if (discountType === 'PERCENTAGE' && (discountValue <= 0 || discountValue >= 100)) {
      res.status(400).json({ message: 'Rabat procentowy musi być między 0 a 100' });
      return;
    }

    if (discountType === 'MULTIPLIER' && (discountValue <= 0 || discountValue >= 1)) {
      res.status(400).json({ message: 'Mnożnik musi być między 0 a 1 (np. 0.8 = 20% rabatu)' });
      return;
    }

    const userId = (req as any).user?.id;

    const campaign = await saleCampaignService.createCampaign({
      name,
      description,
      discountType: discountType || 'PERCENTAGE',
      discountValue: parseFloat(discountValue),
      roundTo99: roundTo99 ?? false,
      startsAt: startsAt ? new Date(startsAt) : null,
      endsAt: endsAt ? new Date(endsAt) : null,
      scope: scope || 'ALL',
      scopeValue: scopeValue || [],
      stackableWithCoupons: stackableWithCoupons ?? true,
      createdBy: userId,
    });

    res.status(201).json(campaign);
  } catch (error: any) {
    console.error('Error creating sale campaign:', error);
    res.status(400).json({ message: error.message || 'Błąd podczas tworzenia kampanii' });
  }
});

/**
 * PUT /api/admin/sale-campaigns/:id
 * Update a sale campaign
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { name, description, discountType, discountValue, roundTo99, startsAt, endsAt, scope, scopeValue, stackableWithCoupons } = req.body;

    const campaign = await saleCampaignService.updateCampaign(req.params.id, {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(discountType !== undefined && { discountType }),
      ...(discountValue !== undefined && { discountValue: parseFloat(discountValue) }),
      ...(roundTo99 !== undefined && { roundTo99 }),
      ...(startsAt !== undefined && { startsAt: startsAt ? new Date(startsAt) : null }),
      ...(endsAt !== undefined && { endsAt: endsAt ? new Date(endsAt) : null }),
      ...(scope !== undefined && { scope }),
      ...(scopeValue !== undefined && { scopeValue }),
      ...(stackableWithCoupons !== undefined && { stackableWithCoupons }),
    });

    res.json(campaign);
  } catch (error: any) {
    console.error('Error updating sale campaign:', error);
    res.status(400).json({ message: error.message || 'Błąd podczas aktualizacji kampanii' });
  }
});

/**
 * DELETE /api/admin/sale-campaigns/:id
 * Delete a sale campaign (only DRAFT)
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const result = await saleCampaignService.deleteCampaign(req.params.id);
    res.json(result);
  } catch (error: any) {
    console.error('Error deleting sale campaign:', error);
    res.status(400).json({ message: error.message || 'Błąd podczas usuwania kampanii' });
  }
});

/**
 * POST /api/admin/sale-campaigns/:id/preview
 * Preview price calculations for a campaign
 */
router.post('/:id/preview', async (req: Request, res: Response) => {
  try {
    const result = await saleCampaignService.previewCampaign(req.params.id);
    res.json(result);
  } catch (error: any) {
    console.error('Error previewing sale campaign:', error);
    res.status(400).json({ message: error.message || 'Błąd podczas podglądu kampanii' });
  }
});

/**
 * POST /api/admin/sale-campaigns/:id/activate
 * Activate a campaign — applies sale prices to products
 */
router.post('/:id/activate', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const result = await saleCampaignService.activateCampaign(req.params.id, userId);
    res.json({ message: `Kampania aktywowana — ${result.processedCount} produktów przecenionych`, ...result });
  } catch (error: any) {
    console.error('Error activating sale campaign:', error);
    res.status(400).json({ message: error.message || 'Błąd podczas aktywacji kampanii' });
  }
});

/**
 * POST /api/admin/sale-campaigns/:id/deactivate
 * Deactivate a campaign — restore original prices
 */
router.post('/:id/deactivate', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const result = await saleCampaignService.deactivateCampaign(req.params.id, userId);
    res.json({ message: `Kampania dezaktywowana — ${result.processedCount} produktów przywróconych`, ...result });
  } catch (error: any) {
    console.error('Error deactivating sale campaign:', error);
    res.status(400).json({ message: error.message || 'Błąd podczas dezaktywacji kampanii' });
  }
});

export default router;
