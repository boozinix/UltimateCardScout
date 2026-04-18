import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Calendar } from 'react-native-calendars';
import {
  format, startOfMonth, endOfMonth, addMonths, subMonths, parseISO, addDays, differenceInDays,
} from 'date-fns';
import { supabase } from '@/lib/supabase';
import { colors, spacing, radius, fontSerif, fontSans, getCategoryColors } from '@/lib/theme';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useFeatureGate } from '@/hooks/useSubscription';
import { PaywallModal } from '@/components/PaywallModal';

type Reminder = {
  id: string;
  remind_at: string;
  period_label: string | null;
  period_end: string;
  status: string;
  benefits: { title: string; value: number | null; frequency: string; category: string | null } | null;
  user_cards: { cards: { name: string } | null } | null;
};

type MarkedDates = Record<string, { dots: { key: string; color: string }[]; selected?: boolean; selectedColor?: string }>;

function dotColor(r: Reminder): string {
  if (r.status === 'used') return colors.success;
  if (r.status === 'snoozed') return colors.muted;
  const daysAway = differenceInDays(parseISO(r.remind_at), new Date());
  if (daysAway <= 0) return colors.urgent;
  if (daysAway <= 7) return colors.warn;
  return colors.gold;
}

function buildMarkedDates(reminders: Reminder[], selected: string | null): MarkedDates {
  const map: MarkedDates = {};
  for (const r of reminders) {
    const d = r.remind_at;
    if (!map[d]) map[d] = { dots: [] };
    if (map[d].dots.length < 3) map[d].dots.push({ key: r.id, color: dotColor(r) });
  }
  if (selected) {
    if (!map[selected]) map[selected] = { dots: [] };
    map[selected].selected = true;
    map[selected].selectedColor = colors.text;
  }
  return map;
}

