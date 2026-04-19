import React, { useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { spacing, radius, fontSans } from '@/lib/theme';
import { Text } from '@/components/primitives/Text';
import { Badge } from '@/components/primitives/Badge';
import { ProgressBar } from './ProgressBar';
import type { Issuer } from '@/lib/applicationTypes';
import { ISSUER_LABELS } from '@/lib/applicationTypes';
import type { RuleResult } from '@/lib/issuerRules';

// ─── Issuer brand colors (dot + accent) ─────────────────────────────────────

const ISSUER_DOT_COLORS: Partial<Record<Issuer, string>> = {
  chase:           '#003087',
  amex:            '#006FCF',
  citi:            '#D1232B',
  capital_one:     '#004879',
  bank_of_america: '#C41230',
  us_bank:         '#BD1D2C',
  barclays:        '#00AEEF',
  discover:        '#FF6600',
};

// ─── Props ──────────────────────────────────────────────────────────────────

interface Props {
  issuer: Issuer;
  rules: RuleResult[];
  overallStatus: 'clear' | 'warning' | 'blocked';
  primaryMetric?: string;
  primaryLabel?: string;
  progress?: { current: number; total: number };
}

// ─── Component ──────────────────────────────────────────────────────────────

export function IssuerVelocityCard({
  issuer,
  rules,
  overallStatus,
  primaryMetric,
  primaryLabel,
  progress,
}: Props) {
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const dotColor = ISSUER_DOT_COLORS[issuer] ?? colors.muted;

  const badgeVariant = overallStatus === 'blocked'
    ? 'danger'
    : overallStatus === 'warning'
      ? 'warning'
      : 'success';

  const badgeLabel = overallStatus === 'blocked'
    ? 'BLOCKED'
    : overallStatus === 'warning'
      ? 'CAUTION'
      : 'CLEAR';

  const s = makeStyles(colors);

  return (
    <View style={s.card}>
      {/* Header row */}
      <Pressable
        onPress={() => setExpanded(!expanded)}
        style={s.header}
      >
        <View style={s.headerLeft}>
          <View style={[s.dot, { backgroundColor: dotColor }]} />
          <View style={{ flex: 1 }}>
            <Text variant="body" style={{ fontFamily: fontSans.semiBold }}>
              {ISSUER_LABELS[issuer]}
            </Text>
            {primaryLabel && (
              <Text variant="caption" color="muted">{primaryLabel}</Text>
            )}
          </View>
        </View>

        <View style={s.headerRight}>
          {primaryMetric && (
            <Text
              variant="heading2"
              style={{
                fontFamily: fontSans.bold,
                fontSize: 20,
                color: overallStatus === 'blocked' ? colors.urgent : colors.text,
                marginRight: 8,
              }}
            >
              {primaryMetric}
            </Text>
          )}
          <Badge label={badgeLabel} variant={badgeVariant} dot />
          <View style={{ marginLeft: 6 }}>
            {expanded
              ? <ChevronUp size={16} color={colors.muted} />
              : <ChevronDown size={16} color={colors.muted} />
            }
          </View>
        </View>
      </Pressable>

      {/* Progress bar (e.g., Chase 5/24) */}
      {progress && (
        <View style={{ paddingHorizontal: spacing.card, paddingBottom: 10 }}>
          <ProgressBar
            current={progress.current}
            total={progress.total}
            variant={
              overallStatus === 'blocked' ? 'danger'
                : overallStatus === 'warning' ? 'warning'
                  : 'accent'
            }
            height={8}
          />
        </View>
      )}

      {/* Expanded detail */}
      {expanded && (
        <View style={s.detail}>
          {rules.map((rule, i) => (
            <View key={rule.rule_id + i} style={s.ruleRow}>
              <View style={[
                s.statusDot,
                {
                  backgroundColor:
                    rule.status === 'blocked' ? colors.urgent
                      : rule.status === 'warning' ? colors.warn
                        : colors.success,
                },
              ]} />
              <View style={{ flex: 1 }}>
                <Text variant="bodySmall">{rule.message}</Text>
                {rule.eligible_after && (
                  <Text variant="caption" color="muted" style={{ marginTop: 2 }}>
                    Clears {rule.eligible_after}
                    {rule.days_until_clear != null ? ` (${rule.days_until_clear} days)` : ''}
                  </Text>
                )}
              </View>
            </View>
          ))}

          {rules.length === 0 && (
            <Text variant="caption" color="muted">No rules to display.</Text>
          )}
        </View>
      )}
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: spacing.card,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      gap: 10,
    },
    headerRight: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    dot: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    detail: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
      padding: spacing.card,
      gap: 10,
    },
    ruleRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
    },
    statusDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      marginTop: 6,
    },
  });
}
