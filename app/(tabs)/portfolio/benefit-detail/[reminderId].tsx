import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { format, parseISO, addDays, differenceInDays } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { colors, spacing, radius, fontSerif, fontSans, getCategoryColors } from '@/lib/theme';
import { cancelReminderNotification, scheduleReminderNotification } from '@/utils/notifications';

type ReminderDetail = {
  id: string;
  period_label: string | null;
  period_start: string | null;
  period_end: string;
  remind_at: string;
  status: string;
  snoozed_until: string | null;
  amount_used: number;
  benefits: {
    title: string;
    description: string | null;
    value: number | null;
    frequency: string;
    category: string | null;
  } | null;
  user_cards: {
    last_four: string | null;
    cards: { name: string; issuer: string } | null;
  } | null;
};

export default function BenefitDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { reminderId } = useLocalSearchParams<{ reminderId: string }>();

  const [reminder, setReminder] = useState<ReminderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('reminders')
      .select(`id, period_label, period_start, period_end, remind_at, status, snoozed_until, amount_used,
        benefits(title, description, value, frequency, category),
        user_cards(last_four, cards(name, issuer))`)
      .eq('id', reminderId)
      .single();
    if (data) setReminder(data as unknown as ReminderDetail);
    setLoading(false);
  }, [reminderId]);

  useEffect(() => { loadData(); }, [loadData]);

  const markUsed = async () => {
    if (!reminder) return;
    setActing(true);
    const { error } = await supabase
      .from('reminders')
      .update({ status: 'used', amount_used: reminder.benefits?.value ?? 0 })
      .eq('id', reminder.id);
    if (error) Alert.alert('Error', error.message);
    else {
      cancelReminderNotification(reminder.id).catch(() => {});
      setReminder(prev => prev ? { ...prev, status: 'used', amount_used: prev.benefits?.value ?? 0 } : prev);
    }
    setActing(false);
  };

  const snooze = async (days: number) => {
    if (!reminder) return;
    setActing(true);
    const snoozeDate = format(addDays(new Date(), days), 'yyyy-MM-dd');
    const { error } = await supabase
      .from('reminders')
      .update({ status: 'snoozed', snoozed_until: snoozeDate })
      .eq('id', reminder.id);
    if (error) Alert.alert('Error', error.message);
    else {
      cancelReminderNotification(reminder.id).catch(() => {});
      scheduleReminderNotification(
        reminder.id,
        reminder.benefits?.title ?? '',
        reminder.user_cards?.cards?.name ?? '',
        reminder.benefits?.value ?? null,
        snoozeDate,
      ).catch(() => {});
      setReminder(prev => prev ? { ...prev, status: 'snoozed', snoozed_until: snoozeDate } : prev);
    }
    setActing(false);
  };

  const undoStatus = async () => {
    if (!reminder) return;
    setActing(true);
    const { error } = await supabase
      .from('reminders')
      .update({ status: 'pending', snoozed_until: null, amount_used: 0 })
      .eq('id', reminder.id);
    if (error) Alert.alert('Error', error.message);
    else {
      scheduleReminderNotification(
        reminder.id,
        reminder.benefits?.title ?? '',
        reminder.user_cards?.cards?.name ?? '',
        reminder.benefits?.value ?? null,
        reminder.remind_at,
      ).catch(() => {});
      setReminder(prev => prev ? { ...prev, status: 'pending', snoozed_until: null, amount_used: 0 } : prev);
    }
    setActing(false);
  };

  if (loading || !reminder) {
    return (
      <View style={[s.container, s.center, { paddingTop: insets.top }]}>
        <ActivityIndicator color={colors.gold} />
      </View>
    );
  }

  const benefit = reminder.benefits;
  const card = reminder.user_cards?.cards;
  const daysToEnd = differenceInDays(parseISO(reminder.period_end), new Date());
  const isUsed = reminder.status === 'used';
  const isSnoozed = reminder.status === 'snoozed';
  const cat = getCategoryColors(benefit?.category ?? null);

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <ArrowLeft size={20} color={colors.muted} strokeWidth={1.75} />
        </Pressable>
        <Text style={s.eyebrow}>BENEFIT DETAIL</Text>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <Text style={s.heroTitle}>{benefit?.title ?? 'Benefit'}</Text>
        <Text style={s.heroSub}>{benefit?.frequency ?? ''} reminder</Text>

        {benefit?.value != null && (
          <Text style={s.heroValue}>${benefit.value}</Text>
        )}

        {(isUsed || isSnoozed) && (
          <View style={[s.statusBar, {
            backgroundColor: isUsed ? colors.successBg : colors.warnBg,
            borderColor: isUsed ? '#BBF7D0' : '#FDE68A',
          }]}>
            <Text style={[s.statusBarText, { color: isUsed ? colors.success : colors.warn }]}>
              {isUsed ? '✓ Marked as used' : `Snoozed until ${reminder.snoozed_until}`}
            </Text>
          </View>
        )}

        <View style={s.metaRow}>
          {benefit?.category && (
            <View style={[s.catPill, { backgroundColor: cat.bg }]}>
              <Text style={[s.catPillText, { color: cat.color }]}>{benefit.category}</Text>
            </View>
          )}
          {card && <Text style={s.cardName}>{card.name}</Text>}
        </View>

        <View style={s.detailCard}>
          {reminder.period_label && <DetailRow label="Period" value={reminder.period_label} />}
          {reminder.period_start && (
            <DetailRow label="Period start" value={format(parseISO(reminder.period_start), 'MMMM d, yyyy')} divider />
          )}
          <DetailRow label="Period end" value={format(parseISO(reminder.period_end), 'MMMM d, yyyy')} divider />
          <DetailRow label="Remind date" value={format(parseISO(reminder.remind_at), 'MMMM d, yyyy')} divider />
          {daysToEnd > 0 && (
            <DetailRow label="Days remaining" value={`${daysToEnd} days`} divider accent />
          )}
        </View>

        {benefit?.description && (
          <View style={s.descCard}>
            <Text style={s.descLabel}>ABOUT THIS BENEFIT</Text>
            <Text style={s.descText}>{benefit.description}</Text>
          </View>
        )}

        <View style={s.curatorNote}>
          <Text style={s.curatorEyebrow}>CURATOR'S INSIGHT</Text>
          <Text style={s.curatorText}>
            {daysToEnd <= 3
              ? `Final window: ${daysToEnd} day${daysToEnd !== 1 ? 's' : ''} remain. Credits that expire unused are gone permanently — act today.`
              : daysToEnd <= 7
              ? `This credit resets in ${daysToEnd} days. Plan when you'll redeem it this week, then mark it used here.`
              : daysToEnd <= 30
              ? `${daysToEnd} days remaining in this period. Consider scheduling your redemption now.`
              : `You have ${daysToEnd} days — no urgency yet. The Curator will remind you as the window narrows.`}
          </Text>
        </View>

        <View style={s.actions}>
          {!isUsed && (
            <Pressable style={s.primaryBtn} onPress={markUsed} disabled={acting}>
              <Text style={s.primaryBtnLabel}>{acting ? '…' : 'MARK AS USED'}</Text>
            </Pressable>
          )}
          {!isUsed && !isSnoozed && (
            <>
              <Pressable style={s.ghostBtn} onPress={() => snooze(7)} disabled={acting}>
                <Text style={s.ghostBtnLabel}>Snooze for 7 days</Text>
              </Pressable>
              <Pressable style={s.ghostBtn} onPress={() => snooze(3)} disabled={acting}>
                <Text style={s.ghostBtnLabel}>Snooze for 3 days</Text>
              </Pressable>
            </>
          )}
          {(isUsed || isSnoozed) && (
            <Pressable style={s.ghostBtn} onPress={undoStatus} disabled={acting}>
              <Text style={s.ghostBtnLabel}>{acting ? '…' : 'Undo'}</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function DetailRow({ label, value, divider, accent }: {
  label: string; value: string; divider?: boolean; accent?: boolean;
}) {
  return (
    <View style={[s.detailRow, divider && s.detailDivider]}>
      <Text style={s.detailLabel}>{label}</Text>
      <Text style={[s.detailValue, accent && s.detailAccent]}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.screen, paddingVertical: 16, gap: 12,
  },
  backBtn: { padding: 4 },
  eyebrow: { fontFamily: fontSans.medium, fontSize: 10, color: colors.muted, letterSpacing: 0.8 },
  scroll: { paddingHorizontal: spacing.screen, paddingBottom: 60 },
  heroTitle: { fontFamily: fontSerif.bold, fontSize: 28, color: colors.text, letterSpacing: -0.5, marginBottom: 4 },
  heroSub: { fontFamily: fontSans.regular, fontSize: 13, color: colors.muted, marginBottom: 12 },
  heroValue: { fontFamily: fontSerif.bold, fontSize: 52, color: colors.gold, letterSpacing: -1.5, marginBottom: 20 },
  statusBar: {
    borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: 14,
    paddingVertical: 10, marginBottom: 16, alignItems: 'center',
  },
  statusBarText: { fontFamily: fontSans.medium, fontSize: 13 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  catPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full },
  catPillText: { fontFamily: fontSans.medium, fontSize: 11 },
  cardName: { fontFamily: fontSans.medium, fontSize: 13, color: colors.muted },
  detailCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, marginBottom: 16, overflow: 'hidden',
  },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 13, paddingHorizontal: 16 },
  detailDivider: { borderTopWidth: 1, borderTopColor: colors.border },
  detailLabel: { fontFamily: fontSans.regular, fontSize: 13, color: colors.muted },
  detailValue: { fontFamily: fontSans.medium, fontSize: 13, color: colors.text, maxWidth: '60%', textAlign: 'right' },
  detailAccent: { fontFamily: fontSerif.bold, color: colors.gold },
  descCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, padding: 16, marginBottom: 16,
  },
  descLabel: { fontFamily: fontSans.medium, fontSize: 10, color: colors.muted, letterSpacing: 0.8, marginBottom: 8 },
  descText: { fontFamily: fontSans.regular, fontSize: 14, color: colors.text, lineHeight: 21 },
  curatorNote: {
    backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: '#FDE68A',
    borderRadius: radius.md, padding: 16, marginBottom: 24,
  },
  curatorEyebrow: { fontFamily: fontSans.medium, fontSize: 10, color: colors.gold, letterSpacing: 0.8, marginBottom: 6 },
  curatorText: { fontFamily: fontSans.regular, fontSize: 13, color: '#78350F', lineHeight: 19 },
  actions: { gap: 10 },
  primaryBtn: {
    backgroundColor: colors.text, paddingVertical: 16,
    borderRadius: radius.sm, alignItems: 'center',
  },
  primaryBtnLabel: { fontFamily: fontSans.medium, fontSize: 12, color: '#fff', letterSpacing: 0.8 },
  ghostBtn: { paddingVertical: 14, borderRadius: radius.sm, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  ghostBtnLabel: { fontFamily: fontSans.medium, fontSize: 13, color: colors.text },
});
