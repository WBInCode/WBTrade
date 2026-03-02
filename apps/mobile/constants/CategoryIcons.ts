/**
 * Category Icons - shared constants for category display
 * Uses custom PNG images from assets/images/categories/
 */
import { Colors } from './Colors';
import { ImageSourcePropType } from 'react-native';

// Category icon images (require returns ImageSourcePropType)
const CATEGORY_IMAGES: Record<string, ImageSourcePropType> = {
  elektronika: require('../assets/images/categories/elektronika.png'),
  dom: require('../assets/images/categories/dom.png'),
  ogrod: require('../assets/images/categories/ogrodnictwo.png'),
  'dom-i-ogrod': require('../assets/images/categories/dom.png'),
  sport: require('../assets/images/categories/sport.png'),
  moda: require('../assets/images/categories/moda.png'),
  zdrowie: require('../assets/images/categories/moda.png'),
  dziecko: require('../assets/images/categories/dziecko.png'),
  motoryzacja: require('../assets/images/categories/motoryzacja.png'),
  narzedzia: require('../assets/images/categories/narzedzia.png'),
  gastronomia: require('../assets/images/categories/gastronomia.png'),
  ogrodnictwo: require('../assets/images/categories/ogrodnictwo.png'),
  outlet: require('../assets/images/categories/outlet.png'),
};

const DEFAULT_ICON = require('../assets/images/categories/outlet.png');

/**
 * Get category icon image source for a category slug
 */
export function getCategoryIcon(slug?: string): ImageSourcePropType {
  if (!slug) return DEFAULT_ICON;
  const normalized = slug.toLowerCase();
  // Direct match first
  if (CATEGORY_IMAGES[normalized]) return CATEGORY_IMAGES[normalized];
  // Partial match
  const key = Object.keys(CATEGORY_IMAGES).find((k) => normalized.includes(k));
  return key ? CATEGORY_IMAGES[key] : DEFAULT_ICON;
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
