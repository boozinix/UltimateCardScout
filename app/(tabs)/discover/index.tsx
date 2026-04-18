import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, ScrollView,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Plane, DollarSign, Gift, Zap, Hotel, ShoppingCart, Fuel, Layers, Calculator, BookOpen, TrendingUp, ArrowRight } from 'lucide-react-native';
import { colors, spacing, radius, fontSerif, fontSans } from '@/lib/theme';
import { promptToAnswers } from '@/lib/nlp';
import { impactLight, impactMedium } from '@/utils/haptics';
import { capture, Events } from '@/lib/analytics';

const QUICK_PILLS = [
  { label: 'Travel', query: 'travel rewards card', Icon: Plane },
  { label: 'Cashback', query: 'best cashback card', Icon: DollarSign },
  { label: 'Big bonus', query: 'best signup bonus', Icon: Gift },
  { label: 'No fee', query: 'no annual fee card', Icon: Zap },
  { label: 'Hotels', query: 'hotel rewards card', Icon: Hotel },
  { label: 'Groceries', query: 'grocery cashback card', Icon: ShoppingCart },
  { label: 'Gas', query: 'gas cashback card', Icon: Fuel },
];

const TOOLS = [
  { label: 'Point Value Calculator', sub: 'UR, MR, TYP, AA and more', route: '/(tabs)/tools/value-calculator', Icon: Calculator },
  { label: 'Portfolio Expander', sub: 'Find cards that complement yours', route: '/(tabs)/tools/portfolio-expander', Icon: Layers },
  { label: 'Bonus Sequencer', sub: 'Plan your signup bonus timeline', route: '/(tabs)/tools/bonus-sequencer', Icon: TrendingUp },
  { label: 'Guides', sub: 'Strategy, transfers, and more', route: '/(tabs)/tools/guides/index', Icon: BookOpen },
];

