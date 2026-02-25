import { Router } from 'express';
import { authGuard } from '../middleware/auth.middleware';
import { loyaltyService } from '../services/loyalty.service';

const router = Router();

// GET /api/loyalty/status — get current user's loyalty level and progress
router.get('/status', authGuard, async (req, res) => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const status = await loyaltyService.getUserLoyaltyStatus(userId);
    return res.json(status);
  } catch (error: any) {
    console.error('[LoyaltyRoute] Error fetching loyalty status:', error);
    return res.status(500).json({ error: 'Nie udało się pobrać statusu lojalnościowego' });
  }
});

// GET /api/loyalty/history — get user's level change history
router.get('/history', authGuard, async (req, res) => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const status = await loyaltyService.getUserLoyaltyStatus(userId);
    return res.json({ history: status.history });
  } catch (error: any) {
    console.error('[LoyaltyRoute] Error fetching loyalty history:', error);
    return res.status(500).json({ error: 'Nie udało się pobrać historii lojalnościowej' });
  }
});

// GET /api/loyalty/levels — get all levels info (public)
router.get('/levels', async (_req, res) => {
  try {
    const levels = loyaltyService.getAllLevels();
    return res.json({ levels });
  } catch (error: any) {
    console.error('[LoyaltyRoute] Error fetching levels:', error);
    return res.status(500).json({ error: 'Nie udało się pobrać informacji o poziomach' });
  }
});

export default router;
