import React, { useState, useMemo, useCallback } from 'react';
import {
  ScrollView, View, Pressable, StyleSheet, Linking, TextInput, Alert,
} from 'react-native';
import {
  ChevronLeft, ChevronRight, ExternalLink, Check, X, Edit3,
  Filter, Zap, AlertTriangle, Inbox,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { spacing, radius, fontSerif, fontSans } from '@/lib/theme';
import { Text } from '@/components/primitives/Text';
import { Button } from '@/components/primitives/Button';
import { Badge } from '@/components/primitives/Badge';
import { Surface } from '@/components/primitives/Surface';
import { FilterChip } from '@/components/composed/FilterChip';
import { EmptyState } from '@/components/composed/EmptyState';
import { supabase } from '@/lib/supabase';
import {
  useDataProposals,
  useApproveProposal,
  useRejectProposal,
  useEditAndApproveProposal,
  useBulkApprove,
  useProposalCounts,
  SOURCE_TYPE_LABELS,
  PROPOSAL_TYPE_LABELS,
} from '@/hooks/useDataProposals';
import type { ProposalStatus } from '@/lib/applicationTypes';

// ── Admin gate ──────────────────────────────────────────────────────────────

const ADMIN_USER_ID = process.env.EXPO_PUBLIC_ADMIN_USER_ID ?? '';

function useIsAdmin(): { isAdmin: boolean; loading: boolean } {
  const [state, setState] = useState({ isAdmin: false, loading: true });

  React.useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const uid = data.user?.id ?? '';
      setState({
        isAdmin: uid === ADMIN_USER_ID || ADMIN_USER_ID === '',
        loading: false,
      });
    });
  }, []);

  return state;
}

// ============================================================
// Screen
// ============================================================

