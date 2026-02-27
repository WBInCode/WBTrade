export const Colors = {
  primary: {
    50: '#fff7ed',
    100: '#ffedd5',
    200: '#fed7aa',
    300: '#fdba74',
    400: '#fb923c',
    500: '#f97316',
    600: '#ea580c',
    700: '#c2410c',
    800: '#9a3412',
    900: '#7c2d12',
    950: '#431407',
  },
  secondary: {
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#e5e5e5',
    300: '#d4d4d4',
    400: '#a3a3a3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
    950: '#0a0a0a',
  },
  white: '#ffffff',
  black: '#000000',
  destructive: '#ef4444',
  success: '#22c55e',
  warning: '#f59e0b',
  background: '#f8f9fa',
  border: '#e5e5e5',
};

export type ThemeColors = typeof lightTheme;

const lightTheme = {
  // Text
  text: Colors.secondary[900],
  textSecondary: Colors.secondary[600],
  textMuted: Colors.secondary[400],
  textInverse: Colors.white,

  // Backgrounds
  background: '#f8f9fa',
  backgroundSecondary: Colors.white,
  backgroundTertiary: Colors.secondary[100],

  // Cards
  card: Colors.white,
  cardBorder: Colors.secondary[200],

  // Borders
  border: Colors.secondary[200],
  borderLight: Colors.secondary[100],
  separator: Colors.secondary[200],

  // Primary / tint
  tint: Colors.primary[500],
  tintLight: Colors.primary[50],
  tintMuted: Colors.primary[100],

  // Tab bar
  tabIconDefault: Colors.secondary[400],
  tabIconSelected: Colors.primary[500],
  tabBarBackground: Colors.white,
  tabBarBorder: Colors.secondary[200],

  // Inputs
  inputBackground: Colors.white,
  inputBorder: Colors.secondary[300],
  inputText: Colors.secondary[900],
  placeholder: Colors.secondary[400],

  // Status colors
  destructive: Colors.destructive,
  destructiveBg: '#fef2f2',
  destructiveText: '#991b1b',
  success: Colors.success,
  successBg: '#f0fdf4',
  successText: '#166534',
  warning: Colors.warning,
  warningBg: '#fffbeb',
  warningText: '#92400e',

  // Misc
  shadow: Colors.black,
  overlay: 'rgba(0,0,0,0.5)',
  badge: Colors.destructive,
  badgeText: Colors.white,
  icon: Colors.secondary[600],
  iconMuted: Colors.secondary[400],

  // Header
  headerBackground: Colors.white,
  headerText: Colors.secondary[900],

  // Status bar
  statusBar: 'dark-content' as 'dark-content' | 'light-content',

  // Skeleton / loading
  skeleton: Colors.secondary[200],
  skeletonHighlight: Colors.secondary[100],

  // Price
  priceText: Colors.secondary[900],
  priceOld: Colors.secondary[400],
  priceDiscount: Colors.destructive,

  // Search
  searchBackground: Colors.secondary[100],
  searchText: Colors.secondary[900],
  searchPlaceholder: Colors.secondary[400],
};

const darkTheme: ThemeColors = {
  // Text
  text: '#F5F5F5',
  textSecondary: '#B0B0B0',
  textMuted: '#9A9A9A',
  textInverse: '#FFFFFF',

  // Backgrounds  (Allegro-inspired: warm grays, not pure black)
  background: '#1C1C1E',
  backgroundSecondary: '#2C2C2E',
  backgroundTertiary: '#3A3A3C',

  // Cards
  card: '#2C2C2E',
  cardBorder: '#3A3A3C',

  // Borders
  border: '#3A3A3C',
  borderLight: '#444446',
  separator: '#3A3A3C',

  // Primary / tint
  tint: Colors.primary[400],
  tintLight: '#4A2E10',
  tintMuted: '#5A3A18',

  // Tab bar
  tabIconDefault: '#808080',
  tabIconSelected: Colors.primary[400],
  tabBarBackground: '#1C1C1E',
  tabBarBorder: '#2C2C2E',

  // Inputs
  inputBackground: '#2C2C2E',
  inputBorder: '#4A4A4C',
  inputText: '#F5F5F5',
  placeholder: '#8E8E93',

  // Status colors
  destructive: '#f87171',
  destructiveBg: '#3C1515',
  destructiveText: '#fca5a5',
  success: '#4ade80',
  successBg: '#1A3A2A',
  successText: '#86efac',
  warning: '#fbbf24',
  warningBg: '#3D2E10',
  warningText: '#fde68a',

  // Misc
  shadow: Colors.black,
  overlay: 'rgba(0,0,0,0.7)',
  badge: '#f87171',
  badgeText: Colors.white,
  icon: '#B0B0B0',
  iconMuted: '#9A9A9A',

  // Header
  headerBackground: '#1C1C1E',
  headerText: '#F5F5F5',

  // Status bar
  statusBar: 'light-content' as 'dark-content' | 'light-content',

  // Skeleton / loading
  skeleton: '#3A3A3C',
  skeletonHighlight: '#4A4A4C',

  // Price
  priceText: '#F5F5F5',
  priceOld: '#808080',
  priceDiscount: '#f87171',

  // Search
  searchBackground: '#2C2C2E',
  searchText: '#F5F5F5',
  searchPlaceholder: '#808080',
};

export const themes = {
  light: lightTheme,
  dark: darkTheme,
};

export default {
  light: lightTheme,
  dark: darkTheme,
};
