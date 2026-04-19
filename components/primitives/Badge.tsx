import React from 'react';
import { View, ViewStyle } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { radius, fontSans } from '@/lib/theme';
import { Text } from './Text';

type BadgeVariant = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'pro';
type BadgeSize = 'sm' | 'md';

interface Props {
  label: string;
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  style?: ViewStyle;
}

export function Badge({
  label,
  variant = 'neutral',
  size = 'sm',
  dot = false,
  style,
}: Props) {
  const { colors } = useTheme();

  const variants: Record<BadgeVariant, { bg: string; text: string; dot: string }> = {
    neutral: { bg: colors.sidebar,   text: colors.muted,   dot: colors.muted },
    success: { bg: colors.successBg, text: colors.success, dot: colors.success },
    warning: { bg: colors.warnBg,    text: colors.warn,    dot: colors.warn },
    danger:  { bg: colors.urgentBg,  text: colors.urgent,  dot: colors.urgent },
    info:    { bg: colors.accentBg,  text: colors.accent,  dot: colors.accent },
    pro:     { bg: colors.goldBg,    text: colors.gold,    dot: colors.gold },
  };

  const v = variants[variant];
  const isSmall = size === 'sm';

  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
          backgroundColor: v.bg,
          borderRadius: radius.full,
          paddingVertical: isSmall ? 2 : 4,
          paddingHorizontal: isSmall ? 8 : 10,
        },
        style,
      ]}
    >
      {dot && (
        <View
          style={{
            width: isSmall ? 5 : 6,
            height: isSmall ? 5 : 6,
            borderRadius: 3,
            backgroundColor: v.dot,
          }}
        />
      )}
      <Text
        variant="caption"
        style={{
          color: v.text,
          fontSize: isSmall ? 10 : 12,
          fontFamily: fontSans.semiBold,
          letterSpacing: 0.5,
        }}
      >
        {label}
      </Text>
    </View>
  );
}
