import React from 'react';
import { View, ViewStyle } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { radius } from '@/lib/theme';
import { Text } from '@/components/primitives/Text';

interface Props {
  current: number;
  total: number;
  variant?: 'auto' | 'accent' | 'success' | 'warning' | 'danger';
  showLabel?: boolean;
  height?: number;
  style?: ViewStyle;
}

export function ProgressBar({
  current,
  total,
  variant = 'auto',
  showLabel = false,
  height = 6,
  style,
}: Props) {
  const { colors } = useTheme();
  const pct = total > 0 ? Math.min(current / total, 1) : 0;

  function getColor(): string {
    if (variant !== 'auto') {
      const map: Record<string, string> = {
        accent: colors.accent,
        success: colors.success,
        warning: colors.warn,
        danger: colors.urgent,
      };
      return map[variant] ?? colors.accent;
    }
    if (pct >= 1) return colors.success;
    if (pct >= 0.7) return colors.accent;
    if (pct >= 0.4) return colors.warn;
    return colors.urgent;
  }

  return (
    <View style={style}>
      <View
        style={{
          height,
          backgroundColor: colors.sidebar,
          borderRadius: height / 2,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            height: '100%',
            width: `${pct * 100}%`,
            backgroundColor: getColor(),
            borderRadius: height / 2,
          }}
        />
      </View>

      {showLabel && (
        <Text variant="caption" color="muted" style={{ marginTop: 4 }}>
          {current.toLocaleString()} / {total.toLocaleString()}
        </Text>
      )}
    </View>
  );
}
