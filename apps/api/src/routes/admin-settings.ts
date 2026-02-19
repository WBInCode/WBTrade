import { Router } from 'express';
import { prisma } from '../db';
import { invalidateCategoryCache } from '../lib/cache';
import { authGuard, adminOnly } from '../middleware/auth.middleware';

const router = Router();

// All admin settings routes require authentication + admin role
router.use(authGuard, adminOnly);

// Helper to safely parse JSON string
const parseJsonValue = (value: string | null | undefined): any => {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

/**
 * POST /api/admin/settings/cache/clear-categories
 * Czyści cache kategorii w Redis (liczniki ofert)
 */
router.post('/cache/clear-categories', async (req, res) => {
  try {
    await invalidateCategoryCache();
    res.json({ success: true, message: 'Cache kategorii wyczyszczony' });
  } catch (error) {
    console.error('Error clearing category cache:', error);
    res.status(500).json({ message: 'Błąd podczas czyszczenia cache' });
  }
});

/**
 * GET /api/admin/settings/carousels
 * Get carousel settings
 */
router.get('/carousels', async (req, res) => {
  try {
    const [carouselSetting, exclusionsSetting] = await Promise.all([
      prisma.settings.findUnique({ where: { key: 'homepage_carousels' } }),
      prisma.settings.findUnique({ where: { key: 'carousel_exclusions' } }),
    ]);

    const carousels = parseJsonValue(carouselSetting?.value);
    const exclusions = parseJsonValue(exclusionsSetting?.value) as { excludedProductIds?: string[] } | null;

    res.json({
      carousels: carousels || {},
      excludedProductIds: exclusions?.excludedProductIds || [],
    });
  } catch (error) {
    console.error('Error fetching carousel settings:', error);
    res.status(500).json({ message: 'Error fetching settings' });
  }
});

/**
 * POST /api/admin/settings/carousels
 * Save carousel settings
 */
router.post('/carousels', async (req, res) => {
  try {
    const { carousels, excludedProductIds } = req.body;

    // Save carousels
    await prisma.settings.upsert({
      where: { key: 'homepage_carousels' },
      update: { value: JSON.stringify(carousels) },
      create: { key: 'homepage_carousels', value: JSON.stringify(carousels) },
    });

    // Save exclusions
    if (excludedProductIds !== undefined) {
      await prisma.settings.upsert({
        where: { key: 'carousel_exclusions' },
        update: { value: JSON.stringify({ excludedProductIds }) },
        create: { key: 'carousel_exclusions', value: JSON.stringify({ excludedProductIds }) },
      });
    }

    res.json({ success: true, message: 'Settings saved successfully' });
  } catch (error) {
    console.error('Error saving carousel settings:', error);
    res.status(500).json({ message: 'Error saving settings' });
  }
});

/**
 * GET /api/admin/settings/:key
 * Get a specific setting
 */
router.get('/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const setting = await prisma.settings.findUnique({
      where: { key },
    });

    if (!setting) {
      res.status(404).json({ message: 'Setting not found' });
      return;
    }

    res.json({ key: setting.key, value: parseJsonValue(setting.value) });
  } catch (error) {
    console.error('Error fetching setting:', error);
    res.status(500).json({ message: 'Error fetching setting' });
  }
});

/**
 * POST /api/admin/settings/:key
 * Save a specific setting
 */
router.post('/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;

    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);

    await prisma.settings.upsert({
      where: { key },
      update: { value: stringValue },
      create: { key, value: stringValue },
    });

    res.json({ success: true, message: 'Setting saved successfully' });
  } catch (error) {
    console.error('Error saving setting:', error);
    res.status(500).json({ message: 'Error saving setting' });
  }
});

export default router;
