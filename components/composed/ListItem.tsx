import React from 'react';
import { Pressable, View, ViewStyle } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/ThemeContext';
import { spacing, radius } from '@/lib/theme';
import { Text } from '@/components/primitives/Text';
import type { LucideIcon } from 'lucide-react-native';

type Variant = 'default' | 'compact';

interface Props {
  title: string;
  subtitle?: string;
  leftIcon?: LucideIcon;
  leftIconColor?: string;
  rightElement?: React.ReactNode;
  onPress?: () => void;
  variant?: Variant;
  style?: ViewStyle;
}

export function ListItem({
  title,
  subtitle,
  leftIcon: LeftIcon,
  leftIconColor,
  rightElement,
  onPress,
  variant = 'default',
  style,
}: Props) {
  const { colors } = useTheme();
  const isCompact = variant === 'compact';

  const content = (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          backgroundColor: colors.surface,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: colors.border,
          paddingVertical: isCompact ? 10 : 14,
          paddingHorizontal: isCompact ? 12 : spacing.card,
          minHeight: 44,
        },
        style,
      ]}
    >
      {LeftIcon && (
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: radius.sm,
            backgroundColor: colors.accentBg,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <LeftIcon size={18} color={leftIconColor ?? colors.accent} strokeWidth={1.75} />
        </View>
      )}

      <View style={{ flex: 1 }}>
        <Text variant={isCompact ? 'bodySmall' : 'body'} style={{ fontWeight: '500' }}>
          {title}
        </Text>
        {subtitle && (
          <Text variant="caption" color="muted" numberOfLines={2}>
            {subtitle}
          </Text>
        )}
      </View>

      {rightElement ?? (
        onPress && <ChevronRight size={16} color={colors.muted} strokeWidth={1.75} />
      )}
    </View>
  );

  if (!onPress) return content;

  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
    >
      {content}
    </Pressable>
  );
}
