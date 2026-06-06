/**
 * ThemeProvider — provides dynamic theme colors to the entire app.
 * Wraps children with a React context that exposes themed colors.
 */
import React, { createContext, useContext, useMemo } from 'react';
import { useAppStore } from '../store/useAppStore';
import { getThemeColors, ThemeColors, Colors, Typography, Spacing, BorderRadius } from './colors';

interface ThemeContextValue {
  colors: ThemeColors;
  isDark: boolean;
  typography: typeof Typography;
  spacing: typeof Spacing;
  borderRadius: typeof BorderRadius;
  brand: {
    primary: string;
    secondary: string;
    accent: string;
  };
}

const ThemeContext = createContext<ThemeContextValue>({
  colors: getThemeColors(false),
  isDark: false,
  typography: Typography,
  spacing: Spacing,
  borderRadius: BorderRadius,
  brand: {
    primary: Colors.primary,
    secondary: Colors.secondary,
    accent: Colors.accent,
  },
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const isDark = useAppStore((s) => s.isDarkMode);

  const value = useMemo<ThemeContextValue>(
    () => ({
      colors: getThemeColors(isDark),
      isDark,
      typography: Typography,
      spacing: Spacing,
      borderRadius: BorderRadius,
      brand: {
        primary: Colors.primary,
        secondary: Colors.secondary,
        accent: Colors.accent,
      },
    }),
    [isDark]
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * Hook to access the current theme in any component.
 */
export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
