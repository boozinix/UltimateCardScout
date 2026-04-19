import React, { useState, useMemo } from 'react';
import {
  ScrollView, View, Pressable, StyleSheet, Modal,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { Plus, Edit3, PieChart } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/ThemeContext';
import { spacing, radius, fontSerif, fontSans } from '@/lib/theme';
import { Text } from '@/components/primitives/Text';
import { Button } from '@/components/primitives/Button';
import { Input } from '@/components/primitives/Input';
import { Surface } from '@/components/primitives/Surface';
import { Badge } from '@/components/primitives/Badge';
import { FilterChip } from '@/components/composed/FilterChip';
import { ProgressBar } from '@/components/composed/ProgressBar';
import { EmptyState } from '@/components/composed/EmptyState';
import { usePointsBalances, useUpdateBalance, usePortfolioTotal } from '@/hooks/usePointsBalances';
import { useHousehold } from '@/hooks/useHousehold';
import { useSubscription } from '@/hooks/useSubscription';
import type { RewardsCurrency, PointsBalanceWithValue } from '@/lib/applicationTypes';
import { CURRENCY_LABELS } from '@/lib/applicationTypes';

// ─── Available programs for adding ─────────────────────────────────────────

const PROGRAMS: { currency: RewardsCurrency; label: string }[] = [
  { currency: 'chase_ur', label: 'Chase Ultimate Rewards' },
  { currency: 'amex_mr', label: 'Amex Membership Rewards' },
  { currency: 'citi_typ', label: 'Citi ThankYou Points' },
  { currency: 'capital_one_miles', label: 'Capital One Miles' },
  { currency: 'united_miles', label: 'United MileagePlus' },
  { currency: 'delta_miles', label: 'Delta SkyMiles' },
  { currency: 'southwest_points', label: 'Southwest Rapid Rewards' },
  { currency: 'jetblue_points', label: 'JetBlue TrueBlue' },
  { currency: 'american_miles', label: 'American AAdvantage' },
  { currency: 'alaska_miles', label: 'Alaska Mileage Plan' },
  { currency: 'hyatt_points', label: 'World of Hyatt' },
  { currency: 'marriott_points', label: 'Marriott Bonvoy' },
  { currency: 'hilton_points', label: 'Hilton Honors' },
  { currency: 'ihg_points', label: 'IHG One Rewards' },
  { currency: 'cash', label: 'Cash Back' },
];

// ─── Screen ─────────────────────────────────────────────────────────────────

export default function PointsPortfolioScreen() {
  const { colors } = useTheme();
  const { isPro } = useSubscription();
  const { data: members = [] } = useHousehold();

  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const activeMemberId = selectedMemberId ?? members[0]?.id ?? undefined;

  const { data: balances = [], isLoading } = usePointsBalances(activeMemberId);
  const { data: portfolio } = usePortfolioTotal();
  const updateBalance = useUpdateBalance();

  // Sheet state
  const [sheetMode, setSheetMode] = useState<'add' | 'edit' | null>(null);
  const [editingBalance, setEditingBalance] = useState<PointsBalanceWithValue | null>(null);
  const [selectedCurrency, setSelectedCurrency] = useState<RewardsCurrency | null>(null);
  const [balanceInput, setBalanceInput] = useState('');

  const totalValue = useMemo(
    () => balances.reduce((sum, b) => sum + b.dollar_value, 0),
    [balances],
  );

  const sortedBalances = useMemo(
    () => [...balances].sort((a, b) => b.dollar_value - a.dollar_value),
    [balances],
  );

  // Programs not yet added
  const availablePrograms = useMemo(() => {
    const existing = new Set(balances.map((b) => b.currency));
    return PROGRAMS.filter((p) => !existing.has(p.currency));
  }, [balances]);

  const openAddSheet = () => {
    setSheetMode('add');
    setSelectedCurrency(null);
    setBalanceInput('');
  };

  const openEditSheet = (b: PointsBalanceWithValue) => {
    setSheetMode('edit');
    setEditingBalance(b);
    setSelectedCurrency(b.currency);
    setBalanceInput(String(b.balance));
  };

  const handleSave = async () => {
    const currency = sheetMode === 'edit' ? editingBalance?.currency : selectedCurrency;
    if (!currency) return;
    const amount = parseInt(balanceInput.replace(/[^0-9]/g, ''), 10);
    if (isNaN(amount)) return;

    try {
      await updateBalance.mutateAsync({
        household_member_id: activeMemberId ?? null,
        currency,
        balance: amount,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
    setSheetMode(null);
  };

  const s = makeStyles(colors);

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
            Portfolio
          </Text>
          <Text variant="bodySmall" color="muted" style={{ lineHeight: 21 }}>
            Your total points value — every program, one number.
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
        {balances.length === 0 && !isLoading && (
          <EmptyState
            icon={PieChart}
            title="No balances yet."
            description="Add your first rewards program to see your portfolio value."
            action={{ label: 'Add program', onPress: openAddSheet }}
            style={{ marginBottom: spacing.xl }}
          />
        )}

        {/* Hero total */}
        {balances.length > 0 && (
          <Surface variant="card" border padding="lg" radius="lg" style={{ alignItems: 'center', marginBottom: spacing.lg }}>
            <Text variant="label" color="muted" style={{ fontSize: 10, letterSpacing: 1.5, marginBottom: 6 }}>
              TOTAL PORTFOLIO VALUE
            </Text>
            <Text variant="display" style={{ fontSize: 40, color: colors.gold }}>
              ${Math.round(totalValue).toLocaleString()}
            </Text>
            <Text variant="caption" color="muted" style={{ marginTop: 4 }}>
              Based on TPG estimated valuations
            </Text>
          </Surface>
        )}

        {/* Per-program rows */}
        {sortedBalances.length > 0 && (
          <View style={{ gap: 10, marginBottom: spacing.lg }}>
            {sortedBalances.map((b) => {
              const pctOfTotal = totalValue > 0 ? b.dollar_value / totalValue : 0;
              return (
                <Pressable
                  key={b.id ?? b.currency}
                  onPress={() => openEditSheet(b)}
                  style={({ pressed }) => [s.programRow, { opacity: pressed ? 0.7 : 1, backgroundColor: colors.surface, borderColor: colors.border }]}
                >
                  <View style={{ flex: 1 }}>
                    <Text variant="body" style={{ fontFamily: fontSans.semiBold, marginBottom: 2 }}>
                      {b.currency_label}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
                      <Text variant="mono" style={{ fontSize: 12, color: colors.muted }}>
                        {b.balance.toLocaleString()} pts
                      </Text>
                      <Text variant="mono" style={{ fontSize: 14, color: colors.text }}>
                        ${Math.round(b.dollar_value).toLocaleString()}
                      </Text>
                      <Text variant="caption" color="muted">
                        {b.cpp.toFixed(2)}\u00A2/pt
                      </Text>
                    </View>
                    <ProgressBar
                      current={pctOfTotal * 100}
                      total={100}
                      variant="accent"
                      height={4}
                      style={{ marginTop: 6 }}
                    />
                  </View>
                  <View style={{ marginLeft: 12, alignItems: 'flex-end' }}>
                    <Text variant="mono" style={{ fontSize: 14, color: colors.text }}>
                      {Math.round(pctOfTotal * 100)}%
                    </Text>
                    <Edit3 size={14} color={colors.muted} strokeWidth={1.5} style={{ marginTop: 4 }} />
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}

        {/* Add program button */}
        {balances.length > 0 && availablePrograms.length > 0 && (
          <Button
            label="Add Program"
            variant="secondary"
            leftIcon={Plus}
            onPress={openAddSheet}
            style={{ alignSelf: 'center', marginBottom: spacing.lg }}
          />
        )}

        {/* Disclaimer */}
        {balances.length > 0 && (
          <Text variant="caption" color="muted" style={{ textAlign: 'center', lineHeight: 18, marginBottom: spacing.xl }}>
            Values based on The Points Guy estimated valuations.{'\n'}
            Actual redemption value varies by transfer partner and booking.
          </Text>
        )}
      </ScrollView>

      {/* Add / Edit bottom sheet */}
      <Modal visible={sheetMode !== null} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={s.sheetOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Pressable style={{ flex: 1 }} onPress={() => setSheetMode(null)} />
          <View style={[s.sheet, { backgroundColor: colors.surface }]}>
            <View style={[s.handle, { backgroundColor: colors.border }]} />

            <Text variant="heading3" style={{ marginBottom: spacing.md }}>
              {sheetMode === 'add' ? 'Add program' : 'Update balance'}
            </Text>

            {/* Program selector (add mode) */}
            {sheetMode === 'add' && (
              <View style={{ marginBottom: spacing.md }}>
                <Text variant="label" color="muted" style={{ fontSize: 11, marginBottom: 8 }}>
                  SELECT PROGRAM
                </Text>
                <ScrollView
                  horizontal={false}
                  style={{ maxHeight: 200 }}
                  showsVerticalScrollIndicator
                >
                  <View style={{ gap: 6 }}>
                    {availablePrograms.map((p) => (
                      <Pressable
                        key={p.currency}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setSelectedCurrency(p.currency);
                        }}
                        style={[
                          s.programOption,
                          {
                            backgroundColor: selectedCurrency === p.currency ? colors.accentBg : colors.bg,
                            borderColor: selectedCurrency === p.currency ? colors.accent : colors.border,
                          },
                        ]}
                      >
                        <Text
                          variant="bodySmall"
                          style={{
                            fontFamily: selectedCurrency === p.currency ? fontSans.semiBold : fontSans.regular,
                            color: selectedCurrency === p.currency ? colors.accent : colors.text,
                          }}
                        >
                          {p.label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>
              </View>
            )}

            {/* Edit mode: show program name */}
            {sheetMode === 'edit' && editingBalance && (
              <View style={{ marginBottom: spacing.md }}>
                <Badge
                  label={editingBalance.currency_label}
                  variant="info"
                  size="md"
                />
              </View>
            )}

            {/* Balance input */}
            {(sheetMode === 'edit' || selectedCurrency) && (
              <Input
                label="Points balance"
                variant="number"
                value={balanceInput}
                onChangeText={setBalanceInput}
                helperText="Enter your current total points"
              />
            )}

            <View style={{ flexDirection: 'row', gap: 10, marginTop: spacing.lg }}>
              <Button
                label="Cancel"
                variant="secondary"
                onPress={() => setSheetMode(null)}
                style={{ flex: 1 }}
              />
              <Button
                label="Save"
                onPress={handleSave}
                loading={updateBalance.isPending}
                disabled={!selectedCurrency && sheetMode === 'add'}
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
    programRow: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: radius.lg,
      borderWidth: 1,
      padding: spacing.card,
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
    programOption: {
      paddingVertical: 10, paddingHorizontal: 14,
      borderRadius: radius.sm, borderWidth: 1,
    },
  });
}
