import React, { useState, useMemo } from 'react';
import {
  ScrollView, View, Pressable, StyleSheet, Modal,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import {
  CalendarClock, Lock, Phone, ArrowDownRight,
  ChevronDown, ChevronUp, AlertTriangle,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/ThemeContext';
import { spacing, radius, fontSerif, fontSans } from '@/lib/theme';
import { Text } from '@/components/primitives/Text';
import { Button } from '@/components/primitives/Button';
import { Input } from '@/components/primitives/Input';
import { Badge } from '@/components/primitives/Badge';
import { Surface } from '@/components/primitives/Surface';
import { FilterChip } from '@/components/composed/FilterChip';
import { ProgressBar } from '@/components/composed/ProgressBar';
import { EmptyState } from '@/components/composed/EmptyState';
import { RetentionCard } from '@/components/composed/RetentionCard';
import { PaywallModal } from '@/components/PaywallModal';
import { useApplications } from '@/hooks/useApplications';
import { useHousehold } from '@/hooks/useHousehold';
import { useSubscription } from '@/hooks/useSubscription';
import {
  useRetentionScripts,
  useDowngradePaths,
  useCreateRetentionOutcome,
} from '@/hooks/useRetention';
import type {
  Application,
  Issuer,
  RetentionOutcomeType,
} from '@/lib/applicationTypes';
import {
  ISSUER_LABELS,
  RETENTION_OUTCOME_LABELS,
} from '@/lib/applicationTypes';

// ============================================================
// Fee Advisor Logic (from B6 spec)
// ============================================================

type FeeAction = 'keep' | 'call_retention' | 'consider_downgrade';

interface FeeRecommendation {
  action: FeeAction;
  reason: string;
}

function getRecommendation(
  benefitsCaptured: number,
  annualFee: number,
  cardAgeMonths: number,
): FeeRecommendation {
  const ratio = annualFee > 0 ? benefitsCaptured / annualFee : 1;

  if (cardAgeMonths < 12) {
    return {
      action: 'call_retention',
      reason: 'Too early to cancel. Closing under 1 year hurts credit.',
    };
  }
  if (ratio >= 1.0) return { action: 'keep', reason: "You're ahead on value." };
  if (ratio >= 0.80) return { action: 'keep', reason: 'Near breakeven. Worth keeping.' };
  if (ratio >= 0.50) return { action: 'call_retention', reason: 'Call retention first.' };
  return { action: 'consider_downgrade', reason: 'Consider downgrade or cancel.' };
}

function daysUntilFee(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  const now = new Date();
  return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function cardAgeInMonths(appliedMonth: string): number {
  const [y, m] = appliedMonth.split('-').map(Number);
  const now = new Date();
  return (now.getFullYear() - y) * 12 + (now.getMonth() + 1 - m);
}

// Enriched application for fee advisor
interface FeeAdvisorCard {
  app: Application;
  daysLeft: number | null;
  benefitsCaptured: number;
  ratio: number;
  ageMonths: number;
  recommendation: FeeRecommendation;
}

// ============================================================
// Retention Outcome types for the logging flow
// ============================================================

const OUTCOME_OPTIONS: { value: RetentionOutcomeType; label: string }[] = [
  { value: 'fee_waived', label: 'Fee Waived' },
  { value: 'points_offer', label: 'Got Points Offer' },
  { value: 'credit_offer', label: 'Got Statement Credit' },
  { value: 'no_offer', label: 'No Offer' },
  { value: 'downgraded', label: 'Downgraded' },
  { value: 'cancelled', label: 'Cancelled Card' },
];

// ============================================================
// Screen
// ============================================================

export default function FeeAdvisorScreen() {
  const { colors } = useTheme();
  const { isPro } = useSubscription();
  const { data: apps = [], isLoading } = useApplications();
  const { data: members = [] } = useHousehold();

  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);

  // Retention outcome logging state
  const [loggingAppId, setLoggingAppId] = useState<string | null>(null);
  const [outcomeType, setOutcomeType] = useState<RetentionOutcomeType | null>(null);
  const [outcomeAmount, setOutcomeAmount] = useState('');
  const [outcomeAccepted, setOutcomeAccepted] = useState<boolean | null>(null);
  const [outcomeNotes, setOutcomeNotes] = useState('');

  const createOutcome = useCreateRetentionOutcome();

  const activeMemberId = selectedMemberId ?? members[0]?.id ?? '';

  // Filter to active cards with annual fees, sorted by fee due date
  const feeCards = useMemo<FeeAdvisorCard[]>(() => {
    const active = apps.filter((a) => {
      if (a.status !== 'active') return false;
      if (a.annual_fee <= 0) return false;
      if (selectedMemberId && a.household_member_id !== selectedMemberId) return false;
      return true;
    });

    return active
      .map((app) => {
        const daysLeft = daysUntilFee(app.annual_fee_next_due);
        // Estimate benefits captured — use bonus_spend_progress as a proxy
        // In a real implementation this would come from tracked benefits
        const benefitsCaptured = app.bonus_achieved
          ? app.annual_fee * 0.9 // Conservative estimate if bonus was earned
          : Math.min(app.bonus_spend_progress * 0.03, app.annual_fee); // ~3% value on spend
        const ratio = app.annual_fee > 0 ? benefitsCaptured / app.annual_fee : 1;
        const ageMonths = cardAgeInMonths(app.applied_month);
        const recommendation = getRecommendation(benefitsCaptured, app.annual_fee, ageMonths);

        return { app, daysLeft, benefitsCaptured, ratio, ageMonths, recommendation };
      })
      .sort((a, b) => {
        // Cards with upcoming fees first, then by date
        const da = a.daysLeft ?? 9999;
        const db = b.daysLeft ?? 9999;
        return da - db;
      });
  }, [apps, selectedMemberId]);

  // Get retention scripts for the expanded card's issuer
  const expandedCard = feeCards.find((fc) => fc.app.id === expandedCardId);
  const { data: scripts = [] } = useRetentionScripts(expandedCard?.app.issuer);
  const { data: downgrades = [] } = useDowngradePaths(expandedCard?.app.issuer);

  // Filter downgrades relevant to the expanded card
  const relevantDowngrades = useMemo(() => {
    if (!expandedCard) return [];
    const cardName = (expandedCard.app.card_name_override ?? expandedCard.app.card_name).toLowerCase();
    return downgrades.filter((d) =>
      d.from_card_name.toLowerCase().includes(cardName.split(' ').slice(-2).join(' ').toLowerCase()) ||
      cardName.includes(d.from_card_name.toLowerCase().split(' ').slice(-2).join(' '))
    );
  }, [downgrades, expandedCard]);

  // Outcome logging handlers
  const openOutcomeSheet = (appId: string) => {
    setLoggingAppId(appId);
    setOutcomeType(null);
    setOutcomeAmount('');
    setOutcomeAccepted(null);
    setOutcomeNotes('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSaveOutcome = async () => {
    if (!loggingAppId || !outcomeType) return;

    const feeCard = feeCards.find((fc) => fc.app.id === loggingAppId);

    try {
      await createOutcome.mutateAsync({
        application_id: loggingAppId,
        fee_amount: feeCard?.app.annual_fee ?? null,
        outcome: outcomeType,
        points_offered:
          outcomeType === 'points_offer'
            ? parseInt(outcomeAmount.replace(/[^0-9]/g, ''), 10) || null
            : null,
        credit_offered:
          outcomeType === 'credit_offer'
            ? parseInt(outcomeAmount.replace(/[^0-9]/g, ''), 10) || null
            : null,
        accepted: outcomeAccepted,
        notes: outcomeNotes.trim() || null,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
    setLoggingAppId(null);
  };

  const s = makeStyles(colors);

  const actionBadge = (action: FeeAction) => {
    switch (action) {
      case 'keep':
        return <Badge label="KEEP" variant="success" dot size="sm" />;
      case 'call_retention':
        return <Badge label="CALL RETENTION" variant="warning" dot size="sm" />;
      case 'consider_downgrade':
        return <Badge label="CONSIDER DOWNGRADE" variant="danger" dot size="sm" />;
    }
  };

  // Pro gate overlay
  const renderProGate = () => (
    <View style={s.proGate}>
      <View style={s.proGateInner}>
        <Lock size={32} color={colors.gold} />
        <Text variant="heading3" style={{ textAlign: 'center', marginTop: 12 }}>
          Fee intelligence requires Pro
        </Text>
        <Text variant="bodySmall" color="muted" style={{ textAlign: 'center', marginTop: 4, lineHeight: 20 }}>
          30-day advance warnings, retention scripts,{'\n'}
          and downgrade recommendations.
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
            Fee Advisor
          </Text>
          <Text variant="bodySmall" color="muted" style={{ lineHeight: 21 }}>
            Annual fees approaching — with retention scripts and downgrade paths.
          </Text>
        </View>

        {/* Household filter */}
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
        {feeCards.length === 0 && !isLoading && (
          <EmptyState
            icon={CalendarClock}
            title="No annual fee cards."
            description="Cards with annual fees will appear here with renewal warnings and retention strategies."
            style={{ marginBottom: spacing.xl }}
          />
        )}

        {/* Fee cards — blurred if not Pro */}
        {feeCards.length > 0 && (
          <View style={{ position: 'relative' }}>
            {/* Fee due soon warning */}
            {feeCards.some((fc) => fc.daysLeft !== null && fc.daysLeft <= 30 && fc.daysLeft >= 0) && (
              <Surface variant="card" border padding="md" radius="md" style={{ marginBottom: spacing.md, borderColor: colors.warn }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <AlertTriangle size={16} color={colors.warn} strokeWidth={2} />
                  <Text variant="bodySmall" style={{ fontFamily: fontSans.semiBold, color: colors.warn }}>
                    {feeCards.filter((fc) => fc.daysLeft !== null && fc.daysLeft <= 30 && fc.daysLeft >= 0).length} fee{feeCards.filter((fc) => fc.daysLeft !== null && fc.daysLeft <= 30 && fc.daysLeft >= 0).length !== 1 ? 's' : ''} due within 30 days
                  </Text>
                </View>
              </Surface>
            )}

            {/* Card list */}
            <View style={{ gap: 12, marginBottom: spacing.lg }}>
              {feeCards.map((fc) => {
                const isExpanded = expandedCardId === fc.app.id;
                const cardName = fc.app.card_name_override ?? fc.app.card_name;
                const pct = Math.round(fc.ratio * 100);
                const isUrgent = fc.daysLeft !== null && fc.daysLeft <= 30 && fc.daysLeft >= 0;

                return (
                  <Surface
                    key={fc.app.id}
                    variant="card"
                    border
                    radius="lg"
                    style={isUrgent ? { borderColor: colors.warn, borderWidth: 1.5 } : undefined}
                  >
                    {/* Card header */}
                    <Pressable
                      onPress={() => setExpandedCardId(isExpanded ? null : fc.app.id)}
                      style={s.cardHeader}
                    >
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <Text variant="body" style={{ fontFamily: fontSans.semiBold }} numberOfLines={1}>
                            {cardName}
                          </Text>
                          {isUrgent && (
                            <AlertTriangle size={14} color={colors.warn} strokeWidth={2} />
                          )}
                        </View>

                        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                          <Text variant="mono" style={{ fontSize: 18, color: colors.text }}>
                            ${fc.app.annual_fee}
                          </Text>
                          {fc.daysLeft !== null && (
                            <Text variant="caption" color="muted">
                              {fc.daysLeft >= 0 ? `Due in ${fc.daysLeft} days` : 'Fee posted'}
                            </Text>
                          )}
                          {fc.daysLeft === null && (
                            <Text variant="caption" color="muted">No due date set</Text>
                          )}
                        </View>

                        {/* Progress bar: captured / fee */}
                        <View style={{ marginTop: 8 }}>
                          <ProgressBar
                            current={Math.min(pct, 100)}
                            total={100}
                            variant={pct >= 80 ? 'success' : pct >= 50 ? 'warning' : 'danger'}
                            height={6}
                          />
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                            <Text variant="caption" color="muted">
                              Captured: ${Math.round(fc.benefitsCaptured)} / ${fc.app.annual_fee} ({pct}%)
                            </Text>
                          </View>
                        </View>

                        {/* Recommendation */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
                          {actionBadge(fc.recommendation.action)}
                          <Text variant="caption" color="muted" style={{ flex: 1 }}>
                            {fc.recommendation.reason}
                          </Text>
                        </View>
                      </View>

                      <View style={{ marginLeft: 8 }}>
                        {isExpanded
                          ? <ChevronUp size={18} color={colors.muted} />
                          : <ChevronDown size={18} color={colors.muted} />
                        }
                      </View>
                    </Pressable>

                    {/* Expanded: retention scripts + downgrade paths + log outcome */}
                    {isExpanded && (
                      <View style={s.expandedSection}>
                        {/* Retention scripts */}
                        {(fc.recommendation.action === 'call_retention' || fc.recommendation.action === 'consider_downgrade') && (
                          <View style={{ marginBottom: spacing.md }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                              <Phone size={14} color={colors.accent} strokeWidth={2} />
                              <Text variant="label" style={{ fontSize: 11, color: colors.accent }}>
                                RETENTION SCRIPTS
                              </Text>
                            </View>
                            <View style={{ gap: 8 }}>
                              {scripts.map((script) => (
                                <RetentionCard
                                  key={script.id}
                                  script={script}
                                  cardAgeMonths={fc.ageMonths}
                                  benefitRatio={fc.ratio}
                                />
                              ))}
                              {scripts.length === 0 && (
                                <Text variant="caption" color="muted">
                                  No retention scripts available for {ISSUER_LABELS[fc.app.issuer]}.
                                </Text>
                              )}
                            </View>
                          </View>
                        )}

                        {/* Downgrade paths */}
                        {(fc.recommendation.action === 'call_retention' || fc.recommendation.action === 'consider_downgrade') &&
                          relevantDowngrades.length > 0 && (
                          <View style={{ marginBottom: spacing.md }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                              <ArrowDownRight size={14} color={colors.accent} strokeWidth={2} />
                              <Text variant="label" style={{ fontSize: 11, color: colors.accent }}>
                                DOWNGRADE OPTIONS
                              </Text>
                            </View>
                            <View style={{ gap: 8 }}>
                              {relevantDowngrades.map((dp) => (
                                <Surface key={dp.id} variant="inset" padding="md" radius="md">
                                  <Text variant="bodySmall" style={{ fontFamily: fontSans.semiBold }}>
                                    {dp.from_card_name} {'\u2192'} {dp.to_card_name}
                                  </Text>
                                  <Text variant="caption" color="muted" style={{ marginTop: 4, lineHeight: 18 }}>
                                    {dp.description}
                                  </Text>
                                </Surface>
                              ))}
                            </View>
                          </View>
                        )}

                        {/* Log retention outcome button */}
                        <Button
                          label="I called retention"
                          variant="secondary"
                          size="sm"
                          leftIcon={Phone}
                          onPress={() => openOutcomeSheet(fc.app.id)}
                        />
                      </View>
                    )}
                  </Surface>
                );
              })}
            </View>

            {/* Disclaimer */}
            <Text variant="caption" color="muted" style={{ textAlign: 'center', lineHeight: 18, marginBottom: spacing.xl }}>
              Benefit estimates are approximate. Track actual credits{'\n'}
              in your application notes for precise calculations.
            </Text>

            {/* Pro gate overlay — free users see blurred recommendations */}
            {!isPro && renderProGate()}
          </View>
        )}
      </ScrollView>

      {/* Retention outcome bottom sheet */}
      <Modal visible={loggingAppId !== null} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={s.sheetOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Pressable style={{ flex: 1 }} onPress={() => setLoggingAppId(null)} />
          <View style={[s.sheet, { backgroundColor: colors.surface }]}>
            <View style={[s.handle, { backgroundColor: colors.border }]} />

            <Text variant="heading3" style={{ marginBottom: spacing.md }}>
              What happened?
            </Text>

            {/* Step 1: Outcome type */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.md }}>
              {OUTCOME_OPTIONS.map((opt) => (
                <FilterChip
                  key={opt.value}
                  label={opt.label}
                  selected={outcomeType === opt.value}
                  onPress={() => setOutcomeType(opt.value)}
                />
              ))}
            </View>

            {/* Step 2: Amount (for points/credit offers) */}
            {(outcomeType === 'points_offer' || outcomeType === 'credit_offer') && (
              <Input
                label={outcomeType === 'points_offer' ? 'Points offered' : 'Credit amount'}
                variant="number"
                prefix={outcomeType === 'credit_offer' ? '$' : undefined}
                value={outcomeAmount}
                onChangeText={setOutcomeAmount}
                helperText="How much was offered?"
              />
            )}

            {/* Step 3: Accepted? */}
            {outcomeType && outcomeType !== 'no_offer' && outcomeType !== 'cancelled' && (
              <View style={{ marginTop: spacing.md }}>
                <Text variant="label" color="muted" style={{ fontSize: 11, marginBottom: 8 }}>
                  DID YOU ACCEPT?
                </Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <FilterChip
                    label="Yes"
                    selected={outcomeAccepted === true}
                    onPress={() => setOutcomeAccepted(true)}
                  />
                  <FilterChip
                    label="No"
                    selected={outcomeAccepted === false}
                    onPress={() => setOutcomeAccepted(false)}
                  />
                </View>
              </View>
            )}

            {/* Step 4: Notes */}
            {outcomeType && (
              <View style={{ marginTop: spacing.md }}>
                <Input
                  variant="multiline"
                  label="Notes (optional)"
                  value={outcomeNotes}
                  onChangeText={setOutcomeNotes}
                  placeholder="Rep name, offer details, anything notable..."
                />
              </View>
            )}

            <View style={{ flexDirection: 'row', gap: 10, marginTop: spacing.lg }}>
              <Button
                label="Cancel"
                variant="secondary"
                onPress={() => setLoggingAppId(null)}
                style={{ flex: 1 }}
              />
              <Button
                label="Save"
                onPress={handleSaveOutcome}
                loading={createOutcome.isPending}
                disabled={!outcomeType}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <PaywallModal
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
        feature="Annual Fee Advisor"
      />
    </>
  );
}

// ============================================================
// Styles
// ============================================================

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    content: {
      paddingHorizontal: spacing.screen,
      paddingTop: 56,
      paddingBottom: 40,
    },
    header: { marginBottom: spacing.lg },
    headerRule: {
      width: 32, height: 3, backgroundColor: colors.gold, borderRadius: 2, marginBottom: 12,
    },
    filterRow: {
      flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.lg,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      padding: spacing.card,
    },
    expandedSection: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
      padding: spacing.card,
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
    sheetOverlay: {
      flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end',
    },
    sheet: {
      borderTopLeftRadius: 24, borderTopRightRadius: 24,
      paddingHorizontal: spacing.screen, paddingTop: spacing.sm, paddingBottom: spacing.xl,
    },
    handle: {
      width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: spacing.lg,
    },
  });
}
