import React, { useEffect } from 'react';
import { View, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { useTheme } from '@/contexts/ThemeContext';
import { radius, motion } from '@/lib/theme';
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

  const animatedWidth = useSharedValue(0);

  useEffect(() => {
    animatedWidth.value = withSpring(pct, {
      damping: motion.progressBar.damping,
      stiffness: motion.progressBar.stiffness,
    });
  }, [pct]);

  const animStyle = useAnimatedStyle(() => ({
    width: `${animatedWidth.value * 100}%` as any,
  }));

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
    <View style={style} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: total, now: current }}>
      <View
        style={{
          height,
          backgroundColor: colors.sidebar,
          borderRadius: height / 2,
          overflow: 'hidden',
        }}
      >
        <Animated.View
          style={[
            {
              height: '100%',
              backgroundColor: getColor(),
              borderRadius: height / 2,
            },
            animStyle,
          ]}
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
