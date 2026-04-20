import React, { useState, useMemo, useCallback } from 'react';
import {
  View, ScrollView, Pressable, StyleSheet, Platform,
  TextInput, Alert, Linking, Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as AppleAuthentication from 'expo-apple-authentication';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import * as Notifications from 'expo-notifications';
import * as Haptics from 'expo-haptics';
import { Search, Check, Bell, Sparkles } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/contexts/ThemeContext';
import { spacing, radius, fontSerif, fontSans } from '@/lib/theme';
import { Text } from '@/components/primitives/Text';
import { Button } from '@/components/primitives/Button';
import { Surface } from '@/components/primitives/Surface';
import { Input } from '@/components/primitives/Input';
import { useCards } from '@/hooks/useCards';
import WealthRing from '@/components/WealthRing';
import { capture, Events } from '@/lib/analytics';
import {
  createCheckoutSession,
  PRICING_MONTHLY_USD,
  PRICING_ANNUAL_USD,
} from '@/lib/subscription';
import { getGradient } from '@/lib/theme';
import type { Card } from '@/lib/cardTypes';

const ONBOARDING_KEY = 'hasSeenOnboarding';
const TOTAL_STEPS = 5;

GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '',
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '',
});

// ── Value estimation helpers ────────────────────────────────────────────────

function estimateAnnualValue(card: Card): {
  total: number;
  bonus: number;
  benefits: number;
  categories: Array<{ label: string; value: number; color: string }>;
} {
  const bonusVal = parseFloat(card.estimated_bonus_value_usd || '0');
  const fee = parseFloat(card.annual_fee || '0');

  // Estimate benefit value from card features
  let benefits = 0;
  const categories: Array<{ label: string; value: number; color: string }> = [];

  if (card.lounge === 'Yes' || card.lounge === 'Priority Pass') {
    benefits += 300;
    categories.push({ label: 'Lounge Access', value: 300, color: '#1D4ED8' });
  }
  if (card.ge_tsa_precheck === 'Yes' || card.ge_tsa_precheck?.includes('Global Entry')) {
    benefits += 100;
    categories.push({ label: 'Travel Credits', value: 100, color: '#166534' });
  }
  if (bonusVal > 0) {
    categories.push({ label: 'Signup Bonus', value: bonusVal, color: '#92400E' });
  }

  // Estimate cashback value (assume $2,000/mo spend)
  const effectiveRate = parseFloat(card.cashback_rate_effective || '0');
  if (effectiveRate > 0) {
    const cashbackAnnual = Math.round(24000 * (effectiveRate / 100));
    if (cashbackAnnual > 0) {
      benefits += cashbackAnnual;
      categories.push({ label: 'Rewards Earning', value: cashbackAnnual, color: '#B45309' });
    }
  }

  // If no specific categories, add a generic one
  if (categories.length === 0 && fee > 0) {
    categories.push({ label: 'Card Benefits', value: Math.max(fee, 100), color: '#6D28D9' });
    benefits = Math.max(fee, 100);
  }

  return {
    total: bonusVal + benefits,
    bonus: bonusVal,
    benefits,
    categories,
  };
}

// ============================================================
// Step Components
// ============================================================

// ── Step 1: Card Selection ──────────────────────────────────────────────────

