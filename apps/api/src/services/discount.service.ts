import { prisma } from '../db';
import crypto from 'crypto';
import { CouponSource } from '@prisma/client';

// ============================================
// DISCOUNT SERVICE
// Handles welcome discount code generation
// ============================================

const WELCOME_DISCOUNT_PERCENT = 20;  // -20%
const WELCOME_DISCOUNT_VALID_DAYS = 14; // 14 days

interface WelcomeDiscountResult {
  couponCode: string;
  discountPercent: number;
  expiresAt: Date;
}

export class DiscountService {
  /**
   * Generate unique discount code
   * Format: WELCOME-XXXXXX (6 random alphanumeric chars)
   */
  private generateCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude confusing chars (0,O,1,I)
    const randomPart = Array.from(
      crypto.randomBytes(6),
      (byte) => chars[byte % chars.length]
    ).join('');
    return `WELCOME-${randomPart}`;
  }

  /**
   * Generate welcome discount code for new user
   * Called after successful registration
   */
  async generateWelcomeDiscount(userId: string, userEmail: string): Promise<WelcomeDiscountResult> {
    // Check if user already has a welcome discount
    const existingCoupon = await prisma.coupon.findFirst({
      where: {
        userId,
        couponSource: 'WELCOME_DISCOUNT',
      },
    });

    if (existingCoupon) {
      // Return existing code if not expired
      if (existingCoupon.expiresAt && existingCoupon.expiresAt > new Date()) {
        return {
          couponCode: existingCoupon.code,
          discountPercent: Number(existingCoupon.value),
          expiresAt: existingCoupon.expiresAt,
        };
      }
      // If expired, user already used their welcome discount opportunity
      throw new Error('Kod powitalny już wygasł');
    }

    // Generate unique code (retry if collision)
    let code: string;
    let attempts = 0;
    do {
      code = this.generateCode();
      const existing = await prisma.coupon.findUnique({ where: { code } });
      if (!existing) break;
      attempts++;
    } while (attempts < 10);

    if (attempts >= 10) {
      throw new Error('Nie udało się wygenerować unikalnego kodu');
    }

    // Calculate expiration date (14 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + WELCOME_DISCOUNT_VALID_DAYS);

    // Create coupon in database
    const coupon = await prisma.coupon.create({
      data: {
        code,
        description: `Zniżka powitalna -${WELCOME_DISCOUNT_PERCENT}% dla ${userEmail}`,
        type: 'PERCENTAGE',
        value: WELCOME_DISCOUNT_PERCENT,
        maximumUses: 1,         // One-time use
        usedCount: 0,
        expiresAt,
        isActive: true,
        userId,
        couponSource: 'WELCOME_DISCOUNT',
      },
    });

    console.log(`✅ [DiscountService] Generated welcome code ${code} for user ${userEmail}, expires ${expiresAt.toISOString()}`);

    return {
      couponCode: coupon.code,
      discountPercent: WELCOME_DISCOUNT_PERCENT,
      expiresAt,
    };
  }

  /**
   * Validate and get coupon details
   */
  async validateCoupon(code: string, userId?: string): Promise<{
    valid: boolean;
    coupon?: any;
    error?: string;
  }> {
    const coupon = await prisma.coupon.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (!coupon) {
      return { valid: false, error: 'Nieprawidłowy kod rabatowy' };
    }

    if (!coupon.isActive) {
      return { valid: false, error: 'Kod rabatowy jest nieaktywny' };
    }

    if (coupon.expiresAt && coupon.expiresAt < new Date()) {
      return { valid: false, error: 'Kod rabatowy wygasł' };
    }

    if (coupon.maximumUses && coupon.usedCount >= coupon.maximumUses) {
      return { valid: false, error: 'Kod rabatowy został już wykorzystany' };
    }

    // For personal discounts, check if it belongs to this user
    if ((coupon.couponSource === 'WELCOME_DISCOUNT' || coupon.couponSource === 'APP_DOWNLOAD' || coupon.couponSource === 'DELIVERY_DELAY') && coupon.userId) {
      if (coupon.userId !== userId) {
        return { valid: false, error: 'Ten kod rabatowy należy do innego użytkownika' };
      }
    }

    // For email-restricted coupons (e.g. DELIVERY_DELAY for guests), verify email
    if (coupon.restrictedToEmail) {
      // Email check happens at checkout (applyCoupon in cart.service) where we have the user's email
      // Here we just flag it as valid if other checks pass
    }

    // Check if coupon requires authentication (registered users only)
    if (coupon.requiresAuth && !userId) {
      return { valid: false, error: 'Ten kod rabatowy jest dostępny tylko dla zarejestrowanych użytkowników' };
    }

    // Check if user already used this coupon (single use per user)
    if (coupon.singleUsePerUser && userId) {
      const existingUsage = await prisma.couponUsage.findUnique({
        where: { couponId_userId: { couponId: coupon.id, userId } },
      });
      if (existingUsage) {
        return { valid: false, error: 'Już wykorzystałeś ten kupon' };
      }
    }

    return { valid: true, coupon };
  }

  /**
   * Mark coupon as used (increment usedCount)
   */
  async markCouponUsed(code: string): Promise<void> {
    await prisma.coupon.update({
      where: { code },
      data: {
        usedCount: { increment: 1 },
      },
    });
  }

  /**
   * Get user's active welcome discount (if any)
   */
  async getUserWelcomeDiscount(userId: string): Promise<WelcomeDiscountResult | null> {
    const coupon = await prisma.coupon.findFirst({
      where: {
        userId,
        couponSource: 'WELCOME_DISCOUNT',
        isActive: true,
        usedCount: 0,
        expiresAt: { gt: new Date() },
      },
    });

    if (!coupon || !coupon.expiresAt) return null;

    return {
      couponCode: coupon.code,
      discountPercent: Number(coupon.value),
      expiresAt: coupon.expiresAt,
    };
  }

  /**
   * Generate discount code for newsletter subscribers
   * Format: NEWS-XXXXXX (6 random alphanumeric chars)
   * 10% discount, valid for 30 days, single use
   */
  async generateNewsletterDiscount(email: string, userId?: string): Promise<WelcomeDiscountResult> {
    const NEWSLETTER_DISCOUNT_PERCENT = 10;
    const NEWSLETTER_DISCOUNT_VALID_DAYS = 30;  // 30 days

    // Try to find userId by email if not provided
    if (!userId) {
      const user = await prisma.user.findUnique({ where: { email } });
      if (user) userId = user.id;
    }

    // Check if this email already has a newsletter discount
    const existingCoupon = await prisma.coupon.findFirst({
      where: {
        OR: [
          { description: { contains: email }, couponSource: 'NEWSLETTER' },
          ...(userId ? [{ userId, couponSource: 'NEWSLETTER' as const }] : []),
        ],
      },
    });

    if (existingCoupon) {
      // If coupon exists but has no userId, assign it now
      if (userId && !existingCoupon.userId) {
        await prisma.coupon.update({
          where: { id: existingCoupon.id },
          data: { userId },
        });
      }
      // Return existing code if not expired and not used
      if (existingCoupon.expiresAt && existingCoupon.expiresAt > new Date() && existingCoupon.usedCount < (existingCoupon.maximumUses || 1)) {
        return {
          couponCode: existingCoupon.code,
          discountPercent: Number(existingCoupon.value),
          expiresAt: existingCoupon.expiresAt,
        };
      }
    }

    // Generate unique code (retry if collision)
    let code: string;
    let attempts = 0;
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    do {
      const randomPart = Array.from(
        crypto.randomBytes(6),
        (byte) => chars[byte % chars.length]
      ).join('');
      code = `NEWS-${randomPart}`;
      const existing = await prisma.coupon.findUnique({ where: { code } });
      if (!existing) break;
      attempts++;
    } while (attempts < 10);

    if (attempts >= 10) {
      throw new Error('Nie udało się wygenerować unikalnego kodu');
    }

    // Calculate expiration date (30 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + NEWSLETTER_DISCOUNT_VALID_DAYS);

    // Create coupon in database
    const coupon = await prisma.coupon.create({
      data: {
        code: code!,
        description: `Zniżka newsletterowa -${NEWSLETTER_DISCOUNT_PERCENT}% na kolejne zakupy dla ${email} (nie łączy się z rabatem za rejestrację i kuponami promocyjnymi)`,
        type: 'PERCENTAGE',
        value: NEWSLETTER_DISCOUNT_PERCENT,
        maximumUses: 1,         // One-time use
        usedCount: 0,
        expiresAt,
        isActive: true,
        couponSource: 'NEWSLETTER',
        ...(userId ? { userId } : {}),
      },
    });

    console.log(`✅ [DiscountService] Generated newsletter code ${code} for ${email}, expires ${expiresAt.toISOString()}`);

    return {
      couponCode: coupon.code,
      discountPercent: NEWSLETTER_DISCOUNT_PERCENT,
      expiresAt,
    };
  }

  /**
   * Generate app download discount (-5%)
   * Format: APP-XXXXXX (6 random alphanumeric chars)
   * 5% discount, valid for 30 days, single use
   */
  async generateAppDownloadDiscount(userId: string, userEmail: string): Promise<WelcomeDiscountResult> {
    const APP_DISCOUNT_PERCENT = 5;
    const APP_DISCOUNT_VALID_DAYS = 30;

    // Check if user already has an app download discount
    const existingCoupon = await prisma.coupon.findFirst({
      where: {
        userId,
        couponSource: 'APP_DOWNLOAD',
      },
    });

    if (existingCoupon) {
      if (existingCoupon.expiresAt && existingCoupon.expiresAt > new Date() && existingCoupon.usedCount < (existingCoupon.maximumUses || 1)) {
        return {
          couponCode: existingCoupon.code,
          discountPercent: Number(existingCoupon.value),
          expiresAt: existingCoupon.expiresAt,
        };
      }
      throw new Error('APP_DOWNLOAD_EXISTS');
    }

    // Generate unique code
    let code: string;
    let attempts = 0;
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    do {
      const randomPart = Array.from(
        crypto.randomBytes(6),
        (byte) => chars[byte % chars.length]
      ).join('');
      code = `APP-${randomPart}`;
      const existing = await prisma.coupon.findUnique({ where: { code } });
      if (!existing) break;
      attempts++;
    } while (attempts < 10);

    if (attempts >= 10) {
      throw new Error('Nie udało się wygenerować unikalnego kodu');
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + APP_DISCOUNT_VALID_DAYS);

    const coupon = await prisma.coupon.create({
      data: {
        code: code!,
        description: `Zniżka -${APP_DISCOUNT_PERCENT}% za pobranie aplikacji mobilnej dla ${userEmail}`,
        type: 'PERCENTAGE',
        value: APP_DISCOUNT_PERCENT,
        maximumUses: 1,
        usedCount: 0,
        expiresAt,
        isActive: true,
        userId,
        couponSource: 'APP_DOWNLOAD',
      },
    });

    console.log(`✅ [DiscountService] Generated app download code ${code} for ${userEmail}, expires ${expiresAt.toISOString()}`);

    return {
      couponCode: coupon.code,
      discountPercent: APP_DISCOUNT_PERCENT,
      expiresAt,
    };
  }

  /**
   * Generate surprise bonus discount for collecting ALL earnable discounts
   * Format: SURPRISE-XXXXXX (6 random alphanumeric chars)
   * 25% discount, valid for 60 days, single use
   */
  async generateSurpriseDiscount(userId: string, userEmail: string): Promise<WelcomeDiscountResult> {
    const SURPRISE_DISCOUNT_PERCENT = 25;
    const SURPRISE_DISCOUNT_VALID_DAYS = 60;

    // Check if user already has a surprise discount
    const existingCoupon = await prisma.coupon.findFirst({
      where: {
        userId,
        couponSource: 'ALL_COLLECTED_BONUS',
      },
    });

    if (existingCoupon) {
      if (existingCoupon.expiresAt && existingCoupon.expiresAt > new Date() && existingCoupon.usedCount < (existingCoupon.maximumUses || 1)) {
        return {
          couponCode: existingCoupon.code,
          discountPercent: Number(existingCoupon.value),
          expiresAt: existingCoupon.expiresAt,
        };
      }
      throw new Error('SURPRISE_ALREADY_CLAIMED');
    }

    // Verify user actually has all required discounts
    const requiredSources: CouponSource[] = ['WELCOME_DISCOUNT', 'APP_DOWNLOAD', 'NEWSLETTER'];
    const userCoupons = await prisma.coupon.findMany({
      where: {
        userId,
        couponSource: { in: requiredSources },
      },
      select: { couponSource: true },
    });

    // Also check newsletter coupons (not tied to userId but to email)
    const newsletterCoupon = await prisma.coupon.findFirst({
      where: {
        description: { contains: userEmail },
        couponSource: 'NEWSLETTER',
      },
    });

    const collectedSources = new Set(userCoupons.map(c => c.couponSource));
    if (newsletterCoupon) collectedSources.add('NEWSLETTER');

    const allCollected = requiredSources.every(s => collectedSources.has(s));
    if (!allCollected) {
      throw new Error('NOT_ALL_COLLECTED');
    }

    // Generate unique code
    let code: string;
    let attempts = 0;
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    do {
      const randomPart = Array.from(
        crypto.randomBytes(6),
        (byte) => chars[byte % chars.length]
      ).join('');
      code = `SURPRISE-${randomPart}`;
      const existing = await prisma.coupon.findUnique({ where: { code } });
      if (!existing) break;
      attempts++;
    } while (attempts < 10);

    if (attempts >= 10) {
      throw new Error('Nie udało się wygenerować unikalnego kodu');
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + SURPRISE_DISCOUNT_VALID_DAYS);

    const coupon = await prisma.coupon.create({
      data: {
        code: code!,
        description: `Specjalny kupon-niespodzianka -${SURPRISE_DISCOUNT_PERCENT}% za zebranie wszystkich rabatów! Dla ${userEmail}`,
        type: 'PERCENTAGE',
        value: SURPRISE_DISCOUNT_PERCENT,
        maximumUses: 1,
        usedCount: 0,
        expiresAt,
        isActive: true,
        userId,
        couponSource: 'ALL_COLLECTED_BONUS',
      },
    });

    console.log(`🎉 [DiscountService] Generated SURPRISE code ${code} for ${userEmail}, expires ${expiresAt.toISOString()}`);

    return {
      couponCode: coupon.code,
      discountPercent: SURPRISE_DISCOUNT_PERCENT,
      expiresAt,
    };
  }

  /**
   * Generate unique apology discount for delivery delay notification.
   * Format: {percent}-XXXXXXXX (e.g. 10-K3BN7WHP)
   * Single-use, tied to specific user or guest email.
   */
  async generateDelayApologyCoupon(data: {
    userId: string | null;
    guestEmail: string | null;
    discountPercent: number;
    validDays: number;
    orderNumber: string;
  }): Promise<WelcomeDiscountResult> {
    const { userId, guestEmail, discountPercent, validDays, orderNumber } = data;
    const recipientLabel = userId ? `user ${userId}` : `guest ${guestEmail}`;

    // Generate unique code: {percent}-XXXXXXXX
    let code: string;
    let attempts = 0;
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    do {
      const randomPart = Array.from(
        crypto.randomBytes(8),
        (byte) => chars[byte % chars.length]
      ).join('');
      code = `${discountPercent}-${randomPart}`;
      const existing = await prisma.coupon.findUnique({ where: { code } });
      if (!existing) break;
      attempts++;
    } while (attempts < 10);

    if (attempts >= 10) {
      throw new Error('Nie udało się wygenerować unikalnego kodu');
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + validDays);

    // Determine the email to restrict coupon to
    const recipientEmail = userId
      ? (await prisma.user.findUnique({ where: { id: userId }, select: { email: true } }))?.email || guestEmail
      : guestEmail;

    const coupon = await prisma.coupon.create({
      data: {
        code: code!,
        description: `Przeprosiny za opóźnienie dostawy zamówienia #${orderNumber} — -${discountPercent}% dla ${recipientEmail || recipientLabel}`,
        type: 'PERCENTAGE',
        value: discountPercent,
        maximumUses: 1,
        usedCount: 0,
        expiresAt,
        isActive: true,
        couponSource: 'DELIVERY_DELAY',
        singleUsePerUser: true,
        requiresAuth: false,
        restrictedToEmail: recipientEmail || null,
        ...(userId ? { userId } : {}),
      },
    });

    console.log(`✅ [DiscountService] Generated delay apology code ${code} (-${discountPercent}%) for ${recipientLabel}, order #${orderNumber}, expires ${expiresAt.toISOString()}`);

    return {
      couponCode: coupon.code,
      discountPercent,
      expiresAt,
    };
  }
}

export const discountService = new DiscountService();
