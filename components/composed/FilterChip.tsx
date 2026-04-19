import React from 'react';
import { Pressable, ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/ThemeContext';
import { radius, fontSans } from '@/lib/theme';
import { Text } from '@/components/primitives/Text';

interface Props {
  label: string;
  selected?: boolean;
  onPress: () => void;
  style?: ViewStyle;
}

export function FilterChip({ label, selected = false, onPress, style }: Props) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      style={[
        {
          paddingVertical: 6,
          paddingHorizontal: 14,
          borderRadius: radius.full,
          backgroundColor: selected ? colors.accent : colors.surface,
          borderWidth: 1,
          borderColor: selected ? colors.accent : colors.border,
          minHeight: 32,
          justifyContent: 'center',
        },
        style,
      ]}
    >
      <Text
        variant="caption"
        style={{
          color: selected ? '#FFFFFF' : colors.text,
          fontFamily: fontSans.medium,
          fontSize: 13,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
