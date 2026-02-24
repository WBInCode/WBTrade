import { prisma } from '../db';
import { LoyaltyLevel, CouponSource } from '@prisma/client';
import crypto from 'crypto';
import {
  LOYALTY_LEVELS,
  getLevelConfig,
  getLevelForSpent,
  getNextLevel,
  isLevelHigher,
  LoyaltyLevelConfig,
} from '../config/loyalty.config';

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateCouponCode(prefix: string): string {
  const randomPart = Array.from(
    crypto.randomBytes(6),
    (byte) => CHARS[byte % CHARS.length]
  ).join('');
  return `${prefix}-${randomPart}`;
}

async function generateUniqueCode(prefix: string): Promise<string> {
  let code: string;
  let attempts = 0;
  do {
    code = generateCouponCode(prefix);
    const existing = await prisma.coupon.findUnique({ where: { code } });
    if (!existing) return code;
    attempts++;
  } while (attempts < 10);
  throw new Error('Nie udało się wygenerować unikalnego kodu kuponu');
}

export class LoyaltyService {
  /**
   * Recalculate user's loyalty level based on their delivered+paid orders.
   * Called when an order is delivered or paid, or on refund.
   */
  async recalculateUserLevel(userId: string, triggerOrderId?: string): Promise<void> {
    // Sum all qualifying orders
    const result = await prisma.order.aggregate({
      where: {
        userId,
        status: 'DELIVERED',
        paymentStatus: 'PAID',
      },
      _sum: { total: true },
      _count: true,
    });

    const totalSpent = Number(result._sum.total || 0);
    const orderCount = result._count;
    const newLevelConfig = getLevelForSpent(totalSpent);

    // Get or create UserLoyalty record
    let loyalty = await prisma.userLoyalty.findUnique({ where: { userId } });

    if (!loyalty) {
      loyalty = await prisma.userLoyalty.create({
        data: {
          userId,
          level: newLevelConfig.level,
          totalSpent,
          qualifyingOrderCount: orderCount,
          permanentDiscount: newLevelConfig.permanentDiscount,
          freeShippingThreshold: newLevelConfig.freeShippingThreshold === -1
            ? null
            : newLevelConfig.freeShippingThreshold,
        },
      });

      // If the user starts at a level above NOWY_KLIENT (e.g., migration), grant rewards
      if (newLevelConfig.level !== 'NOWY_KLIENT') {
        await this.grantLevelUpRewards(userId, newLevelConfig);
        await prisma.loyaltyHistory.create({
          data: {
            userLoyaltyId: loyalty.id,
            previousLevel: 'NOWY_KLIENT',
            newLevel: newLevelConfig.level,
            totalSpentAt: totalSpent,
            triggeredBy: triggerOrderId || 'SYSTEM',
          },
        });
      }
      return;
    }

    const previousLevel = loyalty.level;
    const levelChanged = previousLevel !== newLevelConfig.level;

    // Update loyalty record
    await prisma.userLoyalty.update({
      where: { userId },
      data: {
        totalSpent,
        qualifyingOrderCount: orderCount,
        level: newLevelConfig.level,
        permanentDiscount: newLevelConfig.permanentDiscount,
        freeShippingThreshold: newLevelConfig.freeShippingThreshold === -1
          ? null
          : newLevelConfig.freeShippingThreshold,
        ...(levelChanged ? { lastLevelUpAt: new Date() } : {}),
      },
    });

    if (levelChanged) {
      // Log the change
      await prisma.loyaltyHistory.create({
        data: {
          userLoyaltyId: loyalty.id,
          previousLevel,
          newLevel: newLevelConfig.level,
          totalSpentAt: totalSpent,
          triggeredBy: triggerOrderId || 'SYSTEM',
        },
      });

      // Grant rewards only on level UP (not down)
      if (isLevelHigher(newLevelConfig.level, previousLevel)) {
        await this.grantLevelUpRewards(userId, newLevelConfig);
        console.log(`🎉 [Loyalty] User ${userId} leveled up: ${previousLevel} → ${newLevelConfig.level} (spent: ${totalSpent} PLN)`);
      } else {
        console.log(`📉 [Loyalty] User ${userId} leveled down: ${previousLevel} → ${newLevelConfig.level} (spent: ${totalSpent} PLN)`);
      }
    }
  }

  /**
   * Grant level-up coupon when user reaches a new level.
   */
  private async grantLevelUpRewards(userId: string, levelConfig: LoyaltyLevelConfig): Promise<void> {
    if (!levelConfig.levelUpCouponPercent) return;

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
    if (!user) return;

    const code = await generateUniqueCode('LVL');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + levelConfig.levelUpCouponValidDays);