export default function CalendarScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isDesktop } = useBreakpoint();
  const isWalletPro = useFeatureGate('reminders');

  const [loading, setLoading] = useState(true);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [acting, setActing] = useState<string | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);

  const load = useCallback(async (month: Date) => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user ?? null;
    if (!user) { setLoading(false); return; }

    const start = format(startOfMonth(subMonths(month, 1)), 'yyyy-MM-dd');
    const end = format(endOfMonth(addMonths(month, 1)), 'yyyy-MM-dd');

    const { data } = await supabase
      .from('reminders')
      .select(`id, remind_at, period_label, period_end, status,
        benefits(title, value, frequency, category),
        user_cards(cards(name))`)
      .eq('user_id', user.id)
      .gte('remind_at', start)
      .lte('remind_at', end)
      .order('remind_at', { ascending: true });

    setReminders((data ?? []) as unknown as Reminder[]);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(currentMonth); }, [load, currentMonth]));

  const onMonthChange = (monthData: { dateString: string }) => {
    const newMonth = parseISO(monthData.dateString);
    setCurrentMonth(newMonth);
    load(newMonth);
  };

  const onDayPress = (day: { dateString: string }) => {
    setSelectedDate(prev => prev === day.dateString ? null : day.dateString);
  };

  const markUsed = async (r: Reminder) => {
    setActing(r.id);
    await supabase.from('reminders').update({ status: 'used', amount_used: r.benefits?.value ?? 0 }).eq('id', r.id);
    setReminders(prev => prev.map(x => x.id === r.id ? { ...x, status: 'used' } : x));
    setActing(null);
  };

  const snoozeReminder = async (r: Reminder) => {
    setActing(r.id);
    const snoozeDate = format(addDays(new Date(), 7), 'yyyy-MM-dd');
    await supabase.from('reminders').update({ status: 'snoozed', snoozed_until: snoozeDate }).eq('id', r.id);
    setReminders(prev => prev.map(x => x.id === r.id ? { ...x, status: 'snoozed' } : x));
    setActing(null);
  };

  if (!isWalletPro) {
    return (
      <View style={[s.container, s.center, { paddingTop: insets.top }]}>
        <Text style={s.lockedTitle}>Benefits Calendar</Text>
        <Text style={s.lockedSub}>Upgrade to see your benefits laid out on a calendar.</Text>
        <Pressable style={s.upgradeBtn} onPress={() => setShowPaywall(true)}>
          <Text style={s.upgradeBtnLabel}>UPGRADE TO PRO</Text>
        </Pressable>
        <PaywallModal visible={showPaywall} onClose={() => setShowPaywall(false)} />
      </View>
    );
  }

  const markedDates = useMemo(() => buildMarkedDates(reminders, selectedDate), [reminders, selectedDate]);
  const selectedReminders = selectedDate ? reminders.filter(r => r.remind_at === selectedDate) : [];

  const upcomingReminders = useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const in7 = format(addDays(new Date(), 7), 'yyyy-MM-dd');
    return reminders.filter(r => r.remind_at > today && r.remind_at <= in7 && r.status === 'pending').slice(0, 5);
  }, [reminders]);

  const calTheme = {
    backgroundColor: 'transparent',
    calendarBackground: 'transparent',
    textSectionTitleColor: colors.muted,
    selectedDayBackgroundColor: colors.text,
    selectedDayTextColor: '#fff',
    todayTextColor: colors.gold,
    todayBackgroundColor: colors.goldBg,
    dayTextColor: colors.text,
    textDisabledColor: colors.border,
    arrowColor: colors.text,
    monthTextColor: colors.text,
    textDayFontFamily: fontSans.regular,
    textMonthFontFamily: fontSerif.bold,
    textDayHeaderFontFamily: fontSans.medium,
    textDayFontWeight: '400' as const,
    textMonthFontWeight: '700' as const,
    textDayHeaderFontWeight: '500' as const,
    textDayFontSize: 14,
    textMonthFontSize: isDesktop ? 20 : 22,
    textDayHeaderFontSize: 11,
  };

  return (
    <ScrollView
      style={[s.container, { paddingTop: insets.top }]}
      showsVerticalScrollIndicator={false}
      stickyHeaderIndices={[0]}
    >
      <View style={s.header}>
        <Text style={s.screenTitle}>Your Monthly</Text>
        <Text style={s.screenTitleItalic}>Cadence</Text>
      </View>

      {loading && reminders.length === 0 ? (
        <View style={s.center}><ActivityIndicator color={colors.gold} /></View>
      ) : (
        <Calendar
          current={format(currentMonth, 'yyyy-MM-dd')}
          markedDates={markedDates}
          markingType="multi-dot"
          onDayPress={onDayPress}
          onMonthChange={onMonthChange}
          theme={calTheme}
          style={s.calendar}
          enableSwipeMonths
        />
      )}

      <View style={s.legend}>
        <LegendDot color={colors.urgent} label="Due soon" />
        <LegendDot color={colors.warn} label="Upcoming" />
        <LegendDot color={colors.gold} label="Future" />
        <LegendDot color={colors.success} label="Used" />
      </View>

      {selectedDate && (
        <View style={s.dayPanel}>
          <View style={s.dayPanelHeader}>
            <Text style={s.dayPanelDate}>{format(parseISO(selectedDate), 'EEEE, MMMM d')}</Text>
            <Text style={s.dayPanelCount}>{selectedReminders.length} reminder{selectedReminders.length !== 1 ? 's' : ''}</Text>
          </View>

          {selectedReminders.length === 0 ? (
            <View style={s.emptyDay}><Text style={s.emptyDayText}>No reminders on this day</Text></View>
          ) : (
            selectedReminders.map(r => (
              <ReminderCard
                key={r.id}
                reminder={r}
                acting={acting === r.id}
                onMarkUsed={() => markUsed(r)}
                onSnooze={() => snoozeReminder(r)}
                onDetail={() => router.push(`/(tabs)/portfolio/benefit-detail/${r.id}` as any)}
              />
            ))
          )}
        </View>
      )}

      {upcomingReminders.length > 0 && (
        <View style={s.upcomingSection}>
          <Text style={s.upcomingLabel}>COMING UP (7 DAYS)</Text>
          {upcomingReminders.map(r => {
            const b = r.benefits;
            const daysAway = differenceInDays(parseISO(r.remind_at), new Date());
            return (
              <Pressable key={r.id} style={s.upcomingRow} onPress={() => router.push(`/(tabs)/portfolio/benefit-detail/${r.id}` as any)}>
                <Text style={s.upcomingTitle} numberOfLines={1}>{b?.title ?? '—'}</Text>
                <Text style={s.upcomingDays}>{daysAway === 0 ? 'Today' : `${daysAway}d`}</Text>
              </Pressable>
            );
          })}
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function ReminderCard({ reminder, acting, onMarkUsed, onSnooze, onDetail }: {
  reminder: Reminder; acting: boolean;
  onMarkUsed: () => void; onSnooze: () => void; onDetail: () => void;
}) {
  const isUsed = reminder.status === 'used';
  const isSnoozed = reminder.status === 'snoozed';
  const daysLeft = differenceInDays(parseISO(reminder.period_end), new Date());
  const accent = isUsed ? colors.success : isSnoozed ? colors.muted : daysLeft <= 7 ? colors.urgent : daysLeft <= 30 ? colors.warn : colors.border;
  const cat = getCategoryColors(reminder.benefits?.category ?? null);

  return (
    <Pressable onPress={onDetail} style={s.reminderCard}>
      <View style={[s.reminderAccent, { backgroundColor: accent }]} />
      <View style={s.reminderBody}>
        <View style={s.reminderTop}>
          <View style={{ flex: 1 }}>
            <Text style={s.reminderCardName}>{reminder.user_cards?.cards?.name ?? ''}</Text>
            <Text style={s.reminderTitle}>{reminder.benefits?.title ?? '—'}</Text>
            {reminder.period_label && <Text style={s.reminderPeriod}>{reminder.period_label}</Text>}
          </View>
          <View style={s.reminderRight}>
            {reminder.benefits?.value != null && <Text style={s.reminderValue}>${reminder.benefits.value}</Text>}
            {reminder.benefits?.category && (
              <View style={[s.catPill, { backgroundColor: cat.bg }]}>
                <Text style={[s.catPillText, { color: cat.color }]}>{reminder.benefits.category}</Text>
              </View>
            )}
          </View>
        </View>

        {!isUsed && !isSnoozed && (
          <View style={s.actions}>
            <Pressable onPress={e => { e.stopPropagation?.(); onMarkUsed(); }} disabled={acting} style={s.markUsedBtn}>
              <Text style={s.markUsedLabel}>{acting ? '…' : 'MARK AS USED'}</Text>
            </Pressable>
            <Pressable onPress={e => { e.stopPropagation?.(); onSnooze(); }} disabled={acting} style={s.snoozeBtn}>
              <Text style={s.snoozeBtnLabel}>{acting ? '…' : 'SNOOZE 7D'}</Text>
            </Pressable>
          </View>
        )}

        {(isUsed || isSnoozed) && (
          <View style={[s.statusBadge, { backgroundColor: isUsed ? colors.successBg : colors.warnBg }]}>
            <Text style={[s.statusBadgeText, { color: isUsed ? colors.success : colors.warn }]}>
              {isUsed ? 'USED' : 'SNOOZED'}
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={s.legendItem}>
      <View style={[s.legendDot, { backgroundColor: color }]} />
      <Text style={s.legendLabel}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { backgroundColor: colors.bg, paddingHorizontal: spacing.screen, paddingTop: 8, paddingBottom: 8 },
  screenTitle: { fontFamily: fontSerif.bold, fontSize: 28, color: colors.text, letterSpacing: -0.5 },
  screenTitleItalic: { fontFamily: fontSerif.italic, fontSize: 28, color: colors.text, letterSpacing: -0.5, marginBottom: 4 },
  calendar: { borderBottomWidth: 1, borderBottomColor: colors.border },
  legend: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 14,
    paddingHorizontal: spacing.screen, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 7, height: 7, borderRadius: 4 },
  legendLabel: { fontFamily: fontSans.regular, fontSize: 11, color: colors.muted },
  dayPanel: { paddingHorizontal: spacing.screen, paddingTop: 20 },
  dayPanelHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16 },
  dayPanelDate: { fontFamily: fontSerif.bold, fontSize: 20, color: colors.text, letterSpacing: -0.3 },
  dayPanelCount: { fontFamily: fontSans.regular, fontSize: 12, color: colors.muted },
  emptyDay: { paddingVertical: 24, alignItems: 'center' },
  emptyDayText: { fontFamily: fontSans.regular, fontSize: 14, color: colors.muted },
  upcomingSection: { paddingHorizontal: spacing.screen, paddingTop: 20 },
  upcomingLabel: { fontFamily: fontSans.medium, fontSize: 9, color: colors.muted, letterSpacing: 1.5, marginBottom: 12 },
  upcomingRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  upcomingTitle: { flex: 1, fontFamily: fontSans.regular, fontSize: 13, color: colors.text },
  upcomingDays: { fontFamily: fontSans.medium, fontSize: 11, color: colors.gold },
  reminderCard: {
    flexDirection: 'row', backgroundColor: colors.surface,
    borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, marginBottom: 10, overflow: 'hidden',
  },
  reminderAccent: { width: 3 },
  reminderBody: { flex: 1, padding: 14 },
  reminderTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  reminderCardName: { fontFamily: fontSans.medium, fontSize: 11, color: colors.muted, marginBottom: 3 },
  reminderTitle: { fontFamily: fontSerif.semiBold, fontSize: 15, color: colors.text, marginBottom: 2 },
  reminderPeriod: { fontFamily: fontSans.regular, fontSize: 12, color: colors.muted },
  reminderRight: { alignItems: 'flex-end', gap: 6, marginLeft: 8 },
  reminderValue: { fontFamily: fontSerif.bold, fontSize: 18, color: colors.gold },
  catPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  catPillText: { fontFamily: fontSans.medium, fontSize: 10 },
  actions: { flexDirection: 'row', gap: 8 },
  markUsedBtn: { backgroundColor: colors.text, paddingHorizontal: 16, paddingVertical: 9, borderRadius: radius.sm },
  markUsedLabel: { fontFamily: fontSans.medium, fontSize: 10, color: '#fff', letterSpacing: 0.6 },
  snoozeBtn: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border },
  snoozeBtnLabel: { fontFamily: fontSans.medium, fontSize: 10, color: colors.muted, letterSpacing: 0.6 },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full },
  statusBadgeText: { fontFamily: fontSans.medium, fontSize: 10, letterSpacing: 0.5 },
  lockedTitle: { fontFamily: fontSerif.bold, fontSize: 24, color: colors.text, textAlign: 'center', marginBottom: 8 },
  lockedSub: { fontFamily: fontSans.regular, fontSize: 14, color: colors.muted, textAlign: 'center', marginHorizontal: 32, marginBottom: 24, lineHeight: 20 },
  upgradeBtn: { backgroundColor: colors.text, paddingHorizontal: 32, paddingVertical: 14, borderRadius: radius.sm },
  upgradeBtnLabel: { fontFamily: fontSans.medium, fontSize: 12, color: '#fff', letterSpacing: 0.8 },
});
