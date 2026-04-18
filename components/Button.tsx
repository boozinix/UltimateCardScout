import React from 'react';
import { Pressable, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, radius, fontSans } from '@/lib/theme';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  labelStyle?: TextStyle;
}

export function Button({
  label, onPress, variant = 'primary', size = 'md',
  loading = false, disabled = false, style, labelStyle,
}: ButtonProps) {
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        sizeStyles[size],
        variantStyles[variant],
        (pressed || disabled) && styles.dimmed,
        style,
      ]}
    >
      {loading
        ? <ActivityIndicator size="small" color={variant === 'primary' ? '#FFF' : colors.text} />
        : <Text style={[styles.label, sizeLabel[size], variantLabel[variant], labelStyle]}>{label}</Text>
      }
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm },
  dimmed: { opacity: 0.5 },
  label: { fontFamily: fontSans.semiBold },
});

const sizeStyles: Record<Size, ViewStyle> = {
  sm: { height: 36, paddingHorizontal: 16 },
  md: { height: 48, paddingHorizontal: 20 },
  lg: { height: 56, paddingHorizontal: 24 },
};

const sizeLabel: Record<Size, TextStyle> = {
  sm: { fontSize: 12, letterSpacing: 0.5 },
  md: { fontSize: 14, letterSpacing: 0.5 },
  lg: { fontSize: 15, letterSpacing: 0.5 },
};

const variantStyles: Record<Variant, ViewStyle> = {
  primary: { backgroundColor: colors.text },
  secondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  ghost: { backgroundColor: 'transparent' },
  danger: { backgroundColor: colors.urgent },
};

const variantLabel: Record<Variant, TextStyle> = {
  primary: { color: '#FFFFFF' },
  secondary: { color: colors.text },
  ghost: { color: colors.muted },
  danger: { color: '#FFFFFF' },
};
