import React from 'react';
import { View, ViewStyle, Platform } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { spacing, radius as themeRadius } from '@/lib/theme';

type SurfaceVariant = 'canvas' | 'card' | 'inset';
type Padding = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'none';
type Radius = 'sm' | 'md' | 'lg' | 'none';

interface Props {
  variant?: SurfaceVariant;
  padding?: Padding;
  radius?: Radius;
  border?: boolean;
  style?: ViewStyle;
  children: React.ReactNode;
}

const PADDING_MAP: Record<Padding, number> = {
  none: 0,
  xs: spacing.xs,
  sm: spacing.sm,
  md: spacing.md,
  lg: spacing.lg,
  xl: spacing.xl,
};

const RADIUS_MAP: Record<Radius, number> = {
  none: 0,
  sm: themeRadius.sm,
  md: themeRadius.md,
  lg: themeRadius.lg,
};

export function Surface({
  variant = 'canvas',
  padding = 'md',
  radius = 'md',
  border = false,
  style,
  children,
}: Props) {
  const { colors } = useTheme();

  const bgMap: Record<SurfaceVariant, string> = {
    canvas: colors.bg,
    card:   colors.surface,
    inset:  colors.sidebar,
  };

  const shadow: ViewStyle = variant === 'card' ? {
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
      },
      android: { elevation: 1 },
      web: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
      },
    }),
  } : {};

  return (
    <View
      style={[
        {
          backgroundColor: bgMap[variant],
          padding: PADDING_MAP[padding],
          borderRadius: RADIUS_MAP[radius],
          borderWidth: border ? 1 : 0,
          borderColor: colors.border,
        },
        shadow,
        style,
      ]}
    >
      {children}
    </View>
  );
}
