import React, { useState, useMemo } from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { Zap, Lock } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { spacing, radius, fontSerif, fontSans } from '@/lib/theme';
import { Text } from '@/components/primitives/Text';
import { Badge } from '@/components/primitives/Badge';
import { Surface } from '@/components/primitives/Surface';
import { Button } from '@/components/primitives/Button';
import { FilterChip } from '@/components/composed/FilterChip';
import { StatCard } from '@/components/composed/StatCard';
import { EmptyState } from '@/components/composed/EmptyState';
import { IssuerVelocityCard } from '@/components/composed/IssuerVelocityCard';
import { PaywallModal } from '@/components/PaywallModal';
import { useApplications } from '@/hooks/useApplications';
import { useHousehold } from '@/hooks/useHousehold';
import { useSubscription } from '@/hooks/useSubscription';
import type { Issuer } from '@/lib/applicationTypes';
import { ISSUER_LABELS } from '@/lib/applicationTypes';
import { computeVelocity, countByStatus, getIssuerRules, worstStatus } from '@/lib/velocityEngine';
import type { VelocityReport } from '@/lib/velocityEngine';

// Issuers to display (in order)
const DISPLAY_ISSUERS: Issuer[] = [
  'chase', 'amex', 'citi', 'capital_one',
  'bank_of_america', 'barclays', 'us_bank', 'discover',
];

