import { useState, useRef, useCallback } from 'react';
import {
  ScrollView, View, Pressable, StyleSheet, Alert,
  KeyboardAvoidingView, Platform, Animated,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft, Edit3, Trash2, Calendar, CreditCard,
  Building2, User, FileText, Target, DollarSign, Phone,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/ThemeContext';
import { spacing, radius, fontSerif, fontSans } from '@/lib/theme';
import { Text } from '@/components/primitives/Text';
import { Button } from '@/components/primitives/Button';
import { Input } from '@/components/primitives/Input';
import { Badge } from '@/components/primitives/Badge';
import { Surface } from '@/components/primitives/Surface';
import { ListItem } from '@/components/composed/ListItem';
import { ProgressBar } from '@/components/composed/ProgressBar';
import { FilterChip } from '@/components/composed/FilterChip';
import { SpendProgress } from '@/components/composed/SpendProgress';
import {
  useApplication, useUpdateApplication, useDeleteApplication,
} from '@/hooks/useApplications';
import { useRetentionOutcomes } from '@/hooks/useRetention';
import {
  ISSUER_LABELS, APPLICATION_STATUS_LABELS, BUREAU_LABELS,
  CURRENCY_LABELS, RETENTION_OUTCOME_LABELS,
  type ApplicationStatus,
  type RetentionOutcome,
} from '@/lib/applicationTypes';

// ─── Status badge mapping ────────────────────────────────────────────────────

const STATUS_BADGE: Record<ApplicationStatus, 'success' | 'danger' | 'warning' | 'neutral' | 'info'> = {
  active: 'success',
  pending: 'warning',
  denied: 'danger',
  closed: 'neutral',
  product_changed: 'info',
  shutdown_by_issuer: 'danger',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatMonth(ym: string): string {
  const [year, month] = ym.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const m = parseInt(month, 10);
  return `${months[m - 1] ?? month} ${year}`;
}

function daysUntil(dateStr: string | null): string | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  const now = new Date();
  const diff = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return 'Expired';
  if (diff === 0) return 'Today';
  return `${diff} days`;
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function ApplicationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const { data: app, isLoading } = useApplication(id!);
  const updateApp = useUpdateApplication();
  const deleteApp = useDeleteApplication();
  const { data: retentionOutcomes = [] } = useRetentionOutcomes(id!);

  const [editing, setEditing] = useState(false);

  // Edit state
  const [editNotes, setEditNotes] = useState('');
  const [editSpendProgress, setEditSpendProgress] = useState('');
  const [editStatus, setEditStatus] = useState<ApplicationStatus>('active');

  const startEditing = () => {
    if (!app) return;
    setEditNotes(app.notes ?? '');
    setEditSpendProgress(String(app.bonus_spend_progress ?? 0));
    setEditStatus(app.status);
    setEditing(true);
  };

  const handleSave = async () => {
    if (!app) return;
    try {
      await updateApp.mutateAsync({
        id: app.id,
        notes: editNotes.trim() || null,
        bonus_spend_progress: parseInt(editSpendProgress, 10) || 0,
        status: editStatus,
        bonus_achieved:
          app.bonus_min_spend && parseInt(editSpendProgress, 10) >= app.bonus_min_spend
            ? true
            : app.bonus_achieved,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setEditing(false);
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Could not save.');
    }
  };

  // Undo toast state
  const [showUndoToast, setShowUndoToast] = useState(false);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastOpacity = useRef(new Animated.Value(0)).current;

  const handleDelete = () => {
    Alert.alert(
      'Delete application?',
      `Remove "${app?.card_name_override ?? app?.card_name}" from your ledger?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            setShowUndoToast(true);
            Animated.timing(toastOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();

            // Schedule actual delete after 5 seconds
            undoTimerRef.current = setTimeout(async () => {
              setShowUndoToast(false);
              await deleteApp.mutateAsync(id!);
              router.back();
            }, 5000);
          },
        },
      ],
    );
  };

  const handleUndo = useCallback(() => {
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    Animated.timing(toastOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
      setShowUndoToast(false);
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const s = makeStyles(colors);

  if (isLoading || !app) {
    return (
      <View style={[s.screen, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text variant="bodySmall" color="muted">Loading...</Text>
      </View>
    );
  }

  const cardName = app.card_name_override ?? app.card_name;
  const hasActiveBonus = app.status === 'active' && !app.bonus_achieved && app.bonus_amount && app.bonus_min_spend;
  const bonusDeadline = daysUntil(app.bonus_spend_deadline);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={s.screen}
        contentContainerStyle={[s.content, { paddingTop: insets.top + 12 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={s.headerRow}>
          <Pressable onPress={() => router.back()} hitSlop={8} style={s.backBtn}>
            <ArrowLeft size={20} color={colors.text} strokeWidth={2} />
          </Pressable>
          <View style={{ flex: 1 }} />
          {!editing && (
            <>
              <Pressable onPress={startEditing} hitSlop={8} style={s.actionBtn}>
                <Edit3 size={16} color={colors.accent} strokeWidth={2} />
              </Pressable>
              <Pressable onPress={handleDelete} hitSlop={8} style={s.actionBtn}>
                <Trash2 size={16} color={colors.urgent} strokeWidth={2} />
              </Pressable>
            </>
          )}
        </View>

        {/* Card hero */}
        <Surface variant="card" border padding="lg" radius="lg" style={{ marginBottom: spacing.lg }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <Text variant="heading2" style={{ marginBottom: 4 }}>{cardName}</Text>
              <Text variant="bodySmall" color="muted">{ISSUER_LABELS[app.issuer]}</Text>
            </View>
            <Badge
              label={APPLICATION_STATUS_LABELS[app.status]}
              variant={STATUS_BADGE[app.status]}
              dot
            />
          </View>

          {app.household_member?.name && (
            <Text variant="caption" color="muted" style={{ marginTop: 8 }}>
              Applied by {app.household_member.name}
            </Text>
          )}
        </Surface>

        {/* Active bonus progress */}
        {hasActiveBonus && !editing && (
          <View style={{ marginBottom: spacing.lg }}>
            <SpendProgress
              application={app}
              onUpdateSpend={async (amount) => {
                try {
                  await updateApp.mutateAsync({
                    id: app.id,
                    bonus_spend_progress: amount,
                    bonus_achieved: app.bonus_min_spend ? amount >= app.bonus_min_spend : false,
                  });
                } catch {}
              }}
              onMarkComplete={async () => {
                try {
                  await updateApp.mutateAsync({
                    id: app.id,
                    bonus_achieved: true,
                    bonus_achieved_at: new Date().toISOString().split('T')[0],
                  });
                } catch {}
              }}
            />
          </View>
        )}

        {/* Detail rows — view mode */}
        {!editing && (
          <View style={{ gap: 2, marginBottom: spacing.lg }}>
            <DetailRow icon={Calendar} label="Applied" value={formatMonth(app.applied_month)} colors={colors} />
            <DetailRow icon={CreditCard} label="Type" value={app.card_type === 'business' ? 'Business' : 'Personal'} colors={colors} />
            <DetailRow icon={Building2} label="Bureau" value={app.credit_bureau ? BUREAU_LABELS[app.credit_bureau] : '—'} colors={colors} />
            <DetailRow icon={DollarSign} label="Annual fee" value={app.annual_fee ? `$${app.annual_fee}` : 'None'} colors={colors} />
            {app.bonus_amount && (
              <DetailRow icon={Target} label="Bonus" value={`${app.bonus_amount.toLocaleString()} ${app.bonus_currency ? CURRENCY_LABELS[app.bonus_currency] : 'pts'}`} colors={colors} />
            )}
            <DetailRow
              icon={User}
              label="5/24"
              value={app.counts_toward_5_24 ? 'Yes — counts' : 'No — exempt'}
              colors={colors}
            />
          </View>
        )}

        {/* Notes — view mode */}
        {!editing && app.notes && (
          <Surface variant="inset" padding="md" radius="md" style={{ marginBottom: spacing.lg }}>
            <Text variant="label" color="muted" style={{ marginBottom: 6, fontSize: 11 }}>
              NOTES
            </Text>
            <Text variant="bodySmall">{app.notes}</Text>
          </Surface>
        )}

        {/* Retention history */}
        {!editing && retentionOutcomes.length > 0 && (
          <View style={{ marginBottom: spacing.lg }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <Phone size={14} color={colors.accent} strokeWidth={2} />
              <Text variant="label" style={{ fontSize: 11, color: colors.accent }}>
                RETENTION HISTORY
              </Text>
            </View>
            <View style={{ gap: 8 }}>
              {retentionOutcomes.map((outcome: RetentionOutcome) => {
                const badgeVariant =
                  outcome.outcome === 'fee_waived' || outcome.outcome === 'points_offer' || outcome.outcome === 'credit_offer'
                    ? 'success'
                    : outcome.outcome === 'cancelled'
                      ? 'danger'
                      : 'neutral';
                return (
                  <Surface key={outcome.id} variant="card" border padding="md" radius="md">
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <Badge
                        label={RETENTION_OUTCOME_LABELS[outcome.outcome]}
                        variant={badgeVariant}
                        size="sm"
                        dot
                      />
                      <Text variant="caption" color="muted">
                        {outcome.called_at}
                      </Text>
                    </View>
                    {outcome.points_offered != null && (
                      <Text variant="bodySmall">
                        Points offered: {outcome.points_offered.toLocaleString()}
                        {outcome.accepted != null && (outcome.accepted ? ' — Accepted' : ' — Declined')}
                      </Text>
                    )}
                    {outcome.credit_offered != null && (
                      <Text variant="bodySmall">
                        Credit offered: ${outcome.credit_offered.toLocaleString()}
                        {outcome.accepted != null && (outcome.accepted ? ' — Accepted' : ' — Declined')}
                      </Text>
                    )}
                    {outcome.outcome === 'fee_waived' && (
                      <Text variant="bodySmall">
                        Fee waived{outcome.fee_amount ? ` ($${outcome.fee_amount})` : ''}
                        {outcome.accepted != null && (outcome.accepted ? ' — Accepted' : ' — Declined')}
                      </Text>
                    )}
                    {outcome.notes && (
                      <Text variant="caption" color="muted" style={{ marginTop: 4 }}>
                        {outcome.notes}
                      </Text>
                    )}
                  </Surface>
                );
              })}
            </View>
          </View>
        )}

        {/* Edit mode */}
        {editing && (
          <View style={{ gap: spacing.md, marginBottom: spacing.lg }}>
            <View>
              <Text variant="label" color="muted" style={{ marginBottom: 8, fontSize: 11 }}>STATUS</Text>
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                {(['active', 'pending', 'denied', 'closed', 'product_changed'] as ApplicationStatus[]).map((s) => (
                  <FilterChip
                    key={s}
                    label={APPLICATION_STATUS_LABELS[s]}
                    selected={editStatus === s}
                    onPress={() => setEditStatus(s)}
                  />
                ))}
              </View>
            </View>

            {app.bonus_min_spend && (
              <Input
                label="Spend progress"
                variant="number"
                prefix="$"
                value={editSpendProgress}
                onChangeText={setEditSpendProgress}
                helperText={`of $${app.bonus_min_spend.toLocaleString()} minimum`}
              />
            )}

            <Input
              variant="multiline"
              label="Notes"
              value={editNotes}
              onChangeText={setEditNotes}
              placeholder="SUS flags, retention notes, anything..."
            />

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
              <Button
                label="Cancel"
                variant="secondary"
                onPress={() => setEditing(false)}
                style={{ flex: 1 }}
              />
              <Button
                label="Save"
                onPress={handleSave}
                loading={updateApp.isPending}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        )}
      </ScrollView>

      {/* Undo toast */}
      {showUndoToast && (
        <Animated.View
          style={{
            position: 'absolute',
            bottom: insets.bottom + 20,
            left: spacing.screen,
            right: spacing.screen,
            backgroundColor: colors.text,
            borderRadius: radius.md,
            padding: 14,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            opacity: toastOpacity,
          }}
        >
          <Text variant="bodySmall" style={{ color: colors.bg }}>
            Application deleted
          </Text>
          <Pressable onPress={handleUndo} hitSlop={8}>
            <Text variant="bodySmall" style={{ color: colors.accent, fontWeight: '600' }}>
              UNDO
            </Text>
          </Pressable>
        </Animated.View>
      )}
    </KeyboardAvoidingView>
  );
}

// ─── Detail row component ────────────────────────────────────────────────────

function DetailRow({
  icon: Icon,
  label,
  value,
  colors,
}: {
  icon: typeof Calendar;
  label: string;
  value: string;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 12,
        paddingHorizontal: 4,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}
    >
      <Icon size={16} color={colors.muted} strokeWidth={1.75} />
      <Text variant="bodySmall" color="muted" style={{ width: 80 }}>{label}</Text>
      <Text variant="bodySmall" style={{ flex: 1, fontWeight: '500' }}>{value}</Text>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    content: {
      paddingHorizontal: spacing.screen,
      paddingBottom: 40,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: spacing.lg,
    },
    backBtn: {
      width: 36,
      height: 36,
      borderRadius: radius.sm,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    actionBtn: {
      width: 36,
      height: 36,
      borderRadius: radius.sm,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}