    await prisma.coupon.create({
      data: {
        code,
        description: `Kupon za awans na poziom ${levelConfig.name} (-${levelConfig.levelUpCouponPercent}%)`,
        type: 'PERCENTAGE',
        value: levelConfig.levelUpCouponPercent,
        minimumAmount: levelConfig.levelUpCouponMinOrder,
        maximumUses: 1,
        usedCount: 0,
        expiresAt,
        isActive: true,
        userId,
        couponSource: 'LOYALTY_LEVEL_UP',
      },
    });

    console.log(`🎁 [Loyalty] Generated level-up coupon ${code} for user ${user.email} (level: ${levelConfig.name})`);
  }

  /**
   * Generate birthday coupon for a user (called by cron job).
   */
  async generateBirthdayCoupon(userId: string): Promise<void> {
    const loyalty = await prisma.userLoyalty.findUnique({ where: { userId } });
    if (!loyalty) return;

    const levelConfig = getLevelConfig(loyalty.level);
    if (!levelConfig.birthdayDiscountPercent) return;

    const currentYear = new Date().getFullYear();
    if (loyalty.lastBirthdayCouponYear === currentYear) return;

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
    if (!user) return;

    const code = await generateUniqueCode('BDAY');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + levelConfig.birthdayDiscountValidDays);

    await prisma.coupon.create({
      data: {
        code,
        description: `Kupon urodzinowy -${levelConfig.birthdayDiscountPercent}% (poziom ${levelConfig.name})`,
        type: 'PERCENTAGE',
        value: levelConfig.birthdayDiscountPercent,
        minimumAmount: levelConfig.birthdayDiscountMinOrder,
        maximumUses: 1,
        usedCount: 0,
        expiresAt,
        isActive: true,
        userId,
        couponSource: 'LOYALTY_BIRTHDAY',
      },
    });

    await prisma.userLoyalty.update({
      where: { userId },
      data: { lastBirthdayCouponYear: currentYear },
    });

    console.log(`🎂 [Loyalty] Generated birthday coupon ${code} for user ${user.email}`);
  }

  /**
   * Generate quarterly coupon for eligible users (Platynowy+).
   */
  async generateQuarterlyCoupon(userId: string): Promise<void> {
    const loyalty = await prisma.userLoyalty.findUnique({ where: { userId } });
    if (!loyalty) return;

    const levelConfig = getLevelConfig(loyalty.level);
    if (!levelConfig.quarterlyDiscountPercent) return;

    // Check if coupon was already generated this quarter
    const now = new Date();
    const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
    if (loyalty.lastQuarterlyCouponAt && loyalty.lastQuarterlyCouponAt >= quarterStart) return;

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
    if (!user) return;

    const code = await generateUniqueCode('QBONUS');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + levelConfig.quarterlyDiscountValidDays);

    await prisma.coupon.create({
      data: {
        code,
        description: `Kwartalny bonus lojalnościowy -${levelConfig.quarterlyDiscountPercent}% (poziom ${levelConfig.name})`,
        type: 'PERCENTAGE',
        value: levelConfig.quarterlyDiscountPercent,
        maximumUses: 1,
        usedCount: 0,
        expiresAt,
        isActive: true,
        userId,
        couponSource: 'LOYALTY_QUARTERLY',
      },
    });

    await prisma.userLoyalty.update({
      where: { userId },
      data: { lastQuarterlyCouponAt: now },
    });

    console.log(`🎁 [Loyalty] Generated quarterly coupon ${code} for user ${user.email} (level: ${levelConfig.name})`);
  }

  /**
   * Process all birthday coupons (daily cron).
   */
  async processBirthdayCoupons(): Promise<{ processed: number }> {
    const today = new Date();
    const month = today.getMonth() + 1;
    const day = today.getDate();

    // Find users with birthday today who have loyalty level with birthday perk
    const users = await prisma.user.findMany({
      where: {
        dateOfBirth: { not: null },
        loyalty: {
          level: { in: ['ZLOTY', 'PLATYNOWY', 'DIAMENTOWY', 'VIP'] },
        },
      },
      select: { id: true, dateOfBirth: true },
    });

    let processed = 0;
    for (const user of users) {
      if (!user.dateOfBirth) continue;
      const bMonth = user.dateOfBirth.getMonth() + 1;
      const bDay = user.dateOfBirth.getDate();
      if (bMonth === month && bDay === day) {
        await this.generateBirthdayCoupon(user.id);
        processed++;
      }
    }

    console.log(`🎂 [Loyalty] Processed ${processed} birthday coupons`);
    return { processed };
  }

  /**
   * Process all quarterly coupons (quarterly cron).
   */
  async processQuarterlyCoupons(): Promise<{ processed: number }> {
    const users = await prisma.userLoyalty.findMany({
      where: {
        level: { in: ['PLATYNOWY', 'DIAMENTOWY', 'VIP'] },
      },
      select: { userId: true },
    });

    let processed = 0;
    for (const loyalty of users) {
      await this.generateQuarterlyCoupon(loyalty.userId);
      processed++;
    }

    console.log(`🎁 [Loyalty] Processed ${processed} quarterly coupons`);
    return { processed };
  }

  /**
   * Process monthly coupons for VIP users.
   */
  async processMonthlyCoupons(): Promise<{ processed: number }> {
    const users = await prisma.userLoyalty.findMany({
      where: { level: 'VIP' },
      select: { userId: true },
    });

    let processed = 0;
    for (const loyalty of users) {
      // For VIP, quarterly coupons are actually monthly
      await this.generateQuarterlyCoupon(loyalty.userId);
      processed++;
    }

    return { processed };
  }

  /**
   * Get user's loyalty status for display.
   */
  async getUserLoyaltyStatus(userId: string) {
    let loyalty = await prisma.userLoyalty.findUnique({
      where: { userId },
      include: {
        history: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    // Auto-create if not exists
    if (!loyalty) {
      await this.recalculateUserLevel(userId);
      loyalty = await prisma.userLoyalty.findUnique({
        where: { userId },
        include: {
          history: {
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
        },
      });
    }

    if (!loyalty) {
      // Shouldn't happen, but fallback
      return {
        level: 'NOWY_KLIENT' as LoyaltyLevel,
        levelName: 'Nowy Klient',
        totalSpent: 0,
        qualifyingOrderCount: 0,
        permanentDiscount: 0,
        freeShippingThreshold: null,
        nextLevel: LOYALTY_LEVELS[1],
        progress: 0,
        amountToNextLevel: LOYALTY_LEVELS[1].threshold,
        perks: [],
        history: [],
      };
    }

    const currentConfig = getLevelConfig(loyalty.level);
    const nextLevelConfig = getNextLevel(loyalty.level);
    const totalSpent = Number(loyalty.totalSpent);

    const progress = nextLevelConfig
      ? Math.min(100, Math.round(((totalSpent - currentConfig.threshold) / (nextLevelConfig.threshold - currentConfig.threshold)) * 100))
      : 100;

    const amountToNextLevel = nextLevelConfig
      ? Math.max(0, nextLevelConfig.threshold - totalSpent)
      : 0;

    // Build perks list
    const perks: string[] = [];
    if (currentConfig.permanentDiscount > 0) {
      perks.push(`Stały rabat ${currentConfig.permanentDiscount}% na wszystkie zamówienia`);
    }
    if (currentConfig.freeShippingThreshold === -1) {
      perks.push('Darmowa dostawa na wszystkie zamówienia');
    } else if (currentConfig.freeShippingThreshold !== null) {
      perks.push(`Darmowa dostawa od ${currentConfig.freeShippingThreshold} PLN`);
    }
    if (currentConfig.birthdayDiscountPercent) {
      perks.push(`Kupon urodzinowy -${currentConfig.birthdayDiscountPercent}%`);
    }
    if (currentConfig.quarterlyDiscountPercent) {
      perks.push(`Kwartalny kupon -${currentConfig.quarterlyDiscountPercent}%`);
    }
    if (currentConfig.earlyAccess) {
      perks.push('Wcześniejszy dostęp do wyprzedaży');
    }
    if (currentConfig.prioritySupport) {
      perks.push('Priorytetowa obsługa klienta');
    }
    if (currentConfig.monthlyDiscount) {
      perks.push('Miesięczny kupon rabatowy -5%');
    }

    return {
      level: loyalty.level,
      levelName: currentConfig.name,
      totalSpent,
      qualifyingOrderCount: loyalty.qualifyingOrderCount,
      permanentDiscount: Number(loyalty.permanentDiscount),
      freeShippingThreshold: loyalty.freeShippingThreshold ? Number(loyalty.freeShippingThreshold) : null,
      nextLevel: nextLevelConfig
        ? { level: nextLevelConfig.level, name: nextLevelConfig.name, threshold: nextLevelConfig.threshold }
        : null,
      progress,
      amountToNextLevel,
      perks,
      history: loyalty.history.map((h) => ({
        previousLevel: h.previousLevel,
        newLevel: h.newLevel,
        totalSpentAt: Number(h.totalSpentAt),
        createdAt: h.createdAt,
      })),
    };
  }

  /**
   * Get all levels info (public endpoint).
   */
  getAllLevels() {
    return LOYALTY_LEVELS.map((l) => {
      const perks: string[] = [];
      if (l.permanentDiscount > 0) perks.push(`Stały rabat ${l.permanentDiscount}%`);
      if (l.freeShippingThreshold === -1) perks.push('Darmowa dostawa zawsze');
      else if (l.freeShippingThreshold !== null) perks.push(`Darmowa dostawa od ${l.freeShippingThreshold} PLN`);
      if (l.levelUpCouponPercent) perks.push(`Kupon za awans -${l.levelUpCouponPercent}%`);
      if (l.birthdayDiscountPercent) perks.push(`Kupon urodzinowy -${l.birthdayDiscountPercent}%`);
      if (l.quarterlyDiscountPercent) perks.push(`Kwartalny bonus -${l.quarterlyDiscountPercent}%`);
      if (l.earlyAccess) perks.push('Wcześniejszy dostęp do wyprzedaży');
      if (l.prioritySupport) perks.push('Priorytetowa obsługa klienta');
      if (l.monthlyDiscount) perks.push('Miesięczny kupon -5%');

      return {
        level: l.level,
        name: l.name,
        threshold: l.threshold,
        permanentDiscount: l.permanentDiscount,
        perks,
      };
    });
  }

  /**
   * Recalculate all users' loyalty levels (admin action / migration).
   */
  async recalculateAllUsers(): Promise<{ processed: number; leveledUp: number }> {
    const users = await prisma.user.findMany({
      where: { role: 'CUSTOMER' },
      select: { id: true },
    });

    let processed = 0;
    let leveledUp = 0;

    for (const user of users) {
      const before = await prisma.userLoyalty.findUnique({
        where: { userId: user.id },
        select: { level: true },
      });

      await this.recalculateUserLevel(user.id, 'ADMIN_RECALCULATE');

      const after = await prisma.userLoyalty.findUnique({
        where: { userId: user.id },
        select: { level: true },
      });

      if (before && after && before.level !== after.level) leveledUp++;
      processed++;
    }

    console.log(`✅ [Loyalty] Recalculated ${processed} users, ${leveledUp} level changes`);
    return { processed, leveledUp };
  }

  /**
   * Admin: get loyalty overview stats.
   */
  async getOverview() {
    const levelCounts = await prisma.userLoyalty.groupBy({
      by: ['level'],
      _count: true,
    });

    const totalUsers = await prisma.userLoyalty.count();
    const totalSpentAggregate = await prisma.userLoyalty.aggregate({
      _sum: { totalSpent: true },
      _avg: { totalSpent: true },
    });

    return {
      totalUsers,
      totalSpent: Number(totalSpentAggregate._sum.totalSpent || 0),
      averageSpent: Number(totalSpentAggregate._avg.totalSpent || 0),
      levelDistribution: levelCounts.map((lc) => ({
        level: lc.level,
        name: getLevelConfig(lc.level).name,
        count: lc._count,
      })),
    };
  }

  /**
   * Admin: get users by level with pagination.
   */
  async getUsersByLevel(level?: LoyaltyLevel, page = 1, limit = 20) {
    const where = level ? { level } : {};
    const [users, total] = await Promise.all([
      prisma.userLoyalty.findMany({
        where,
        include: {
          user: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
        },
        orderBy: { totalSpent: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.userLoyalty.count({ where }),
    ]);

    return {
      users: users.map((u) => ({
        userId: u.userId,
        email: u.user.email,
        firstName: u.user.firstName,
        lastName: u.user.lastName,
        level: u.level,
        levelName: getLevelConfig(u.level).name,
        totalSpent: Number(u.totalSpent),
        qualifyingOrderCount: u.qualifyingOrderCount,
        lastLevelUpAt: u.lastLevelUpAt,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Admin: manually set user's level.
   */
  async setUserLevel(userId: string, newLevel: LoyaltyLevel): Promise<void> {
    const loyalty = await prisma.userLoyalty.findUnique({ where: { userId } });
    if (!loyalty) {
      await this.recalculateUserLevel(userId);
    }

    const current = await prisma.userLoyalty.findUnique({ where: { userId } });
    if (!current) throw new Error('User loyalty record not found');

    const newConfig = getLevelConfig(newLevel);

    await prisma.userLoyalty.update({
      where: { userId },
      data: {
        level: newLevel,
        permanentDiscount: newConfig.permanentDiscount,
        freeShippingThreshold: newConfig.freeShippingThreshold === -1 ? null : newConfig.freeShippingThreshold,
        lastLevelUpAt: new Date(),
      },
    });

    await prisma.loyaltyHistory.create({
      data: {
        userLoyaltyId: current.id,
        previousLevel: current.level,
        newLevel,
        totalSpentAt: current.totalSpent,
        triggeredBy: 'ADMIN',
      },
    });

    console.log(`🔧 [Loyalty] Admin set user ${userId} level: ${current.level} → ${newLevel}`);
  }
}

export const loyaltyService = new LoyaltyService();
