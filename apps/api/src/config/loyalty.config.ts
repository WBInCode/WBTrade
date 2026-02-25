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
  // Korzyści: kupony jednorazowe za awans, kwartalne kupony, wcześniejszy dostęp, priorytetowa obsługa
  // Darmowa dostawa od 300 PLN jest domyślna dla WSZYSTKICH klientów - nie jest perkiem lojalnościowym
  // Brak stałego rabatu - tylko kupony jednorazowe z min. kwotą zamówienia
  {
    level: 'BRAZOWY',
    name: 'Brązowy',
    threshold: 500,
    permanentDiscount: 0,
    freeShippingThreshold: null,
    levelUpCouponPercent: 3,
    levelUpCouponMinOrder: 200,
    levelUpCouponValidDays: 14,
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
    threshold: 1500,
    permanentDiscount: 0,
    freeShippingThreshold: null,
    levelUpCouponPercent: 5,
    levelUpCouponMinOrder: 200,
    levelUpCouponValidDays: 14,
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
    threshold: 3500,
    permanentDiscount: 0,
    freeShippingThreshold: null,
    levelUpCouponPercent: 5,
    levelUpCouponMinOrder: 250,
    levelUpCouponValidDays: 14,
    birthdayDiscountPercent: null,
    birthdayDiscountMinOrder: null,
    birthdayDiscountValidDays: 0,
    quarterlyDiscountPercent: null,
    quarterlyDiscountValidDays: 0,
    earlyAccess: true,
    prioritySupport: false,
    monthlyDiscount: false,
  },
  {
    level: 'PLATYNOWY',
    name: 'Platynowy',
    threshold: 7000,
    permanentDiscount: 0,
    freeShippingThreshold: null,
    levelUpCouponPercent: 7,
    levelUpCouponMinOrder: 250,
    levelUpCouponValidDays: 14,
    birthdayDiscountPercent: null,
    birthdayDiscountMinOrder: null,
    birthdayDiscountValidDays: 0,
    quarterlyDiscountPercent: 3,
    quarterlyDiscountValidDays: 14,
    earlyAccess: true,
    prioritySupport: true,
    monthlyDiscount: false,
  },
  {
    level: 'DIAMENTOWY',
    name: 'Diamentowy',
    threshold: 12000,
    permanentDiscount: 0,
    freeShippingThreshold: null,
    levelUpCouponPercent: 8,
    levelUpCouponMinOrder: 200,
    levelUpCouponValidDays: 14,
    birthdayDiscountPercent: null,
    birthdayDiscountMinOrder: null,
    birthdayDiscountValidDays: 0,
    quarterlyDiscountPercent: 5,
    quarterlyDiscountValidDays: 14,
    earlyAccess: true,
    prioritySupport: true,
    monthlyDiscount: false,
  },
  {
    level: 'VIP',
    name: 'VIP',
    threshold: 20000,
    permanentDiscount: 0,
    freeShippingThreshold: null,
    levelUpCouponPercent: 10,
    levelUpCouponMinOrder: 200,
    levelUpCouponValidDays: 14,
    birthdayDiscountPercent: null,
    birthdayDiscountMinOrder: null,
    birthdayDiscountValidDays: 0,
    quarterlyDiscountPercent: 5,
    quarterlyDiscountValidDays: 14,
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
