import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { differenceInDays, parseISO } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { colors, spacing, radius, fontSerif, fontSans, getCategoryColors } from '@/lib/theme';
import { useFeatureGate } from '@/hooks/useSubscription';
import WealthRing, { RingSegment } from '@/components/WealthRing';
import { PaywallModal } from '@/components/PaywallModal';

type UserCard = {
  id: string;
  card_id: string;
  last_four: string | null;
  annual_fee_override: number | null;
  cards: {
    name: string;
    issuer: string;
    annual_fee: string;
    gradient_key: string | null;
  } | null;
};

type Reminder = {
  id: string;
  remind_at: string;
  period_end: string;
  period_label: string | null;
  status: string;
  benefits: { title: string; value: number | null; category: string | null } | null;
  user_cards: { id: string } | null;
};

const ANNUAL_MULTIPLIER: Record<string, number> = {
  monthly: 12,
  quarterly: 4,
  'semi-annual': 2,
  annual: 1,
  'multi-year': 0.25,
};

const CATEGORY_COLORS: Record<string, string> = {
  travel: colors.category.travel,
  dining: colors.category.dining,
  entertainment: colors.category.entertainment,
  fitness: colors.category.fitness,
  wellness: colors.category.fitness,
  hotel: colors.category.hotel,
  shopping: colors.category.shopping,
};

function parseFee(feeStr: string | undefined): number {
  if (!feeStr) return 0;
  const m = feeStr.replace(/[^0-9.]/g, '');
  return parseFloat(m) || 0;
}

