import React, { useState, useMemo } from 'react';
import {
  View, Text, TextInput, FlatList, Pressable, StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { colors, spacing, radius, fontSerif, fontSans } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import { useCards } from '@/hooks/useCards';
import { FREE_CARD_LIMIT } from '@/lib/subscription';
import { useSubscription } from '@/hooks/useSubscription';
import { notificationSuccess, impactMedium } from '@/utils/haptics';
import { generateReminders } from '@/utils/generateReminders';

export default function AddCardScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: cards, isLoading } = useCards();
  const { isPro } = useSubscription();
  const [search, setSearch] = useState('');
  const [lastFour, setLastFour] = useState('');
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!cards) return [];
    if (!search.trim()) return cards.slice(0, 20);
    const q = search.toLowerCase();
    return cards.filter((c) =>
      c.card_name.toLowerCase().includes(q) || c.issuer.toLowerCase().includes(q)
    ).slice(0, 20);
  }, [cards, search]);

  const selectedCard = useMemo(() => {
    return cards?.find((c) => c.id === selectedCardId) ?? null;
  }, [cards, selectedCardId]);

  const addMutation = useMutation({
    mutationFn: async ({ cardId, lastFourDigits }: { cardId: string; lastFourDigits: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Check free limit server-side
      if (!isPro) {
        const { count } = await supabase
          .from('user_cards')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id);
        if ((count ?? 0) >= FREE_CARD_LIMIT) {
          throw new Error(`Free plan allows up to ${FREE_CARD_LIMIT} cards. Upgrade to Pro for unlimited.`);
        }
      }

      const appDate = new Date().toISOString().slice(0, 10);
      const { data: inserted, error } = await supabase.from('user_cards').insert({
        user_id: user.id,
        card_id: cardId,
        last_four: lastFourDigits || null,
        application_date: appDate,
      }).select('id').single();
      if (error) {
        if (error.code === '23505') throw new Error('You already have this card in your portfolio.');
        throw error;
      }
      // Generate reminders for pro users (fire and forget)
      if (isPro && inserted?.id) {
        generateReminders(inserted.id, user.id, appDate).catch(() => {});
      }
    },
    onSuccess: async () => {
      await notificationSuccess();
      await queryClient.invalidateQueries({ queryKey: ['user_cards'] });
      router.back();
    },
    onError: (err: Error) => {
      Alert.alert('Could not add card', err.message);
    },
  });

  const handleAdd = async () => {
    if (!selectedCardId) return;
    await impactMedium();
    addMutation.mutate({ cardId: selectedCardId, lastFourDigits: lastFour.trim() });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.backBtn}>← Cancel</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Add Card</Text>
        <Pressable
          style={[styles.saveBtn, (!selectedCardId || addMutation.isPending) && styles.saveBtnDisabled]}
          onPress={handleAdd}
          disabled={!selectedCardId || addMutation.isPending}
        >
          {addMutation.isPending ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.saveBtnText}>Add</Text>
          )}
        </Pressable>
      </View>

      {/* Selected card preview */}
      {selectedCard && (
        <View style={styles.selectedPreview}>
          <Text style={styles.selectedName}>{selectedCard.card_name}</Text>
          <Text style={styles.selectedIssuer}>{selectedCard.issuer}</Text>
        </View>
      )}

      {/* Search */}
      <View style={styles.searchWrap}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by card name or issuer..."
          placeholderTextColor={colors.muted}
          value={search}
          onChangeText={setSearch}
          autoFocus
        />
      </View>

      {/* Last four (optional) */}
      <View style={styles.lastFourWrap}>
        <TextInput
          style={styles.lastFourInput}
          placeholder="Last 4 digits (optional)"
          placeholderTextColor={colors.muted}
          value={lastFour}
          onChangeText={(t) => setLastFour(t.replace(/\D/g, '').slice(0, 4))}
          keyboardType="numeric"
          maxLength={4}
        />
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.gold} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(c) => c.id ?? c.card_name}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => {
            const selected = selectedCardId === item.id;
            return (
              <Pressable
                style={[styles.cardRow, selected && styles.cardRowSelected]}
                onPress={() => setSelectedCardId(selected ? null : (item.id as string))}
              >
                <View style={styles.cardInfo}>
                  <Text style={styles.cardName} numberOfLines={1}>{item.card_name}</Text>
                  <Text style={styles.cardIssuer}>{item.issuer}</Text>
                </View>
                {selected && (
                  <View style={styles.checkmark}>
                    <Text style={styles.checkmarkText}>✓</Text>
                  </View>
                )}
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={styles.emptyText}>No cards found for "{search}"</Text>
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
  backBtn: { fontFamily: fontSans.medium, fontSize: 15, color: colors.muted },
  headerTitle: { fontFamily: fontSerif.bold, fontSize: 18, color: colors.text },
  saveBtn: {
    backgroundColor: colors.gold,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    minWidth: 60,
    alignItems: 'center',
  },
  saveBtnDisabled: { backgroundColor: colors.border },
  saveBtnText: { fontFamily: fontSans.bold, fontSize: 14, color: '#FFFFFF' },
  selectedPreview: {
    backgroundColor: colors.goldBg,
    borderBottomWidth: 1,
    borderBottomColor: colors.gold + '40',
    paddingHorizontal: spacing.screen,
    paddingVertical: spacing.sm,
  },
  selectedName: { fontFamily: fontSans.semiBold, fontSize: 14, color: colors.gold },
  selectedIssuer: { fontFamily: fontSans.regular, fontSize: 12, color: colors.muted },
  searchWrap: {
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
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
  lastFourWrap: {
    paddingHorizontal: spacing.screen,
    paddingBottom: spacing.sm,
  },
  lastFourInput: {
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
  listContent: { paddingHorizontal: spacing.screen, paddingBottom: spacing.xl },
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
  cardInfo: { flex: 1 },
  cardName: { fontFamily: fontSans.medium, fontSize: 14, color: colors.text },
  cardIssuer: { fontFamily: fontSans.regular, fontSize: 12, color: colors.muted, marginTop: 2 },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkText: { fontSize: 13, color: '#FFFFFF', fontWeight: '700' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xl },
  emptyText: { fontFamily: fontSans.regular, fontSize: 14, color: colors.muted },
});
