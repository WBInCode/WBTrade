import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { themes, ThemeColors } from '../constants/Colors';

export type ThemePreference = 'auto' | 'light' | 'dark';
export type ColorScheme = 'light' | 'dark';

interface ThemeContextValue {
  colorScheme: ColorScheme;
  themePreference: ThemePreference;
  setThemePreference: (pref: ThemePreference) => void;
  colors: ThemeColors;
  themeLoaded: boolean;
}

const STORAGE_KEY = '@theme_preference';

const ThemeContext = createContext<ThemeContextValue>({
  colorScheme: 'light',
  themePreference: 'auto',
  setThemePreference: () => {},
  colors: themes.light,
  themeLoaded: false,
});

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useSystemColorScheme();
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>('auto');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((value) => {
      if (value === 'light' || value === 'dark' || value === 'auto') {
        setThemePreferenceState(value);
      }
      setLoaded(true);
    }).catch(() => {
      setLoaded(true);
    });
  }, []);

  const setThemePreference = useCallback((pref: ThemePreference) => {
    setThemePreferenceState(pref);
    AsyncStorage.setItem(STORAGE_KEY, pref).catch(() => {});
  }, []);

  const colorScheme: ColorScheme =
    themePreference === 'auto'
      ? (systemScheme === 'dark' ? 'dark' : 'light')
      : themePreference;

  const colors = themes[colorScheme];

  return (
    <ThemeContext.Provider value={{ colorScheme, themePreference, setThemePreference, colors, themeLoaded: loaded }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
