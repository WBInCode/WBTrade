import { api } from './api';

export interface UserCoupon {
  id: string;
  code: string;
  description: string | null;
  type: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'FREE_SHIPPING';
  value: number;
  minimumAmount: number | null;
  maximumUses: number | null;
  usedCount: number;
  expiresAt: string | null;
  isActive: boolean;
  couponSource: string;
  createdAt: string;
  status: 'active' | 'used' | 'expired';
}

export interface WelcomeDiscount {
  couponCode: string;
  discountPercent: number;
  expiresAt: string;
}

export const couponsApi = {
  /** Get all user's coupons */
  getMyCoupons: () =>
    api.get<{ coupons: UserCoupon[] }>('/coupons/my'),

  /** Get user's welcome discount (if active) */
  getWelcomeDiscount: () =>
    api.get<{ discount: WelcomeDiscount | null }>('/coupons/welcome'),

  /** Claim app download discount (-5%) */
  claimAppDownload: () =>
    api.post<{ discount: WelcomeDiscount }>('/coupons/claim-app-download'),

  /** Claim surprise bonus coupon (-25%) for collecting all discounts */
  claimSurprise: () =>
    api.post<{ discount: WelcomeDiscount }>('/coupons/claim-surprise'),

  /** Check newsletter subscription status */
  getNewsletterStatus: (email: string) =>
    api.get<{ success: boolean; subscribed: boolean; verified: boolean }>('/newsletter/status', { email }),

  /** Subscribe to newsletter (auto-verify for logged-in users, no coupon generation) */
  subscribeNewsletter: (email: string) =>
    api.post<{ success: boolean; message: string; verified?: boolean }>('/newsletter/subscribe', { email, source: 'app_discounts' }),

  /** Claim newsletter discount coupon (-10%) after subscribing */
  claimNewsletterCoupon: () =>
    api.post<{ discount: WelcomeDiscount }>('/coupons/claim-newsletter'),
};