export default function AdminProposalsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { isAdmin, loading: authLoading } = useIsAdmin();

  const [statusFilter, setStatusFilter] = useState<ProposalStatus | null>('pending');
  const [sourceFilter, setSourceFilter] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [editMode, setEditMode] = useState(false);
  const [editValues, setEditValues] = useState<Record<string, string>>({});

  const { data: proposals = [], isLoading } = useDataProposals({
    status: statusFilter ?? undefined,
    sourceType: sourceFilter ?? undefined,
  });
  const { data: counts } = useProposalCounts();
  const approve = useApproveProposal();
  const reject = useRejectProposal();
  const editAndApprove = useEditAndApproveProposal();
  const bulkApprove = useBulkApprove();

  const current = proposals[currentIndex] ?? null;

  const goNext = useCallback(() => {
    setCurrentIndex((i) => Math.min(i + 1, proposals.length - 1));
    setEditMode(false);
    setEditValues({});
  }, [proposals.length]);

  const goPrev = useCallback(() => {
    setCurrentIndex((i) => Math.max(i - 1, 0));
    setEditMode(false);
    setEditValues({});
  }, []);

  const handleApprove = useCallback(async () => {
    if (!current) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await approve.mutateAsync(current.id);
    goNext();
  }, [current, approve, goNext]);

  const handleReject = useCallback(async () => {
    if (!current) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    await reject.mutateAsync({ id: current.id });
    goNext();
  }, [current, reject, goNext]);

  const handleEditApprove = useCallback(async () => {
    if (!current) return;
    const merged: Record<string, unknown> = { ...current.proposed_change };
    for (const [k, v] of Object.entries(editValues)) {
      const num = Number(v);
      merged[k] = isNaN(num) ? v : num;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await editAndApprove.mutateAsync({ id: current.id, editedChange: merged });
    setEditMode(false);
    setEditValues({});
    goNext();
  }, [current, editValues, editAndApprove, goNext]);

  const handleBulkApprove = useCallback(async () => {
    Alert.alert(
      'Bulk Approve',
      `Approve all high-confidence ${sourceFilter ? SOURCE_TYPE_LABELS[sourceFilter] : ''} proposals?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve All',
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            await bulkApprove.mutateAsync({
              sourceType: sourceFilter ?? undefined,
              minConfidence: 0.85,
            });
            setCurrentIndex(0);
          },
        },
      ],
    );
  }, [sourceFilter, bulkApprove]);

  // Auto-apply countdown
  const autoApplyIn = useMemo(() => {
    if (!current?.auto_apply_after) return null;
    const diff = new Date(current.auto_apply_after).getTime() - Date.now();
    if (diff <= 0) return 'imminently';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours > 0) return `${hours}h`;
    return `${Math.floor(diff / (1000 * 60))}m`;
  }, [current]);

  const s = makeStyles(colors);

  // ── Auth gate ───────────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <View style={[s.screen, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text variant="body" color="muted">Verifying access...</Text>
      </View>
    );
  }

  if (!isAdmin) {
    return (
      <View style={[s.screen, { justifyContent: 'center', alignItems: 'center' }]}>
        <AlertTriangle size={48} color={colors.urgent} strokeWidth={1.5} />
        <Text variant="heading2" style={{ marginTop: 16, textAlign: 'center' }}>
          Access Denied
        </Text>
        <Text variant="bodySmall" color="muted" style={{ marginTop: 8, textAlign: 'center' }}>
          This screen is restricted to administrators.
        </Text>
        <Button
          label="Go Back"
          variant="secondary"
          onPress={() => router.back()}
          style={{ marginTop: 24 }}
        />
      </View>
    );
  }

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={s.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <ChevronLeft size={24} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text variant="label" style={{ color: colors.gold, fontSize: 10, letterSpacing: 2, marginBottom: 2 }}>
            ADMIN
          </Text>
          <Text variant="heading1" style={{ fontFamily: fontSerif.boldItalic, fontSize: 28 }}>
            Pipeline Review
          </Text>
        </View>
      </View>

      {/* Summary stats */}
      <View style={s.statsRow}>
        {(['pending', 'auto_apply_pending', 'auto_applied', 'rejected'] as const).map((st) => (
          <Pressable
            key={st}
            style={[s.statBadge, statusFilter === st && { borderColor: colors.accent, borderWidth: 1.5 }]}
            onPress={() => {
              setStatusFilter(statusFilter === st ? null : st);
              setCurrentIndex(0);
            }}
          >
            <Text variant="mono" style={{ fontSize: 18, color: colors.text }}>
              {counts?.[st] ?? 0}
            </Text>
            <Text variant="caption" color="muted" style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {st.replace('_', ' ')}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Source filter */}
      <View style={s.filterRow}>
        {Object.entries(SOURCE_TYPE_LABELS).map(([key, label]) => (
          <FilterChip
            key={key}
            label={label}
            selected={sourceFilter === key}
            onPress={() => {
              setSourceFilter(sourceFilter === key ? null : key);
              setCurrentIndex(0);
            }}
          />
        ))}
      </View>

      {/* Bulk approve button */}
      {statusFilter === 'pending' && proposals.length > 1 && (
        <Pressable style={s.bulkRow} onPress={handleBulkApprove}>
          <Zap size={14} color={colors.accent} />
          <Text variant="bodySmall" style={{ color: colors.accent, marginLeft: 6 }}>
            Approve all high-confidence{sourceFilter ? ` ${SOURCE_TYPE_LABELS[sourceFilter]}` : ''} proposals
          </Text>
        </Pressable>
      )}

      {/* Loading */}
      {isLoading && (
        <Surface variant="card" padding="xl" radius="lg" style={{ alignItems: 'center', marginBottom: spacing.lg }}>
          <Text variant="body" color="muted">Loading proposals...</Text>
        </Surface>
      )}

      {/* Empty state */}
      {!isLoading && proposals.length === 0 && (
        <EmptyState
          icon={Inbox}
          title="All clear."
          description="Nothing to review. Check back after the next pipeline run."
          style={{ marginTop: spacing.xl }}
        />
      )}

      {/* Proposal card (Tinder-style, one at a time) */}
      {!isLoading && current && (
        <>
          {/* Navigation */}
          <View style={s.navRow}>
            <Pressable onPress={goPrev} disabled={currentIndex === 0} hitSlop={12}>
              <ChevronLeft size={20} color={currentIndex === 0 ? colors.border : colors.text} />
            </Pressable>
            <Text variant="bodySmall" color="muted">
              Proposal {currentIndex + 1} of {proposals.length}
            </Text>
            <Pressable onPress={goNext} disabled={currentIndex >= proposals.length - 1} hitSlop={12}>
              <ChevronRight size={20} color={currentIndex >= proposals.length - 1 ? colors.border : colors.text} />
            </Pressable>
          </View>

          <Surface variant="card" border padding="lg" radius="lg" style={{ marginBottom: spacing.lg }}>
            {/* Source + type */}
            <View style={s.metaRow}>
              <Badge
                variant="info"
                size="sm"
                label={SOURCE_TYPE_LABELS[current.source_type] ?? current.source_type}
              />
              <Badge
                variant="neutral"
                size="sm"
                label={PROPOSAL_TYPE_LABELS[current.proposal_type] ?? current.proposal_type}
              />
            </View>

            {/* Card name / summary */}
            <Text variant="heading3" style={{ marginTop: 12, marginBottom: 4 }}>
              {(current.proposed_change as any)?.card_name ??
                (current.proposed_change as any)?.summary ??
                current.proposal_type}
            </Text>

            {/* Confidence + auto-apply */}
            <View style={[s.metaRow, { marginTop: 8 }]}>
              <Text variant="mono" style={{ fontSize: 14 }}>
                Confidence: {(current.confidence_score * 100).toFixed(0)}%
              </Text>
              {autoApplyIn && current.status === 'auto_apply_pending' && (
                <Text variant="caption" style={{ color: colors.warn }}>
                  Auto-applies in {autoApplyIn}
                </Text>
              )}
            </View>

            {/* Changes table */}
            {current.current_value && Object.keys(current.current_value).length > 0 && (
              <View style={s.changesTable}>
                <View style={s.changesHeader}>
                  <Text variant="caption" color="muted" style={{ flex: 1 }}>Field</Text>
                  <Text variant="caption" color="muted" style={{ flex: 1, textAlign: 'center' }}>Current</Text>
                  <Text variant="caption" color="muted" style={{ flex: 1, textAlign: 'right' }}>Proposed</Text>
                </View>
                {Object.entries(current.proposed_change)
                  .filter(([k]) => k in (current.current_value ?? {}))
                  .map(([key, proposed]) => (
                    <View key={key} style={s.changesRow}>
                      <Text variant="caption" style={{ flex: 1 }}>{key}</Text>
                      <Text variant="caption" color="muted" style={{ flex: 1, textAlign: 'center' }}>
                        {String((current.current_value as any)?.[key] ?? '—')}
                      </Text>
                      {editMode ? (
                        <TextInput
                          style={[s.editInput, { color: colors.text, borderColor: colors.border }]}
                          value={editValues[key] ?? String(proposed ?? '')}
                          onChangeText={(v) => setEditValues((prev) => ({ ...prev, [key]: v }))}
                        />
                      ) : (
                        <Text
                          variant="mono"
                          style={{ flex: 1, textAlign: 'right', fontSize: 13, color: colors.accent }}
                        >
                          {String(proposed ?? '—')}
                        </Text>
                      )}
                    </View>
                  ))}
              </View>
            )}

            {/* All proposed changes (when no diff table) */}
            {(!current.current_value || Object.keys(current.current_value).length === 0) && (
              <View style={s.changesTable}>
                <Text variant="label" color="muted" style={{ fontSize: 10, marginBottom: 6 }}>PROPOSED DATA</Text>
                {Object.entries(current.proposed_change)
                  .filter(([k]) => !['user_id'].includes(k))
                  .slice(0, 8)
                  .map(([key, val]) => (
                    <View key={key} style={s.changesRow}>
                      <Text variant="caption" style={{ flex: 1 }}>{key}</Text>
                      {editMode ? (
                        <TextInput
                          style={[s.editInput, { color: colors.text, borderColor: colors.border }]}
                          value={editValues[key] ?? String(val ?? '')}
                          onChangeText={(v) => setEditValues((prev) => ({ ...prev, [key]: v }))}
                        />
                      ) : (
                        <Text variant="caption" color="muted" style={{ flex: 1, textAlign: 'right' }}>
                          {String(val ?? '—')}
                        </Text>
                      )}
                    </View>
                  ))}
              </View>
            )}

            {/* Source link */}
            {current.source_url && (
              <Pressable
                style={s.sourceLink}
                onPress={() => Linking.openURL(current.source_url!)}
              >
                <ExternalLink size={14} color={colors.accent} />
                <Text variant="caption" style={{ color: colors.accent, marginLeft: 6 }}>
                  View source
                </Text>
              </Pressable>
            )}

            {/* Action buttons */}
            {current.status === 'pending' || current.status === 'auto_apply_pending' ? (
              <View style={s.actionRow}>
                <Button
                  label="Reject"
                  variant="destructive"
                  size="sm"
                  leftIcon={X}
                  onPress={handleReject}
                  style={{ flex: 1 }}
                />
                <Button
                  label={editMode ? 'Cancel' : 'Edit'}
                  variant="secondary"
                  size="sm"
                  leftIcon={Edit3}
                  onPress={() => {
                    setEditMode(!editMode);
                    if (editMode) setEditValues({});
                  }}
                  style={{ flex: 1 }}
                />
                <Button
                  label={editMode ? 'Save & Apply' : 'Approve'}
                  variant="primary"
                  size="sm"
                  leftIcon={Check}
                  onPress={editMode ? handleEditApprove : handleApprove}
                  style={{ flex: 1 }}
                />
              </View>
            ) : (
              <View style={s.statusRow}>
                <Badge
                  variant={
                    current.status === 'approved' || current.status === 'auto_applied'
                      ? 'success'
                      : current.status === 'rejected'
                        ? 'danger'
                        : 'neutral'
                  }
                  label={current.status.replace('_', ' ').toUpperCase()}
                />
                {current.reviewed_at && (
                  <Text variant="caption" color="muted">
                    {new Date(current.reviewed_at).toLocaleDateString()}
                  </Text>
                )}
              </View>
            )}
          </Surface>
        </>
      )}

      {/* Timestamp */}
      {current && (
        <Text variant="caption" color="muted" style={{ textAlign: 'center', marginBottom: spacing.xl }}>
          Created {new Date(current.created_at).toLocaleString()}
        </Text>
      )}
    </ScrollView>
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
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.lg,
    },
    statsRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: spacing.md,
    },
    statBadge: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: 10,
      alignItems: 'center',
    },
    filterRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: spacing.md,
    },
    bulkRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      marginBottom: spacing.md,
    },
    navRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.sm,
    },
    metaRow: {
      flexDirection: 'row',
      gap: 8,
      alignItems: 'center',
    },
    changesTable: {
      marginTop: 16,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: 12,
    },
    changesHeader: {
      flexDirection: 'row',
      marginBottom: 8,
    },
    changesRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 6,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    editInput: {
      flex: 1,
      textAlign: 'right',
      fontSize: 13,
      fontFamily: fontSans.regular,
      borderWidth: 1,
      borderRadius: 4,
      paddingHorizontal: 6,
      paddingVertical: 3,
    },
    sourceLink: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 16,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    actionRow: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 16,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    statusRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 16,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
  });
}
