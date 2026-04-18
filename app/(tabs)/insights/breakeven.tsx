import React, { useCallback, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { colors, spacing, radius, fontSerif, fontSans } from '@/lib/theme';
import { useFeatureGate } from '@/hooks/useSubscription';
import { PaywallModal } from '@/components/PaywallModal';

type CardBreakeven = {
  userCardId: string;
  name: string;
  issuer: string;
  annualFee: number;
  benefitsCaptured: number;
  benefitsTotal: number;
  progress: number; // 0–100
  status: 'ahead' | 'on-track' | 'behind' | 'no-fee';
};

function parseFee(s: string | undefined): number {
  if (!s) return 0;
  const n = parseFloat(s.replace(/[^0-9.]/g, ''));
  return isNaN(n) ? 0 : n;
}

function breakevenStatus(fee: number, captured: number): CardBreakeven['status'] {
  if (fee === 0) return 'no-fee';
  const ratio = fee > 0 ? captured / fee : 0;
  if (ratio >= 1) return 'ahead';
  if (ratio >= 0.5) return 'on-track';
  return 'behind';
}

const STATUS_COLOR: Record<CardBreakeven['status'], string> = {
  ahead: colors.success,
  'on-track': colors.warn,
  behind: colors.urgent,
  'no-fee': colors.muted,
};

const STATUS_LABEL: Record<CardBreakeven['status'], string> = {
  ahead: 'Paid off',
  'on-track': 'On track',
  behind: 'Behind',
  'no-fee': 'No fee',
};

export default function BreakevenScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const isPro = useFeatureGate('dashboard');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cards, setCards] = useState<CardBreakeven[]>([]);
  const [showPaywall, setShowPaywall] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) { setLoading(false); setRefreshing(false); return; }

    const [cardsRes, remindersRes] = await Promise.all([
      supabase.from('user_cards')
        .select('id, cards(name, issuer, annual_fee)')
        .eq('user_id', session.user.id),
      supabase.from('reminders')
        .select('user_card_id, status, amount_used, benefits(value)')
        .eq('user_id', session.user.id),
    ]);

    const usedByCard: Record<string, number> = {};
    const totalByCard: Record<string, number> = {};

    for (const r of (remindersRes.data ?? []) as any[]) {
      const ucId = r.user_card_id;
      const val = r.benefits?.value ?? 0;
      if (!totalByCard[ucId]) totalByCard[ucId] = 0;
      totalByCard[ucId] += val;
      if (r.status === 'used') {
        if (!usedByCard[ucId]) usedByCard[ucId] = 0;
        usedByCard[ucId] += r.amount_used ?? val;
      }
    }

    const result: CardBreakeven[] = ((cardsRes.data ?? []) as any[]).map((uc) => {
      const fee = parseFee(uc.cards?.annual_fee ?? uc.annual_fee_override);
      const captured = usedByCard[uc.id] ?? 0;
      const total = totalByCard[uc.id] ?? 0;
      const progress = fee > 0 ? Math.min(100, Math.round((captured / fee) * 100)) : 100;
      return {
        userCardId: uc.id,
        name: uc.cards?.name ?? 'Unknown',
        issuer: uc.cards?.issuer ?? '',
        annualFee: fee,
        benefitsCaptured: captured,
        benefitsTotal: total,
        progress,
        status: breakevenStatus(fee, captured),
      };
    });

    result.sort((a, b) => {
      const order = { behind: 0, 'on-track': 1, ahead: 2, 'no-fee': 3 };
      return order[a.status] - order[b.status];
    });

    setCards(result);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (!isPro) {
    return (
      <View style={[s.container, s.center, { paddingTop: insets.top }]}>
        <Text style={s.lockedTitle}>Breakeven Tracker</Text>
        <Text style={s.lockedSub}>
          See exactly how much value you've captured against each card's annual fee.
        </Text>
        <Pressable style={s.upgradeBtn} onPress={() => setShowPaywall(true)}>
          <Text style={s.upgradeBtnText}>UPGRADE TO PRO</Text>
        </Pressable>
        <PaywallModal visible={showPaywall} onClose={() => setShowPaywall(false)} />
      </View>
    );
  }

  return (
    <ScrollView
      style={[s.container, { paddingTop: insets.top }]}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.accent} />}
    >
      <View style={s.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={s.back}>← Back</Text>
        </Pressable>
        <Text style={s.title}>Breakeven</Text>
        <Text style={s.subtitle}>Value captured vs. fees paid</Text>
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator color={colors.accent} /></View>
      ) : cards.length === 0 ? (
        <View style={s.center}>
          <Text style={s.emptyText}>Add cards and track benefits to see your breakeven status.</Text>
        </View>
      ) : (
        <View style={s.cardList}>
          {cards.map((c) => {
            const statusColor = STATUS_COLOR[c.status];
            return (
              <View key={c.userCardId} style={s.card}>
                <View style={s.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.cardName} numberOfLines={1}>{c.name}</Text>
                    <Text style={s.cardIssuer}>{c.issuer}</Text>
                  </View>
                  <View style={[s.statusBadge, { backgroundColor: statusColor + '22' }]}>
                    <Text style={[s.statusText, { color: statusColor }]}>
                      {STATUS_LABEL[c.status]}
                    </Text>
                  </View>
                </View>

                {/* Progress bar */}
                {c.status !== 'no-fee' && (
                  <View style={s.barWrap}>
                    <View style={s.barTrack}>
                      <View
                        style={[
                          s.barFill,
                          { width: `${c.progress}%` as any, backgroundColor: statusColor },
                        ]}
                      />
                    </View>
                    <Text style={s.barPct}>{c.progress}%</Text>
                  </View>
                )}

                {/* Numbers */}
                <View style={s.nums}>
                  <View style={s.numItem}>
                    <Text style={s.numLabel}>Annual fee</Text>
                    <Text style={s.numVal}>{c.annualFee > 0 ? `$${c.annualFee}` : 'None'}</Text>
                  </View>
                  <View style={s.numDivider} />
                  <View style={s.numItem}>
                    <Text style={s.numLabel}>Captured</Text>
                    <Text style={[s.numVal, { color: colors.gold }]}>${c.benefitsCaptured}</Text>
                  </View>
                  <View style={s.numDivider} />
                  <View style={s.numItem}>
                    <Text style={s.numLabel}>Net</Text>
                    <Text style={[
                      s.numVal,
                      { color: c.benefitsCaptured >= c.annualFee ? colors.success : colors.urgent },
                    ]}>
                      {c.benefitsCaptured >= c.annualFee ? '+' : ''}
                      ${c.benefitsCaptured - c.annualFee}
                    </Text>
                  </View>
                </View>

                {c.status === 'behind' && c.annualFee > 0 && (
                  <Text style={s.hint}>
                    Use ${Math.max(0, c.annualFee - c.benefitsCaptured)} more in benefits to break even this year.
                  </Text>
                )}
              </View>
            );
          })}
        </View>
      )}

      <View style={{ height: 48 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.screen },
  header: { paddingHorizontal: spacing.screen, paddingTop: 8, paddingBottom: 16 },
  back: { fontFamily: fontSans.medium, fontSize: 14, color: colors.muted, marginBottom: 12 },
  title: { fontFamily: fontSerif.boldItalic, fontSize: 30, color: colors.text, letterSpacing: -0.5 },
  subtitle: { fontFamily: fontSans.regular, fontSize: 13, color: colors.muted, marginTop: 2 },
  cardList: { paddingHorizontal: spacing.screen, gap: 12 },
  card: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, padding: spacing.md,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  cardName: { fontFamily: fontSans.semiBold, fontSize: 15, color: colors.text },
  cardIssuer: { fontFamily: fontSans.regular, fontSize: 12, color: colors.muted, marginTop: 1 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full },
  statusText: { fontFamily: fontSans.semiBold, fontSize: 11 },
  barWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  barTrack: { flex: 1, height: 6, backgroundColor: colors.border, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: 6, borderRadius: 3 },
  barPct: { fontFamily: fontSans.semiBold, fontSize: 12, color: colors.text, minWidth: 36, textAlign: 'right' },
  nums: { flexDirection: 'row', alignItems: 'center' },
  numItem: { flex: 1, alignItems: 'center' },
  numDivider: { width: 1, height: 32, backgroundColor: colors.border },
  numLabel: { fontFamily: fontSans.regular, fontSize: 11, color: colors.muted, marginBottom: 2 },
  numVal: { fontFamily: fontSerif.bold, fontSize: 17, color: colors.text },
  hint: {
    fontFamily: fontSans.regular, fontSize: 12, color: colors.urgent,
    marginTop: 10, lineHeight: 17,
  },
  emptyText: { fontFamily: fontSans.regular, fontSize: 14, color: colors.muted, textAlign: 'center' },
  lockedTitle: { fontFamily: fontSerif.bold, fontSize: 24, color: colors.text, textAlign: 'center', marginBottom: 8 },
  lockedSub: { fontFamily: fontSans.regular, fontSize: 14, color: colors.muted, textAlign: 'center', lineHeight: 20, marginBottom: 24, marginHorizontal: 16 },
  upgradeBtn: { backgroundColor: colors.text, paddingHorizontal: 32, paddingVertical: 14, borderRadius: radius.sm },
  upgradeBtnText: { fontFamily: fontSans.medium, fontSize: 12, color: '#fff', letterSpacing: 0.8 },
});
