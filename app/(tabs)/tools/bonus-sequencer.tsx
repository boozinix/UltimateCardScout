import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, TextInput, Pressable, StyleSheet, Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors, spacing, radius, fontSerif, fontSans } from '@/lib/theme';
import { useCards } from '@/hooks/useCards';
import { computeOptimalPlan } from '@/lib/calculators/spendAllocation';
import { formatCurrency, formatNumber } from '@/utils/formatters';

export default function BonusSequencerScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: cards } = useCards();
  const [budget, setBudget] = useState('15000');
  const [maxCards, setMaxCards] = useState('3');
  const [netMode, setNetMode] = useState(false);

  const budgetNum = parseInt(budget.replace(/,/g, ''), 10) || 0;
  const maxCardsNum = parseInt(maxCards, 10) || 3;

  const plan = useMemo(() => {
    if (!cards || budgetNum <= 0) return null;
    return computeOptimalPlan(cards as never[], budgetNum, maxCardsNum, netMode ? 'net' : 'gross');
  }, [cards, budgetNum, maxCardsNum, netMode]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.backBtn}>← Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Bonus Sequencer</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.headline}>Maximize Your Bonuses</Text>
        <Text style={styles.sub}>
          Tell us your spend budget and how many cards you can handle. We'll find the best combination.
        </Text>

        {/* Inputs */}
        <View style={styles.inputsRow}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>SPEND BUDGET</Text>
            <TextInput
              style={styles.input}
              value={budget}
              onChangeText={setBudget}
              keyboardType="numeric"
              placeholder="15000"
              placeholderTextColor={colors.muted}
            />
            <Text style={styles.inputHint}>Total spend you can put on new cards</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>MAX CARDS</Text>
            <TextInput
              style={styles.input}
              value={maxCards}
              onChangeText={setMaxCards}
              keyboardType="numeric"
              placeholder="3"
              placeholderTextColor={colors.muted}
            />
            <Text style={styles.inputHint}>Number of new cards at once</Text>
          </View>
        </View>

        {/* Net mode toggle */}
        <View style={styles.toggleRow}>
          <View style={styles.toggleLeft}>
            <Text style={styles.toggleLabel}>Optimize net value</Text>
            <Text style={styles.toggleSub}>Subtract annual fees from bonus value</Text>
          </View>
          <Switch
            value={netMode}
            onValueChange={setNetMode}
            trackColor={{ false: colors.border, true: colors.gold }}
            thumbColor="#FFFFFF"
          />
        </View>

        {/* Results */}
        {plan && plan.allocation.length > 0 ? (
          <>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>OPTIMAL PLAN</Text>
              <Text style={styles.summaryBonus}>{formatCurrency(plan.totalBonus)}</Text>
              <Text style={styles.summaryNote}>
                in bonus value · {formatCurrency(plan.totalSpendUsed)} total spend required
              </Text>
            </View>

            {plan.allocation.map((item, i) => (
              <View key={item.card.card_name} style={styles.planCard}>
                <View style={styles.planCardHeader}>
                  <View style={styles.planStep}>
                    <Text style={styles.planStepText}>{i + 1}</Text>
                  </View>
                  <View style={styles.planCardInfo}>
                    <Text style={styles.planCardName}>{item.card.card_name}</Text>
                    <Text style={styles.planCardIssuer}>{(item.card as never as { issuer: string }).issuer}</Text>
                  </View>
                </View>
                <View style={styles.planCardStats}>
                  <View style={styles.planStat}>
                    <Text style={styles.planStatLabel}>Spend required</Text>
                    <Text style={styles.planStatValue}>{formatCurrency(item.minSpend)}</Text>
                  </View>
                  <View style={styles.planStat}>
                    <Text style={styles.planStatLabel}>Bonus value</Text>
                    <Text style={[styles.planStatValue, { color: colors.success }]}>{formatCurrency(item.bonus)}</Text>
                  </View>
                </View>
              </View>
            ))}

            <View style={styles.roi}>
              <Text style={styles.roiLabel}>Return on Spend</Text>
              <Text style={styles.roiValue}>
                {budgetNum > 0 ? `${((plan.totalBonus / plan.totalSpendUsed) * 100).toFixed(1)}%` : '—'}
              </Text>
            </View>
          </>
        ) : plan !== null && plan.allocation.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No plan found</Text>
            <Text style={styles.emptyText}>
              Try increasing your budget or max cards. Some cards require $1,000+ minimum spend.
            </Text>
          </View>
        ) : null}

        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerText}>
            Max 2 cards per issuer. Knapsack algorithm optimizes for total bonus value within your budget.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.screen,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: { fontFamily: fontSans.medium, fontSize: 15, color: colors.gold },
  headerTitle: { fontFamily: fontSerif.bold, fontSize: 18, color: colors.text },
  content: { paddingHorizontal: spacing.screen, paddingVertical: spacing.lg, paddingBottom: spacing.xl },
  headline: { fontFamily: fontSerif.bold, fontSize: 24, color: colors.text, marginBottom: 4 },
  sub: { fontFamily: fontSans.regular, fontSize: 14, color: colors.muted, lineHeight: 20, marginBottom: spacing.lg },
  inputsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  inputGroup: { flex: 1 },
  inputLabel: {
    fontFamily: fontSans.semiBold,
    fontSize: 10,
    color: colors.gold,
    letterSpacing: 1,
    marginBottom: 4,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
    fontFamily: fontSans.bold,
    fontSize: 18,
    color: colors.text,
    marginBottom: 4,
  },
  inputHint: { fontFamily: fontSans.regular, fontSize: 11, color: colors.muted, lineHeight: 16 },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    marginBottom: spacing.lg,
  },
  toggleLeft: { flex: 1, marginRight: spacing.sm },
  toggleLabel: { fontFamily: fontSans.medium, fontSize: 14, color: colors.text },
  toggleSub: { fontFamily: fontSans.regular, fontSize: 12, color: colors.muted, marginTop: 2 },
  summaryCard: {
    backgroundColor: colors.goldBg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.gold + '40',
    padding: spacing.md,
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  summaryLabel: { fontFamily: fontSans.semiBold, fontSize: 10, color: colors.gold, letterSpacing: 1 },
  summaryBonus: { fontFamily: fontSerif.bold, fontSize: 38, color: colors.gold, marginVertical: 4 },
  summaryNote: { fontFamily: fontSans.regular, fontSize: 13, color: colors.muted },
  planCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    marginBottom: 8,
  },
  planCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm, gap: spacing.sm },
  planStep: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planStepText: { fontFamily: fontSans.bold, fontSize: 13, color: '#FFFFFF' },
  planCardInfo: { flex: 1 },
  planCardName: { fontFamily: fontSans.semiBold, fontSize: 14, color: colors.text },
  planCardIssuer: { fontFamily: fontSans.regular, fontSize: 12, color: colors.muted },
  planCardStats: { flexDirection: 'row', gap: spacing.sm },
  planStat: {
    flex: 1,
    backgroundColor: colors.sidebar,
    borderRadius: radius.sm,
    padding: spacing.xs,
    alignItems: 'center',
  },
  planStatLabel: { fontFamily: fontSans.regular, fontSize: 11, color: colors.muted },
  planStatValue: { fontFamily: fontSans.bold, fontSize: 14, color: colors.text, marginTop: 2 },
  roi: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.sidebar,
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  roiLabel: { fontFamily: fontSans.medium, fontSize: 14, color: colors.muted },
  roiValue: { fontFamily: fontSerif.bold, fontSize: 22, color: colors.gold },
  emptyState: { alignItems: 'center', paddingVertical: spacing.xl, gap: spacing.sm },
  emptyTitle: { fontFamily: fontSerif.bold, fontSize: 20, color: colors.text },
  emptyText: { fontFamily: fontSans.regular, fontSize: 14, color: colors.muted, textAlign: 'center', lineHeight: 20 },
  disclaimer: {
    backgroundColor: colors.sidebar,
    borderRadius: radius.sm,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  disclaimerText: { fontFamily: fontSans.regular, fontSize: 12, color: colors.muted, lineHeight: 18 },
});
