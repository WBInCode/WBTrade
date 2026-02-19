import { Router, Request, Response } from 'express';
import { prisma } from '../db';
import { authGuard, adminOnly } from '../middleware/auth.middleware';

const router = Router();

// All coupon admin routes require auth + admin
router.use(authGuard, adminOnly);

/**
 * GET /api/admin/coupons
 * List all coupons with optional filters
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { page = '1', limit = '20', search, status, type } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};

    if (search) {
      where.OR = [
        { code: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    if (status === 'active') {
      where.isActive = true;
    } else if (status === 'inactive') {
      where.isActive = false;
    } else if (status === 'expired') {
      where.expiresAt = { lt: new Date() };
    }

    if (type && ['PERCENTAGE', 'FIXED_AMOUNT', 'FREE_SHIPPING'].includes(type as string)) {
      where.type = type as string;
    }

    const [coupons, total] = await Promise.all([
      prisma.coupon.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.coupon.count({ where }),
    ]);

    res.json({
      coupons,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Error fetching coupons:', error);
    res.status(500).json({ message: 'Błąd podczas pobierania kuponów' });
  }
});

/**
 * GET /api/admin/coupons/stats
 * Get coupon statistics
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const now = new Date();
    const [total, active, expired, totalUsed] = await Promise.all([
      prisma.coupon.count(),
      prisma.coupon.count({ where: { isActive: true, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] } }),
      prisma.coupon.count({ where: { expiresAt: { lt: now } } }),
      prisma.coupon.aggregate({ _sum: { usedCount: true } }),
    ]);

    res.json({
      total,
      active,
      expired,
      inactive: total - active - expired,
      totalUsed: totalUsed._sum.usedCount || 0,
    });
  } catch (error) {
    console.error('Error fetching coupon stats:', error);
    res.status(500).json({ message: 'Błąd podczas pobierania statystyk' });
  }
});

/**
 * GET /api/admin/coupons/:id
 * Get single coupon
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const coupon = await prisma.coupon.findUnique({
      where: { id: req.params.id },
    });

    if (!coupon) {
      res.status(404).json({ message: 'Kupon nie znaleziony' });
      return;
    }

    res.json(coupon);
  } catch (error) {
    console.error('Error fetching coupon:', error);
    res.status(500).json({ message: 'Błąd podczas pobierania kuponu' });
  }
});

/**
 * POST /api/admin/coupons
 * Create a new coupon
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { code, description, type, value, minimumAmount, maximumUses, startsAt, expiresAt, isActive, couponSource } = req.body;

    if (!code || !value) {
      res.status(400).json({ message: 'Kod kuponu i wartość są wymagane' });
      return;
    }

    // Check for duplicate code
    const existing = await prisma.coupon.findUnique({ where: { code: code.toUpperCase() } });
    if (existing) {
      res.status(409).json({ message: 'Kupon o tym kodzie już istnieje' });
      return;
    }

    const coupon = await prisma.coupon.create({
      data: {
        code: code.toUpperCase(),
        description: description || null,
        type: type || 'PERCENTAGE',
        value: parseFloat(value),
        minimumAmount: minimumAmount ? parseFloat(minimumAmount) : null,
        maximumUses: maximumUses ? parseInt(maximumUses) : null,
        startsAt: startsAt ? new Date(startsAt) : null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        isActive: isActive !== undefined ? isActive : true,
        couponSource: couponSource || 'MANUAL',
      },
    });

    res.status(201).json(coupon);
  } catch (error) {
    console.error('Error creating coupon:', error);
    res.status(500).json({ message: 'Błąd podczas tworzenia kuponu' });
  }
});

/**
 * PUT /api/admin/coupons/:id
 * Update a coupon
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { code, description, type, value, minimumAmount, maximumUses, startsAt, expiresAt, isActive, couponSource } = req.body;

    // Check if coupon exists
    const existing = await prisma.coupon.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      res.status(404).json({ message: 'Kupon nie znaleziony' });
      return;
    }

    // Check for duplicate code (if changing code)
    if (code && code.toUpperCase() !== existing.code) {
      const duplicate = await prisma.coupon.findUnique({ where: { code: code.toUpperCase() } });
      if (duplicate) {
        res.status(409).json({ message: 'Kupon o tym kodzie już istnieje' });
        return;
      }
    }

    const coupon = await prisma.coupon.update({
      where: { id: req.params.id },
      data: {
        ...(code && { code: code.toUpperCase() }),
        ...(description !== undefined && { description }),
        ...(type && { type }),
        ...(value !== undefined && { value: parseFloat(value) }),
        ...(minimumAmount !== undefined && { minimumAmount: minimumAmount ? parseFloat(minimumAmount) : null }),
        ...(maximumUses !== undefined && { maximumUses: maximumUses ? parseInt(maximumUses) : null }),
        ...(startsAt !== undefined && { startsAt: startsAt ? new Date(startsAt) : null }),
        ...(expiresAt !== undefined && { expiresAt: expiresAt ? new Date(expiresAt) : null }),
        ...(isActive !== undefined && { isActive }),
        ...(couponSource && { couponSource }),
      },
    });

    res.json(coupon);
  } catch (error) {
    console.error('Error updating coupon:', error);
    res.status(500).json({ message: 'Błąd podczas aktualizacji kuponu' });
  }
});

/**
 * PATCH /api/admin/coupons/:id/toggle
 * Toggle coupon active status
 */
router.patch('/:id/toggle', async (req: Request, res: Response) => {
  try {
    const coupon = await prisma.coupon.findUnique({ where: { id: req.params.id } });
    if (!coupon) {
      res.status(404).json({ message: 'Kupon nie znaleziony' });
      return;
    }

    const updated = await prisma.coupon.update({
      where: { id: req.params.id },
      data: { isActive: !coupon.isActive },
    });

    res.json(updated);
  } catch (error) {
    console.error('Error toggling coupon:', error);
    res.status(500).json({ message: 'Błąd podczas zmiany statusu kuponu' });
  }
});

/**
 * DELETE /api/admin/coupons/:id
 * Delete a coupon
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const coupon = await prisma.coupon.findUnique({ where: { id: req.params.id } });
    if (!coupon) {
      res.status(404).json({ message: 'Kupon nie znaleziony' });
      return;
    }

    await prisma.coupon.delete({ where: { id: req.params.id } });
    res.json({ message: 'Kupon usunięty' });
  } catch (error) {
    console.error('Error deleting coupon:', error);
    res.status(500).json({ message: 'Błąd podczas usuwania kuponu' });
  }
});

export default router;
