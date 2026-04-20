/**
 * ThemeContext — light/dark mode switching.
 *
 * Usage in any component:
 *   const { colors, isDark, setMode } = useTheme();
 *
 * Mode options:
 *   'system' — follows OS preference (default)
 *   'light'  — always light
 *   'dark'   — always dark
 *
 * Preference persisted to AsyncStorage.
 */
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightColors, darkColors, AppColors } from '@/lib/theme';

export type ThemeMode = 'system' | 'light' | 'dark';

const THEME_KEY = 'cardscout_theme_mode';

interface ThemeContextValue {
  isDark: boolean;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  colors: AppColors;
}

const ThemeContext = createContext<ThemeContextValue>({
  isDark: false,
  mode: 'system',
  setMode: () => {},
  colors: lightColors,
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme(); // 'light' | 'dark' | null
  const [mode, setModeState] = useState<ThemeMode>('system');

  // Load persisted preference on mount
  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then((saved) => {
      if (saved === 'light' || saved === 'dark' || saved === 'system') {
        setModeState(saved);
      }
    }).catch(() => {});
  }, []);

  // Persist on change
  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode);
    AsyncStorage.setItem(THEME_KEY, newMode).catch(() => {});
  };

  const isDark =
    mode === 'dark' ? true
    : mode === 'light' ? false
    : systemScheme === 'dark';

  const colors = isDark ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ isDark, mode, setMode, colors }}>
      {children}
    </ThemeContext.Provider>
  );
}

/** Primary hook — use this in all components going forward */
export function useTheme() {
  return useContext(ThemeContext);
}