function StepCardSelection({
  cards,
  selectedIds,
  onToggle,
  search,
  onSearchChange,
  colors,
}: {
  cards: Card[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  search: string;
  onSearchChange: (s: string) => void;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  const filtered = useMemo(() => {
    if (!search.trim()) return cards.slice(0, 20);
    const q = search.toLowerCase();
    return cards.filter(
      (c) =>
        c.card_name.toLowerCase().includes(q) ||
        c.issuer.toLowerCase().includes(q),
    ).slice(0, 30);
  }, [cards, search]);

  return (
    <View style={{ flex: 1 }}>
      <Text variant="heading1" style={{ fontFamily: fontSerif.boldItalic, fontSize: 30, letterSpacing: -0.5, marginBottom: 6 }}>
        What cards do you have?
      </Text>
      <Text variant="bodySmall" color="muted" style={{ lineHeight: 21, marginBottom: spacing.lg }}>
        Select your current cards so we can show you what you're sitting on.
      </Text>

      {/* Search */}
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: colors.surface, borderRadius: radius.sm,
        borderWidth: 1, borderColor: colors.border,
        paddingHorizontal: 12, marginBottom: spacing.md, height: 44,
      }}>
        <Search size={16} color={colors.muted} />
        <TextInput
          style={{
            flex: 1, marginLeft: 8, fontSize: 15,
            fontFamily: fontSans.regular, color: colors.text,
          }}
          value={search}
          onChangeText={onSearchChange}
          placeholder="Search cards..."
          placeholderTextColor={colors.muted}
        />
      </View>

      {/* Card grid */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingBottom: 20 }}
      >
        {filtered.map((card) => {
          const id = card.id ?? card.card_name;
          const isSelected = selectedIds.has(id);
          const gradientColors = getGradient(card.gradient_key ?? 'default');

          return (
            <Pressable
              key={id}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onToggle(id);
              }}
              style={[
                {
                  flexDirection: 'row', alignItems: 'center',
                  backgroundColor: isSelected ? colors.accentBg : colors.surface,
                  borderRadius: radius.md, borderWidth: 1.5,
                  borderColor: isSelected ? colors.accent : colors.border,
                  padding: 12, gap: 12,
                },
              ]}
            >
              {/* Mini card art */}
              <View style={{
                width: 48, height: 30, borderRadius: 4,
                backgroundColor: gradientColors[0] as string,
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Text variant="caption" style={{ color: '#fff', fontSize: 8, fontFamily: fontSans.bold }}>
                  {card.issuer?.slice(0, 4).toUpperCase()}
                </Text>
              </View>

              <View style={{ flex: 1 }}>
                <Text variant="body" style={{ fontFamily: fontSans.medium, fontSize: 14 }} numberOfLines={1}>
                  {card.card_name}
                </Text>
                <Text variant="caption" color="muted" style={{ fontSize: 11 }}>
                  {card.issuer} · ${card.annual_fee ?? '0'}/yr
                </Text>
              </View>

              {/* Check circle */}
              <View style={{
                width: 24, height: 24, borderRadius: 12,
                borderWidth: isSelected ? 0 : 1.5,
                borderColor: colors.border,
                backgroundColor: isSelected ? colors.accent : 'transparent',
                alignItems: 'center', justifyContent: 'center',
              }}>
                {isSelected && <Check size={14} color="#fff" strokeWidth={3} />}
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

// ── Step 2: Value Reveal ────────────────────────────────────────────────────

function StepValueReveal({
  cards,
  selectedIds,
  colors,
}: {
  cards: Card[];
  selectedIds: Set<string>;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  const selectedCards = useMemo(
    () => cards.filter((c) => selectedIds.has(c.id ?? c.card_name)),
    [cards, selectedIds],
  );

  const { totalValue, segments, perCard } = useMemo(() => {
    let total = 0;
    const allCategories: Array<{ label: string; value: number; color: string }> = [];
    const perCard: Array<{ name: string; value: number }> = [];

    for (const card of selectedCards) {
      const v = estimateAnnualValue(card);
      total += v.total;
      perCard.push({ name: card.card_name, value: v.total });
      allCategories.push(...v.categories);
    }

    // Merge categories by label
    const merged = new Map<string, { label: string; value: number; color: string }>();
    for (const cat of allCategories) {
      const existing = merged.get(cat.label);
      if (existing) {
        existing.value += cat.value;
      } else {
        merged.set(cat.label, { ...cat });
      }
    }

    return {
      totalValue: Math.round(total),
      segments: [...merged.values()].sort((a, b) => b.value - a.value).slice(0, 5),
      perCard: perCard.sort((a, b) => b.value - a.value),
    };
  }, [selectedCards]);

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
      <Text variant="heading1" style={{ fontFamily: fontSerif.boldItalic, fontSize: 30, letterSpacing: -0.5, marginBottom: 6 }}>
        Here's what you're sitting on.
      </Text>
      <Text variant="bodySmall" color="muted" style={{ lineHeight: 21, marginBottom: spacing.xl }}>
        Based on your {selectedCards.length} card{selectedCards.length !== 1 ? 's' : ''}, we estimate this annual value.
      </Text>

      {/* WealthRing */}
      <View style={{ alignItems: 'center', marginBottom: spacing.xl }}>
        <WealthRing
          total={totalValue}
          segments={segments}
          size={180}
        />
      </View>

      {/* Big number callout */}
      <Surface variant="card" border padding="lg" radius="lg" style={{ alignItems: 'center', marginBottom: spacing.lg }}>
        <Text variant="mono" style={{ fontSize: 36, color: colors.gold, fontFamily: fontSerif.bold }}>
          ${totalValue.toLocaleString()}
        </Text>
        <Text variant="bodySmall" color="muted" style={{ marginTop: 4 }}>
          estimated annual value available
        </Text>
      </Surface>

      {/* Per-card breakdown */}
      {perCard.length > 0 && (
        <View style={{ gap: 8, marginBottom: spacing.lg }}>
          <Text variant="label" color="muted" style={{ fontSize: 10, letterSpacing: 1.5 }}>
            PER CARD
          </Text>
          {perCard.map((c, i) => (
            <View key={i} style={{
              flexDirection: 'row', justifyContent: 'space-between',
              paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth,
              borderBottomColor: colors.border,
            }}>
              <Text variant="bodySmall" numberOfLines={1} style={{ flex: 1 }}>{c.name}</Text>
              <Text variant="mono" style={{ fontSize: 14, color: colors.gold }}>
                ${c.value.toLocaleString()}
              </Text>
            </View>
          ))}
        </View>
      )}

      <Text variant="caption" color="muted" style={{ textAlign: 'center', lineHeight: 18 }}>
        Estimates based on typical usage patterns.{'\n'}
        Actual value depends on your spending habits.
      </Text>
    </ScrollView>
  );
}

// ── Step 3: Auth ────────────────────────────────────────────────────────────

function StepAuth({
  onComplete,
  onSkip,
  colors,
}: {
  onComplete: () => void;
  onSkip: () => void;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleApple = async () => {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!credential.identityToken) return;
      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'apple', token: credential.identityToken,
      });
      if (error) throw error;
      capture(Events.SIGNUP, { auth_method: 'apple', source: 'onboarding' });
      onComplete();
    } catch (err: unknown) {
      if ((err as any)?.code === 'ERR_REQUEST_CANCELED') return;
      Alert.alert('Apple Sign In failed', (err as Error).message ?? 'Please try again.');
    }
  };

  const handleGoogle = async () => {
    try {
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();
      const idToken = response.data?.idToken;
      if (!idToken) return;
      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'google', token: idToken,
      });
      if (error) throw error;
      capture(Events.SIGNUP, { auth_method: 'google', source: 'onboarding' });
      onComplete();
    } catch (err: unknown) {
      if ((err as any)?.code === 'SIGN_IN_CANCELLED') return;
      Alert.alert('Google Sign In failed', (err as Error).message ?? 'Please try again.');
    }
  };

  const handleMagicLink = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes('@')) {
      Alert.alert('Check your email', 'Please enter a valid email address.');
      return;
    }
    setLoading(true);
    try {
      const redirectTo = Platform.OS === 'web'
        ? process.env.EXPO_PUBLIC_APP_URL ?? 'http://localhost:8081'
        : (await import('expo-linking')).createURL('/');
      const { error } = await supabase.auth.signInWithOtp({
        email: trimmed, options: { emailRedirectTo: redirectTo },
      });
      if (error) throw error;
      capture(Events.SIGNUP, { auth_method: 'magic_link', source: 'onboarding' });
      Alert.alert('Check your email', `We sent a sign-in link to ${trimmed}.`);
    } catch (err: unknown) {
      Alert.alert('Something went wrong', (err as Error).message ?? 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const showApple = Platform.OS === 'ios';

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
      <Text variant="heading1" style={{ fontFamily: fontSerif.boldItalic, fontSize: 30, letterSpacing: -0.5, marginBottom: 6 }}>
        Save your progress
      </Text>
      <Text variant="bodySmall" color="muted" style={{ lineHeight: 21, marginBottom: spacing.xl }}>
        Create an account to track your cards and never miss a benefit.
      </Text>

      {/* Social buttons */}
      <View style={{ gap: 12, marginBottom: spacing.lg }}>
        {showApple && (
          <Pressable
            onPress={handleApple}
            style={({ pressed }) => [{
              height: 52, backgroundColor: '#000', borderRadius: radius.sm,
              alignItems: 'center', justifyContent: 'center',
            }, pressed && { opacity: 0.85 }]}
          >
            <Text variant="label" style={{ color: '#fff', fontSize: 12, letterSpacing: 1.5 }}>
              CONTINUE WITH APPLE
            </Text>
          </Pressable>
        )}
        <Pressable
          onPress={handleGoogle}
          style={({ pressed }) => [{
            height: 52, backgroundColor: colors.surface, borderRadius: radius.sm,
            borderWidth: 1, borderColor: colors.border,
            alignItems: 'center', justifyContent: 'center',
          }, pressed && { opacity: 0.85 }]}
        >
          <Text variant="label" style={{ color: colors.text, fontSize: 12, letterSpacing: 1.5 }}>
            CONTINUE WITH GOOGLE
          </Text>
        </Pressable>
      </View>

      {/* Divider */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: spacing.lg }}>
        <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
        <Text variant="caption" color="muted">or sign in with email</Text>
        <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
      </View>

      {/* Email */}
      <Input
        label="YOUR EMAIL"
        variant="email"
        value={email}
        onChangeText={setEmail}
        placeholder="name@email.com"
      />
      <Button
        label={loading ? 'SENDING...' : 'SEND MAGIC LINK'}
        variant="primary"
        onPress={handleMagicLink}
        disabled={loading}
        loading={loading}
        fullWidth
        style={{ marginTop: spacing.md }}
      />

      {/* Skip */}
      <Pressable onPress={onSkip} style={{ alignItems: 'center', paddingVertical: spacing.lg }}>
        <Text variant="bodySmall" style={{ color: colors.accent }}>
          Continue without an account
        </Text>
      </Pressable>

      <Text variant="caption" color="muted" style={{ textAlign: 'center', lineHeight: 16 }}>
        By continuing, you agree to our Terms of Service and Privacy Policy.
      </Text>
    </ScrollView>
  );
}

