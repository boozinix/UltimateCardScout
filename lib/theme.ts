/**
 * Design system tokens — single source of truth.
 * NEVER hardcode hex values in components.
 */

export const colors = {
  bg: '#FAFAF9',
  sidebar: '#F2EFE9',
  surface: '#FFFFFF',
  border: '#E2DDD6',
  text: '#1C1917',
  muted: '#78716C',

  // Primary brand accent — CTAs, nav active state, links
  accent: '#1B4FD8',
  accentBg: '#DBEAFE',

  // Semantic "captured value" — wealth ring arcs, "$X captured" displays, vault achievements only
  gold: '#92400E',
  goldBg: '#FEF3C7',

  urgent: '#C2410C',
  urgentBg: '#FFF1EE',
  warn: '#B45309',
  warnBg: '#FEF3C7',
  success: '#166534',
  successBg: '#DCFCE7',

  category: {
    travel: '#1D4ED8',      travelBg: '#DBEAFE',
    dining: '#B45309',      diningBg: '#FEF3C7',
    entertainment: '#6D28D9', entertainmentBg: '#F3E8FF',
    fitness: '#166534',     fitnessBg: '#DCFCE7',
    hotel: '#BE123C',       hotelBg: '#FFF1F2',
    shopping: '#C2410C',    shoppingBg: '#FFF7ED',
  },

  gradients: {
    amexPlatinum: ['#2D2D2D', '#5A5A5A', '#3A3A3A'] as const,
    chaseSapphire: ['#0F2B5B', '#1D4ED8'] as const,
    amexGold: ['#92400E', '#D97706', '#FCD34D'] as const,
    capitalVenture: ['#1E293B', '#334155'] as const,
    default: ['#374151', '#6B7280'] as const,
  },
} as const;

export const spacing = {
  xs: 4, sm: 8, md: 16, lg: 24, xl: 32, '2xl': 48,
  screen: 20,
  section: 28,
  card: 16,
} as const;

export const radius = {
  sm: 8, md: 12, lg: 16, xl: 18, full: 9999,
} as const;

export const fontSerif = {
  regular: 'PlayfairDisplay_400Regular',
  medium: 'PlayfairDisplay_500Medium',
  semiBold: 'PlayfairDisplay_600SemiBold',
  bold: 'PlayfairDisplay_700Bold',
  italic: 'PlayfairDisplay_400Regular_Italic',
  boldItalic: 'PlayfairDisplay_700Bold_Italic',
} as const;

export const fontSans = {
  light: 'Inter_300Light',
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semiBold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

export const theme = {
  colors: {
    bg: colors.bg,
    surface: colors.surface,
    border: colors.border,
    textPrimary: colors.text,
    textSecondary: colors.muted,
    gold: colors.gold,
    goldBg: colors.goldBg,
    urgent: colors.urgent,
    urgentBg: colors.urgentBg,
    success: colors.success,
    successBg: colors.successBg,
    warn: colors.warn,
    warnBg: colors.warnBg,
  },
  gradients: colors.gradients,
  radius: { card: radius.md, button: radius.sm, chip: radius.sm, full: radius.full },
  spacing: { screen: spacing.screen, section: spacing.section, card: spacing.card },
} as const;

export type GradientKey = keyof typeof colors.gradients;

export function getGradient(key: string): readonly string[] {
  const g = colors.gradients as Record<string, readonly string[]>;
  return g[key] ?? colors.gradients.default;
}

export function getCategoryColors(category: string | null): { color: string; bg: string } {
  const map: Record<string, { color: string; bg: string }> = {
    travel: { color: colors.category.travel, bg: colors.category.travelBg },
    dining: { color: colors.category.dining, bg: colors.category.diningBg },
    entertainment: { color: colors.category.entertainment, bg: colors.category.entertainmentBg },
    fitness: { color: colors.category.fitness, bg: colors.category.fitnessBg },
    wellness: { color: colors.category.fitness, bg: colors.category.fitnessBg },
    hotel: { color: colors.category.hotel, bg: colors.category.hotelBg },
    shopping: { color: colors.category.shopping, bg: colors.category.shoppingBg },
    retail: { color: colors.category.shopping, bg: colors.category.shoppingBg },
  };
  return map[category?.toLowerCase() ?? ''] ?? { color: colors.muted, bg: colors.sidebar };
}
