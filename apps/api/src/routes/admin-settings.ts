import { Router } from 'express';
import { prisma } from '../db';

const router = Router();

// Note: These endpoints are under /api/admin/settings, accessed only from admin panel
// The admin panel has its own authentication (ADMIN_ACCESS_SECRET)

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

    const exclusions = exclusionsSetting?.value as { excludedProductIds?: string[] } | null;

    res.json({
      carousels: carouselSetting?.value || {},
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
      update: { value: carousels },
      create: { key: 'homepage_carousels', value: carousels },
    });

    // Save exclusions
    if (excludedProductIds !== undefined) {
      await prisma.settings.upsert({
        where: { key: 'carousel_exclusions' },
        update: { value: { excludedProductIds } },
        create: { key: 'carousel_exclusions', value: { excludedProductIds } },
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

    res.json({ key: setting.key, value: setting.value });
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

    await prisma.settings.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });

    res.json({ success: true, message: 'Setting saved successfully' });
  } catch (error) {
    console.error('Error saving setting:', error);
    res.status(500).json({ message: 'Error saving setting' });
  }
});

export default router;
