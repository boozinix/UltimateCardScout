/**
 * ThemeContext — light/dark mode switching.
 *
 * Usage in any component:
 *   const { colors, isDark, setMode } = useTheme();
 *
 * Mode options:
 *   'system' — follows OS preference (default)
 *   'light'  — always light
 *   'dark'   — always dark (UI toggle added later)
 *
 * NOTE: Preference is in-memory only for now.
 * TODO: Persist to AsyncStorage or Supabase user prefs when user settings UI is built.
 */
import { createContext, useContext, useState, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { lightColors, darkColors, AppColors } from '@/lib/theme';

export type ThemeMode = 'system' | 'light' | 'dark';

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
  const [mode, setMode] = useState<ThemeMode>('system');

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
