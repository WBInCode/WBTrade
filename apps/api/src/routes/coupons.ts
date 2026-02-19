import { Router } from 'express';
import { authGuard } from '../middleware/auth.middleware';
import { discountService } from '../services/discount.service';
import { prisma } from '../db';

const router = Router();

// GET /api/coupons/my — get all user's coupons
router.get('/my', authGuard, async (req, res) => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const coupons = await prisma.coupon.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        code: true,
        description: true,
        type: true,
        value: true,
        minimumAmount: true,
        maximumUses: true,
        usedCount: true,
        expiresAt: true,
        isActive: true,
        couponSource: true,
        createdAt: true,
      },
    });

    // Enrich with status
    const enriched = coupons.map((c: any) => {
      const isExpired = c.expiresAt ? c.expiresAt < new Date() : false;
      const isUsed = c.maximumUses ? c.usedCount >= c.maximumUses : false;
      let status: 'active' | 'used' | 'expired' = 'active';
      if (isUsed) status = 'used';
      else if (isExpired) status = 'expired';
      else if (!c.isActive) status = 'expired';

      return { ...c, status };
    });

    return res.json({ coupons: enriched });
  } catch (error: any) {
    console.error('[CouponsRoute] Error fetching user coupons:', error);
    return res.status(500).json({ error: 'Nie udało się pobrać kuponów' });
  }
});

// GET /api/coupons/welcome — get user's welcome discount
router.get('/welcome', authGuard, async (req, res) => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const discount = await discountService.getUserWelcomeDiscount(userId);
    return res.json({ discount });
  } catch (error: any) {
    console.error('[CouponsRoute] Error fetching welcome discount:', error);
    return res.status(500).json({ error: 'Nie udało się pobrać rabatu powitalnego' });
  }
});

export default router;
