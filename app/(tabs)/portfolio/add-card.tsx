import React, { useState, useMemo } from 'react';
import {
  View, Text, TextInput, FlatList, Pressable, StyleSheet,
  ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link2, Search, CheckCircle } from 'lucide-react-native';
import { colors, spacing, radius, fontSerif, fontSans } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import { useCards } from '@/hooks/useCards';
import { FREE_CARD_LIMIT } from '@/lib/subscription';
import { useSubscription } from '@/hooks/useSubscription';
import { notificationSuccess, impactMedium } from '@/utils/haptics';
import { generateReminders } from '@/utils/generateReminders';
import { capture, Events } from '@/lib/analytics';

type Mode = 'search' | 'url';

type ExtractedBenefit = {
  title: string;
  description: string;
  value: number | null;
  frequency: string;
  category: string | null;
};

export default function AddCardScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: cards, isLoading } = useCards();
  const { isPro } = useSubscription();

  const [mode, setMode] = useState<Mode>('search');
  const [search, setSearch] = useState('');
  const [lastFour, setLastFour] = useState('');
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  // URL mode state
  const [cardUrl, setCardUrl] = useState('');
  const [urlCardName, setUrlCardName] = useState('');
  const [urlIssuer, setUrlIssuer] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [extractedBenefits, setExtractedBenefits] = useState<ExtractedBenefit[] | null>(null);
  const [urlMatchedCardId, setUrlMatchedCardId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!cards) return [];
    if (!search.trim()) return cards.slice(0, 20);
    const q = search.toLowerCase();
    return cards.filter((c) =>
      c.card_name.toLowerCase().includes(q) || c.issuer.toLowerCase().includes(q)
    ).slice(0, 20);
  }, [cards, search]);

  const selectedCard = useMemo(
    () => cards?.find((c) => c.id === selectedCardId) ?? null,
    [cards, selectedCardId]
  );

  const addMutation = useMutation({
    mutationFn: async ({ cardId, lastFourDigits }: { cardId: string; lastFourDigits: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      if (!isPro) {
        const { count } = await supabase
          .from('user_cards')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id);
        if ((count ?? 0) >= FREE_CARD_LIMIT) {
          throw new Error(`Free plan allows up to ${FREE_CARD_LIMIT} cards. Upgrade to Pro.`);
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
        if (error.code === '23505') throw new Error('You already have this card in your vault.');
        throw error;
      }
      if (isPro && inserted?.id) {
        generateReminders(inserted.id, user.id, appDate).catch(() => {});
      }
    },
    onSuccess: async () => {
      await notificationSuccess();
      capture(Events.CARD_ADDED, { mode });
      await queryClient.invalidateQueries({ queryKey: ['user_cards'] });
      router.back();
    },
    onError: (err: Error) => Alert.alert('Could not add card', err.message),
  });

  const handleAdd = async () => {
    if (!selectedCardId) return;
    await impactMedium();
    addMutation.mutate({ cardId: selectedCardId, lastFourDigits: lastFour.trim() });
  };

  const handleExtract = async () => {
    if (!cardUrl.trim() || !urlCardName.trim()) {
      Alert.alert('Required', 'Enter the card URL and card name.');
      return;
    }
    if (!isPro) {
      Alert.alert('Pro required', 'AI benefit extraction requires a Pro subscription.');
      return;
    }
    await impactMedium();
    setExtracting(true);
    setExtractedBenefits(null);
    setUrlMatchedCardId(null);

    try {
      const { data, error } = await supabase.functions.invoke('scrape-card', {
        body: { url: cardUrl.trim(), card_name: urlCardName.trim(), issuer: urlIssuer.trim() },
      });
      if (error) throw new Error(error.message);
      setExtractedBenefits((data as any).benefits ?? []);

      // Try to match to a card in the local DB
      const match = cards?.find((c) =>
        c.card_name.toLowerCase().includes(urlCardName.toLowerCase()) ||
        urlCardName.toLowerCase().includes(c.card_name.toLowerCase())
      );
      if (match?.id) setUrlMatchedCardId(match.id as string);
    } catch (err: unknown) {
      Alert.alert('Extraction failed', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setExtracting(false);
    }
  };

  const handleConfirmUrl = async () => {
    if (!urlMatchedCardId) {
      Alert.alert(
        'Card not in database',
        `"${urlCardName}" wasn't found in the 110-card database. Use the Search tab to find and add it manually.`
      );
      return;
    }
    await impactMedium();
    addMutation.mutate({ cardId: urlMatchedCardId, lastFourDigits: '' });
  };

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={s.backBtn}>← Cancel</Text>
        </Pressable>
        <Text style={s.headerTitle}>Add to Vault</Text>
        {mode === 'search' ? (
          <Pressable
            style={[s.saveBtn, (!selectedCardId || addMutation.isPending) && s.saveBtnDisabled]}
            onPress={handleAdd}
            disabled={!selectedCardId || addMutation.isPending}
          >
            {addMutation.isPending
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={s.saveBtnText}>Add</Text>}
          </Pressable>
        ) : (
          <View style={{ width: 56 }} />
        )}
      </View>

      {/* Mode toggle */}
      <View style={s.modeRow}>
        <Pressable
          style={[s.modeBtn, mode === 'search' && s.modeBtnActive]}
          onPress={() => setMode('search')}
        >
          <Search size={13} color={mode === 'search' ? colors.accent : colors.muted} strokeWidth={2} />
          <Text style={[s.modeBtnText, mode === 'search' && s.modeBtnTextActive]}>Search</Text>
        </Pressable>
        <Pressable
          style={[s.modeBtn, mode === 'url' && s.modeBtnActive]}
          onPress={() => setMode('url')}
        >
          <Link2 size={13} color={mode === 'url' ? colors.accent : colors.muted} strokeWidth={2} />
          <Text style={[s.modeBtnText, mode === 'url' && s.modeBtnTextActive]}>
            By URL {!isPro && <Text style={s.proTag}>PRO</Text>}
          </Text>
        </Pressable>
      </View>

      {mode === 'search' ? (
        <>
          {selectedCard && (
            <View style={s.selectedPreview}>
              <Text style={s.selectedName}>{selectedCard.card_name}</Text>
              <Text style={s.selectedIssuer}>{selectedCard.issuer}</Text>
            </View>
          )}
          <View style={s.inputWrap}>
            <TextInput
              style={s.input}
              placeholder="Search by card name or issuer…"
              placeholderTextColor={colors.muted}
              value={search}
              onChangeText={setSearch}
              autoFocus
            />
          </View>
          <View style={s.inputWrap}>
            <TextInput
              style={s.input}
              placeholder="Last 4 digits (optional)"
              placeholderTextColor={colors.muted}
              value={lastFour}
              onChangeText={(t) => setLastFour(t.replace(/\D/g, '').slice(0, 4))}
              keyboardType="numeric"
              maxLength={4}
            />
          </View>

          {isLoading ? (
            <View style={s.centered}><ActivityIndicator color={colors.accent} /></View>
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={(c) => c.id ?? c.card_name}
              contentContainerStyle={s.listContent}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const sel = selectedCardId === item.id;
                return (
                  <Pressable
                    style={[s.cardRow, sel && s.cardRowSelected]}
                    onPress={() => setSelectedCardId(sel ? null : (item.id as string))}
                  >
                    <View style={s.cardInfo}>
                      <Text style={s.cardName} numberOfLines={1}>{item.card_name}</Text>
                      <Text style={s.cardIssuer}>{item.issuer}</Text>
                    </View>
                    {sel && (
                      <CheckCircle size={20} color={colors.accent} strokeWidth={2} />
                    )}
                  </Pressable>
                );
              }}
              ListEmptyComponent={
                <View style={s.centered}>
                  <Text style={s.emptyText}>No cards found for "{search}"</Text>
                </View>
              }
            />
          )}
        </>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={s.urlContent} keyboardShouldPersistTaps="handled">
          <Text style={s.urlNote}>
            Paste the issuer's card page URL. AI will extract the benefit list and match it to your vault.
          </Text>

          <Text style={s.label}>CARD URL</Text>
          <TextInput
            style={s.input}
            placeholder="https://americanexpress.com/platinum"
            placeholderTextColor={colors.muted}
            value={cardUrl}
            onChangeText={setCardUrl}
            autoCapitalize="none"
            keyboardType="url"
          />

          <Text style={s.label}>CARD NAME</Text>
          <TextInput
            style={s.input}
            placeholder="e.g. Amex Platinum"
            placeholderTextColor={colors.muted}
            value={urlCardName}
            onChangeText={setUrlCardName}
          />

          <Text style={s.label}>ISSUER (optional)</Text>
          <TextInput
            style={[s.input, { marginBottom: spacing.lg }]}
            placeholder="e.g. American Express"
            placeholderTextColor={colors.muted}
            value={urlIssuer}
            onChangeText={setUrlIssuer}
          />

          <Pressable
            style={[s.extractBtn, (extracting || !cardUrl.trim() || !urlCardName.trim()) && s.extractBtnDisabled]}
            onPress={handleExtract}
            disabled={extracting || !cardUrl.trim() || !urlCardName.trim()}
          >
            {extracting
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={s.extractBtnText}>Extract Benefits with AI →</Text>}
          </Pressable>

          {extracting && (
            <Text style={s.extractingNote}>Reading card page and extracting benefits…</Text>
          )}

          {extractedBenefits && (
            <View style={s.benefitPreview}>
              <Text style={s.benefitPreviewTitle}>
                {extractedBenefits.length} benefit{extractedBenefits.length !== 1 ? 's' : ''} found
              </Text>
              {extractedBenefits.slice(0, 6).map((b, i) => (
                <View key={i} style={s.benefitRow}>
                  <Text style={s.benefitTitle}>{b.title}</Text>
                  <View style={s.benefitMeta}>
                    {b.value != null && <Text style={s.benefitValue}>${b.value}</Text>}
                    <Text style={s.benefitFreq}>{b.frequency}</Text>
                  </View>
                </View>
              ))}
              {extractedBenefits.length > 6 && (
                <Text style={s.benefitMore}>+ {extractedBenefits.length - 6} more</Text>
              )}

              <Pressable
                style={[s.confirmBtn, addMutation.isPending && s.extractBtnDisabled]}
                onPress={handleConfirmUrl}
                disabled={addMutation.isPending}
              >
                {addMutation.isPending
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={s.confirmBtnText}>Add to Vault →</Text>}
              </Pressable>

              {!urlMatchedCardId && (
                <Text style={s.noMatchNote}>
                  Card not matched in database — will attempt to add by name.
                </Text>
              )}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.screen, paddingVertical: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backBtn: { fontFamily: fontSans.medium, fontSize: 15, color: colors.muted },
  headerTitle: { fontFamily: fontSerif.bold, fontSize: 18, color: colors.text },
  saveBtn: {
    backgroundColor: colors.accent, borderRadius: radius.full,
    paddingHorizontal: spacing.md, paddingVertical: 7, minWidth: 60, alignItems: 'center',
  },
  saveBtnDisabled: { backgroundColor: colors.border },
  saveBtnText: { fontFamily: fontSans.bold, fontSize: 14, color: '#fff' },
  modeRow: {
    flexDirection: 'row', gap: 8,
    paddingHorizontal: spacing.screen, paddingVertical: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  modeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 9, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
  },
  modeBtnActive: { borderColor: colors.accent, backgroundColor: colors.accentBg },
  modeBtnText: { fontFamily: fontSans.medium, fontSize: 13, color: colors.muted },
  modeBtnTextActive: { color: colors.accent },
  proTag: { fontFamily: fontSans.medium, fontSize: 9, color: colors.gold },
  selectedPreview: {
    backgroundColor: colors.accentBg, borderBottomWidth: 1,
    borderBottomColor: colors.accent + '33',
    paddingHorizontal: spacing.screen, paddingVertical: spacing.sm,
  },
  selectedName: { fontFamily: fontSans.semiBold, fontSize: 14, color: colors.accent },
  selectedIssuer: { fontFamily: fontSans.regular, fontSize: 12, color: colors.muted },
  inputWrap: { paddingHorizontal: spacing.screen, paddingTop: spacing.sm, paddingBottom: 4 },
  input: {
    backgroundColor: colors.surface, borderRadius: radius.sm,
    borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: spacing.md, paddingVertical: 10,
    fontFamily: fontSans.regular, fontSize: 15, color: colors.text,
    marginBottom: 4,
  },
  listContent: { paddingHorizontal: spacing.screen, paddingBottom: spacing.xl, paddingTop: spacing.sm },
  cardRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: radius.sm,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.sm, marginBottom: 8,
  },
  cardRowSelected: { borderColor: colors.accent, backgroundColor: colors.accentBg },
  cardInfo: { flex: 1 },
  cardName: { fontFamily: fontSans.medium, fontSize: 14, color: colors.text },
  cardIssuer: { fontFamily: fontSans.regular, fontSize: 12, color: colors.muted, marginTop: 2 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xl },
  emptyText: { fontFamily: fontSans.regular, fontSize: 14, color: colors.muted },
  // URL mode
  urlContent: { padding: spacing.screen, paddingBottom: spacing.xl },
  urlNote: {
    fontFamily: fontSans.regular, fontSize: 13, color: colors.muted,
    lineHeight: 19, marginBottom: spacing.lg,
  },
  label: {
    fontFamily: fontSans.medium, fontSize: 10, color: colors.muted,
    letterSpacing: 1.2, marginBottom: 6,
  },
  extractBtn: {
    backgroundColor: colors.accent, borderRadius: radius.md,
    paddingVertical: 14, alignItems: 'center',
  },
  extractBtnDisabled: { backgroundColor: colors.border },
  extractBtnText: { fontFamily: fontSans.semiBold, fontSize: 14, color: '#fff', letterSpacing: 0.3 },
  extractingNote: {
    fontFamily: fontSans.regular, fontSize: 12, color: colors.muted,
    textAlign: 'center', marginTop: spacing.sm,
  },
  benefitPreview: {
    marginTop: spacing.lg, backgroundColor: colors.surface,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md,
  },
  benefitPreviewTitle: {
    fontFamily: fontSans.semiBold, fontSize: 13, color: colors.text, marginBottom: spacing.sm,
  },
  benefitRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  benefitTitle: { fontFamily: fontSans.medium, fontSize: 13, color: colors.text, flex: 1 },
  benefitMeta: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  benefitValue: { fontFamily: fontSans.semiBold, fontSize: 13, color: colors.gold },
  benefitFreq: { fontFamily: fontSans.regular, fontSize: 11, color: colors.muted },
  benefitMore: {
    fontFamily: fontSans.regular, fontSize: 12, color: colors.muted,
    paddingVertical: 8, textAlign: 'center',
  },
  confirmBtn: {
    backgroundColor: colors.accent, borderRadius: radius.md,
    paddingVertical: 13, alignItems: 'center', marginTop: spacing.md,
  },
  confirmBtnText: { fontFamily: fontSans.semiBold, fontSize: 14, color: '#fff' },
  noMatchNote: {
    fontFamily: fontSans.regular, fontSize: 11, color: colors.warn,
    textAlign: 'center', marginTop: spacing.sm,
  },
});
