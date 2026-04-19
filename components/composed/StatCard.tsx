import React from 'react';
import { View, ViewStyle } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { spacing, radius } from '@/lib/theme';
import { Text } from '@/components/primitives/Text';
import { ProgressBar } from './ProgressBar';

interface Props {
  value: string;
  label: string;
  trend?: { direction: 'up' | 'down'; text: string };
  progress?: { current: number; total: number };
  emphasis?: boolean;
  style?: ViewStyle;
}

export function StatCard({ value, label, trend, progress, emphasis, style }: Props) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        {
          backgroundColor: emphasis ? colors.accentBg : colors.surface,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: emphasis ? colors.accent : colors.border,
          padding: spacing.card,
        },
        style,
      ]}
    >
      <Text
        variant="display"
        style={{
          fontSize: 32,
          color: emphasis ? colors.accent : colors.text,
          marginBottom: 4,
        }}
      >
        {value}
      </Text>

      <Text variant="caption" color="muted">
        {label}
      </Text>

      {trend && (
        <Text
          variant="caption"
          color={trend.direction === 'up' ? 'success' : 'danger'}
          style={{ marginTop: 4 }}
        >
          {trend.direction === 'up' ? '↑' : '↓'} {trend.text}
        </Text>
      )}

      {progress && (
        <View style={{ marginTop: 8 }}>
          <ProgressBar current={progress.current} total={progress.total} showLabel />
        </View>
      )}
    </View>
  );
}
