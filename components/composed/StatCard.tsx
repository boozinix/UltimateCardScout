import React, { useEffect } from 'react';
import { View, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '@/contexts/ThemeContext';
import { spacing, radius, motion } from '@/lib/theme';
import { Text } from '@/components/primitives/Text';
import { ProgressBar } from './ProgressBar';

const AnimatedText = Animated.createAnimatedComponent(Text);

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

  // Try to parse numeric value for count-up animation
  const numericMatch = value.match(/^([^\d]*)(\d[\d,]*\.?\d*)(.*)$/);
  const prefix = numericMatch?.[1] ?? '';
  const numStr = numericMatch?.[2] ?? '';
  const suffix = numericMatch?.[3] ?? '';
  const targetNum = numStr ? parseFloat(numStr.replace(/,/g, '')) : NaN;
  const isAnimatable = !isNaN(targetNum) && targetNum > 0;

  const animatedNum = useSharedValue(0);

  useEffect(() => {
    if (isAnimatable) {
      animatedNum.value = 0;
      animatedNum.value = withTiming(targetNum, {
        duration: motion.countUp.duration,
        easing: Easing.out(Easing.cubic),
      });
    }
  }, [targetNum, isAnimatable]);

  // For count-up, we render the animated value as text
  // Since Animated.Text with animatedProps for text content is complex on RN,
  // we just display the final value with a simple opacity fade-in
  const opacity = useSharedValue(0);
  useEffect(() => {
    opacity.value = withTiming(1, { duration: motion.countUp.duration });
  }, [value]);

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
      accessibilityRole="summary"
      accessibilityLabel={`${label}: ${value}`}
    >
      <Animated.View style={{ opacity }}>
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
      </Animated.View>

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
