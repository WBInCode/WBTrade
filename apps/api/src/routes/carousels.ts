import { Router, Request, Response } from 'express';
import { carouselService } from '../services/carousel.service';
import { authGuard, adminOnly } from '../middleware/auth.middleware';

const router = Router();

// ─── Public routes ───────────────────────────────────────────────────────────

/**
 * GET /api/carousels
 * List all active & visible carousels (without products).
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const carousels = await carouselService.getAll();
    res.json({ carousels });
  } catch (error) {
    console.error('Error fetching carousels:', error);
    res.status(500).json({ message: 'Error fetching carousels' });
  }
});

/**
 * GET /api/carousels/:slug/products
 * Get products for a specific carousel.
 */
router.get('/:slug/products', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const products = await carouselService.getProducts(slug);
    res.json({ products });
  } catch (error) {
    console.error('Error fetching carousel products for slug:', String(req.params.slug).replace(/[\n\r]/g, ''), error);
    res.status(500).json({ message: 'Error fetching carousel products' });
  }
});

// ─── Admin routes ────────────────────────────────────────────────────────────

/**
 * PUT /api/carousels/admin/reorder
 * Reorder carousels — receives array of { id, sortOrder }.
 * MUST be defined BEFORE /admin/:id to avoid Express matching "reorder" as :id.
 */
router.put('/admin/reorder', authGuard, adminOnly, async (req: Request, res: Response) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items)) {
      res.status(400).json({ message: 'items array is required' });
      return;
    }
    await carouselService.reorder(items);
    res.json({ success: true });
  } catch (error) {
    console.error('Error reordering carousels:', error);
    res.status(500).json({ message: 'Error reordering carousels' });
  }
});

/**
 * GET /api/carousels/admin/all
 * List all carousels for admin (including hidden/inactive).
 */
router.get('/admin/all', authGuard, adminOnly, async (req: Request, res: Response) => {
  try {
    const carousels = await carouselService.getAllAdmin();
    res.json({ carousels });
  } catch (error) {
    console.error('Error fetching admin carousels:', error);
    res.status(500).json({ message: 'Error fetching carousels' });
  }
});

// ─── Exclusion management routes (before :id routes) ─────────────────────────

/**
 * GET /api/carousels/admin/exclusions
 * Get all excluded product IDs with product details.
 */
router.get('/admin/exclusions', authGuard, adminOnly, async (req: Request, res: Response) => {
  try {
    const data = await carouselService.getExclusions();
    res.json(data);
  } catch (error) {
    console.error('Error fetching exclusions:', error);
    res.status(500).json({ message: 'Error fetching exclusions' });
  }
});

/**
 * PUT /api/carousels/admin/exclusions
 * Set the full list of excluded product IDs.
 */
router.put('/admin/exclusions', authGuard, adminOnly, async (req: Request, res: Response) => {
  try {
    const { productIds } = req.body;
    if (!Array.isArray(productIds)) {
      res.status(400).json({ message: 'productIds array is required' });
      return;
    }
    const excludedIds = await carouselService.setExclusions(productIds);
    res.json({ excludedProductIds: excludedIds });
  } catch (error) {
    console.error('Error setting exclusions:', error);
    res.status(500).json({ message: 'Error setting exclusions' });
  }
});

/**
 * POST /api/carousels/admin/exclusions/:productId
 * Add a product to the exclusion list.
 */
router.post('/admin/exclusions/:productId', authGuard, adminOnly, async (req: Request, res: Response) => {
  try {
    const excludedIds = await carouselService.addExclusion(req.params.productId);
    res.json({ excludedProductIds: excludedIds });
  } catch (error) {
    console.error('Error adding exclusion:', error);
    res.status(500).json({ message: 'Error adding exclusion' });
  }
});

/**
 * DELETE /api/carousels/admin/exclusions/:productId
 * Remove a product from the exclusion list.
 */
router.delete('/admin/exclusions/:productId', authGuard, adminOnly, async (req: Request, res: Response) => {
  try {
    const excludedIds = await carouselService.removeExclusion(req.params.productId);
    res.json({ excludedProductIds: excludedIds });
  } catch (error) {
    console.error('Error removing exclusion:', error);
    res.status(500).json({ message: 'Error removing exclusion' });
  }
});

