import React, { useState, useMemo } from 'react';
import {
  View, Text, TextInput, Pressable, FlatList, StyleSheet, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors, spacing, radius, fontSerif, fontSans } from '@/lib/theme';
import { useCards } from '@/hooks/useCards';
import { CardTile } from '@/components/CardTile';

const REWARD_FILTERS = ['All', 'Cashback', 'Travel', 'Airline', 'Hotel'];
const FEE_FILTERS = ['Any', 'No fee', 'Under $100', 'Under $400', '$400+'];

export default function BrowserScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [rewardFilter, setRewardFilter] = useState('All');
  const [feeFilter, setFeeFilter] = useState('Any');
  const [issuerFilter, setIssuerFilter] = useState('All');

  const { data: cards, isLoading } = useCards();

  const issuers = useMemo(() => {
    if (!cards) return ['All'];
    const set = new Set(cards.map((c) => c.issuer));
    return ['All', ...Array.from(set).sort()];
  }, [cards]);

  const filtered = useMemo(() => {
    if (!cards) return [];
    return cards.filter((card) => {
      const name = (card.card_name + ' ' + card.issuer).toLowerCase();
      if (search && !name.includes(search.toLowerCase())) return false;

      if (rewardFilter !== 'All') {
        const model = (card.reward_model || '').toLowerCase();
        const filterLower = rewardFilter.toLowerCase();
        if (!model.includes(filterLower)) return false;
      }

      if (feeFilter !== 'Any') {
        const fee = parseFloat((card.annual_fee || '').replace(/[^0-9.]/g, '') || '0');
        if (feeFilter === 'No fee' && fee !== 0) return false;
        if (feeFilter === 'Under $100' && fee >= 100) return false;
        if (feeFilter === 'Under $400' && fee >= 400) return false;
        if (feeFilter === '$400+' && fee < 400) return false;
      }

      if (issuerFilter !== 'All' && card.issuer !== issuerFilter) return false;

      return true;
    });
  }, [cards, search, rewardFilter, feeFilter, issuerFilter]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.backBtn}>← Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Card Browser</Text>
        <Text style={styles.countBadge}>{isLoading ? '...' : filtered.length}</Text>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search cards..."
          placeholderTextColor={colors.muted}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Reward type filter */}
      <FlatList
        horizontal
        data={REWARD_FILTERS}
        keyExtractor={(f) => f}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
        style={styles.chipScroll}
        renderItem={({ item }) => (
          <Pressable
            style={[styles.chip, rewardFilter === item && styles.chipActive]}
            onPress={() => setRewardFilter(item)}
          >
            <Text style={[styles.chipText, rewardFilter === item && styles.chipTextActive]}>
              {item}
            </Text>
          </Pressable>
        )}
      />

      {/* Fee filter */}
      <FlatList
        horizontal
        data={FEE_FILTERS}
        keyExtractor={(f) => f}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
        style={styles.chipScroll}
        renderItem={({ item }) => (
          <Pressable
            style={[styles.chip, feeFilter === item && styles.chipActive]}
            onPress={() => setFeeFilter(item)}
          >
            <Text style={[styles.chipText, feeFilter === item && styles.chipTextActive]}>
              {item}
            </Text>
          </Pressable>
        )}
      />

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.gold} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(c) => c.card_name + c.issuer}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => <CardTile card={item} />}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={styles.emptyText}>No cards match your filters.</Text>
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
  countBadge: {
    fontFamily: fontSans.medium,
    fontSize: 13,
    color: colors.muted,
  },
  searchWrap: {
    paddingHorizontal: spacing.screen,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchInput: {
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontFamily: fontSans.regular,
    fontSize: 15,
    color: colors.text,
  },
  chipScroll: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  chipRow: {
    paddingHorizontal: spacing.screen,
    paddingVertical: spacing.sm,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipActive: {
    backgroundColor: colors.gold,
    borderColor: colors.gold,
  },
  chipText: {
    fontFamily: fontSans.medium,
    fontSize: 13,
    color: colors.text,
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  emptyText: {
    fontFamily: fontSans.regular,
    fontSize: 15,
    color: colors.muted,
    textAlign: 'center',
  },
});
