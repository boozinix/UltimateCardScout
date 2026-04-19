import React, { useState } from 'react';
import { View, StyleSheet, Modal, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { Clock, Check, TrendingUp } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/ThemeContext';
import { spacing, radius, fontSans } from '@/lib/theme';
import { Text } from '@/components/primitives/Text';
import { Button } from '@/components/primitives/Button';
import { Input } from '@/components/primitives/Input';
import { Badge } from '@/components/primitives/Badge';
import { Surface } from '@/components/primitives/Surface';
import { ProgressBar } from './ProgressBar';
import type { Application } from '@/lib/applicationTypes';
import { CURRENCY_LABELS } from '@/lib/applicationTypes';

// ─── Props ──────────────────────────────────────────────────────────────────

interface Props {
  application: Application;
  onUpdateSpend: (amount: number) => void;
  onMarkComplete: () => void;
  compact?: boolean;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function daysRemaining(deadline: string | null): number | null {
  if (!deadline) return null;
  const d = new Date(deadline);
  const now = new Date();
  return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function spendStatus(
  progress: number,
  target: number,
  daysLeft: number | null,
): { label: string; variant: 'success' | 'warning' | 'danger' | 'info' } {
  if (progress >= target) return { label: 'Achieved', variant: 'success' };
  if (daysLeft !== null && daysLeft < 0) return { label: 'Expired', variant: 'danger' };
  if (daysLeft !== null && daysLeft <= 7) return { label: 'Final stretch', variant: 'danger' };
  const pct = target > 0 ? progress / target : 0;
  if (daysLeft !== null) {
    // Expected pace: (total_days - days_left) / total_days should be <= pct
    // Simplified: if >60% done, on pace
    if (pct >= 0.6) return { label: 'On pace', variant: 'success' };
    if (pct >= 0.3) return { label: 'Behind pace', variant: 'warning' };
    return { label: 'Behind', variant: 'danger' };
  }
  if (pct >= 0.8) return { label: 'Almost there', variant: 'info' };
  return { label: 'In progress', variant: 'info' };
}

// ─── Component ──────────────────────────────────────────────────────────────

export function SpendProgress({ application, onUpdateSpend, onMarkComplete, compact = false }: Props) {
  const { colors } = useTheme();
  const [showUpdateSheet, setShowUpdateSheet] = useState(false);
  const [spendInput, setSpendInput] = useState('');

  const app = application;
  const target = app.bonus_min_spend ?? 0;
  const progress = app.bonus_spend_progress ?? 0;
  const daysLeft = daysRemaining(app.bonus_spend_deadline);
  const remaining = Math.max(0, target - progress);
  const dailyNeeded = daysLeft && daysLeft > 0 ? Math.ceil(remaining / daysLeft) : null;
  const status = spendStatus(progress, target, daysLeft);
  const pct = target > 0 ? Math.round((progress / target) * 100) : 0;

  const handleSubmitSpend = () => {
    const amount = parseInt(spendInput.replace(/[^0-9]/g, ''), 10);
    if (!amount || isNaN(amount)) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onUpdateSpend(amount);
    setShowUpdateSheet(false);
    setSpendInput('');
  };

  const handleMarkComplete = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onMarkComplete();
  };

  const s = makeStyles(colors);

  // Compact version for hub list
  if (compact) {
    return (
      <View style={s.compactRow}>
        <View style={{ flex: 1 }}>
          <Text variant="bodySmall" style={{ fontFamily: fontSans.medium }} numberOfLines={1}>
            {app.card_name_override ?? app.card_name}
          </Text>
          <ProgressBar current={progress} total={target} height={4} style={{ marginTop: 4 }} />
        </View>
        <View style={{ alignItems: 'flex-end', marginLeft: 12 }}>
          <Text variant="mono" style={{ fontSize: 12, color: colors.text }}>{pct}%</Text>
          {daysLeft !== null && daysLeft >= 0 && (
            <Text variant="caption" color="muted">{daysLeft}d left</Text>
          )}
        </View>
      </View>
    );
  }

  // Full version for application detail
  return (
    <>
      <Surface variant="card" border padding="md" radius="md">
        <View style={s.headerRow}>
          <Text variant="heading3">Bonus Progress</Text>
          <Badge label={status.label} variant={status.variant} dot size="sm" />
        </View>

        <ProgressBar
          current={progress}
          total={target}
          height={10}
          style={{ marginTop: 8 }}
        />

        <View style={s.amountRow}>
          <Text variant="mono" style={{ fontSize: 16, color: colors.text }}>
            ${progress.toLocaleString()}
          </Text>
          <Text variant="bodySmall" color="muted">
            / ${target.toLocaleString()}
          </Text>
          <View style={{ flex: 1 }} />
          <Text variant="mono" style={{ fontSize: 16, color: colors.text }}>
            {pct}%
          </Text>
        </View>

        {/* Deadline + daily spend info */}
        <View style={s.infoRow}>
          {daysLeft !== null && (
            <View style={s.infoPill}>
              <Clock size={12} color={colors.muted} strokeWidth={2} />
              <Text variant="caption" color="muted">
                {daysLeft >= 0 ? `${daysLeft} days left` : 'Deadline passed'}
              </Text>
            </View>
          )}
          {dailyNeeded !== null && dailyNeeded > 0 && (
            <View style={s.infoPill}>
              <TrendingUp size={12} color={colors.muted} strokeWidth={2} />
              <Text variant="caption" color="muted">
                Need ${dailyNeeded.toLocaleString()}/day
              </Text>
            </View>
          )}
        </View>

        {/* Reward line */}
        {app.bonus_amount && (
          <Text variant="caption" color="muted" style={{ marginTop: 8 }}>
            Earn {app.bonus_amount.toLocaleString()} {app.bonus_currency ? CURRENCY_LABELS[app.bonus_currency] : 'points'}
          </Text>
        )}

        {/* Action buttons */}
        <View style={s.actions}>
          {progress < target && (
            <Button
              label="Update Spend"
              variant="secondary"
              size="sm"
              onPress={() => {
                setSpendInput(String(progress));
                setShowUpdateSheet(true);
              }}
              style={{ flex: 1 }}
            />
          )}
          {progress >= target && !app.bonus_achieved && (
            <Button
              label="Mark Bonus Received"
              variant="primary"
              size="sm"
              leftIcon={Check}
              onPress={handleMarkComplete}
              style={{ flex: 1 }}
            />
          )}
        </View>
      </Surface>

      {/* Update spend bottom sheet (modal) */}
      <Modal visible={showUpdateSheet} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={s.sheetOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Pressable style={{ flex: 1 }} onPress={() => setShowUpdateSheet(false)} />
          <View style={[s.sheet, { backgroundColor: colors.surface }]}>
            <View style={[s.handle, { backgroundColor: colors.border }]} />
            <Text variant="heading3" style={{ marginBottom: spacing.md }}>
              Update spend progress
            </Text>
            <Input
              label="Total spend so far"
              variant="number"
              prefix="$"
              value={spendInput}
              onChangeText={setSpendInput}
              helperText={`Target: $${target.toLocaleString()}`}
            />
            <View style={{ flexDirection: 'row', gap: 10, marginTop: spacing.lg }}>
              <Button
                label="Cancel"
                variant="secondary"
                onPress={() => setShowUpdateSheet(false)}
                style={{ flex: 1 }}
              />
              <Button
                label="Save"
                onPress={handleSubmitSpend}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    amountRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: 4,
      marginTop: 10,
    },
    infoRow: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 8,
    },
    infoPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    actions: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 14,
    },
    compactRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
    },
    sheetOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    sheet: {
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: spacing.screen,
      paddingTop: spacing.sm,
      paddingBottom: spacing.xl,
    },
    handle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      alignSelf: 'center',
      marginBottom: spacing.lg,
    },
  });
}