// ── Step 4: Notifications ───────────────────────────────────────────────────

function StepNotifications({
  onComplete,
  onSkip,
  colors,
}: {
  onComplete: () => void;
  onSkip: () => void;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  const [requesting, setRequesting] = useState(false);

  const handleEnable = async () => {
    setRequesting(true);
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status === 'granted') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch {
      // Permission denied or unavailable
    }
    setRequesting(false);
    onComplete();
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.lg }}>
      <View style={{
        width: 80, height: 80, borderRadius: 40,
        backgroundColor: colors.accentBg,
        alignItems: 'center', justifyContent: 'center',
        marginBottom: spacing.xl,
      }}>
        <Bell size={36} color={colors.accent} strokeWidth={1.5} />
      </View>

      <Text variant="heading1" style={{ fontFamily: fontSerif.boldItalic, fontSize: 28, textAlign: 'center', marginBottom: 8 }}>
        Never miss a deadline
      </Text>
      <Text variant="bodySmall" color="muted" style={{ textAlign: 'center', lineHeight: 21, marginBottom: spacing.xl, maxWidth: 300 }}>
        We'll remind you before benefits expire, fees post, and bonus deadlines arrive.
      </Text>

      <Button
        label="Enable Notifications"
        variant="primary"
        onPress={handleEnable}
        loading={requesting}
        fullWidth
        style={{ marginBottom: spacing.md }}
      />
      <Pressable onPress={onSkip} style={{ paddingVertical: 12 }}>
        <Text variant="bodySmall" color="muted">Not now</Text>
      </Pressable>
    </View>
  );
}

