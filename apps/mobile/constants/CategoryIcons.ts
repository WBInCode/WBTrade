/**
 * Category Icons - shared constants for category display
 * Uses MaterialCommunityIcons icon names
 */
import { Colors } from './Colors';

// Map category slugs to MaterialCommunityIcons names
const CATEGORY_ICONS: Record<string, string> = {
  elektronika: 'laptop',
  agd: 'washing-machine',
  'dom-i-ogrod': 'home-roof',
  sport: 'basketball',
  moda: 'hanger',
  dziecko: 'baby-face-outline',
  zdrowie: 'heart-pulse',
  motoryzacja: 'car',
  narzedzia: 'wrench',
  zabawki: 'gamepad-variant',
  ksiazki: 'book-open-variant',
  muzyka: 'music',
  ogrod: 'flower-tulip-outline',
  kuchnia: 'silverware-fork-knife',
  biuro: 'desk',
  odziez: 'tshirt-crew',
  obuwie: 'shoe-sneaker',
  komputery: 'desktop-classic',
  telefony: 'cellphone',
  foto: 'camera',
  tv: 'television',
  default: 'shape-outline',
};

/**
 * Get MaterialCommunityIcons icon name for a category slug
 */
export function getCategoryIcon(slug?: string): string {
  if (!slug) return CATEGORY_ICONS.default;
  const normalized = slug.toLowerCase();
  const key = Object.keys(CATEGORY_ICONS).find((k) => normalized.includes(k));
  return key ? CATEGORY_ICONS[key] : CATEGORY_ICONS.default;
}

/**
 * Background colors for category circles
 */
export const ICON_BG_COLORS = [
  Colors.primary[100],
  '#e0f2fe',
  '#fce7f3',
  '#d1fae5',
  '#fef3c7',
  '#ede9fe',
  '#fde68a',
  '#ccfbf1',
  '#fee2e2',
  '#e0e7ff',
];

/**
 * Icon/text colors for category circles
 */
export const ICON_COLORS = [
  Colors.primary[600],
  '#0284c7',
  '#db2777',
  '#059669',
  '#d97706',
  '#7c3aed',
  '#b45309',
  '#0d9488',
  '#dc2626',
  '#4f46e5',
];