/**
 * GET /api/carousels/admin/:id
 * Get a single carousel by ID.
 */
router.get('/admin/:id', authGuard, adminOnly, async (req: Request, res: Response) => {
  try {
    const carousel = await carouselService.getById(req.params.id);
    if (!carousel) {
      res.status(404).json({ message: 'Carousel not found' });
      return;
    }
    res.json({ carousel });
  } catch (error) {
    console.error('Error fetching carousel:', error);
    res.status(500).json({ message: 'Error fetching carousel' });
  }
});

/**
 * POST /api/carousels/admin
 * Create a new carousel.
 */
router.post('/admin', authGuard, adminOnly, async (req: Request, res: Response) => {
  try {
    const { name, slug, description, icon, color, mode, productLimit, categoryIds, productIds, autoSource, isVisible, sortOrder } = req.body;

    if (!name) {
      res.status(400).json({ message: 'Name is required' });
      return;
    }
    if (!mode || !['MANUAL', 'SEMI_AUTOMATIC', 'AUTOMATIC'].includes(mode)) {
      res.status(400).json({ message: 'Valid mode is required (MANUAL, SEMI_AUTOMATIC, AUTOMATIC)' });
      return;
    }

    const carousel = await carouselService.create({
      name,
      slug: slug || name,
      description,
      icon,
      color,
      mode,
      productLimit,
      categoryIds,
      productIds,
      autoSource,
      isVisible,
      sortOrder,
    });

    res.status(201).json({ carousel });
  } catch (error: any) {
    if (error?.code === 'P2002') {
      res.status(409).json({ message: 'Carousel with this slug already exists' });
      return;
    }
    console.error('Error creating carousel:', error);
    res.status(500).json({ message: 'Error creating carousel' });
  }
});

/**
 * PUT /api/carousels/admin/:id
 * Update a carousel.
 */
router.put('/admin/:id', authGuard, adminOnly, async (req: Request, res: Response) => {
  try {
    const { name, slug, description, icon, color, mode, productLimit, categoryIds, productIds, autoSource, isVisible, isActive, sortOrder } = req.body;

    if (mode && !['MANUAL', 'SEMI_AUTOMATIC', 'AUTOMATIC'].includes(mode)) {
      res.status(400).json({ message: 'Invalid mode' });
      return;
    }

    const carousel = await carouselService.update(req.params.id, {
      name,
      slug,
      description,
      icon,
      color,
      mode,
      productLimit,
      categoryIds,
      productIds,
      autoSource,
      isVisible,
      isActive,
      sortOrder,
    });

    res.json({ carousel });
  } catch (error: any) {
    if (error?.code === 'P2025') {
      res.status(404).json({ message: 'Carousel not found' });
      return;
    }
    if (error?.code === 'P2002') {
      res.status(409).json({ message: 'Carousel with this slug already exists' });
      return;
    }
    console.error('Error updating carousel:', error);
    res.status(500).json({ message: 'Error updating carousel' });
  }
});

/**
 * DELETE /api/carousels/admin/:id
 * Delete a carousel.
 */
router.delete('/admin/:id', authGuard, adminOnly, async (req: Request, res: Response) => {
  try {
    await carouselService.delete(req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    if (error?.code === 'P2025') {
      res.status(404).json({ message: 'Carousel not found' });
      return;
    }
    console.error('Error deleting carousel:', error);
    res.status(500).json({ message: 'Error deleting carousel' });
  }
});

/**
 * PATCH /api/carousels/admin/:id/visibility
 * Toggle carousel visibility.
 */
router.patch('/admin/:id/visibility', authGuard, adminOnly, async (req: Request, res: Response) => {
  try {
    const carousel = await carouselService.toggleVisibility(req.params.id);
    res.json({ carousel });
  } catch (error: any) {
    if (error?.message === 'Carousel not found') {
      res.status(404).json({ message: 'Carousel not found' });
      return;
    }
    console.error('Error toggling visibility:', error);
    res.status(500).json({ message: 'Error toggling visibility' });
  }
});

export default router;
