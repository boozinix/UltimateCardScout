import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Pressable, Switch, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { colors, spacing, radius, fontSerif, fontSans, getCategoryColors } from '@/lib/theme';

type Benefit = {
  id: string;
  title: string;
  description: string | null;
  value: number | null;
  frequency: string;
  category: string | null;
  reminder_default_days: number | null;
};

type Pref = {
  benefit_id: string;
  enabled: boolean;
  reminder_days_before: number | null;
};

function frequencyLabel(f: string): string {
  const map: Record<string, string> = {
    monthly: 'Monthly',
    quarterly: 'Quarterly',
    'semi-annual': 'Semi-Annual',
    annual: 'Annual',
    'multi-year': 'Multi-Year',
  };
  return map[f] ?? f;
}

function reminderOptions(frequency: string): number[] {
  switch (frequency) {
    case 'monthly':     return [1, 3, 5, 7, 14];
    case 'quarterly':   return [3, 7, 14, 21, 30];
    case 'semi-annual': return [7, 14, 30, 45, 60];
    case 'annual':      return [7, 14, 30, 60, 90];
    case 'multi-year':  return [14, 30, 60, 90, 180];
    default:            return [7, 14, 30];
  }
}

const FREQ_ORDER = ['monthly', 'quarterly', 'semi-annual', 'annual', 'multi-year'];