export default function DiscoverScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef<TextInput>(null);

  const handleSearch = async () => {
    const q = query.trim();
    if (!q) return;
    await impactMedium();
    capture(Events.SEARCH_PERFORMED, { query: q });
    const result = promptToAnswers(q);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError('');
    const encoded = encodeURIComponent(JSON.stringify(result.answers));
    router.push(`/(tabs)/discover/results?answers=${encoded}`);
  };

  const handlePill = async (pillQuery: string) => {
    await impactLight();
    const result = promptToAnswers(pillQuery);
    if (result.ok) {
      const encoded = encodeURIComponent(JSON.stringify(result.answers));
      router.push(`/(tabs)/discover/results?answers=${encoded}`);
    }
  };

  const handleStartQuiz = async () => {
    await impactMedium();
    router.push('/(tabs)/discover/quiz');
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.bg}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.lg }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.eyebrow}>CARDSCOUT</Text>
        <Text style={styles.headline}>Find your{'\n'}perfect card.</Text>
        <Text style={styles.sub}>Describe what you want, or take the guided quiz.</Text>

        {/* Search bar */}
        <View style={styles.searchBox}>
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder="Travel card with lounge access, no fee cashback…"
            placeholderTextColor={colors.muted}
            value={query}
            onChangeText={(t) => { setQuery(t); setError(''); }}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            multiline={false}
          />
          <Pressable style={styles.searchBtn} onPress={handleSearch}>
            <ArrowRight size={18} color="#fff" strokeWidth={2} />
          </Pressable>
        </View>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {/* Quick pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.pillsScroll}
          contentContainerStyle={styles.pillsContent}
        >
          {QUICK_PILLS.map((pill) => (
            <Pressable
              key={pill.label}
              style={styles.pill}
              onPress={() => handlePill(pill.query)}
            >
              <pill.Icon size={12} color={colors.muted} strokeWidth={1.75} />
              <Text style={styles.pillText}>{pill.label}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Divider */}
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Quiz CTA */}
        <Pressable style={styles.quizBtn} onPress={handleStartQuiz}>
          <View style={styles.quizBtnLeft}>
            <Text style={styles.quizBtnTitle}>Take the guided quiz</Text>
            <Text style={styles.quizBtnSub}>3 questions · ranked results · 2 minutes</Text>
          </View>
          <ArrowRight size={16} color={colors.accent} strokeWidth={2} />
        </Pressable>

        {/* Browse all */}
        <Pressable style={styles.browseBtn} onPress={() => router.push('/(tabs)/tools/browser' as any)}>
          <Text style={styles.browseBtnText}>Browse all 110 cards</Text>
          <ArrowRight size={14} color={colors.muted} strokeWidth={1.75} />
        </Pressable>

        {/* Tools section */}
        <Text style={styles.sectionLabel}>TOOLS</Text>
        {TOOLS.map((tool) => (
          <Pressable key={tool.label} style={styles.toolRow} onPress={() => router.push(tool.route as any)}>
            <View style={styles.toolIcon}>
              <tool.Icon size={16} color={colors.accent} strokeWidth={1.75} />
            </View>
            <View style={styles.toolText}>
              <Text style={styles.toolLabel}>{tool.label}</Text>
              <Text style={styles.toolSub}>{tool.sub}</Text>
            </View>
            <ArrowRight size={14} color={colors.muted} strokeWidth={1.75} />
          </Pressable>
        ))}

        {/* Footer note */}
        <Text style={styles.footerNote}>
          110 cards compared · No ads · Honest rankings
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  bg: { flex: 1, backgroundColor: colors.bg },
  content: {
    paddingHorizontal: spacing.screen,
    paddingBottom: spacing.xl,
  },
  eyebrow: {
    fontFamily: fontSans.semiBold,
    fontSize: 10,
    color: colors.accent,
    letterSpacing: 1.5,
    marginBottom: spacing.xs,
  },
  headline: {
    fontFamily: fontSerif.boldItalic,
    fontSize: 38,
    color: colors.text,
    lineHeight: 46,
    marginBottom: spacing.sm,
  },
  sub: {
    fontFamily: fontSans.regular,
    fontSize: 15,
    color: colors.muted,
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  searchBox: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  input: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    fontFamily: fontSans.regular,
    fontSize: 15,
    color: colors.text,
  },
  searchBtn: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontFamily: fontSans.regular,
    fontSize: 13,
    color: colors.urgent,
    marginBottom: spacing.sm,
    marginTop: 2,
  },
  pillsScroll: { marginTop: spacing.sm, marginBottom: spacing.lg, flexGrow: 0 },
  pillsContent: { gap: 8 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  pillText: {
    fontFamily: fontSans.medium,
    fontSize: 13,
    color: colors.text,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { fontFamily: fontSans.regular, fontSize: 13, color: colors.muted },
  quizBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.accentBg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.accent + '33',
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  quizBtnLeft: { flex: 1 },
  quizBtnTitle: {
    fontFamily: fontSans.semiBold,
    fontSize: 15,
    color: colors.text,
    marginBottom: 3,
  },
  quizBtnSub: {
    fontFamily: fontSans.regular,
    fontSize: 13,
    color: colors.muted,
  },
  browseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 13,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xl,
  },
  browseBtnText: { fontFamily: fontSans.medium, fontSize: 14, color: colors.text },
  sectionLabel: {
    fontFamily: fontSans.medium,
    fontSize: 10,
    color: colors.muted,
    letterSpacing: 1.2,
    marginBottom: spacing.sm,
  },
  toolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: 8,
  },
  toolIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.accentBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolText: { flex: 1 },
  toolLabel: { fontFamily: fontSans.medium, fontSize: 14, color: colors.text },
  toolSub: { fontFamily: fontSans.regular, fontSize: 12, color: colors.muted, marginTop: 1 },
  footerNote: {
    fontFamily: fontSans.regular,
    fontSize: 12,
    color: colors.muted,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
});