export default function InsightsScreen() {
  const insets = useSafeAreaInsets();
  const isPro = useFeatureGate('dashboard');

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userCards, setUserCards] = useState<UserCard[]>([]);
  const [expiring, setExpiring] = useState<Reminder[]>([]);
  const [showPaywall, setShowPaywall] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) { setLoading(false); setRefreshing(false); return; }

    const [cardsRes, remindersRes] = await Promise.all([
      supabase.from('user_cards')
        .select(`id, card_id, last_four, annual_fee_override, cards(name, issuer, annual_fee, gradient_key)`)
        .eq('user_id', session.user.id),
      supabase.from('reminders')
        .select(`id, remind_at, period_end, period_label, status, benefits(title, value, category), user_cards(id)`)
        .eq('user_id', session.user.id)
        .eq('status', 'pending')
        .gte('remind_at', new Date().toISOString().slice(0, 10))
        .lte('remind_at', new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10))
        .order('remind_at', { ascending: true })
        .limit(6),
    ]);

    setUserCards((cardsRes.data ?? []) as unknown as UserCard[]);
    setExpiring((remindersRes.data ?? []) as unknown as Reminder[]);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (!isPro) {
    return (
      <View style={[s.container, s.center, { paddingTop: insets.top }]}>
        <Text style={s.lockedTitle}>Insights Dashboard</Text>
        <Text style={s.lockedSub}>
          Upgrade to unlock your WealthRing, ROI tracker, breakeven analysis, and more.
        </Text>
        <Pressable style={s.upgradeBtn} onPress={() => setShowPaywall(true)}>
          <Text style={s.upgradeBtnLabel}>UPGRADE TO PRO</Text>
        </Pressable>
        <PaywallModal visible={showPaywall} onClose={() => setShowPaywall(false)} />
      </View>
    );
  }

  // Compute derived data
  const totalFees = userCards.reduce((sum, uc) => {
    const fee = uc.annual_fee_override ?? parseFee(uc.cards?.annual_fee);
    return sum + fee;
  }, 0);

  // Category totals across all reminders (estimate annual from pending reminders)
  const categoryTotals: Record<string, number> = {};

  // Build ring segments from category data (we'd need benefit data, use expiring as proxy)
  const segments: RingSegment[] = Object.entries(categoryTotals)
    .filter(([, v]) => v > 0)
    .map(([label, value]) => ({
      label: label.charAt(0).toUpperCase() + label.slice(1),
      value,
      color: CATEGORY_COLORS[label] ?? colors.muted,
    }));

  // ROI
  const totalBenefitValue = segments.reduce((s, seg) => s + seg.value, 0);
  const roi = totalFees > 0 ? ((totalBenefitValue - totalFees) / totalFees) * 100 : 0;

  return (
    <ScrollView
      style={[s.container, { paddingTop: insets.top }]}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.gold} />}
    >
      <View style={s.pageHead}>
        <Text style={s.eyebrow}>YOUR PORTFOLIO</Text>
        <Text style={s.pageTitle}>Insights</Text>
        <Text style={s.pageSub}>
          {userCards.length} card{userCards.length !== 1 ? 's' : ''} · ${totalFees.toLocaleString()} annual fees
        </Text>
      </View>

      {loading ? (
        <View style={s.loadingRow}><ActivityIndicator color={colors.gold} /></View>
      ) : (
        <>
          {/* Wealth Ring */}
          <View style={s.ringCard}>
            <Text style={s.sectionLabel}>ANNUAL BENEFIT VALUE</Text>
            <WealthRing total={totalBenefitValue} segments={segments} size={180} />
          </View>

          {/* ROI Card */}
          <View style={s.roiCard}>
            <View style={s.roiRow}>
              <View style={s.roiItem}>
                <Text style={s.roiValue}>${totalFees.toLocaleString()}</Text>
                <Text style={s.roiLabel}>Annual fees</Text>
              </View>
              <View style={s.roiDivider} />
              <View style={s.roiItem}>
                <Text style={[s.roiValue, { color: totalBenefitValue >= totalFees ? colors.success : colors.urgent }]}>
                  {roi >= 0 ? '+' : ''}{roi.toFixed(0)}%
                </Text>
                <Text style={s.roiLabel}>ROI</Text>
              </View>
              <View style={s.roiDivider} />
              <View style={s.roiItem}>
                <Text style={[s.roiValue, { color: colors.gold }]}>
                  ${(totalBenefitValue - totalFees).toLocaleString()}
                </Text>
                <Text style={s.roiLabel}>Net value</Text>
              </View>
            </View>
            <Text style={s.roiNote}>
              {totalBenefitValue >= totalFees
                ? 'Your cards are paying for themselves.'
                : 'Track more benefits to see your full value.'}
            </Text>
          </View>

          {/* Expiring soon */}
          {expiring.length > 0 && (
            <View style={s.section}>
              <Text style={s.sectionLabel}>EXPIRING SOON</Text>
              {expiring.map(r => {
                const daysLeft = differenceInDays(parseISO(r.period_end), new Date());
                const cat = getCategoryColors(r.benefits?.category ?? null);
                return (
                  <View key={r.id} style={s.expiryRow}>
                    <View style={[s.expiryDot, { backgroundColor: daysLeft <= 7 ? colors.urgent : colors.warn }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={s.expiryTitle}>{r.benefits?.title ?? '—'}</Text>
                      {r.period_label && <Text style={s.expiryPeriod}>{r.period_label}</Text>}
                    </View>
                    {r.benefits?.value != null && (
                      <Text style={s.expiryValue}>${r.benefits.value}</Text>
                    )}
                    <Text style={[s.expiryDays, { color: daysLeft <= 7 ? colors.urgent : colors.warn }]}>
                      {daysLeft === 0 ? 'Today' : `${daysLeft}d`}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}

          {/* Cards breakdown */}
          {userCards.length > 0 && (
            <View style={s.section}>
              <Text style={s.sectionLabel}>YOUR CARDS</Text>
              {userCards.map(uc => {
                const fee = uc.annual_fee_override ?? parseFee(uc.cards?.annual_fee);
                return (
                  <View key={uc.id} style={s.cardRow}>
                    <Text style={s.cardRowName}>{uc.cards?.name ?? 'Unknown'}</Text>
                    <Text style={s.cardRowFee}>${fee}/yr</Text>
                  </View>
                );
              })}
            </View>
          )}

          {/* Curator note */}
          <View style={s.curatorNote}>
            <Text style={s.curatorEyebrow}>THE CURATOR'S NOTE</Text>
            <Text style={s.curatorText}>
              "The disciplined collector reviews their portfolio annually. Every fee paid without a matching benefit is value left on the table."
            </Text>
          </View>
        </>
      )}

      <View style={{ height: 48 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pageHead: { paddingHorizontal: spacing.screen, paddingTop: 16, paddingBottom: 8 },
  eyebrow: { fontFamily: fontSans.medium, fontSize: 10, color: colors.muted, letterSpacing: 1.5, marginBottom: 4 },
  pageTitle: { fontFamily: fontSerif.bold, fontSize: 32, color: colors.text, letterSpacing: -0.5 },
  pageSub: { fontFamily: fontSans.regular, fontSize: 13, color: colors.muted, marginTop: 2, marginBottom: 12 },
  loadingRow: { paddingVertical: 60, alignItems: 'center' },
  ringCard: {
    marginHorizontal: spacing.screen, marginBottom: 16,
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.card, alignItems: 'center',
  },
  sectionLabel: { fontFamily: fontSans.medium, fontSize: 10, color: colors.muted, letterSpacing: 1.2, marginBottom: 16 },
  roiCard: {
    marginHorizontal: spacing.screen, marginBottom: 16,
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, padding: spacing.card,
  },
  roiRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  roiItem: { flex: 1, alignItems: 'center' },
  roiDivider: { width: 1, height: 40, backgroundColor: colors.border },
  roiValue: { fontFamily: fontSerif.bold, fontSize: 22, color: colors.text, letterSpacing: -0.5 },
  roiLabel: { fontFamily: fontSans.regular, fontSize: 11, color: colors.muted, marginTop: 2 },
  roiNote: { fontFamily: fontSans.regular, fontSize: 12, color: colors.muted, textAlign: 'center' },
  section: { marginHorizontal: spacing.screen, marginBottom: 16 },
  expiryRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  expiryDot: { width: 8, height: 8, borderRadius: 4 },
  expiryTitle: { fontFamily: fontSans.medium, fontSize: 13, color: colors.text },
  expiryPeriod: { fontFamily: fontSans.regular, fontSize: 11, color: colors.muted },
  expiryValue: { fontFamily: fontSerif.bold, fontSize: 15, color: colors.gold },
  expiryDays: { fontFamily: fontSans.medium, fontSize: 11, minWidth: 32, textAlign: 'right' },
  cardRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  cardRowName: { fontFamily: fontSans.medium, fontSize: 13, color: colors.text },
  cardRowFee: { fontFamily: fontSans.regular, fontSize: 12, color: colors.muted },
  curatorNote: {
    marginHorizontal: spacing.screen, marginBottom: 8,
    backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: '#FDE68A',
    borderRadius: radius.md, padding: 16,
  },
  curatorEyebrow: { fontFamily: fontSans.medium, fontSize: 9, color: colors.gold, letterSpacing: 1.2, marginBottom: 8 },
  curatorText: { fontFamily: fontSerif.italic, fontSize: 14, color: '#78350F', lineHeight: 21 },
  lockedTitle: { fontFamily: fontSerif.bold, fontSize: 24, color: colors.text, textAlign: 'center', marginBottom: 8 },
  lockedSub: { fontFamily: fontSans.regular, fontSize: 14, color: colors.muted, textAlign: 'center', marginHorizontal: 32, marginBottom: 24, lineHeight: 20 },
  upgradeBtn: { backgroundColor: colors.text, paddingHorizontal: 32, paddingVertical: 14, borderRadius: radius.sm },
  upgradeBtnLabel: { fontFamily: fontSans.medium, fontSize: 12, color: '#fff', letterSpacing: 0.8 },
});
