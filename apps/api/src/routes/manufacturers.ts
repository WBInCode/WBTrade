import { Router, Request, Response } from 'express';
import { prisma } from '../db';
import { authGuard, adminOnly } from '../middleware/auth.middleware';

const router = Router();

// ========================================
// PUBLIC ROUTES
// ========================================

/**
 * GET /api/manufacturers
 * List all manufacturers (public, for product pages)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { page = '1', limit = '50', search } = req.query;
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 50));
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};

    if (search) {
      where.name = { contains: search as string, mode: 'insensitive' };
    }

    const [manufacturers, total] = await Promise.all([
      prisma.manufacturer.findMany({
        where,
        orderBy: { name: 'asc' },
        skip,
        take: limitNum,
        include: {
          _count: { select: { products: true } },
        },
      }),
      prisma.manufacturer.count({ where }),
    ]);

    res.json({
      manufacturers,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Error fetching manufacturers:', error);
    res.status(500).json({ message: 'Error fetching manufacturers' });
  }
});

/**
 * GET /api/manufacturers/slug/:slug
 * Get a single manufacturer by slug (public - for /producenci/[slug] page)
 */
router.get('/slug/:slug', async (req: Request, res: Response) => {
  try {
    const manufacturer = await prisma.manufacturer.findUnique({
      where: { slug: req.params.slug },
      include: {
        _count: { select: { products: true } },
      },
    });

    if (!manufacturer) {
      res.status(404).json({ message: 'Producent nie został znaleziony' });
      return;
    }

    res.json(manufacturer);
  } catch (error) {
    console.error('Error fetching manufacturer:', error);
    res.status(500).json({ message: 'Error fetching manufacturer' });
  }
});

/**
 * GET /api/manufacturers/:id
 * Get a single manufacturer by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const manufacturer = await prisma.manufacturer.findUnique({
      where: { id: req.params.id },
      include: {
        _count: { select: { products: true } },
      },
    });

    if (!manufacturer) {
      res.status(404).json({ message: 'Producent nie został znaleziony' });
      return;
    }

    res.json(manufacturer);
  } catch (error) {
    console.error('Error fetching manufacturer:', error);
    res.status(500).json({ message: 'Error fetching manufacturer' });
  }
});

// ========================================
// ADMIN ROUTES
// ========================================

/**
 * POST /api/manufacturers (admin only)
 * Create a new manufacturer
 */
router.post('/', authGuard, adminOnly, async (req: Request, res: Response) => {
  try {
    const { name, slug, address, email, phone, website, safetyInfo, euRepName, euRepAddress, euRepEmail } = req.body;

    if (!name || !name.trim()) {
      res.status(400).json({ message: 'Nazwa producenta jest wymagana' });
      return;
    }

    const finalSlug = slug || name.toLowerCase()
      .replace(/[ąćęłńóśźż]/g, (c: string) => 'acelnoszzacelnoszz'['ąćęłńóśźżĄĆĘŁŃÓŚŹŻ'.indexOf(c)] || c)
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const manufacturer = await prisma.manufacturer.create({
      data: {
        name: name.trim(),
        slug: finalSlug,
        address: address || null,
        email: email || null,
        phone: phone || null,
        website: website || null,
        safetyInfo: safetyInfo || null,
        euRepName: euRepName || null,
        euRepAddress: euRepAddress || null,
        euRepEmail: euRepEmail || null,
      },
    });

    res.status(201).json(manufacturer);
  } catch (error: any) {
    if (error?.code === 'P2002') {
      res.status(409).json({ message: 'Producent o tej nazwie lub slug już istnieje' });
      return;
    }
    console.error('Error creating manufacturer:', error);
    res.status(500).json({ message: 'Error creating manufacturer' });
  }
});

/**
 * PUT /api/manufacturers/:id (admin only)
 * Update a manufacturer
 */
router.put('/:id', authGuard, adminOnly, async (req: Request, res: Response) => {
  try {
    const { name, slug, address, email, phone, website, safetyInfo, euRepName, euRepAddress, euRepEmail } = req.body;

    const existing = await prisma.manufacturer.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      res.status(404).json({ message: 'Producent nie został znaleziony' });
      return;
    }

    const manufacturer = await prisma.manufacturer.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(slug !== undefined && { slug }),
        ...(address !== undefined && { address: address || null }),
        ...(email !== undefined && { email: email || null }),
        ...(phone !== undefined && { phone: phone || null }),
        ...(website !== undefined && { website: website || null }),
        ...(safetyInfo !== undefined && { safetyInfo: safetyInfo || null }),
        ...(euRepName !== undefined && { euRepName: euRepName || null }),
        ...(euRepAddress !== undefined && { euRepAddress: euRepAddress || null }),
        ...(euRepEmail !== undefined && { euRepEmail: euRepEmail || null }),
      },
    });

    res.json(manufacturer);
  } catch (error: any) {
    if (error?.code === 'P2002') {
      res.status(409).json({ message: 'Producent o tej nazwie lub slug już istnieje' });
      return;
    }
    console.error('Error updating manufacturer:', error);
    res.status(500).json({ message: 'Error updating manufacturer' });
  }
});

/**
 * DELETE /api/manufacturers/:id (admin only)
 * Delete a manufacturer (sets products' manufacturerId to null)
 */
router.delete('/:id', authGuard, adminOnly, async (req: Request, res: Response) => {
  try {
    const existing = await prisma.manufacturer.findUnique({
      where: { id: req.params.id },
      include: { _count: { select: { products: true } } },
    });

    if (!existing) {
      res.status(404).json({ message: 'Producent nie został znaleziony' });
      return;
    }

    // Unlink products first
    await prisma.product.updateMany({
      where: { manufacturerId: req.params.id },
      data: { manufacturerId: null },
    });

    await prisma.manufacturer.delete({ where: { id: req.params.id } });

    res.json({ message: 'Producent usunięty', unlinkedProducts: existing._count.products });
  } catch (error) {
    console.error('Error deleting manufacturer:', error);
    res.status(500).json({ message: 'Error deleting manufacturer' });
  }
});

export default router;