export default function VelocityDashboardScreen() {
  const { colors } = useTheme();
  const { isPro } = useSubscription();
  const { data: apps = [], isLoading: appsLoading } = useApplications();
  const { data: members = [] } = useHousehold();

  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);

  // Default to first member
  const activeMemberId = selectedMemberId ?? members[0]?.id ?? '';
  const activeMember = members.find((m) => m.id === activeMemberId);

  // Compute velocity report
  const report = useMemo<VelocityReport | null>(() => {
    if (!activeMemberId || apps.length === 0) return null;
    return computeVelocity(apps, activeMemberId);
  }, [apps, activeMemberId]);

  const summary = report ? countByStatus(report) : { clear: 0, warning: 0, blocked: 0 };

  const s = makeStyles(colors);

  // Pro gate overlay
  const renderProGate = () => (
    <View style={s.proGate}>
      <View style={s.proGateInner}>
        <Lock size={32} color={colors.gold} />
        <Text variant="heading3" style={{ textAlign: 'center', marginTop: 12 }}>
          Velocity intelligence requires Pro
        </Text>
        <Text variant="bodySmall" color="muted" style={{ textAlign: 'center', marginTop: 4, lineHeight: 20 }}>
          Know exactly when you can apply next.{'\n'}
          14 issuer rules tracked in real time.
        </Text>
        <Button
          label="Unlock Pro"
          variant="primary"
          onPress={() => setShowPaywall(true)}
          style={{ marginTop: 16 }}
        />
      </View>
    </View>
  );

  return (
    <>
      <ScrollView
        style={s.screen}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={s.header}>
          <View style={s.headerRule} />
          <Text
            variant="label"
            style={{ color: colors.gold, fontSize: 10, letterSpacing: 2, marginBottom: 6 }}
          >
            INTELLIGENCE
          </Text>
          <Text
            variant="heading1"
            style={{ fontFamily: fontSerif.boldItalic, fontSize: 32, letterSpacing: -0.5, marginBottom: 4 }}
          >
            Velocity
          </Text>
          <Text variant="bodySmall" color="muted" style={{ lineHeight: 21 }}>
            Issuer rules, application timing, and eligibility — all in one view.
          </Text>
        </View>

        {/* Household member filter */}
        {members.length > 1 && (
          <View style={s.filterRow}>
            {members.map((m) => (
              <FilterChip
                key={m.id}
                label={m.name}
                selected={m.id === activeMemberId}
                onPress={() => setSelectedMemberId(m.id)}
              />
            ))}
          </View>
        )}

        {/* Empty state */}
        {apps.length === 0 && !appsLoading && (
          <EmptyState
            icon={Zap}
            title="No applications yet."
            description="Add your card history to see velocity rules and timing recommendations."
            style={{ marginBottom: spacing.xl }}
          />
        )}

        {/* Dashboard content — blurred/locked if not Pro */}
        {apps.length > 0 && (
          <View style={{ position: 'relative' }}>
            {/* Summary stats */}
            <View style={s.statsRow}>
              <StatCard
                value={String(summary.clear)}
                label="Issuers clear"
                style={{ flex: 1 }}
              />
              <StatCard
                value={String(summary.warning)}
                label="Cautions"
                emphasis={summary.warning > 0}
                style={{ flex: 1 }}
              />
              <StatCard
                value={String(summary.blocked)}
                label="Blocked"
                emphasis={summary.blocked > 0}
                style={{ flex: 1 }}
              />
            </View>

            {/* Overall status */}
            {report && (
              <View style={s.statusBanner}>
                <Badge
                  label={
                    report.overall_status === 'clear'
                      ? 'ALL CLEAR'
                      : report.overall_status === 'some_warnings'
                        ? 'SOME CAUTIONS'
                        : 'SOME BLOCKED'
                  }
                  variant={
                    report.overall_status === 'clear'
                      ? 'success'
                      : report.overall_status === 'some_warnings'
                        ? 'warning'
                        : 'danger'
                  }
                  dot
                  size="md"
                />
                {activeMember && (
                  <Text variant="caption" color="muted" style={{ marginLeft: 8 }}>
                    for {activeMember.name}
                  </Text>
                )}
              </View>
            )}

            {/* Per-issuer cards */}
            {report && (
              <View style={s.cardsSection}>
                {DISPLAY_ISSUERS.map((issuer) => {
                  const rules = getIssuerRules(report, issuer);
                  if (rules.length === 0) return null;

                  const status = worstStatus(rules);
                  const primary = rules[0];

                  // Build metric display
                  let metric: string | undefined;
                  let metricLabel: string | undefined;
                  let progress: { current: number; total: number } | undefined;

                  if (issuer === 'chase') {
                    const r = report.chase.five_twenty_four;
                    metric = `${r.current_value ?? 0}/5`;
                    metricLabel = '5/24 count';
                    progress = { current: r.current_value ?? 0, total: 5 };
                  } else if (issuer === 'amex') {
                    const r = report.amex.credit_limit;
                    metric = `${r.current_value ?? 0}/5`;
                    metricLabel = 'Open credit cards';
                  } else if (issuer === 'bank_of_america') {
                    metric = undefined;
                    metricLabel = '2/3/4 rule';
                  } else if (issuer === 'barclays') {
                    const r = report.barclays.six_24;
                    metric = `${r.current_value ?? 0}/6`;
                    metricLabel = '6/24 count';
                  } else if (primary.current_value != null && primary.limit_value != null && primary.limit_value > 0) {
                    metric = `${primary.current_value}/${primary.limit_value}`;
                  }

                  return (
                    <IssuerVelocityCard
                      key={issuer}
                      issuer={issuer}
                      rules={rules}
                      overallStatus={status}
                      primaryMetric={metric}
                      primaryLabel={metricLabel}
                      progress={progress}
                    />
                  );
                })}
              </View>
            )}

            {/* Optimal next recommendation */}
            {report?.optimal_next && (
              <Surface variant="card" border padding="md" radius="lg" style={{ marginBottom: spacing.lg }}>
                <Text variant="label" style={{ color: colors.gold, fontSize: 10, letterSpacing: 1.5, marginBottom: 6 }}>
                  RECOMMENDATION
                </Text>
                <Text variant="body" style={{ lineHeight: 22 }}>
                  {report.optimal_next}
                </Text>
              </Surface>
            )}

            {/* Pro gate overlay */}
            {!isPro && renderProGate()}
          </View>
        )}
      </ScrollView>

      <PaywallModal
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
        feature="Velocity Dashboard"
      />
    </>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    content: {
      paddingHorizontal: spacing.screen,
      paddingTop: 56,
      paddingBottom: 40,
    },
    header: {
      marginBottom: spacing.lg,
    },
    headerRule: {
      width: 32,
      height: 3,
      backgroundColor: colors.gold,
      borderRadius: 2,
      marginBottom: 12,
    },
    filterRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: spacing.lg,
    },
    statsRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: spacing.md,
    },
    statusBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.lg,
    },
    cardsSection: {
      gap: 12,
      marginBottom: spacing.lg,
    },
    proGate: {
      position: 'absolute',
      top: 0,
      left: -spacing.screen,
      right: -spacing.screen,
      bottom: 0,
      backgroundColor: 'rgba(250, 250, 249, 0.85)',
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: radius.lg,
    },
    proGateInner: {
      alignItems: 'center',
      paddingHorizontal: spacing.xl,
      maxWidth: 300,
    },
  });
}
