import React, { useState } from 'react';
import {
  View, TextInput, Pressable, StyleSheet,
  TextInputProps, ViewStyle,
} from 'react-native';
import { X } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { spacing, radius, fontSans } from '@/lib/theme';
import { Text } from './Text';

type InputVariant = 'text' | 'email' | 'number' | 'search' | 'multiline';

interface Props extends Omit<TextInputProps, 'style'> {
  variant?: InputVariant;
  label?: string;
  error?: string;
  helperText?: string;
  prefix?: string;
  onClear?: () => void;
  containerStyle?: ViewStyle;
}

export function Input({
  variant = 'text',
  label,
  error,
  helperText,
  prefix,
  onClear,
  containerStyle,
  value,
  onChangeText,
  ...rest
}: Props) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);

  const borderColor = error
    ? colors.urgent
    : focused
      ? colors.accent
      : colors.border;

  const keyboardType: TextInputProps['keyboardType'] =
    variant === 'email' ? 'email-address'
    : variant === 'number' ? 'numeric'
    : 'default';

  return (
    <View style={containerStyle}>
      {label && (
        <Text variant="label" color="muted" style={{ marginBottom: 6, fontSize: 11 }}>
          {label}
        </Text>
      )}

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor,
          borderRadius: radius.sm,
          minHeight: variant === 'multiline' ? 100 : 44,
          paddingHorizontal: 12,
        }}
      >
        {prefix && (
          <Text variant="body" color="muted" style={{ marginRight: 4 }}>
            {prefix}
          </Text>
        )}

        <TextInput
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          keyboardType={keyboardType}
          autoCapitalize={variant === 'email' ? 'none' : 'sentences'}
          multiline={variant === 'multiline'}
          textAlignVertical={variant === 'multiline' ? 'top' : 'center'}
          placeholderTextColor={colors.muted}
          style={{
            flex: 1,
            fontFamily: fontSans.regular,
            fontSize: 15,
            color: colors.text,
            paddingVertical: variant === 'multiline' ? 12 : 0,
          }}
          {...rest}
        />

        {variant === 'search' && value && onClear && (
          <Pressable onPress={onClear} hitSlop={8}>
            <X size={16} color={colors.muted} strokeWidth={2} />
          </Pressable>
        )}
      </View>

      {error && (
        <Text variant="caption" color="danger" style={{ marginTop: 4 }}>
          {error}
        </Text>
      )}
      {helperText && !error && (
        <Text variant="caption" color="muted" style={{ marginTop: 4 }}>
          {helperText}
        </Text>
      )}
    </View>
  );
}
