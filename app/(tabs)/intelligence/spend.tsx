import React, { useState, useMemo } from 'react';
import { ScrollView, View, Pressable, StyleSheet } from 'react-native';
import {
  CreditCard, Lock, AlertTriangle, Trophy,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/ThemeContext';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { spacing, radius, fontSerif, fontSans } from '@/lib/theme';
import { Text } from '@/components/primitives/Text';
import { Button } from '@/components/primitives/Button';
import { Input } from '@/components/primitives/Input';
import { Badge } from '@/components/primitives/Badge';
import { Surface } from '@/components/primitives/Surface';
import { FilterChip } from '@/components/composed/FilterChip';
import { EmptyState } from '@/components/composed/EmptyState';
import { PaywallModal } from '@/components/PaywallModal';
import { useApplications } from '@/hooks/useApplications';
import { useHousehold } from '@/hooks/useHousehold';
import { useSubscription } from '@/hooks/useSubscription';
import { useValuations, resolveCpp } from '@/hooks/usePointsBalances';
import {
  useCardCategories,
  rankCards,
  SPEND_CATEGORIES,
  type RankedCard,
} from '@/hooks/useCardCategories';
import { CURRENCY_CPP, CURRENCY_LABELS } from '@/lib/applicationTypes';
import type { RewardsCurrency } from '@/lib/applicationTypes';

// ─── Rank medals ────────────────────────────────────────────────────────────

const RANK_MEDALS = ['\uD83E\uDD47', '\uD83E\uDD48', '\uD83E\uDD49'];

// ============================================================
// Screen
// ============================================================

export default function SpendOptimizerScreen() {
  const { colors } = useTheme();
  const { isDesktop } = useBreakpoint();
  const { isPro } = useSubscription();
  const { data: apps = [] } = useApplications();
  const { data: members = [] } = useHousehold();
  const { data: allCategories = [] } = useCardCategories();
  const { data: serverCpp } = useValuations();

  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [showPaywall, setShowPaywall] = useState(false);

  const activeMemberId = selectedMemberId ?? members[0]?.id ?? '';

  // Get user's active card names
  const userCardNames = useMemo(() => {
    return apps
      .filter((a) => {
        if (a.status !== 'active') return false;
        if (selectedMemberId && a.household_member_id !== selectedMemberId) return false;
        return true;
      })
      .map((a) => a.card_name_override ?? a.card_name);
  }, [apps, selectedMemberId]);

  // Build valuations map — DB values override local constants (matches portfolio)
  const valuationsMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const [key, val] of Object.entries(CURRENCY_CPP)) {
      map[key] = val;
    }
    // Override with DB values using resolveCpp logic
    if (serverCpp) {
      for (const key of Object.keys(CURRENCY_CPP) as RewardsCurrency[]) {
        map[key] = resolveCpp(key, serverCpp);
      }
    }
    return map;
  }, [serverCpp]);

  // Parse amount
  const parsedAmount = useMemo(() => {
    const n = parseFloat(amount.replace(/[^0-9.]/g, ''));
    return isNaN(n) ? undefined : n;
  }, [amount]);

  // Rank cards for selected category
  const ranked = useMemo<RankedCard[]>(() => {
    if (!selectedCategory || userCardNames.length === 0) return [];
    return rankCards(userCardNames, allCategories, selectedCategory, valuationsMap, parsedAmount);
  }, [selectedCategory, userCardNames, allCategories, valuationsMap, parsedAmount]);

  // Categories that have at least one card with a multiplier
  const availableCategories = useMemo(() => {
    const userNamesLower = new Set(userCardNames.map((n) => n.toLowerCase()));
    const catSet = new Set<string>();
    for (const cc of allCategories) {
      if (userNamesLower.has(cc.card_name.toLowerCase())) {
        catSet.add(cc.category.toLowerCase());
      }
    }
    return SPEND_CATEGORIES.filter((sc) => catSet.has(sc.id));
  }, [allCategories, userCardNames]);

  const handleSelectCategory = (catId: string) => {
    setSelectedCategory(catId === selectedCategory ? null : catId);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
            Which Card?
          </Text>
          <Text variant="bodySmall" color="muted" style={{ lineHeight: 21 }}>
            For your best return — ranked by actual dollar value.
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

        {/* Empty state — no active cards */}
        {userCardNames.length === 0 && (
          <EmptyState
            icon={CreditCard}
            title="No active cards."
            description="Add cards to your ledger to see which one to use for each category."
            style={{ marginBottom: spacing.xl }}
          />
        )}

        {/* Pro gate: spend optimizer is fully locked for free users */}
        {!isPro && userCardNames.length > 0 && (
          <View style={s.lockedContainer}>
            <Lock size={32} color={colors.gold} />
            <Text variant="heading3" style={{ textAlign: 'center', marginTop: 12 }}>
              Spend optimizer requires Pro
            </Text>
            <Text variant="bodySmall" color="muted" style={{ textAlign: 'center', marginTop: 4, lineHeight: 20 }}>
              Know which card earns the most for every purchase.{'\n'}
              Ranked by actual dollar value, not just multiplier.
            </Text>
            <Button
              label="Unlock Pro"
              variant="primary"
              onPress={() => setShowPaywall(true)}
              style={{ marginTop: 16 }}
            />
          </View>
        )}

        {/* Main optimizer UI — Pro only */}
        {isPro && userCardNames.length > 0 && (
          <>
            {/* Category selection */}
            <View style={{ marginBottom: spacing.lg }}>
              <Text variant="label" color="muted" style={{ fontSize: 11, marginBottom: 10 }}>
                SELECT CATEGORY
              </Text>
              <View style={s.categoryGrid}>
                {availableCategories.map((cat) => (
                  <FilterChip
                    key={cat.id}
                    label={cat.label}
                    selected={selectedCategory === cat.id}
                    onPress={() => handleSelectCategory(cat.id)}
                  />
                ))}
                {availableCategories.length === 0 && (
                  <Text variant="caption" color="muted">
                    No bonus categories found for your cards. Category data may need to be seeded.
                  </Text>
                )}
              </View>
            </View>

            {/* Amount input (optional) */}
            <View style={{ marginBottom: spacing.lg }}>
              <Input
                label="Amount (optional)"
                variant="number"
                prefix="$"
                value={amount}
                onChangeText={setAmount}
                helperText="Enter a purchase amount to see total value earned"
              />
            </View>

            {/* Results */}
            {selectedCategory && ranked.length > 0 && (
              <View style={{ marginBottom: spacing.lg }}>
                <Text variant="heading3" style={{ marginBottom: 12 }}>
                  Best for {SPEND_CATEGORIES.find((c) => c.id === selectedCategory)?.label ?? selectedCategory}
                </Text>
                <View style={{ gap: 10 }}>
                  {ranked.map((card, index) => (
                    <Surface
                      key={card.card_name + index}
                      variant="card"
                      border
                      padding="md"
                      radius="lg"
                      style={index === 0 ? { borderColor: colors.gold, borderWidth: 1.5 } : undefined}
                    >
                      <View style={s.resultRow}>
                        <Text style={{ fontSize: 22, marginRight: 10 }}>
                          {RANK_MEDALS[index] ?? `#${index + 1}`}
                        </Text>
                        <View style={{ flex: 1 }}>
                          <Text variant="body" style={{ fontFamily: fontSans.semiBold }}>
                            {card.card_name}
                          </Text>
                          <View style={s.resultMeta}>
                            <Text variant="mono" style={{ fontSize: 16, color: colors.text }}>
                              {card.multiplier}x
                            </Text>
                            {card.rewards_currency && (
                              <Text variant="caption" color="muted">
                                {CURRENCY_LABELS[card.rewards_currency as RewardsCurrency] ?? card.rewards_currency}
                              </Text>
                            )}
                          </View>
                          {card.totalValue !== null && (
                            <Text variant="mono" style={{ fontSize: 14, color: colors.gold, marginTop: 4 }}>
                              ${card.totalValue.toFixed(2)} value on ${parsedAmount?.toLocaleString()}
                            </Text>
                          )}
                          <Text variant="caption" color="muted" style={{ marginTop: 2 }}>
                            {card.cpp.toFixed(2)}\u00A2/pt = ${(card.valuePerDollar * 100).toFixed(2)}\u00A2 per dollar spent
                          </Text>
                        </View>
                      </View>

                      {/* Warnings */}
                      {card.isNearCap && (
                        <View style={s.warningRow}>
                          <AlertTriangle size={12} color={colors.warn} strokeWidth={2} />
                          <Text variant="caption" style={{ color: colors.warn }}>
                            Near spending cap — {card.capInfo}
                          </Text>
                        </View>
                      )}
                      {card.capInfo && !card.isNearCap && (
                        <View style={s.warningRow}>
                          <Text variant="caption" color="muted">
                            {card.capInfo}
                          </Text>
                        </View>
                      )}
                    </Surface>
                  ))}
                </View>
              </View>
            )}

            {/* No results for category */}
            {selectedCategory && ranked.length === 0 && (
              <Surface variant="inset" padding="lg" radius="md" style={{ marginBottom: spacing.lg }}>
                <Text variant="bodySmall" color="muted" style={{ textAlign: 'center' }}>
                  None of your cards have a bonus multiplier for this category.{'\n'}
                  Your default 1x card earns the base rate.
                </Text>
              </Surface>
            )}

            {/* No category selected prompt */}
            {!selectedCategory && (
              <Surface variant="inset" padding="lg" radius="md" style={{ alignItems: 'center', marginBottom: spacing.lg }}>
                <Trophy size={24} color={colors.muted} strokeWidth={1.5} />
                <Text variant="bodySmall" color="muted" style={{ textAlign: 'center', marginTop: 8, lineHeight: 20 }}>
                  Select a spending category above to see{'\n'}
                  which of your cards earns the most value.
                </Text>
              </Surface>
            )}

            {/* Methodology note */}
            <Text variant="caption" color="muted" style={{ textAlign: 'center', lineHeight: 18, marginBottom: spacing.xl }}>
              Rankings use multiplier x cents-per-point (TPG valuations).{'\n'}
              Cashback cards use 1.0 cpp. Actual value may vary by redemption.
            </Text>
          </>
        )}
      </ScrollView>

      <PaywallModal
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
        feature="Spend Optimizer"
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
    categoryGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    resultRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    resultMeta: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: 8,
      marginTop: 2,
    },
    warningRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 8,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    lockedContainer: {
      alignItems: 'center',
      paddingVertical: spacing['2xl'],
      paddingHorizontal: spacing.xl,
    },
  });
}
