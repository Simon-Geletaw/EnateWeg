/**
 * YeEnat Weg — Design System Theme
 * Ethiopian & Earthy color palette with full dark mode support.
 * All colors, typography, and spacing constants live here.
 */

export const Colors = {
  // ─── Brand Colors ──────────────────────────────────────
  primary: '#1E5128',       // Deep Forest Green (Growth/Health)
  primaryLight: '#2E7D32',
  primaryDark: '#0D3B1B',

  secondary: '#D4A373',     // Warm Earth/Mustard (Teff/Earthy)
  secondaryLight: '#E0C09F',
  secondaryDark: '#B8864F',

  accent: '#C1121F',        // Deep Red (Berbere/Danger/Alert)
  accentLight: '#D9534F',

  // ─── Semantic Colors ───────────────────────────────────
  success: '#2E7D32',
  warning: '#F9A825',
  danger: '#C1121F',
  info: '#1976D2',

  // ─── Calorie Ring Colors ───────────────────────────────
  calorieGreen: '#4CAF50',
  calorieAmber: '#FF9800',
  calorieRed: '#C1121F',

  // ─── Light Mode ────────────────────────────────────────
  light: {
    background: '#F8F9FA',
    surface: '#FFFFFF',
    surfaceElevated: '#FFFFFF',
    text: '#1A1A1A',
    textSecondary: '#6B7280',
    textMuted: '#9CA3AF',
    border: '#E5E7EB',
    divider: '#F0F0F0',
    inputBg: '#F3F4F6',
    cardShadow: 'rgba(0, 0, 0, 0.08)',
  },

  // ─── Dark Mode ─────────────────────────────────────────
  dark: {
    background: '#121212',
    surface: '#1E1E1E',
    surfaceElevated: '#2A2A2A',
    text: '#E0E0E0',
    textSecondary: '#9CA3AF',
    textMuted: '#6B7280',
    border: '#374151',
    divider: '#2A2A2A',
    inputBg: '#2A2A2A',
    cardShadow: 'rgba(0, 0, 0, 0.3)',
  },
} as const;

export const Typography = {
  // Minimum 16px for body text (accessibility requirement)
  sizes: {
    xs: 12,
    sm: 14,
    base: 16,    // minimum for body
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
    '5xl': 48,
  },
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
  },
  families: {
    // System default (will use Noto Sans Ethiopic on Android for Amharic)
    sans: undefined,
  },
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
  '5xl': 64,
} as const;

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
} as const;

/**
 * Returns the correct theme palette based on dark mode setting.
 */
export function getThemeColors(isDark: boolean) {
  return {
    ...Colors,
    ...(isDark ? Colors.dark : Colors.light),
  };
}

export type ThemeColors = ReturnType<typeof getThemeColors>;
