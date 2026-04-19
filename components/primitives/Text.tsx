import React from 'react';
import { Text as RNText, TextStyle, StyleSheet } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { fontSerif, fontSans } from '@/lib/theme';

export type TextVariant =
  | 'display'
  | 'heading1'
  | 'heading2'
  | 'heading3'
  | 'body'
  | 'bodySmall'
  | 'caption'
  | 'mono'
  | 'label';

export type TextColor = 'primary' | 'secondary' | 'muted' | 'danger' | 'success' | 'warning' | 'accent';

interface Props {
  variant?: TextVariant;
  color?: TextColor;
  align?: 'left' | 'center' | 'right';
  numberOfLines?: number;
  style?: TextStyle;
  children: React.ReactNode;
}

const VARIANT_STYLES: Record<TextVariant, TextStyle> = {
  display:   { fontFamily: fontSerif.bold, fontSize: 40, letterSpacing: -1, lineHeight: 48 },
  heading1:  { fontFamily: fontSerif.bold, fontSize: 28, letterSpacing: -0.5, lineHeight: 36 },
  heading2:  { fontFamily: fontSerif.semiBold, fontSize: 22, letterSpacing: -0.3, lineHeight: 28 },
  heading3:  { fontFamily: fontSans.semiBold, fontSize: 18, lineHeight: 24 },
  body:      { fontFamily: fontSans.regular, fontSize: 15, lineHeight: 23 },
  bodySmall: { fontFamily: fontSans.regular, fontSize: 13, lineHeight: 19 },
  caption:   { fontFamily: fontSans.regular, fontSize: 12, lineHeight: 18 },
  mono:      { fontFamily: fontSans.bold, fontSize: 14, letterSpacing: -0.3 },
  label:     { fontFamily: fontSans.medium, fontSize: 13, letterSpacing: 1, textTransform: 'uppercase' },
};

export function Text({
  variant = 'body',
  color = 'primary',
  align,
  numberOfLines,
  style,
  children,
}: Props) {
  const { colors } = useTheme();

  const COLOR_MAP: Record<TextColor, string> = {
    primary:   colors.text,
    secondary: colors.muted,
    muted:     colors.muted,
    danger:    colors.urgent,
    success:   colors.success,
    warning:   colors.warn,
    accent:    colors.accent,
  };

  return (
    <RNText
      style={[
        VARIANT_STYLES[variant],
        { color: COLOR_MAP[color] },
        align && { textAlign: align },
        style,
      ]}
      numberOfLines={numberOfLines}
    >
      {children}
    </RNText>
  );
}
