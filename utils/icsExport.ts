import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { format, parseISO } from 'date-fns';
import { supabase } from '@/lib/supabase';

type ReminderRow = {
  id: string;
  remind_at: string;
  period_end: string;
  period_label: string | null;
  benefits: { title: string; value: number | null; description: string | null } | null;
  user_cards: { cards: { name: string } | null } | null;
};

function icsDate(dateStr: string): string {
  return format(parseISO(dateStr), 'yyyyMMdd');
}

function escapeIcs(str: string): string {
  return str.replace(/[\\;,]/g, (c) => `\\${c}`).replace(/\n/g, '\\n');
}

function buildIcs(reminders: ReminderRow[]): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//CardScout//Benefits Tracker//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];

  for (const r of reminders) {
    const title = r.benefits?.title ?? 'Benefit Reminder';
    const cardName = r.user_cards?.cards?.name ?? '';
    const value = r.benefits?.value;
    const desc = r.benefits?.description ?? '';
    const summary = value != null ? `$${value} ${title}${cardName ? ` — ${cardName}` : ''}` : `${title}${cardName ? ` — ${cardName}` : ''}`;

    const eventDesc = [
      desc,
      r.period_label ? `Period: ${r.period_label}` : '',
      `Expires: ${format(parseISO(r.period_end), 'MMMM d, yyyy')}`,
      'Tracked by CardScout',
    ].filter(Boolean).join('\\n');

    lines.push(
      'BEGIN:VEVENT',
      `UID:cardscout-${r.id}@cardscout.app`,
      `DTSTAMP:${icsDate(new Date().toISOString())}T000000Z`,
      `DTSTART;VALUE=DATE:${icsDate(r.remind_at)}`,
      `DTEND;VALUE=DATE:${icsDate(r.remind_at)}`,
      `SUMMARY:${escapeIcs(summary)}`,
      `DESCRIPTION:${escapeIcs(eventDesc)}`,
      'STATUS:CONFIRMED',
      'BEGIN:VALARM',
      'TRIGGER:-P0D',
      'ACTION:DISPLAY',
      `DESCRIPTION:${escapeIcs(summary)}`,
      'END:VALARM',
      'END:VEVENT',
    );
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

export async function exportCalendar(): Promise<{ success: boolean; error?: string }> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return { success: false, error: 'Not authenticated' };

  const { data: reminders, error } = await supabase
    .from('reminders')
    .select(`id, remind_at, period_end, period_label, benefits(title, value, description), user_cards(cards(name))`)
    .eq('user_id', session.user.id)
    .eq('status', 'pending')
    .order('remind_at', { ascending: true });

  if (error) return { success: false, error: error.message };
  if (!reminders?.length) return { success: false, error: 'No pending reminders to export' };

  const icsContent = buildIcs(reminders as unknown as ReminderRow[]);

  if (Platform.OS === 'web') {
    const blob = new Blob([icsContent], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cardscout-benefits.ics';
    a.click();
    URL.revokeObjectURL(url);
    return { success: true };
  }

  // Native: write to cache and share
  const filePath = `${FileSystem.cacheDirectory}cardscout-benefits.ics`;
  await FileSystem.writeAsStringAsync(filePath, icsContent, { encoding: FileSystem.EncodingType.UTF8 });

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) return { success: false, error: 'Sharing not available on this device' };

  await Sharing.shareAsync(filePath, {
    mimeType: 'text/calendar',
    dialogTitle: 'Export Benefits Calendar',
    UTI: 'public.calendar',
  });

  return { success: true };
}
