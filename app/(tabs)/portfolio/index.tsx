import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CreditCard, Plus, BarChart3, ChevronRight } from 'lucide-react-native';
import { colors, spacing, radius, fontSerif, fontSans } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import { FREE_CARD_LIMIT } from '@/lib/subscription';
import { useFeatureGate } from '@/hooks/useSubscription';
import { PaywallModal } from '@/components/PaywallModal';
import { impactMedium } from '@/utils/haptics';

type UserCard = {
  id: string;
  card_id: string;
  last_four: string | null;
  nickname: string | null;
  application_date: string | null;
  card: {
    card_name: string;
    issuer: string;
    annual_fee: string;
    reward_model: string;
  };
};

export default function VaultScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showPaywall, setShowPaywall] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const isWalletPro = useFeatureGate('wallet');

  const { data: userCards, isLoading } = useQuery({
    queryKey: ['user_cards'],
    queryFn: async (): Promise<UserCard[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase
        .from('user_cards')
        .select(`
          id,
          card_id,
          last_four,
          nickname,
          application_date,
          card:cards(card_name, issuer, annual_fee, reward_model)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as UserCard[];
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (userCardId: string) => {
      const { error } = await supabase.from('user_cards').delete().eq('id', userCardId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user_cards'] });
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['user_cards'] });
    setRefreshing(false);
  }, [queryClient]);

  const handleAddCard = async () => {
    await impactMedium();
    const count = userCards?.length ?? 0;
    if (!isWalletPro && count >= FREE_CARD_LIMIT) {
      setShowPaywall(true);
      return;
    }
    router.push('/(tabs)/portfolio/add-card');
  };

  const count = userCards?.length ?? 0;
  const atFreeLimit = !isWalletPro && count >= FREE_CARD_LIMIT;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.heading}>Vault</Text>
        <Pressable style={styles.addBtn} onPress={handleAddCard}>
          <Plus size={14} color="#fff" strokeWidth={2.5} />
          <Text style={styles.addBtnText}>Add card</Text>
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : (
        <FlatList
          data={userCards}
          keyExtractor={(c) => c.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
          }
          ListHeaderComponent={
            isWalletPro ? (
              <Pressable
                style={styles.insightsRow}
                onPress={() => router.push('/(tabs)/insights' as any)}
              >
                <BarChart3 size={16} color={colors.gold} strokeWidth={1.75} />
                <Text style={styles.insightsLabel}>Portfolio insights & WealthRing</Text>
                <ChevronRight size={14} color={colors.muted} strokeWidth={1.75} />
              </Pressable>
            ) : null
          }
          renderItem={({ item }) => (
            <View style={styles.cardRow}>
              <View style={styles.cardAccent} />
              <View style={styles.cardBody}>
                <View style={styles.cardTop}>
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardName} numberOfLines={1}>
                      {item.nickname || item.card.card_name}
                    </Text>
                    <Text style={styles.cardIssuer}>
                      {item.card.issuer}
                      {item.last_four ? ` ···· ${item.last_four}` : ''}
                    </Text>
                  </View>
                  <View style={styles.cardActions}>
                    {isWalletPro && (
                      <Pressable
                        style={styles.benefitsBtn}
                        onPress={() => router.push(`/(tabs)/portfolio/card-benefits/${item.id}` as any)}
                        hitSlop={8}
                      >
                        <Text style={styles.benefitsBtnText}>Benefits</Text>
                      </Pressable>
                    )}
                    <Pressable
                      style={styles.removeBtn}
                      onPress={() => removeMutation.mutate(item.id)}
                      hitSlop={8}
                    >
                      <Text style={styles.removeBtnText}>×</Text>
                    </Pressable>
                  </View>
                </View>

                <View style={styles.cardMeta}>
                  <View style={styles.metaBadge}>
                    <Text style={styles.metaBadgeText}>
                      {(item.card.reward_model || 'Rewards').charAt(0).toUpperCase() +
                        (item.card.reward_model || '').slice(1)}
                    </Text>
                  </View>
                  {item.card.annual_fee && item.card.annual_fee !== '0' && (
                    <View style={styles.metaBadge}>
                      <Text style={styles.metaBadgeText}>{item.card.annual_fee}/yr</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={styles.emptyIconWrap}>
                <CreditCard size={32} color={colors.muted} strokeWidth={1.5} />
              </View>
              <Text style={styles.emptyTitle}>Your vault awaits.</Text>
              <Text style={styles.emptySub}>
                Add up to {FREE_CARD_LIMIT} cards for free to start tracking your wallet.
              </Text>
              <Pressable style={styles.emptyBtn} onPress={handleAddCard}>
                <Text style={styles.emptyBtnText}>Add your first card</Text>
              </Pressable>
            </View>
          }
          ListFooterComponent={
            count > 0 ? (
              <View style={styles.footer}>
                {atFreeLimit ? (
                  <Pressable style={styles.upgradeBar} onPress={() => setShowPaywall(true)}>
                    <Text style={styles.upgradeBarText}>
                      Free plan · {count}/{FREE_CARD_LIMIT} cards · Upgrade for unlimited
                    </Text>
                  </Pressable>
                ) : (
                  <Text style={styles.footerNote}>
                    {count} card{count !== 1 ? 's' : ''} · {isWalletPro ? 'Pro' : `${count}/${FREE_CARD_LIMIT} free`}
                  </Text>
                )}
              </View>
            ) : null
          }
        />
      )}

      <PaywallModal
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
        feature="More than 3 cards in vault"
      />
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
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  heading: { fontFamily: fontSerif.boldItalic, fontSize: 30, color: colors.text },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.accent,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  addBtnText: { fontFamily: fontSans.semiBold, fontSize: 13, color: '#FFFFFF' },
  insightsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  insightsLabel: { flex: 1, fontFamily: fontSans.medium, fontSize: 14, color: colors.text },
  listContent: {
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  cardRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  cardAccent: { width: 3, backgroundColor: colors.border },
  cardBody: { flex: 1, padding: spacing.sm },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.xs },
  cardInfo: { flex: 1 },
  cardName: {
    fontFamily: fontSans.semiBold,
    fontSize: 15,
    color: colors.text,
    marginBottom: 2,
  },
  cardIssuer: { fontFamily: fontSans.regular, fontSize: 12, color: colors.muted },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: spacing.xs },
  benefitsBtn: {
    backgroundColor: colors.sidebar, borderRadius: radius.sm,
    paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: colors.border,
  },
  benefitsBtnText: { fontFamily: fontSans.medium, fontSize: 11, color: colors.text },
  removeBtn: { padding: 4 },
  removeBtnText: { fontSize: 20, color: colors.muted, lineHeight: 22 },
  cardMeta: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  metaBadge: {
    backgroundColor: colors.sidebar,
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  metaBadgeText: { fontFamily: fontSans.medium, fontSize: 11, color: colors.muted },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.screen,
    gap: spacing.sm,
  },
  emptyIconWrap: {
    width: 72, height: 72,
    borderRadius: radius.lg,
    backgroundColor: colors.sidebar,
    borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  emptyTitle: { fontFamily: fontSerif.boldItalic, fontSize: 22, color: colors.text },
  emptySub: {
    fontFamily: fontSans.regular,
    fontSize: 15,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 22,
  },
  emptyBtn: {
    marginTop: spacing.sm,
    backgroundColor: colors.accent,
    borderRadius: radius.full,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
  },
  emptyBtnText: { fontFamily: fontSans.semiBold, fontSize: 15, color: '#FFFFFF' },
  footer: { paddingTop: spacing.sm },
  footerNote: { fontFamily: fontSans.regular, fontSize: 13, color: colors.muted, textAlign: 'center' },
  upgradeBar: {
    backgroundColor: colors.accentBg,
    borderRadius: radius.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.accent + '40',
    alignItems: 'center',
  },
  upgradeBarText: { fontFamily: fontSans.medium, fontSize: 13, color: colors.accent, textAlign: 'center' },
});
