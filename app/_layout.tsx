import '../global.css';
import { useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Sentry from '@sentry/react-native';
import { capture, Events } from '@/lib/analytics';
import {
  useFonts,
  Inter_300Light,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import {
  PlayfairDisplay_400Regular,
  PlayfairDisplay_500Medium,
  PlayfairDisplay_600SemiBold,
  PlayfairDisplay_700Bold,
  PlayfairDisplay_400Regular_Italic,
  PlayfairDisplay_700Bold_Italic,
} from '@expo-google-fonts/playfair-display';
import * as SplashScreen from 'expo-splash-screen';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { colors } from '@/lib/theme';
import { BreakpointProvider } from '@/contexts/BreakpointContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import DevToggle from '@/components/DevToggle';

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN ?? '',
  enabled: !__DEV__,
  tracesSampleRate: 0.2,
});

const queryClient = new QueryClient();

SplashScreen.preventAutoHideAsync();

function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_300Light,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    PlayfairDisplay_400Regular,
    PlayfairDisplay_500Medium,
    PlayfairDisplay_600SemiBold,
    PlayfairDisplay_700Bold,
    PlayfairDisplay_400Regular_Italic,
    PlayfairDisplay_700Bold_Italic,
  });

  const hasFiredAppOpen = useRef(false);

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  // app_open: fire once per session on first foreground
  useEffect(() => {
    if (!hasFiredAppOpen.current) {
      capture(Events.APP_OPEN, { platform: Platform.OS });
      hasFiredAppOpen.current = true;
    }
    const listener = AppState.addEventListener('change', (state) => {
      if (state === 'active' && !hasFiredAppOpen.current) {
        capture(Events.APP_OPEN, { platform: Platform.OS });
        hasFiredAppOpen.current = true;
      }
    });
    return () => listener.remove();
  }, []);

  if (!fontsLoaded) return null;

  return (
    <ThemeProvider>
      <BreakpointProvider>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <StatusBar style="dark" backgroundColor={colors.bg} />
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="onboarding/index" />
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="admin" />
            </Stack>
            <DevToggle />
          </GestureHandlerRootView>
        </QueryClientProvider>
      </BreakpointProvider>
    </ThemeProvider>
  );
}

export default Sentry.wrap(RootLayout);
