import React from 'react';
import { View, ViewStyle } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { spacing } from '@/lib/theme';
import { Text } from '@/components/primitives/Text';
import { Button } from '@/components/primitives/Button';
import type { LucideIcon } from 'lucide-react-native';

interface Props {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: { label: string; onPress: () => void };
  style?: ViewStyle;
}

export function EmptyState({ icon: Icon, title, description, action, style }: Props) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        {
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: spacing['2xl'],
          paddingHorizontal: spacing.lg,
        },
        style,
      ]}
    >
      {Icon && (
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: colors.accentBg,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: spacing.md,
          }}
        >
          <Icon size={24} color={colors.accent} strokeWidth={1.5} />
        </View>
      )}

      <Text variant="heading3" align="center" style={{ marginBottom: 8 }}>
        {title}
      </Text>

      {description && (
        <Text variant="bodySmall" color="muted" align="center" style={{ maxWidth: 280 }}>
          {description}
        </Text>
      )}

      {action && (
        <View style={{ marginTop: spacing.lg }}>
          <Button label={action.label} onPress={action.onPress} />
        </View>
      )}
    </View>
  );
}
