import { prisma } from '../db';
import crypto from 'crypto';

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

    // For welcome discounts, check if it belongs to this user
    if (coupon.couponSource === 'WELCOME_DISCOUNT' && coupon.userId) {
      if (coupon.userId !== userId) {
        return { valid: false, error: 'Ten kod rabatowy należy do innego użytkownika' };
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
}

export const discountService = new DiscountService();
