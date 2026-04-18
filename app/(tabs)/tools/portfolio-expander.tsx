import React, { useState, useMemo } from 'react';
import {
  View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors, spacing, radius, fontSerif, fontSans } from '@/lib/theme';
import { useCards } from '@/hooks/useCards';
import { scoreCard } from '@/lib/scoring';
import { CardTile } from '@/components/CardTile';
import { impactLight } from '@/utils/haptics';

export default function PortfolioExpanderScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: cards, isLoading } = useCards();
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set());
  const [showResults, setShowResults] = useState(false);

  const toggleCard = async (name: string) => {
    await impactLight();
    setSelectedCards((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const recommendations = useMemo(() => {
    if (!cards || !showResults) return [];
    const owned = Array.from(selectedCards);
    const defaultAnswers = {
      primary_goal_ranked: ['Travel', 'Bonus', 'Cashback', 'Everyday'],
      annual_fee_tolerance: 'Medium',
      spend_comfort: 'Medium',
    };
    return cards
      .filter((c) => !selectedCards.has(c.card_name))
      .map((card) => ({
        card,
        score: scoreCard(card, defaultAnswers, owned),
      }))
      .filter((r) => r.score > -999)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  }, [cards, selectedCards, showResults]);

  if (showResults) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable onPress={() => setShowResults(false)} hitSlop={12}>
            <Text style={styles.backBtn}>← Change cards</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Your Next Card</Text>
          <View style={{ width: 80 }} />
        </View>

        <FlatList
          data={recommendations}
          keyExtractor={(r) => r.card.card_name}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item, index }) => (
            <CardTile card={item.card} rank={index + 1} />
          )}
          ListHeaderComponent={
            <View style={styles.listHeader}>
              <Text style={styles.listHeaderTitle}>Best cards to add next</Text>
              <Text style={styles.listHeaderSub}>
                Based on what you already have — ranked to maximize total portfolio value
              </Text>
            </View>
          }
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.backBtn}>← Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Portfolio Expander</Text>
        <Text style={styles.countBadge}>{selectedCards.size} selected</Text>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.gold} />
        </View>
      ) : (
        <>
          <View style={styles.instruction}>
            <Text style={styles.instructionText}>
              Select all the cards you currently have. We'll find what to add next.
            </Text>
          </View>

          <FlatList
            data={cards}
            keyExtractor={(c) => c.card_name}
            contentContainerStyle={styles.selectListContent}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const owned = selectedCards.has(item.card_name);
              return (
                <Pressable
                  style={[styles.cardRow, owned && styles.cardRowSelected]}
                  onPress={() => toggleCard(item.card_name)}
                >
                  <View style={styles.cardRowLeft}>
                    <Text style={styles.cardRowName} numberOfLines={1}>{item.card_name}</Text>
                    <Text style={styles.cardRowIssuer}>{item.issuer}</Text>
                  </View>
                  <View style={[styles.checkbox, owned && styles.checkboxSelected]}>
                    {owned && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                </Pressable>
              );
            }}
          />

          <View style={styles.ctaBar}>
            <Pressable
              style={[styles.ctaBtn, selectedCards.size === 0 && styles.ctaBtnDisabled]}
              onPress={() => setShowResults(true)}
              disabled={selectedCards.size === 0}
            >
              <Text style={styles.ctaBtnText}>
                Find my next card ({selectedCards.size} owned) →
              </Text>
            </Pressable>
          </View>
        </>
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
  backBtn: { fontFamily: fontSans.medium, fontSize: 15, color: colors.gold },
  headerTitle: { fontFamily: fontSerif.bold, fontSize: 18, color: colors.text },
  countBadge: { fontFamily: fontSans.medium, fontSize: 13, color: colors.muted },
  instruction: {
    paddingHorizontal: spacing.screen,
    paddingVertical: spacing.sm,
    backgroundColor: colors.sidebar,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  instructionText: {
    fontFamily: fontSans.regular,
    fontSize: 14,
    color: colors.muted,
    lineHeight: 20,
  },
  selectListContent: { paddingHorizontal: spacing.screen, paddingTop: spacing.sm, paddingBottom: 100 },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    marginBottom: 8,
  },
  cardRowSelected: {
    borderColor: colors.gold,
    backgroundColor: colors.goldBg,
  },
  cardRowLeft: { flex: 1, marginRight: spacing.sm },
  cardRowName: {
    fontFamily: fontSans.medium,
    fontSize: 14,
    color: colors.text,
  },
  cardRowIssuer: {
    fontFamily: fontSans.regular,
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: colors.gold,
    borderColor: colors.gold,
  },
  checkmark: { fontSize: 12, color: '#FFFFFF', fontWeight: '700' },
  ctaBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: spacing.md,
    paddingBottom: spacing.lg,
  },
  ctaBtn: {
    backgroundColor: colors.gold,
    borderRadius: radius.full,
    paddingVertical: 14,
    alignItems: 'center',
  },
  ctaBtnDisabled: { backgroundColor: colors.border },
  ctaBtnText: { fontFamily: fontSans.bold, fontSize: 15, color: '#FFFFFF' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { paddingHorizontal: spacing.screen, paddingBottom: spacing.xl },
  listHeader: { paddingTop: spacing.lg, paddingBottom: spacing.md },
  listHeaderTitle: { fontFamily: fontSerif.bold, fontSize: 22, color: colors.text, marginBottom: 4 },
  listHeaderSub: { fontFamily: fontSans.regular, fontSize: 13, color: colors.muted, lineHeight: 19 },
});
