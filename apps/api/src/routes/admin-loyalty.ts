import { Router } from 'express';
import { authGuard, adminOnly } from '../middleware/auth.middleware';
import { loyaltyService } from '../services/loyalty.service';
import { LoyaltyLevel } from '@prisma/client';
import { z } from 'zod';

const router = Router();

// All admin loyalty routes require auth + admin role
router.use(authGuard, adminOnly);

// GET /api/admin/loyalty/overview — dashboard stats
router.get('/overview', async (_req, res) => {
  try {
    const overview = await loyaltyService.getOverview();
    return res.json(overview);
  } catch (error: any) {
    console.error('[AdminLoyalty] Error fetching overview:', error);
    return res.status(500).json({ error: 'Nie udało się pobrać statystyk lojalnościowych' });
  }
});

// GET /api/admin/loyalty/users — list users with loyalty info
router.get('/users', async (req, res) => {
  try {
    const { level, page = '1', limit = '20' } = req.query;
    const loyaltyLevel = level && Object.values(LoyaltyLevel).includes(level as LoyaltyLevel)
      ? (level as LoyaltyLevel)
      : undefined;

    const result = await loyaltyService.getUsersByLevel(
      loyaltyLevel,
      parseInt(page as string, 10) || 1,
      Math.min(parseInt(limit as string, 10) || 20, 100)
    );
    return res.json(result);
  } catch (error: any) {
    console.error('[AdminLoyalty] Error fetching users:', error);
    return res.status(500).json({ error: 'Nie udało się pobrać użytkowników' });
  }
});

// PUT /api/admin/loyalty/users/:id/level — manually set user level
router.put('/users/:id/level', async (req, res) => {
  try {
    const { id } = req.params;
    const schema = z.object({
      level: z.nativeEnum(LoyaltyLevel),
    });
    const validation = schema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: 'Nieprawidłowy poziom', details: validation.error.flatten() });
    }

    await loyaltyService.setUserLevel(id, validation.data.level);
    return res.json({ message: 'Poziom został zmieniony' });
  } catch (error: any) {
    console.error('[AdminLoyalty] Error setting user level:', error);
    return res.status(500).json({ error: 'Nie udało się zmienić poziomu' });
  }
});

// POST /api/admin/loyalty/recalculate — recalculate all users
router.post('/recalculate', async (_req, res) => {
  try {
    const result = await loyaltyService.recalculateAllUsers();
    return res.json(result);
  } catch (error: any) {
    console.error('[AdminLoyalty] Error recalculating:', error);
    return res.status(500).json({ error: 'Nie udało się przeliczyć poziomów' });
  }
});

// GET /api/admin/loyalty/levels — get level config
router.get('/levels', async (_req, res) => {
  try {
    const levels = loyaltyService.getAllLevels();
    return res.json({ levels });
  } catch (error: any) {
    console.error('[AdminLoyalty] Error fetching levels:', error);
    return res.status(500).json({ error: 'Nie udało się pobrać konfiguracji poziomów' });
  }
});

export default router;
