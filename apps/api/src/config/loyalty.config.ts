import { LoyaltyLevel } from '@prisma/client';

export interface LoyaltyLevelConfig {
  level: LoyaltyLevel;
  name: string;
  threshold: number;
  permanentDiscount: number;
  freeShippingThreshold: number | null; // null = use store default, -1 = always free
  levelUpCouponPercent: number | null;
  levelUpCouponMinOrder: number | null;
  levelUpCouponValidDays: number;
  birthdayDiscountPercent: number | null;
  birthdayDiscountMinOrder: number | null;
  birthdayDiscountValidDays: number;
  quarterlyDiscountPercent: number | null;
  quarterlyDiscountValidDays: number;
  earlyAccess: boolean;
  prioritySupport: boolean;
  monthlyDiscount: boolean;
}

export const LOYALTY_LEVELS: LoyaltyLevelConfig[] = [
  {
    level: 'NOWY_KLIENT',
    name: 'Nowy Klient',
    threshold: 0,
    permanentDiscount: 0,
    freeShippingThreshold: null,
    levelUpCouponPercent: null,
    levelUpCouponMinOrder: null,
    levelUpCouponValidDays: 0,
    birthdayDiscountPercent: null,
    birthdayDiscountMinOrder: null,
    birthdayDiscountValidDays: 0,
    quarterlyDiscountPercent: null,
    quarterlyDiscountValidDays: 0,
    earlyAccess: false,
    prioritySupport: false,
    monthlyDiscount: false,
  },
  {
    level: 'BRAZOWY',
    name: 'Brązowy',
    threshold: 300,
    permanentDiscount: 0,
    freeShippingThreshold: null,
    levelUpCouponPercent: 5,
    levelUpCouponMinOrder: 100,
    levelUpCouponValidDays: 30,
    birthdayDiscountPercent: null,
    birthdayDiscountMinOrder: null,
    birthdayDiscountValidDays: 0,
    quarterlyDiscountPercent: null,
    quarterlyDiscountValidDays: 0,
    earlyAccess: false,
    prioritySupport: false,
    monthlyDiscount: false,
  },
  {
    level: 'SREBRNY',
    name: 'Srebrny',
    threshold: 800,
    permanentDiscount: 3,
    freeShippingThreshold: 200,
    levelUpCouponPercent: 7,
    levelUpCouponMinOrder: 100,
    levelUpCouponValidDays: 30,
    birthdayDiscountPercent: null,
    birthdayDiscountMinOrder: null,
    birthdayDiscountValidDays: 0,
    quarterlyDiscountPercent: null,
    quarterlyDiscountValidDays: 0,
    earlyAccess: false,
    prioritySupport: false,
    monthlyDiscount: false,
  },
  {
    level: 'ZLOTY',
    name: 'Złoty',
    threshold: 2000,
    permanentDiscount: 5,
    freeShippingThreshold: 150,
    levelUpCouponPercent: 10,
    levelUpCouponMinOrder: 100,
    levelUpCouponValidDays: 30,
    birthdayDiscountPercent: 15,
    birthdayDiscountMinOrder: 100,
    birthdayDiscountValidDays: 14,
    quarterlyDiscountPercent: null,
    quarterlyDiscountValidDays: 0,
    earlyAccess: true,
    prioritySupport: false,
    monthlyDiscount: false,
  },
  {
    level: 'PLATYNOWY',
    name: 'Platynowy',
    threshold: 4000,
    permanentDiscount: 7,
    freeShippingThreshold: 100,
    levelUpCouponPercent: 12,
    levelUpCouponMinOrder: 50,
    levelUpCouponValidDays: 30,
    birthdayDiscountPercent: 20,
    birthdayDiscountMinOrder: 50,
    birthdayDiscountValidDays: 14,
    quarterlyDiscountPercent: 10,
    quarterlyDiscountValidDays: 30,
    earlyAccess: true,
    prioritySupport: true,
    monthlyDiscount: false,
  },
  {
    level: 'DIAMENTOWY',
    name: 'Diamentowy',
    threshold: 8000,
    permanentDiscount: 10,
    freeShippingThreshold: -1,
    levelUpCouponPercent: 15,
    levelUpCouponMinOrder: null,
    levelUpCouponValidDays: 30,
    birthdayDiscountPercent: 25,
    birthdayDiscountMinOrder: null,
    birthdayDiscountValidDays: 14,
    quarterlyDiscountPercent: 15,
    quarterlyDiscountValidDays: 30,
    earlyAccess: true,
    prioritySupport: true,
    monthlyDiscount: false,
  },
  {
    level: 'VIP',
    name: 'VIP',
    threshold: 15000,
    permanentDiscount: 12,
    freeShippingThreshold: -1,
    levelUpCouponPercent: 20,
    levelUpCouponMinOrder: null,
    levelUpCouponValidDays: 30,
    birthdayDiscountPercent: 30,
    birthdayDiscountMinOrder: null,
    birthdayDiscountValidDays: 30,
    quarterlyDiscountPercent: 10,
    quarterlyDiscountValidDays: 30,
    earlyAccess: true,
    prioritySupport: true,
    monthlyDiscount: true,
  },
];

export function getLevelConfig(level: LoyaltyLevel): LoyaltyLevelConfig {
  return LOYALTY_LEVELS.find((l) => l.level === level) || LOYALTY_LEVELS[0];
}

export function getLevelForSpent(totalSpent: number): LoyaltyLevelConfig {
  let result = LOYALTY_LEVELS[0];
  for (const level of LOYALTY_LEVELS) {
    if (totalSpent >= level.threshold) {
      result = level;
    }
  }
  return result;
}

export function getNextLevel(currentLevel: LoyaltyLevel): LoyaltyLevelConfig | null {
  const currentIndex = LOYALTY_LEVELS.findIndex((l) => l.level === currentLevel);
  if (currentIndex === -1 || currentIndex >= LOYALTY_LEVELS.length - 1) return null;
  return LOYALTY_LEVELS[currentIndex + 1];
}

export const LOYALTY_LEVEL_ORDER: LoyaltyLevel[] = LOYALTY_LEVELS.map((l) => l.level);

export function isLevelHigher(a: LoyaltyLevel, b: LoyaltyLevel): boolean {
  return LOYALTY_LEVEL_ORDER.indexOf(a) > LOYALTY_LEVEL_ORDER.indexOf(b);
}