// ── Step 5: Pro Upsell ──────────────────────────────────────────────────────

function StepProUpsell({
  estimatedValue,
  onComplete,
  onSkip,
  colors,
}: {
  estimatedValue: number;
  onComplete: () => void;
  onSkip: () => void;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  const annualMonthly = (PRICING_ANNUAL_USD / 12).toFixed(2);
  const savingsPct = Math.round((1 - PRICING_ANNUAL_USD / (PRICING_MONTHLY_USD * 12)) * 100);

  const handleUpgrade = async (plan: 'monthly' | 'annual') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const url = await createCheckoutSession(plan);
    if (url) await Linking.openURL(url);
    onComplete();
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
      <View style={{ alignItems: 'center', marginBottom: spacing.lg }}>
        <View style={{
          width: 56, height: 56, borderRadius: 28,
          backgroundColor: colors.goldBg,
          alignItems: 'center', justifyContent: 'center',
          marginBottom: spacing.md,
        }}>
          <Sparkles size={28} color={colors.gold} strokeWidth={1.5} />
        </View>

        <Text variant="heading1" style={{ fontFamily: fontSerif.boldItalic, fontSize: 28, textAlign: 'center', marginBottom: 6 }}>
          Track ${estimatedValue.toLocaleString()} in value
        </Text>
        <Text variant="bodySmall" color="muted" style={{ textAlign: 'center', lineHeight: 21, maxWidth: 320 }}>
          You have cards worth tracking. Start your 14-day free trial to unlock the full intelligence suite.
        </Text>
      </View>

      {/* Feature list */}
      <Surface variant="card" border padding="lg" radius="lg" style={{ marginBottom: spacing.lg }}>
        {[
          'Velocity Dashboard — 5/24 and all issuer rules',
          'Annual Fee Advisor + retention scripts',
          'Spend Optimizer — best card for every purchase',
          'Deal Passport — transfer bonuses & elevated offers',
          'Points Portfolio with live valuations',
          'Bonus spend deadline tracking + alerts',
        ].map((f) => (
          <View key={f} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
            <Check size={16} color={colors.gold} strokeWidth={2.5} style={{ marginTop: 2 }} />
            <Text variant="bodySmall" style={{ flex: 1, lineHeight: 20 }}>{f}</Text>
          </View>
        ))}
      </Surface>

      {/* Annual CTA */}
      <Pressable
        onPress={() => handleUpgrade('annual')}
        style={({ pressed }) => [{
          backgroundColor: colors.accent, borderRadius: radius.md,
          padding: spacing.md, flexDirection: 'row',
          alignItems: 'center', justifyContent: 'space-between',
          marginBottom: spacing.sm,
        }, pressed && { opacity: 0.9 }]}
      >
        <View>
          <Text variant="body" style={{ color: '#fff', fontFamily: fontSans.bold, fontSize: 17 }}>
            ${PRICING_ANNUAL_USD.toFixed(0)} / year
          </Text>
          <Text variant="caption" style={{ color: 'rgba(255,255,255,0.8)', marginTop: 2 }}>
            ~ ${annualMonthly}/mo · Best value
          </Text>
        </View>
        <View style={{
          backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: radius.sm,
          paddingHorizontal: spacing.sm, paddingVertical: 4,
        }}>
          <Text variant="caption" style={{ color: '#fff', fontFamily: fontSans.bold }}>
            Save {savingsPct}%
          </Text>
        </View>
      </Pressable>

      {/* Monthly */}
      <Pressable
        onPress={() => handleUpgrade('monthly')}
        style={({ pressed }) => [{
          borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md,
          padding: spacing.md, alignItems: 'center', marginBottom: spacing.md,
        }, pressed && { opacity: 0.85 }]}
      >
        <Text variant="body" style={{ fontFamily: fontSans.semiBold }}>
          ${PRICING_MONTHLY_USD.toFixed(2)} / month
        </Text>
      </Pressable>

      <Text variant="caption" color="muted" style={{ textAlign: 'center', marginBottom: spacing.md }}>
        14-day free trial · Cancel anytime
      </Text>

      <Pressable onPress={onSkip} style={{ alignItems: 'center', paddingVertical: 12 }}>
        <Text variant="bodySmall" color="muted">Continue free</Text>
      </Pressable>
    </ScrollView>
  );
}

