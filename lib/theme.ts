/**
 * Design system tokens — single source of truth.
 * NEVER hardcode hex values in components.
 * Use useTheme() from contexts/ThemeContext to get the active color set.
 * The named `colors` export is the LIGHT theme — kept for backward compat.
 */

// ─── LIGHT THEME ────────────────────────────────────────────────────────────
export const lightColors = {
  bg:       '#FAFAF9',
  sidebar:  '#F2EFE9',
  surface:  '#FFFFFF',
  border:   '#E2DDD6',
  text:     '#1C1917',
  muted:    '#78716C',

  accent:   '#1B4FD8',
  accentBg: '#DBEAFE',

  // Semantic "captured value" only — wealth ring, "$X captured"
  gold:   '#92400E',
  goldBg: '#FEF3C7',

  urgent:    '#C2410C', urgentBg:    '#FFF1EE',
  warn:      '#B45309', warnBg:      '#FEF3C7',
  success:   '#166534', successBg:   '#DCFCE7',

  category: {
    travel:        '#1D4ED8', travelBg:        '#DBEAFE',
    dining:        '#B45309', diningBg:        '#FEF3C7',
    entertainment: '#6D28D9', entertainmentBg: '#F3E8FF',
    fitness:       '#166534', fitnessBg:       '#DCFCE7',
    hotel:         '#BE123C', hotelBg:         '#FFF1F2',
    shopping:      '#C2410C', shoppingBg:      '#FFF7ED',
  },

  gradients: {
    amexPlatinum:  ['#2D2D2D', '#5A5A5A', '#3A3A3A'] as const,
    chaseSapphire: ['#0F2B5B', '#1D4ED8'] as const,
    amexGold:      ['#92400E', '#D97706', '#FCD34D'] as const,
    capitalVenture:['#1E293B', '#334155'] as const,
    default:       ['#374151', '#6B7280'] as const,
  },
} as const;

// ─── DARK THEME ─────────────────────────────────────────────────────────────
export const darkColors = {
  bg:       '#0F0F0F',
  sidebar:  '#171717',
  surface:  '#1C1C1E',
  border:   '#2C2C2E',
  text:     '#F5F5F0',
  muted:    '#8E8E93',

  accent:   '#4F7BFF',
  accentBg: '#1E2F5C',

  gold:   '#D97706',
  goldBg: '#1C1200',

  urgent:    '#FF6B47', urgentBg:    '#2C0F00',
  warn:      '#F59E0B', warnBg:      '#1C1200',
  success:   '#34D399', successBg:   '#022C22',

  category: {
    travel:        '#4F7BFF', travelBg:        '#1E2F5C',
    dining:        '#F59E0B', diningBg:        '#1C1200',
    entertainment: '#A78BFA', entertainmentBg: '#1E1040',
    fitness:       '#34D399', fitnessBg:       '#022C22',
    hotel:         '#FB7185', hotelBg:         '#2C0010',
    shopping:      '#FF6B47', shoppingBg:      '#2C0F00',
  },

  // Gradients are the same — card art doesn't change with theme
  gradients: lightColors.gradients,
} as const;

// Backward-compat alias — components using `import { colors }` still get light theme.
// New components: use useTheme().colors instead.
export const colors = lightColors;

// ─── SHARED TOKENS (theme-independent) ──────────────────────────────────────
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
  regular:   'PlayfairDisplay_400Regular',
  medium:    'PlayfairDisplay_500Medium',
  semiBold:  'PlayfairDisplay_600SemiBold',
  bold:      'PlayfairDisplay_700Bold',
  italic:    'PlayfairDisplay_400Regular_Italic',
  boldItalic:'PlayfairDisplay_700Bold_Italic',
} as const;

export const fontSans = {
  light:    'Inter_300Light',
  regular:  'Inter_400Regular',
  medium:   'Inter_500Medium',
  semiBold: 'Inter_600SemiBold',
  bold:     'Inter_700Bold',
} as const;

// The type of any colors object (light or dark)
export type AppColors = typeof lightColors;

// ─── MOTION TOKENS ──────────────────────────────────────────────────────────
export const motion = {
  tabSwitch:   { duration: 150, easing: 'ease-out' },
  screenPush:  { duration: 250, easing: 'ease-in-out' },
  modalSpring: { damping: 20, stiffness: 300 },
  progressBar: { duration: 400, damping: 15, stiffness: 120 },
  countUp:     { duration: 600, easing: 'ease-out' },
  cardTilt:    { damping: 12, stiffness: 200 },
} as const;

// ─── HELPERS ─────────────────────────────────────────────────────────────────
export type GradientKey = keyof typeof lightColors.gradients;

export function getGradient(key: string): readonly string[] {
  const g = lightColors.gradients as Record<string, readonly string[]>;
  return g[key] ?? lightColors.gradients.default;
}

export function getCategoryColors(
  category: string | null,
  isDark = false,
): { color: string; bg: string } {
  const c = isDark ? darkColors.category : lightColors.category;
  const map: Record<string, { color: string; bg: string }> = {
    travel:        { color: c.travel,        bg: c.travelBg },
    dining:        { color: c.dining,        bg: c.diningBg },
    entertainment: { color: c.entertainment, bg: c.entertainmentBg },
    fitness:       { color: c.fitness,       bg: c.fitnessBg },
    wellness:      { color: c.fitness,       bg: c.fitnessBg },
    hotel:         { color: c.hotel,         bg: c.hotelBg },
    shopping:      { color: c.shopping,      bg: c.shoppingBg },
    retail:        { color: c.shopping,      bg: c.shoppingBg },
  };
  const fallback = isDark
    ? { color: darkColors.muted,  bg: darkColors.surface }
    : { color: lightColors.muted, bg: lightColors.sidebar };
  return map[category?.toLowerCase() ?? ''] ?? fallback;
}
