import { Router } from 'express';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
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

// POST /api/coupons/claim-app-download — claim app download discount (-5%)
router.post('/claim-app-download', authGuard, async (req, res) => {
  try {
    const userId = (req as any).user?.userId;
    const email = (req as any).user?.email || '';
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const result = await discountService.generateAppDownloadDiscount(userId, email);
    return res.json({ discount: result });
  } catch (error: any) {
    if (error.message === 'APP_DOWNLOAD_EXISTS') {
      return res.status(409).json({ error: 'Rabat za pobranie aplikacji został już przyznany' });
    }
    console.error('[CouponsRoute] Error claiming app download discount:', error);
    return res.status(500).json({ error: 'Nie udało się przyznać rabatu' });
  }
});

// POST /api/coupons/claim-newsletter — subscribe to newsletter and claim -10% discount
router.post('/claim-newsletter', authGuard, async (req, res) => {
  try {
    const userId = (req as any).user?.userId;
    const email = (req as any).user?.email || '';
    if (!userId || !email) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // 1. Subscribe to newsletter (auto-verify since user is authenticated)
    const existing = await prisma.newsletter_subscriptions.findUnique({
      where: { email: normalizedEmail },
    });

    if (!existing) {
      const token = crypto.randomBytes(32).toString('hex');
      await prisma.newsletter_subscriptions.create({
        data: {
          id: uuidv4(),
          email: normalizedEmail,
          token,
          is_verified: true,
          verified_at: new Date(),
        },
      });
    } else if (existing.unsubscribed_at) {
      await prisma.newsletter_subscriptions.update({
        where: { email: normalizedEmail },
        data: {
          unsubscribed_at: null,
          is_verified: true,
          verified_at: new Date(),
          subscribed_at: new Date(),
        },
      });
    }

    // 2. Generate newsletter discount
    const result = await discountService.generateNewsletterDiscount(normalizedEmail, userId);
    return res.json({ discount: result });
  } catch (error: any) {
    console.error('[CouponsRoute] Error claiming newsletter discount:', error);
    return res.status(500).json({ error: 'Nie udało się przyznać rabatu newsletterowego' });
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