export default function CardBenefitsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { userCardId } = useLocalSearchParams<{ userCardId: string }>();

  const [cardName, setCardName] = useState('');
  const [benefits, setBenefits] = useState<Benefit[]>([]);
  const [prefs, setPrefs] = useState<Record<string, Pref>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user ?? null;
    if (!user) { setLoading(false); return; }

    const cardRes = await supabase.from('user_cards').select('card_id, cards(name)').eq('id', userCardId).single();
    const cardId = (cardRes.data as any)?.card_id ?? '';
    setCardName((cardRes.data as any)?.cards?.name ?? '');

    const [benefitsRes, prefsRes] = await Promise.all([
      supabase.from('benefits')
        .select('id, title, description, value, frequency, category, reminder_default_days')
        .eq('card_id', cardId)
        .eq('is_active', true)
        .order('sort_order', { ascending: true }),
      supabase.from('user_benefit_prefs')
        .select('benefit_id, enabled, reminder_days_before')
        .eq('user_card_id', userCardId)
        .eq('user_id', user.id),
    ]);

    setBenefits((benefitsRes.data ?? []) as Benefit[]);
    const prefMap: Record<string, Pref> = {};
    for (const p of (prefsRes.data ?? [])) prefMap[p.benefit_id] = p as Pref;
    setPrefs(prefMap);
    setLoading(false);
  }, [userCardId]);

  useEffect(() => { load(); }, [load]);

  const toggleEnabled = async (b: Benefit) => {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user ?? null;
    if (!user) return;

    const current = prefs[b.id];
    const newEnabled = !(current?.enabled ?? true);
    setSaving(b.id);

    await supabase.from('user_benefit_prefs').upsert({
      user_id: user.id,
      user_card_id: userCardId,
      benefit_id: b.id,
      enabled: newEnabled,
      reminder_days_before: current?.reminder_days_before ?? null,
    }, { onConflict: 'user_card_id,benefit_id' });

    setPrefs(prev => ({
      ...prev,
      [b.id]: { ...prev[b.id], benefit_id: b.id, enabled: newEnabled, reminder_days_before: prev[b.id]?.reminder_days_before ?? null },
    }));
    setSaving(null);
  };

  const setReminderDays = async (b: Benefit, days: number) => {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user ?? null;
    if (!user) return;

    const current = prefs[b.id];
    setSaving(b.id);

    await supabase.from('user_benefit_prefs').upsert({
      user_id: user.id,
      user_card_id: userCardId,
      benefit_id: b.id,
      enabled: current?.enabled ?? true,
      reminder_days_before: days,
    }, { onConflict: 'user_card_id,benefit_id' });

    setPrefs(prev => ({
      ...prev,
      [b.id]: { ...prev[b.id], benefit_id: b.id, enabled: prev[b.id]?.enabled ?? true, reminder_days_before: days },
    }));
    setSaving(null);
  };

  const grouped: Record<string, Benefit[]> = {};
  for (const b of benefits) {
    if (!grouped[b.frequency]) grouped[b.frequency] = [];
    grouped[b.frequency].push(b);
  }

  if (loading) {
    return (
      <View style={[s.container, s.center, { paddingTop: insets.top }]}>
        <ActivityIndicator color={colors.gold} />
      </View>
    );
  }

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <ArrowLeft size={20} color={colors.muted} strokeWidth={1.75} />
        </Pressable>
        <View>
          <Text style={s.eyebrow}>BENEFIT ALERTS</Text>
          <Text style={s.headerTitle} numberOfLines={1}>{cardName}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <Text style={s.intro}>
          Toggle alerts for individual benefits and set how many days before expiry you'd like to be reminded.
        </Text>

        {FREQ_ORDER.filter(f => grouped[f]).map(freq => (
          <View key={freq} style={s.freqGroup}>
            <Text style={s.freqLabel}>{frequencyLabel(freq).toUpperCase()}</Text>

            {grouped[freq].map(b => {
              const pref = prefs[b.id];
              const enabled = pref?.enabled ?? true;
              const days = pref?.reminder_days_before ?? b.reminder_default_days ?? 7;
              const isExpanded = expanded === b.id;
              const cat = getCategoryColors(b.category);

              return (
                <View key={b.id} style={[s.benefitCard, !enabled && s.benefitCardDisabled]}>
                  <View style={s.benefitTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.benefitTitle, !enabled && s.disabledText]}>{b.title}</Text>
                      <View style={s.metaRow}>
                        {b.category && (
                          <View style={[s.catPill, { backgroundColor: cat.bg }]}>
                            <Text style={[s.catPillText, { color: cat.color }]}>{b.category}</Text>
                          </View>
                        )}
                        {b.value != null && (
                          <Text style={s.valueText}>${b.value}</Text>
                        )}
                      </View>
                    </View>
                    <Switch
                      value={enabled}
                      onValueChange={() => toggleEnabled(b)}
                      disabled={saving === b.id}
                      trackColor={{ false: colors.border, true: '#D97706' }}
                      thumbColor={enabled ? colors.gold : colors.muted}
                    />
                  </View>

                  {enabled && (
                    <>
                      <Pressable
                        style={s.reminderRow}
                        onPress={() => setExpanded(isExpanded ? null : b.id)}
                      >
                        <Text style={s.reminderLabel}>Remind</Text>
                        <Text style={s.reminderValue}>{days} days before</Text>
                        {isExpanded
                          ? <ChevronUp size={14} color={colors.muted} strokeWidth={1.75} />
                          : <ChevronDown size={14} color={colors.muted} strokeWidth={1.75} />}
                      </Pressable>

                      {isExpanded && (
                        <View style={s.daysGrid}>
                          {reminderOptions(b.frequency).map(opt => (
                            <Pressable
                              key={opt}
                              style={[s.dayChip, opt === days && s.dayChipActive]}
                              onPress={() => { setReminderDays(b, opt); setExpanded(null); }}
                            >
                              <Text style={[s.dayChipText, opt === days && s.dayChipTextActive]}>{opt}d</Text>
                            </Pressable>
                          ))}
                        </View>
                      )}
                    </>
                  )}
                </View>
              );
            })}
          </View>
        ))}

        <View style={{ height: 48 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.screen, paddingVertical: 16, gap: 12,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backBtn: { padding: 4 },
  eyebrow: { fontFamily: fontSans.medium, fontSize: 10, color: colors.muted, letterSpacing: 0.8 },
  headerTitle: { fontFamily: fontSerif.semiBold, fontSize: 18, color: colors.text },
  scroll: { paddingHorizontal: spacing.screen, paddingTop: 16, paddingBottom: 40 },
  intro: { fontFamily: fontSans.regular, fontSize: 13, color: colors.muted, lineHeight: 19, marginBottom: 24 },
  freqGroup: { marginBottom: 28 },
  freqLabel: { fontFamily: fontSans.medium, fontSize: 10, color: colors.muted, letterSpacing: 0.8, marginBottom: 10 },
  benefitCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, marginBottom: 8, overflow: 'hidden',
  },
  benefitCardDisabled: { opacity: 0.55 },
  benefitTop: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  benefitTitle: { fontFamily: fontSerif.semiBold, fontSize: 14, color: colors.text, marginBottom: 6 },
  disabledText: { color: colors.muted },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  catPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.full },
  catPillText: { fontFamily: fontSans.medium, fontSize: 10 },
  valueText: { fontFamily: fontSerif.bold, fontSize: 13, color: colors.gold },
  reminderRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 11,
    borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.bg,
  },
  reminderLabel: { fontFamily: fontSans.regular, fontSize: 12, color: colors.muted, flex: 1 },
  reminderValue: { fontFamily: fontSans.medium, fontSize: 12, color: colors.text },
  daysGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
    paddingHorizontal: 16, paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.bg,
  },
  dayChip: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: radius.full, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
  },
  dayChipActive: { backgroundColor: colors.text, borderColor: colors.text },
  dayChipText: { fontFamily: fontSans.medium, fontSize: 12, color: colors.muted },
  dayChipTextActive: { color: '#fff' },
});
