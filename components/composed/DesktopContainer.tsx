import React from 'react';
import { View, ViewStyle } from 'react-native';
import { useBreakpoint } from '@/hooks/useBreakpoint';

interface Props {
  children: React.ReactNode;
  maxWidth?: number;
  style?: ViewStyle;
}

/**
 * Wraps content with a max-width container on desktop.
 * On mobile, renders children directly with no wrapper overhead.
 */
export function DesktopContainer({
  children,
  maxWidth = 1200,
  style,
}: Props) {
  const { isDesktop } = useBreakpoint();

  if (!isDesktop) return <>{children}</>;

  return (
    <View
      style={[
        {
          width: '100%',
          maxWidth,
          alignSelf: 'center',
          paddingHorizontal: 32,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
