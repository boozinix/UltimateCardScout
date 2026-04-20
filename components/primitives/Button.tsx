import React from 'react';
import { Pressable, ActivityIndicator, View, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/ThemeContext';
import { radius, fontSans } from '@/lib/theme';
import { Text } from './Text';
import type { LucideIcon } from 'lucide-react-native';

type Variant = 'primary' | 'secondary' | 'tertiary' | 'destructive';
type Size = 'sm' | 'md' | 'lg';

interface Props {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  leftIcon?: LucideIcon;
  rightIcon?: LucideIcon;
  style?: ViewStyle;
}

const SIZE_HEIGHT: Record<Size, number> = { sm: 32, md: 44, lg: 52 };
const SIZE_PX: Record<Size, number> = { sm: 12, md: 16, lg: 20 };
const SIZE_FONT: Record<Size, number> = { sm: 12, md: 14, lg: 15 };
const SIZE_ICON: Record<Size, number> = { sm: 14, md: 16, lg: 18 };

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  leftIcon: LeftIcon,
  rightIcon: RightIcon,
  style,
}: Props) {
  const { colors } = useTheme();

  const variantStyles: Record<Variant, { bg: string; border?: string; text: string }> = {
    primary:     { bg: colors.accent, text: '#FFFFFF' },
    secondary:   { bg: 'transparent', border: colors.border, text: colors.text },
    tertiary:    { bg: 'transparent', text: colors.accent },
    destructive: { bg: colors.urgent, text: '#FFFFFF' },
  };

  const v = variantStyles[variant];
  const iconSize = SIZE_ICON[size];

  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || loading }}
      style={({ pressed, hovered }) => [
        {
          height: SIZE_HEIGHT[size],
          paddingHorizontal: SIZE_PX[size],
          backgroundColor: v.bg,
          borderRadius: radius.sm,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          borderWidth: v.border ? 1 : 0,
          borderColor: v.border,
          opacity: pressed || disabled ? 0.5 : (hovered as boolean) ? 0.85 : 1,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
          cursor: disabled ? 'not-allowed' : 'pointer',
        } as any,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={v.text} />
      ) : (
        <>
          {LeftIcon && <LeftIcon size={iconSize} color={v.text} strokeWidth={2} />}
          <Text
            variant="label"
            style={{
              color: v.text,
              fontSize: SIZE_FONT[size],
              fontFamily: fontSans.semiBold,
              letterSpacing: 0.5,
              textTransform: 'uppercase',
            }}
          >
            {label}
          </Text>
          {RightIcon && <RightIcon size={iconSize} color={v.text} strokeWidth={2} />}
        </>
      )}
    </Pressable>
  );
}
