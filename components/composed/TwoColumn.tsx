import React from 'react';
import { View, ViewStyle } from 'react-native';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { spacing } from '@/lib/theme';

interface Props {
  left: React.ReactNode;
  right: React.ReactNode;
  leftWidth?: number;
  gap?: number;
  style?: ViewStyle;
}

/**
 * Two-column layout for desktop. Stacks vertically on mobile.
 * Left column is fixed-width sidebar, right is flex.
 */
export function TwoColumn({
  left,
  right,
  leftWidth = 360,
  gap = spacing.xl,
  style,
}: Props) {
  const { isDesktop } = useBreakpoint();

  if (!isDesktop) {
    return (
      <View style={style}>
        {left}
        {right}
      </View>
    );
  }

  return (
    <View
      style={[
        {
          flexDirection: 'row',
          gap,
          alignItems: 'flex-start',
        },
        style,
      ]}
    >
      <View style={{ width: leftWidth, flexShrink: 0 }}>{left}</View>
      <View style={{ flex: 1 }}>{right}</View>
    </View>
  );
}
