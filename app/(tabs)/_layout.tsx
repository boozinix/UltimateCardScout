import { Platform, View, Text, Pressable, StyleSheet } from 'react-native';
import { Tabs, useRouter, useSegments } from 'expo-router';
import { Compass, Wallet, TrendingUp, Settings, BarChart3 } from 'lucide-react-native';
import { spacing, radius, fontSerif, fontSans } from '@/lib/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { useBreakpoint } from '@/hooks/useBreakpoint';

const NAV_ITEMS = [
  { name: 'discover',      label: 'Discover',      Icon: Compass    },
  { name: 'portfolio',     label: 'Vault',          Icon: Wallet     },
  { name: 'intelligence',  label: 'Intelligence',   Icon: TrendingUp },
  { name: 'settings',      label: 'Settings',       Icon: Settings   },
];

function DesktopSidebar() {
  const router = useRouter();
  const segments = useSegments();
  const { colors } = useTheme();
  const active = segments[1] ?? 'discover';

  const s = makeStyles(colors);

  return (
    <View style={s.sidebar}>
      {/* Brand */}
      <View style={s.brand}>
        <View style={s.brandRule} />
        <Text style={s.brandName}>CardScout</Text>
        <Text style={s.brandSub}>DISCOVER · TRACK · OPTIMIZE</Text>
      </View>

      {/* Nav items */}
      <View style={s.nav}>
        {NAV_ITEMS.map(({ name, label, Icon }) => {
          const isActive = active === name;
          return (
            <Pressable
              key={name}
              style={[s.navItem, isActive && s.navItemActive]}
              onPress={() => router.push(`/(tabs)/${name}` as any)}
            >
              <Icon
                size={18}
                color={isActive ? colors.accent : colors.muted}
                strokeWidth={isActive ? 2 : 1.75}
              />
              <Text style={[s.navLabel, isActive && s.navLabelActive]}>{label}</Text>
              {isActive && <View style={s.activeBar} />}
            </Pressable>
          );
        })}
      </View>

      {/* Insights shortcut */}
      <Pressable style={s.insightsLink} onPress={() => router.push('/(tabs)/insights' as any)}>
        <BarChart3 size={14} color={colors.gold} strokeWidth={1.75} />
        <Text style={s.insightsLinkText}>Portfolio insights</Text>
      </Pressable>

      {/* Settings is now a nav item in NAV_ITEMS */}
    </View>
  );
}

export default function TabsLayout() {
  const { isDesktop } = useBreakpoint();
  const { colors } = useTheme();
  const s = makeStyles(colors);

  if (isDesktop) {
    return (
      <View style={s.desktopShell}>
        <DesktopSidebar />
        <View style={s.desktopContent}>
          <Tabs screenOptions={{ headerShown: false, tabBarStyle: { display: 'none' } }}>
            <Tabs.Screen name="discover" />
            <Tabs.Screen name="portfolio" />
            <Tabs.Screen name="intelligence" />
            <Tabs.Screen name="settings" />
            <Tabs.Screen name="calendar"     options={{ href: null }} />
            <Tabs.Screen name="tools"        options={{ href: null }} />
            <Tabs.Screen name="insights"     options={{ href: null }} />
          </Tabs>
        </View>
      </View>
    );
  }

  // Mobile — bottom tabs
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.bg,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          height: Platform.OS === 'ios' ? 84 : 64,
          paddingBottom: Platform.OS === 'ios' ? 28 : 8,
          paddingTop: 8,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarLabelStyle: {
          fontFamily: fontSans.medium,
          fontSize: 9,
          letterSpacing: 0.5,
          textTransform: 'uppercase',
        },
      }}
    >
      <Tabs.Screen
        name="discover"
        options={{
          title: 'Discover',
          tabBarIcon: ({ color, size }) => <Compass size={size - 2} color={color} strokeWidth={1.75} />,
        }}
      />
      <Tabs.Screen
        name="portfolio"
        options={{
          title: 'Vault',
          tabBarIcon: ({ color, size }) => <Wallet size={size - 2} color={color} strokeWidth={1.75} />,
        }}
      />
      <Tabs.Screen
        name="intelligence"
        options={{
          title: 'Intelligence',
          tabBarIcon: ({ color, size }) => <TrendingUp size={size - 2} color={color} strokeWidth={1.75} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => <Settings size={size - 2} color={color} strokeWidth={1.75} />,
        }}
      />
      <Tabs.Screen name="calendar"    options={{ href: null }} />
      <Tabs.Screen name="tools"       options={{ href: null }} />
      <Tabs.Screen name="insights"    options={{ href: null }} />
    </Tabs>
  );
}

const SIDEBAR_WIDTH = 240;

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    desktopShell: {
      flex: 1,
      flexDirection: 'row',
      backgroundColor: colors.bg,
    },
    sidebar: {
      width: SIDEBAR_WIDTH,
      backgroundColor: colors.sidebar,
      borderRightWidth: 1,
      borderRightColor: colors.border,
      paddingTop: 48,
      paddingBottom: 32,
      paddingHorizontal: 20,
      flexDirection: 'column',
    },
    desktopContent: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    brand: { marginBottom: 40 },
    brandRule: {
      width: 32, height: 3,
      backgroundColor: colors.gold,
      borderRadius: 2,
      marginBottom: 12,
    },
    brandName: {
      fontFamily: fontSerif.bold,
      fontSize: 20,
      color: colors.text,
      letterSpacing: -0.5,
      marginBottom: 3,
    },
    brandSub: {
      fontFamily: fontSans.medium,
      fontSize: 8,
      color: colors.muted,
      letterSpacing: 1.5,
    },
    nav: { flex: 1, gap: 2 },
    navItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 11,
      paddingHorizontal: 12,
      borderRadius: radius.md,
      position: 'relative',
    },
    navItemActive: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    navLabel: {
      fontFamily: fontSans.medium,
      fontSize: 14,
      color: colors.muted,
    },
    navLabelActive: { color: colors.text },
    activeBar: {
      position: 'absolute',
      left: 0, top: 8, bottom: 8,
      width: 3,
      backgroundColor: colors.accent,
      borderRadius: 2,
    },
    insightsLink: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: radius.md,
      marginTop: 8,
    },
    insightsLinkText: {
      fontFamily: fontSans.regular,
      fontSize: 12,
      color: colors.gold,
    },
  });
}
