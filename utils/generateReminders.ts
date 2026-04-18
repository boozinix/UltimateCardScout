import {
  startOfMonth, endOfMonth, addMonths, startOfQuarter, endOfQuarter,
  addQuarters, startOfYear, endOfYear, addYears, format, parseISO, isBefore, addDays,
} from 'date-fns';
import { supabase } from '@/lib/supabase';

type Benefit = {
  id: string;
  title: string;
  value: number | null;
  frequency: string;
  reset_logic: string | null;
  reminder_default_days: number | null;
  card_id: string;
};

type Pref = {
  benefit_id: string;
  enabled: boolean;
  reminder_days_before: number | null;
};

type ReminderRow = {
  user_id: string;
  user_card_id: string;
  benefit_id: string;
  period_label: string;
  period_start: string;
  period_end: string;
  remind_at: string;
  status: 'pending';
};

function isPastPeriod(periodEnd: Date): boolean {
  return isBefore(periodEnd, new Date());
}

function toDateStr(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

function remindDate(periodEnd: Date, daysBefore: number): string {
  const remind = addDays(periodEnd, -daysBefore);
  return toDateStr(isBefore(remind, new Date()) ? new Date() : remind);
}

function buildRows(
  userId: string,
  userCardId: string,
  benefit: Benefit,
  pref: Pref | undefined,
  applicationDate: Date,
): ReminderRow[] {
  if (pref && !pref.enabled) return [];
  const daysBefore = pref?.reminder_days_before ?? benefit.reminder_default_days ?? 7;
  const rows: ReminderRow[] = [];
  const now = new Date();
  const freq = benefit.frequency;

  if (freq === 'monthly') {
    for (let i = 0; i < 12; i++) {
      const monthStart = startOfMonth(addMonths(startOfYear(now), i));
      const monthEnd = endOfMonth(monthStart);
      if (isPastPeriod(monthEnd)) continue;
      rows.push({
        user_id: userId, user_card_id: userCardId, benefit_id: benefit.id,
        period_label: format(monthStart, 'MMMM yyyy'),
        period_start: toDateStr(monthStart),
        period_end: toDateStr(monthEnd),
        remind_at: remindDate(monthEnd, daysBefore),
        status: 'pending',
      });
    }
  } else if (freq === 'quarterly') {
    for (let q = 0; q < 4; q++) {
      const qStart = startOfQuarter(addQuarters(startOfYear(now), q));
      const qEnd = endOfQuarter(qStart);
      if (isPastPeriod(qEnd)) continue;
      rows.push({
        user_id: userId, user_card_id: userCardId, benefit_id: benefit.id,
        period_label: `Q${q + 1} ${format(qStart, 'yyyy')}`,
        period_start: toDateStr(qStart),
        period_end: toDateStr(qEnd),
        remind_at: remindDate(qEnd, daysBefore),
        status: 'pending',
      });
    }
  } else if (freq === 'semi-annual') {
    const year = now.getFullYear();
    const halves = [
      { label: `H1 ${year}`, start: new Date(year, 0, 1), end: new Date(year, 5, 30) },
      { label: `H2 ${year}`, start: new Date(year, 6, 1), end: new Date(year, 11, 31) },
    ];
    for (const h of halves) {
      if (isPastPeriod(h.end)) continue;
      rows.push({
        user_id: userId, user_card_id: userCardId, benefit_id: benefit.id,
        period_label: h.label,
        period_start: toDateStr(h.start),
        period_end: toDateStr(h.end),
        remind_at: remindDate(h.end, daysBefore),
        status: 'pending',
      });
    }
  } else if (freq === 'annual') {
    let periodStart: Date;
    let periodEnd: Date;
    if (benefit.reset_logic === 'account_anniversary') {
      const appMonth = applicationDate.getMonth();
      const appDay = applicationDate.getDate();
      const thisYear = now.getFullYear();
      periodStart = new Date(thisYear, appMonth, appDay);
      if (isBefore(periodStart, now)) periodStart = new Date(thisYear + 1, appMonth, appDay);
      periodEnd = addDays(addYears(periodStart, 1), -1);
    } else {
      periodStart = startOfYear(now);
      periodEnd = endOfYear(now);
      if (isPastPeriod(periodEnd)) {
        periodStart = startOfYear(addYears(now, 1));
        periodEnd = endOfYear(periodStart);
      }
    }
    rows.push({
      user_id: userId, user_card_id: userCardId, benefit_id: benefit.id,
      period_label: `${format(periodStart, 'yyyy')} Annual`,
      period_start: toDateStr(periodStart),
      period_end: toDateStr(periodEnd),
      remind_at: remindDate(periodEnd, daysBefore),
      status: 'pending',
    });
  } else if (freq === 'multi-year') {
    const years = benefit.reset_logic?.match(/(\d+)/) ? parseInt(benefit.reset_logic.match(/(\d+)/)![1]) : 4;
    const periodEnd = addYears(applicationDate, years);
    if (!isPastPeriod(periodEnd)) {
      rows.push({
        user_id: userId, user_card_id: userCardId, benefit_id: benefit.id,
        period_label: `Every ${years} years`,
        period_start: toDateStr(applicationDate),
        period_end: toDateStr(periodEnd),
        remind_at: remindDate(periodEnd, daysBefore),
        status: 'pending',
      });
    }
  }

  return rows;
}

export async function generateReminders(
  userCardId: string,
  userId: string,
  applicationDate: string,
): Promise<{ count: number; error: string | null }> {
  const appDate = parseISO(applicationDate);

  const { data: userCard } = await supabase
    .from('user_cards')
    .select('card_id')
    .eq('id', userCardId)
    .single();

  if (!userCard) return { count: 0, error: 'User card not found' };

  const { data: benefits } = await supabase
    .from('benefits')
    .select('id, title, value, frequency, reset_logic, reminder_default_days, card_id')
    .eq('card_id', userCard.card_id)
    .eq('is_active', true);

  if (!benefits?.length) return { count: 0, error: null };

  const { data: prefsData } = await supabase
    .from('user_benefit_prefs')
    .select('benefit_id, enabled, reminder_days_before')
    .eq('user_card_id', userCardId)
    .eq('user_id', userId);

  const prefMap: Record<string, Pref> = {};
  for (const p of (prefsData ?? [])) prefMap[p.benefit_id] = p as Pref;

  const rows: ReminderRow[] = [];
  for (const b of benefits) {
    rows.push(...buildRows(userId, userCardId, b as Benefit, prefMap[b.id], appDate));
  }

  if (!rows.length) return { count: 0, error: null };

  // Insert in chunks of 100
  let inserted = 0;
  for (let i = 0; i < rows.length; i += 100) {
    const chunk = rows.slice(i, i + 100);
    const { error } = await supabase.from('reminders').insert(chunk);
    if (error) return { count: inserted, error: error.message };
    inserted += chunk.length;
  }

  return { count: inserted, error: null };
}