// ============================================================
// Main Onboarding Screen
// ============================================================

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { data: allCards = [] } = useCards();

  const [step, setStep] = useState(0);
  const [selectedCardIds, setSelectedCardIds] = useState(new Set<string>());
  const [cardSearch, setCardSearch] = useState('');

  // Calculate total steps — skip Pro upsell if < 3 cards
  const showProUpsell = selectedCardIds.size >= 3;
  const totalSteps = showProUpsell ? TOTAL_STEPS : TOTAL_STEPS - 1;

  // Get top 20 cards (priority cards first)
  const topCards = useMemo(() => {
    const priorityIssuers = ['Chase', 'American Express', 'Citi', 'Capital One', 'Bank of America'];
    return [...allCards].sort((a, b) => {
      const aIdx = priorityIssuers.findIndex((p) => a.issuer?.includes(p));
      const bIdx = priorityIssuers.findIndex((p) => b.issuer?.includes(p));
      const aRank = aIdx >= 0 ? aIdx : 99;
      const bRank = bIdx >= 0 ? bIdx : 99;
      if (aRank !== bRank) return aRank - bRank;
      return parseFloat(b.estimated_bonus_value_usd || '0') - parseFloat(a.estimated_bonus_value_usd || '0');
    });
  }, [allCards]);

  // Estimated total value from selected cards
  const estimatedValue = useMemo(() => {
    let total = 0;
    for (const card of topCards) {
      const id = card.id ?? card.card_name;
      if (selectedCardIds.has(id)) {
        total += estimateAnnualValue(card).total;
      }
    }
    return Math.round(total);
  }, [topCards, selectedCardIds]);

  const toggleCard = useCallback((id: string) => {
    setSelectedCardIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const completeOnboarding = useCallback(async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    router.replace('/(tabs)/discover' as any);
  }, [router]);

  const goNext = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (step === 0 && selectedCardIds.size === 0) {
      // Skip value reveal if no cards selected
      setStep(2);
    } else if (step >= totalSteps - 1) {
      completeOnboarding();
    } else {
      setStep((s) => s + 1);
    }
  }, [step, selectedCardIds.size, totalSteps, completeOnboarding]);

  const skip = useCallback(async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    router.replace('/(tabs)/discover' as any);
  }, [router]);

  // Map step index to actual screen (skipping value reveal if no cards)
  const getScreenForStep = () => {
    if (step === 0) return 'cards';
    if (step === 1) return selectedCardIds.size > 0 ? 'value' : 'auth';
    if (step === 2) return 'auth';
    if (step === 3) return 'notifications';
    if (step === 4) return 'pro';
    return 'cards';
  };

  const screen = getScreenForStep();
  const s = makeStyles(colors);

  return (
    <View style={[s.container, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 }]}>
      {/* Top bar: dots + skip */}
      <View style={s.topBar}>
        <View style={s.dots}>
          {Array.from({ length: totalSteps }, (_, i) => (
            <View
              key={i}
              style={[s.dot, i === step && s.dotActive, i < step && s.dotComplete]}
            />
          ))}
        </View>
        <Pressable onPress={skip} hitSlop={12}>
          <Text variant="bodySmall" color="muted">Skip</Text>
        </Pressable>
      </View>

      {/* Screen content */}
      <View style={s.body}>
        {screen === 'cards' && (
          <StepCardSelection
            cards={topCards}
            selectedIds={selectedCardIds}
            onToggle={toggleCard}
            search={cardSearch}
            onSearchChange={setCardSearch}
            colors={colors}
          />
        )}
        {screen === 'value' && (
          <StepValueReveal
            cards={topCards}
            selectedIds={selectedCardIds}
            colors={colors}
          />
        )}
        {screen === 'auth' && (
          <StepAuth
            onComplete={goNext}
            onSkip={goNext}
            colors={colors}
          />
        )}
        {screen === 'notifications' && (
          <StepNotifications
            onComplete={goNext}
            onSkip={goNext}
            colors={colors}
          />
        )}
        {screen === 'pro' && (
          <StepProUpsell
            estimatedValue={estimatedValue}
            onComplete={completeOnboarding}
            onSkip={completeOnboarding}
            colors={colors}
          />
        )}
      </View>

      {/* Bottom CTA (cards + value steps only) */}
      {(screen === 'cards' || screen === 'value') && (
        <View style={s.bottomBar}>
          <Pressable
            onPress={goNext}
            style={({ pressed }) => [s.nextBtn, pressed && { opacity: 0.85 }]}
          >
            <Text variant="label" style={{ color: '#fff', fontSize: 14, letterSpacing: 0.5 }}>
              {screen === 'cards'
                ? selectedCardIds.size > 0
                  ? `Continue with ${selectedCardIds.size} card${selectedCardIds.size !== 1 ? 's' : ''}`
                  : 'I don\'t have any yet'
                : 'Continue'}
            </Text>
          </Pressable>

          {screen === 'cards' && (
            <Pressable onPress={() => router.push('/(auth)/login' as any)} style={{ paddingVertical: 10 }}>
              <Text variant="caption" color="muted">Already have an account? Sign in</Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

// ============================================================
// Styles
// ============================================================

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bg,
      paddingHorizontal: spacing.screen,
    },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.lg,
    },
    dots: { flexDirection: 'row', gap: 6 },
    dot: {
      width: 8, height: 8, borderRadius: 4,
      backgroundColor: colors.border,
    },
    dotActive: { backgroundColor: colors.gold, width: 24 },
    dotComplete: { backgroundColor: colors.accent },
    body: { flex: 1 },
    bottomBar: { alignItems: 'center', paddingTop: spacing.md },
    nextBtn: {
      width: '100%', height: 52,
      backgroundColor: colors.text,
      borderRadius: radius.sm,
      alignItems: 'center', justifyContent: 'center',
      marginBottom: 8,
    },
  });
}
