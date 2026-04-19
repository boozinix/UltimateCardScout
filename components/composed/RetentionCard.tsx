import React, { useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Copy, Check, ChevronDown, ChevronUp } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/ThemeContext';
import { spacing, radius, fontSans } from '@/lib/theme';
import { Text } from '@/components/primitives/Text';
import { Badge } from '@/components/primitives/Badge';
import { Surface } from '@/components/primitives/Surface';
import type { RetentionScript } from '@/lib/applicationTypes';

// ─── Situation labels ──────────────────────────────────────────────────────

const SITUATION_LABELS: Record<string, string> = {
  below_breakeven: 'Below breakeven',
  above_breakeven: 'Above breakeven',
  considering_downgrade: 'Considering downgrade',
  first_year: 'First year',
  high_spend: 'High spender',
  gold_below_breakeven: 'Gold — below breakeven',
  gold_above_breakeven: 'Gold — above breakeven',
  general: 'General',
};

// ─── Props ──────────────────────────────────────────────────────────────────

interface Props {
  script: RetentionScript;
  cardAgeMonths?: number;
  benefitRatio?: number;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function RetentionCard({ script, cardAgeMonths, benefitRatio }: Props) {
  const { colors } = useTheme();
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const handleCopy = async () => {
    await Clipboard.setStringAsync(script.script_text);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const situationLabel = SITUATION_LABELS[script.situation] ?? script.situation;

  // Auto-highlight if the script situation matches the user's actual situation
  const isRelevant =
    (benefitRatio !== undefined && benefitRatio < 0.8 && script.situation === 'below_breakeven') ||
    (benefitRatio !== undefined && benefitRatio >= 0.8 && script.situation === 'above_breakeven') ||
    (cardAgeMonths !== undefined && cardAgeMonths < 12 && script.situation === 'first_year');

  const s = makeStyles(colors);

  return (
    <Surface
      variant="card"
      border
      radius="md"
      style={isRelevant ? { borderColor: colors.accent, borderWidth: 1.5 } : undefined}
    >
      <Pressable onPress={() => setExpanded(!expanded)} style={s.header}>
        <View style={{ flex: 1 }}>
          <View style={s.tagRow}>
            <Badge
              label={situationLabel}
              variant={isRelevant ? 'info' : 'neutral'}
              size="sm"
            />
            {isRelevant && (
              <Badge label="BEST MATCH" variant="pro" size="sm" />
            )}
          </View>
        </View>
        {expanded
          ? <ChevronUp size={16} color={colors.muted} />
          : <ChevronDown size={16} color={colors.muted} />
        }
      </Pressable>

      {expanded && (
        <View style={s.body}>
          <Text variant="bodySmall" style={{ lineHeight: 22, color: colors.text }}>
            {script.script_text}
          </Text>
          <Pressable onPress={handleCopy} style={s.copyBtn}>
            {copied
              ? <Check size={14} color={colors.success} strokeWidth={2} />
              : <Copy size={14} color={colors.accent} strokeWidth={2} />
            }
            <Text
              variant="caption"
              style={{
                fontFamily: fontSans.semiBold,
                color: copied ? colors.success : colors.accent,
              }}
            >
              {copied ? 'Copied' : 'Copy script'}
            </Text>
          </Pressable>
        </View>
      )}
    </Surface>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: spacing.card,
    },
    tagRow: {
      flexDirection: 'row',
      gap: 6,
      flexWrap: 'wrap',
    },
    body: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
      padding: spacing.card,
    },
    copyBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 12,
      alignSelf: 'flex-start',
      paddingVertical: 6,
      paddingHorizontal: 12,
      backgroundColor: colors.accentBg,
      borderRadius: radius.sm,
    },
  });
}
