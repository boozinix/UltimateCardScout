import React from 'react';
import { Text, StyleSheet, TextStyle } from 'react-native';
import { colors, fontSerif, fontSans } from '@/lib/theme';

interface TypoProps {
  children: React.ReactNode;
  style?: TextStyle;
  numberOfLines?: number;
}

export function Headline({ children, style, numberOfLines }: TypoProps) {
  return <Text style={[styles.headline, style]} numberOfLines={numberOfLines}>{children}</Text>;
}

export function Title({ children, style, numberOfLines }: TypoProps) {
  return <Text style={[styles.title, style]} numberOfLines={numberOfLines}>{children}</Text>;
}

export function Body({ children, style, numberOfLines }: TypoProps) {
  return <Text style={[styles.body, style]} numberOfLines={numberOfLines}>{children}</Text>;
}

export function Label({ children, style, numberOfLines }: TypoProps) {
  return <Text style={[styles.label, style]} numberOfLines={numberOfLines}>{children}</Text>;
}

export function Caption({ children, style, numberOfLines }: TypoProps) {
  return <Text style={[styles.caption, style]} numberOfLines={numberOfLines}>{children}</Text>;
}

export function MonoAmount({ children, style, numberOfLines }: TypoProps) {
  return <Text style={[styles.mono, style]} numberOfLines={numberOfLines}>{children}</Text>;
}

const styles = StyleSheet.create({
  headline: { fontFamily: fontSerif.bold, fontSize: 28, color: colors.text, letterSpacing: -0.5, lineHeight: 36 },
  title: { fontFamily: fontSerif.semiBold, fontSize: 20, color: colors.text, letterSpacing: -0.3 },
  body: { fontFamily: fontSans.regular, fontSize: 15, color: colors.text, lineHeight: 23 },
  label: { fontFamily: fontSans.medium, fontSize: 13, color: colors.muted, letterSpacing: 0.2 },
  caption: { fontFamily: fontSans.regular, fontSize: 12, color: colors.muted, lineHeight: 18 },
  mono: { fontFamily: fontSans.bold, fontSize: 22, color: colors.text, letterSpacing: -0.5 },
});
