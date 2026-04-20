import React, { useState, useMemo } from 'react';
import {
  ScrollView, View, Pressable, StyleSheet, Linking,
} from 'react-native';
import {
  ArrowRightLeft, TrendingUp, Clock, Users,
  ChevronLeft, ExternalLink, Sparkles, ChevronDown, ChevronUp,
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
import { useApplications } from '@/hooks/useApplications';
import { useHousehold } from '@/hooks/useHousehold';
import { usePointsBalances } from '@/hooks/usePointsBalances';
import {
  usePersonalizedDeals,
  useDeals,
  DEAL_TYPE_LABELS,
  type PersonalizedDeal,
} from '@/hooks/useDealPassport';
import type { DealType, RewardsCurrency } from '@/lib/applicationTypes';

// ── Deal type icons ─────────────────────────────────────────────────────────

const DEAL_ICONS: Record<DealType, typeof ArrowRightLeft> = {
  transfer_bonus: ArrowRightLeft,
  elevated_signup: TrendingUp,
  limited_offer: Clock,
  community_report: Users,
};

// ── Urgency badge ───────────────────────────────────────────────────────────

function urgencyLabel(daysLeft: number | null): {
  text: string;
  variant: 'danger' | 'warning' | 'success' | 'info' | 'neutral';
} {
  if (daysLeft === null) return { text: 'ONGOING', variant: 'neutral' };
  if (daysLeft <= 3) return { text: `${daysLeft}d LEFT`, variant: 'danger' };
  if (daysLeft <= 7) return { text: `${daysLeft}d LEFT`, variant: 'warning' };
  if (daysLeft <= 14) return { text: `${daysLeft}d LEFT`, variant: 'info' };
  return { text: `${daysLeft}d LEFT`, variant: 'neutral' };
}

// ============================================================
// Deal Card Component
// ============================================================

function DealCard({
  deal,
  colors,
  isRelevant,
}: {
  deal: PersonalizedDeal;
  colors: ReturnType<typeof useTheme>['colors'];
  isRelevant: boolean;
}) {
  const Icon = DEAL_ICONS[deal.deal_type] ?? Clock;
  const urg = urgencyLabel(deal.days_left);

  return (
    <Surface
      variant="card"
      border
      padding="md"
      radius="lg"
      style={isRelevant ? { borderColor: colors.accent, borderWidth: 1.5 } : undefined}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
        <View style={{
          width: 36, height: 36, borderRadius: 18,
          backgroundColor: isRelevant ? colors.accentBg : colors.bg,
          alignItems: 'center', justifyContent: 'center', marginRight: 12,
        }}>
          <Icon size={18} color={isRelevant ? colors.accent : colors.muted} strokeWidth={1.5} />
        </View>

        <View style={{ flex: 1 }}>
          {/* Type + urgency */}
          <View style={{ flexDirection: 'row', gap: 6, marginBottom: 4 }}>
            <Badge variant={urg.variant} size="sm" label={urg.text} />
            <Badge variant="neutral" size="sm" label={DEAL_TYPE_LABELS[deal.deal_type]} />
          </View>

          {/* Title */}
          <Text variant="body" style={{ fontFamily: fontSans.semiBold, marginBottom: 2 }}>
            {deal.title}
          </Text>

          {/* Description */}
          {deal.description && (
            <Text variant="bodySmall" color="muted" style={{ lineHeight: 19, marginBottom: 4 }}>
              {deal.description}
            </Text>
          )}

          {/* Relevance */}
          {isRelevant && deal.relevance_reason && (
            <View style={{
              flexDirection: 'row', alignItems: 'center', gap: 4,
              marginTop: 4, marginBottom: 2,
            }}>
              <Sparkles size={12} color={colors.success} />
              <Text variant="caption" style={{ color: colors.success }}>
                {deal.relevance_reason}
              </Text>
            </View>
          )}

          {/* Value added */}
          {deal.value_added !== null && deal.value_added > 0 && (
            <Text variant="mono" style={{ fontSize: 14, color: colors.gold, marginTop: 2 }}>
              +{deal.value_added.toLocaleString()} bonus points
            </Text>
          )}

          {/* Source link */}
          {deal.source_url && (
            <Pressable
              style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                Linking.openURL(deal.source_url!);
              }}
            >
              <ExternalLink size={12} color={colors.accent} />
              <Text variant="caption" style={{ color: colors.accent, marginLeft: 4 }}>
                Learn More
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    </Surface>
  );
}

// ============================================================
// Screen
// ============================================================

export default function DealPassportScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  const { data: apps = [] } = useApplications();
  const { data: members = [] } = useHousehold();
  const { data: balances = [] } = usePointsBalances();
  const { data: rawDeals = [] } = useDeals();

  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [showOtherDeals, setShowOtherDeals] = useState(false);
  const [typeFilter, setTypeFilter] = useState<DealType | null>(null);

  // Build user's currency set and balance map
  const { userCurrencies, userBalances, userCardNames } = useMemo(() => {
    const currencies = new Set<string>();
    const balMap: Record<string, number> = {};
    for (const b of balances) {
      if (selectedMemberId && b.household_member_id !== selectedMemberId) continue;
      currencies.add(b.currency);
      balMap[b.currency] = (balMap[b.currency] ?? 0) + b.balance;
    }
    const cardNames = apps
      .filter((a) => {
        if (a.status !== 'active' && a.status !== 'pending') return false;
        if (selectedMemberId && a.household_member_id !== selectedMemberId) return false;
        return true;
      })
      .map((a) => a.card_name_override ?? a.card_name);

    return { userCurrencies: currencies, userBalances: balMap, userCardNames: cardNames };
  }, [balances, apps, selectedMemberId]);

  const { data: personalizedDeals = [] } = usePersonalizedDeals(
    userCurrencies,
    userBalances,
    userCardNames,
  );

  // Split into "for your wallet" and "other"
  const { forYou, other } = useMemo(() => {
    let all = personalizedDeals;
    if (typeFilter) {
      all = all.filter((d) => d.deal_type === typeFilter);
    }
    const forYou = all.filter((d) => d.is_relevant);
    const other = all.filter((d) => !d.is_relevant);
    return { forYou, other };
  }, [personalizedDeals, typeFilter]);

  const activeMemberId = selectedMemberId ?? members[0]?.id ?? '';
  const s = makeStyles(colors);

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={s.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <ChevronLeft size={24} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <View style={s.headerRule} />
          <Text variant="label" style={{ color: colors.gold, fontSize: 10, letterSpacing: 2, marginBottom: 6 }}>
            INTELLIGENCE
          </Text>
          <Text variant="heading1" style={{ fontFamily: fontSerif.boldItalic, fontSize: 32, letterSpacing: -0.5, marginBottom: 4 }}>
            Deal Passport
          </Text>
          <Text variant="bodySmall" color="muted" style={{ lineHeight: 21 }}>
            Relevant to your wallet — transfer bonuses, elevated signups, and community reports.
          </Text>
        </View>
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

      {/* Type filter */}
      <View style={s.filterRow}>
        {(Object.entries(DEAL_TYPE_LABELS) as [DealType, string][]).map(([key, label]) => (
          <FilterChip
            key={key}
            label={label}
            selected={typeFilter === key}
            onPress={() => setTypeFilter(typeFilter === key ? null : key)}
          />
        ))}
      </View>

      {/* Empty state */}
      {rawDeals.length === 0 && (
        <EmptyState
          icon={Sparkles}
          title="No deals yet."
          description="Deals will appear here as the automation pipeline discovers transfer bonuses, elevated signups, and community reports."
          style={{ marginTop: spacing.lg }}
        />
      )}

      {/* FOR YOUR WALLET */}
      {forYou.length > 0 && (
        <View style={{ marginBottom: spacing.lg }}>
          <Text variant="label" color="muted" style={{ fontSize: 11, letterSpacing: 1.5, marginBottom: 10 }}>
            FOR YOUR WALLET
          </Text>
          <View style={{ gap: 10 }}>
            {forYou.map((deal) => (
              <DealCard key={deal.id} deal={deal} colors={colors} isRelevant />
            ))}
          </View>
        </View>
      )}

      {/* OTHER DEALS */}
      {other.length > 0 && (
        <View style={{ marginBottom: spacing.lg }}>
          <Pressable
            style={s.otherHeader}
            onPress={() => {
              setShowOtherDeals(!showOtherDeals);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
          >
            <Text variant="label" color="muted" style={{ fontSize: 11, letterSpacing: 1.5 }}>
              OTHER DEALS
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text variant="caption" color="muted">
                {other.length} deal{other.length === 1 ? '' : 's'}
              </Text>
              {showOtherDeals ? (
                <ChevronUp size={14} color={colors.muted} />
              ) : (
                <ChevronDown size={14} color={colors.muted} />
              )}
            </View>
          </Pressable>
          {showOtherDeals && (
            <View style={{ gap: 10, marginTop: 10 }}>
              {other.map((deal) => (
                <DealCard key={deal.id} deal={deal} colors={colors} isRelevant={false} />
              ))}
            </View>
          )}
        </View>
      )}

      {/* No relevant deals but some other deals */}
      {forYou.length === 0 && other.length > 0 && !showOtherDeals && (
        <Surface variant="inset" padding="lg" radius="md" style={{ marginBottom: spacing.lg, alignItems: 'center' }}>
          <Text variant="bodySmall" color="muted" style={{ textAlign: 'center', lineHeight: 20 }}>
            No deals match your current wallet.{'\n'}
            Expand "Other Deals" to browse all active offers.
          </Text>
        </Surface>
      )}

      {/* Footer note */}
      <Text variant="caption" color="muted" style={{ textAlign: 'center', lineHeight: 18, marginBottom: spacing.xl }}>
        Deals sourced from Doctor of Credit, Reddit, and community reports.{'\n'}
        Transfer bonuses are time-limited — verify terms before transferring.
      </Text>
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
      alignItems: 'flex-start',
      marginBottom: spacing.lg,
    },
    headerRule: {
      width: 32, height: 3, backgroundColor: colors.gold, borderRadius: 2, marginBottom: 12,
    },
    filterRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: spacing.md,
    },
    otherHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
  });
}
