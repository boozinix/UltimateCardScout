import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { differenceInDays, parseISO } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { colors, spacing, radius, fontSerif, fontSans, getCategoryColors } from '@/lib/theme';
import { useFeatureGate } from '@/hooks/useSubscription';
import { PaywallModal } from '@/components/PaywallModal';

type Reminder = {
  id: string;
  remind_at: string;
  period_end: string;
  period_label: string | null;
  status: string;
  benefits: { title: string; value: number | null; frequency: string; category: string | null } | null;
  user_cards: { cards: { name: string } | null } | null;
};

type FilterMode = 'pending' | 'used' | 'all';

function accentColor(daysLeft: number, status: string): string {
  if (status === 'used') return colors.success;
  if (status === 'snoozed') return colors.muted;
  if (daysLeft <= 7) return colors.urgent;
  if (daysLeft <= 30) return colors.warn;
  return colors.border;
}

export default function BenefitsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const isWalletPro = useFeatureGate('reminders');

  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterMode>('pending');
  const [showPaywall, setShowPaywall] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) { setLoading(false); setRefreshing(false); return; }

    const { data } = await supabase
      .from('reminders')
      .select(`id, remind_at, period_end, period_label, status,
        benefits(title, value, frequency, category),
        user_cards(cards(name))`)
      .eq('user_id', session.user.id)
      .order('remind_at', { ascending: true });

    setReminders((data ?? []) as unknown as Reminder[]);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (!isWalletPro) {
    return (
      <View style={[s.container, s.center, { paddingTop: insets.top }]}>
        <Text style={s.lockedTitle}>Benefits Tracking</Text>
        <Text style={s.lockedSub}>Upgrade to track and get reminded about your card benefits.</Text>
        <Pressable style={s.upgradeBtn} onPress={() => setShowPaywall(true)}>
          <Text style={s.upgradeBtnLabel}>UPGRADE TO PRO</Text>
        </Pressable>
        <PaywallModal visible={showPaywall} onClose={() => setShowPaywall(false)} />
      </View>
    );
  }

  const filtered = reminders.filter(r => {
    if (filter === 'pending') return r.status === 'pending' || r.status === 'snoozed';
    if (filter === 'used') return r.status === 'used';
    return true;
  });

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.headerRow}>
        <View>
          <Text style={s.screenTitle}>Your</Text>
          <Text style={s.screenTitleItalic}>Benefits</Text>
        </View>
      </View>

      <View style={s.filters}>
        {(['pending', 'used', 'all'] as FilterMode[]).map(f => (
          <Pressable
            key={f}
            style={[s.filterChip, filter === f && s.filterChipActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[s.filterChipText, filter === f && s.filterChipTextActive]}>
              {f === 'pending' ? 'Active' : f === 'used' ? 'Used' : 'All'}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator color={colors.gold} /></View>
      ) : (
        <ScrollView
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.gold} />}
        >
          {filtered.length === 0 ? (
            <View style={s.empty}>
              <Text style={s.emptyText}>No reminders in this view</Text>
            </View>
          ) : (
            filtered.map(r => {
              const daysLeft = differenceInDays(parseISO(r.period_end), new Date());
              const cat = getCategoryColors(r.benefits?.category ?? null);
              const accent = accentColor(daysLeft, r.status);
              return (
                <Pressable
                  key={r.id}
                  style={s.card}
                  onPress={() => router.push(`/(tabs)/portfolio/benefit-detail/${r.id}` as any)}
                >
                  <View style={[s.cardAccent, { backgroundColor: accent }]} />
                  <View style={s.cardBody}>
                    <View style={s.cardTop}>
                      <View style={{ flex: 1 }}>
                        <Text style={s.cardCardName}>{r.user_cards?.cards?.name ?? ''}</Text>
                        <Text style={s.cardTitle}>{r.benefits?.title ?? '—'}</Text>
                        {r.period_label && <Text style={s.cardPeriod}>{r.period_label}</Text>}
                      </View>
                      <View style={s.cardRight}>
                        {r.benefits?.value != null && (
                          <Text style={s.cardValue}>${r.benefits.value}</Text>
                        )}
                        {r.benefits?.category && (
                          <View style={[s.catPill, { backgroundColor: cat.bg }]}>
                            <Text style={[s.catPillText, { color: cat.color }]}>
                              {r.benefits.category}
                            </Text>
                          </View>
                        )}
                        {r.status !== 'pending' && (
                          <View style={[s.statusBadge, {
                            backgroundColor: r.status === 'used' ? colors.successBg : colors.warnBg,
                          }]}>
                            <Text style={[s.statusBadgeText, {
                              color: r.status === 'used' ? colors.success : colors.warn,
                            }]}>
                              {r.status === 'used' ? 'USED' : 'SNOOZED'}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                    {r.status === 'pending' && daysLeft <= 30 && daysLeft >= 0 && (
                      <Text style={[s.expiryText, { color: daysLeft <= 7 ? colors.urgent : colors.warn }]}>
                        {daysLeft === 0 ? 'Expires today' : `${daysLeft}d remaining`}
                      </Text>
                    )}
                  </View>
                </Pressable>
              );
            })
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerRow: { paddingHorizontal: spacing.screen, paddingTop: 8, paddingBottom: 4 },
  screenTitle: { fontFamily: fontSerif.bold, fontSize: 28, color: colors.text, letterSpacing: -0.5 },
  screenTitleItalic: { fontFamily: fontSerif.italic, fontSize: 28, color: colors.text, letterSpacing: -0.5, marginBottom: 4 },
  filters: { flexDirection: 'row', gap: 8, paddingHorizontal: spacing.screen, paddingBottom: 12 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border },
  filterChipActive: { backgroundColor: colors.text, borderColor: colors.text },
  filterChipText: { fontFamily: fontSans.medium, fontSize: 12, color: colors.muted },
  filterChipTextActive: { color: '#fff' },
  scroll: { paddingHorizontal: spacing.screen, paddingTop: 4 },
  empty: { paddingVertical: 60, alignItems: 'center' },
  emptyText: { fontFamily: fontSans.regular, fontSize: 14, color: colors.muted },
  card: {
    flexDirection: 'row', backgroundColor: colors.surface,
    borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, marginBottom: 10, overflow: 'hidden',
  },
  cardAccent: { width: 3 },
  cardBody: { flex: 1, padding: 14 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start' },
  cardCardName: { fontFamily: fontSans.medium, fontSize: 11, color: colors.muted, marginBottom: 3 },
  cardTitle: { fontFamily: fontSerif.semiBold, fontSize: 15, color: colors.text, marginBottom: 2 },
  cardPeriod: { fontFamily: fontSans.regular, fontSize: 12, color: colors.muted },
  cardRight: { alignItems: 'flex-end', gap: 6, marginLeft: 8 },
  cardValue: { fontFamily: fontSerif.bold, fontSize: 18, color: colors.gold },
  catPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  catPillText: { fontFamily: fontSans.medium, fontSize: 10 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  statusBadgeText: { fontFamily: fontSans.medium, fontSize: 10 },
  expiryText: { fontFamily: fontSans.medium, fontSize: 11, marginTop: 8 },
  lockedTitle: { fontFamily: fontSerif.bold, fontSize: 24, color: colors.text, textAlign: 'center', marginBottom: 8 },
  lockedSub: { fontFamily: fontSans.regular, fontSize: 14, color: colors.muted, textAlign: 'center', marginHorizontal: 32, marginBottom: 24, lineHeight: 20 },
  upgradeBtn: { backgroundColor: colors.text, paddingHorizontal: 32, paddingVertical: 14, borderRadius: radius.sm },
  upgradeBtnLabel: { fontFamily: fontSans.medium, fontSize: 12, color: '#fff', letterSpacing: 0.8 },
});
