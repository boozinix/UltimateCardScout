import React, { useMemo, useState } from 'react';
import {
  View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { colors, spacing, radius, fontSerif, fontSans } from '@/lib/theme';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useCards } from '@/hooks/useCards';
import { scoreCard, getNarrativeOneliner, getScoreBreakdown, type Answers } from '@/lib/scoring';
import { CardTile } from '@/components/CardTile';

const FILTERS = ['All', 'Personal', 'Business', 'No fee', 'Travel', 'Cashback'];

export default function ResultsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isDesktop } = useBreakpoint();
  const { answers: answersParam } = useLocalSearchParams<{ answers: string }>();
  const [activeFilter, setActiveFilter] = useState('All');

  const answers: Answers = useMemo(() => {
    try {
      return answersParam ? JSON.parse(decodeURIComponent(answersParam)) : {};
    } catch {
      return {};
    }
  }, [answersParam]);

  const { data: cards, isLoading, error } = useCards();

  const ranked = useMemo(() => {
    if (!cards?.length) return [];
    return cards
      .map((card) => ({
        card,
        score: scoreCard(card, answers, []),
        oneliner: getNarrativeOneliner(card, answers),
        breakdown: getScoreBreakdown(card, answers),
      }))
      .filter((r) => r.score > -999)
      .sort((a, b) => b.score - a.score)
      .slice(0, 30);
  }, [cards, answers]);

  const filtered = useMemo(() => {
    if (activeFilter === 'All') return ranked;
    if (activeFilter === 'Personal') return ranked.filter((r) => (r.card.card_type || '').toLowerCase() !== 'business');
    if (activeFilter === 'Business') return ranked.filter((r) => (r.card.card_type || '').toLowerCase() === 'business');
    if (activeFilter === 'No fee') return ranked.filter((r) => {
      const fee = parseFloat(r.card.annual_fee?.replace(/[^0-9.]/g, '') || '0');
      return fee === 0;
    });
    if (activeFilter === 'Travel') return ranked.filter((r) => (r.card.reward_model || '').toLowerCase().includes('travel') || (r.card.reward_model || '').toLowerCase().includes('airline') || (r.card.reward_model || '').toLowerCase().includes('hotel'));
    if (activeFilter === 'Cashback') return ranked.filter((r) => (r.card.reward_model || '').toLowerCase() === 'cashback');
    return ranked;
  }, [ranked, activeFilter]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.backBtn}>← Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Your Results</Text>
        <Text style={styles.headerCount}>
          {isLoading ? '...' : `${filtered.length} cards`}
        </Text>
      </View>

      {/* Filter chips */}
      <FlatList
        horizontal
        data={FILTERS}
        keyExtractor={(f) => f}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtersContent}
        style={styles.filters}
        renderItem={({ item }) => (
          <Pressable
            style={[styles.filterChip, activeFilter === item && styles.filterChipActive]}
            onPress={() => setActiveFilter(item)}
          >
            <Text style={[styles.filterChipText, activeFilter === item && styles.filterChipTextActive]}>
              {item}
            </Text>
          </Pressable>
        )}
      />

      {/* Content */}
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.gold} size="large" />
          <Text style={styles.loadingText}>Ranking cards for you...</Text>
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>Couldn't load cards. Check your connection.</Text>
          <Pressable style={styles.retryBtn} onPress={() => router.back()}>
            <Text style={styles.retryBtnText}>Go back</Text>
          </Pressable>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyTitle}>No cards match</Text>
          <Text style={styles.emptyText}>Try a different filter or adjust your preferences.</Text>
          <Pressable style={styles.retryBtn} onPress={() => router.back()}>
            <Text style={styles.retryBtnText}>Start over</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(r) => r.card.card_name + r.card.issuer}
          contentContainerStyle={[
            styles.listContent,
            isDesktop && { maxWidth: 1200, alignSelf: 'center' as const, width: '100%' as any },
          ]}
          showsVerticalScrollIndicator={false}
          renderItem={({ item, index }) => (
            <CardTile
              card={item.card}
              rank={index + 1}
              narrativeOneliner={item.oneliner}
              scoreBreakdown={item.breakdown}
            />
          )}
          ListHeaderComponent={
            <View style={styles.listHeader}>
              <Text style={styles.listHeaderTitle}>
                {filtered.length} cards ranked for you
              </Text>
              <Text style={styles.listHeaderSub}>
                Scored on your goals, fee tolerance, and spending comfort
              </Text>
            </View>
          }
        />
      )}
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
  backBtn: {
    fontFamily: fontSans.medium,
    fontSize: 15,
    color: colors.gold,
  },
  headerTitle: {
    fontFamily: fontSerif.bold,
    fontSize: 18,
    color: colors.text,
  },
  headerCount: {
    fontFamily: fontSans.medium,
    fontSize: 13,
    color: colors.muted,
  },
  filters: {
    flexGrow: 0,
    flexShrink: 0,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filtersContent: {
    paddingHorizontal: spacing.screen,
    paddingVertical: spacing.sm,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  filterChipActive: {
    backgroundColor: colors.gold,
    borderColor: colors.gold,
  },
  filterChipText: {
    fontFamily: fontSans.medium,
    fontSize: 13,
    color: colors.text,
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    paddingHorizontal: spacing.screen,
    paddingBottom: spacing.xl,
  },
  listHeader: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  listHeaderTitle: {
    fontFamily: fontSerif.bold,
    fontSize: 20,
    color: colors.text,
    marginBottom: 4,
  },
  listHeaderSub: {
    fontFamily: fontSans.regular,
    fontSize: 13,
    color: colors.muted,
    lineHeight: 19,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.screen,
    gap: spacing.sm,
  },
  loadingText: {
    fontFamily: fontSans.regular,
    fontSize: 15,
    color: colors.muted,
    marginTop: spacing.sm,
  },
  errorText: {
    fontFamily: fontSans.regular,
    fontSize: 15,
    color: colors.urgent,
    textAlign: 'center',
  },
  emptyTitle: {
    fontFamily: fontSerif.bold,
    fontSize: 22,
    color: colors.text,
  },
  emptyText: {
    fontFamily: fontSans.regular,
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: spacing.sm,
    paddingVertical: 10,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.gold,
    borderRadius: radius.full,
  },
  retryBtnText: {
    fontFamily: fontSans.semiBold,
    fontSize: 14,
    color: '#FFFFFF',
  },
});
