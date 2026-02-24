import { api } from './api';

// ─── Types ───

export interface LoyaltyLevelInfo {
  level: string;
  name: string;
  threshold: number;
  permanentDiscount: number;
  perks: string[];
}

export interface LoyaltyHistoryEntry {
  previousLevel: string;
  newLevel: string;
  totalSpentAt: number;
  createdAt: string;
}

export interface LoyaltyStatus {
  level: string;
  levelName: string;
  totalSpent: number;
  qualifyingOrderCount: number;
  permanentDiscount: number;
  freeShippingThreshold: number | null;
  nextLevel: { level: string; name: string; threshold: number } | null;
  progress: number;
  amountToNextLevel: number;
  perks: string[];
  history: LoyaltyHistoryEntry[];
}

// ─── API ───

export const loyaltyApi = {
  getStatus: () =>
    api.get<LoyaltyStatus>('/loyalty/status'),

  getHistory: () =>
    api.get<{ history: LoyaltyHistoryEntry[] }>('/loyalty/history'),

  getLevels: () =>
    api.get<{ levels: LoyaltyLevelInfo[] }>('/loyalty/levels'),
};
