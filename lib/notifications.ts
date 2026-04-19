// ============================================================
// Push Notification Scaffolding
// Uses expo-notifications for local scheduling.
// Actual push requires device testing — this scaffolds the logic.
// ============================================================

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// ─── Configuration ──────────────────────────────────────────────────────────

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  } as Notifications.NotificationBehavior),
});

// ─── Permission ─────────────────────────────────────────────────────────────

export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

// ─── Spend Reminder Scheduling ──────────────────────────────────────────────

/**
 * Schedule spend reminders for a bonus deadline.
 * Schedules at 30 days and 7 days before the deadline.
 * Returns the notification identifiers for later cancellation.
 */
export async function scheduleSpendReminders(
  applicationId: string,
  cardName: string,
  deadline: string,      // ISO date string
  remainingSpend: number,
): Promise<string[]> {
  const hasPermission = await requestNotificationPermission();
  if (!hasPermission) return [];

  const deadlineDate = new Date(deadline);
  const now = new Date();
  const ids: string[] = [];

  const reminders = [
    { daysOut: 30, title: '30 days left for bonus', body: `$${remainingSpend.toLocaleString()} remaining on ${cardName}.` },
    { daysOut: 7, title: 'Bonus deadline in 7 days', body: `$${remainingSpend.toLocaleString()} remaining on ${cardName}. Final push.` },
  ];

  for (const { daysOut, title, body } of reminders) {
    const triggerDate = new Date(deadlineDate.getTime() - daysOut * 24 * 60 * 60 * 1000);
    // Only schedule if the trigger is in the future
    if (triggerDate > now) {
      try {
        const id = await Notifications.scheduleNotificationAsync({
          content: {
            title,
            body,
            data: { applicationId, type: 'spend_reminder' },
          },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: triggerDate },
        });
        ids.push(id);
      } catch {
        // Notification scheduling can fail on some platforms
      }
    }
  }

  return ids;
}

/**
 * Cancel previously scheduled spend reminders.
 */
export async function cancelSpendReminders(notificationIds: string[]): Promise<void> {
  for (const id of notificationIds) {
    try {
      await Notifications.cancelScheduledNotificationAsync(id);
    } catch {
      // Already cancelled or expired
    }
  }
}

// ─── Fee Reminder Scheduling ───────────────────────────────────────────────

/**
 * Schedule a 30-day advance reminder for an upcoming annual fee.
 * Returns the notification identifier for later cancellation.
 */
export async function scheduleFeeReminder(
  applicationId: string,
  cardName: string,
  feeDueDate: string,  // ISO date string
  feeAmount: number,
): Promise<string[]> {
  const hasPermission = await requestNotificationPermission();
  if (!hasPermission) return [];

  const dueDate = new Date(feeDueDate);
  const now = new Date();
  const ids: string[] = [];

  const reminders = [
    {
      daysOut: 30,
      title: 'Annual fee due in 30 days',
      body: `${cardName} — $${feeAmount} fee posting soon. Review your retention options.`,
    },
    {
      daysOut: 7,
      title: 'Annual fee due in 7 days',
      body: `${cardName} — $${feeAmount} fee posts this week. Call retention or downgrade now.`,
    },
  ];

  for (const { daysOut, title, body } of reminders) {
    const triggerDate = new Date(dueDate.getTime() - daysOut * 24 * 60 * 60 * 1000);
    if (triggerDate > now) {
      try {
        const id = await Notifications.scheduleNotificationAsync({
          content: {
            title,
            body,
            data: { applicationId, type: 'fee_reminder' },
          },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: triggerDate },
        });
        ids.push(id);
      } catch {
        // Notification scheduling can fail on some platforms
      }
    }
  }

  return ids;
}

/**
 * Cancel all scheduled notifications for a specific application.
 * Uses data.applicationId to match.
 */
export async function cancelRemindersForApplication(applicationId: string): Promise<void> {
  try {
    const all = await Notifications.getAllScheduledNotificationsAsync();
    for (const notification of all) {
      const data = notification.content.data as Record<string, unknown> | undefined;
      if (data?.applicationId === applicationId) {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier);
      }
    }
  } catch {
    // Platform doesn't support this or no permissions
  }
}
