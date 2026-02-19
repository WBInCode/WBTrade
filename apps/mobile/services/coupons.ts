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
};
