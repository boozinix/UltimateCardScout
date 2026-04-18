import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { parseISO, setHours, setMinutes } from 'date-fns';

const STORAGE_KEY = 'cardscout_notif_ids';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function getIdMap(): Promise<Record<string, string>> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

async function saveIdMap(map: Record<string, string>): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function scheduleReminderNotification(
  reminderId: string,
  benefitTitle: string,
  cardName: string,
  value: number | null,
  remindAt: string,
): Promise<void> {
  if (Platform.OS === 'web') return;

  const granted = await requestNotificationPermissions();
  if (!granted) return;

  const remindDate = setMinutes(setHours(parseISO(remindAt), 9), 0);
  if (remindDate <= new Date()) return;

  const notifId = await Notifications.scheduleNotificationAsync({
    content: {
      title: `${cardName}: ${benefitTitle}`,
      body: value != null
        ? `Your $${value} ${benefitTitle} credit is expiring soon — use it before it's gone.`
        : `Your ${benefitTitle} benefit is expiring soon.`,
      data: { reminderId },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: remindDate,
    },
  });

  const map = await getIdMap();
  map[reminderId] = notifId;
  await saveIdMap(map);
}

export async function cancelReminderNotification(reminderId: string): Promise<void> {
  if (Platform.OS === 'web') return;
  const map = await getIdMap();
  const notifId = map[reminderId];
  if (notifId) {
    await Notifications.cancelScheduledNotificationAsync(notifId);
    delete map[reminderId];
    await saveIdMap(map);
  }
}

export async function cancelAllReminderNotifications(): Promise<void> {
  if (Platform.OS === 'web') return;
  await Notifications.cancelAllScheduledNotificationsAsync();
  await AsyncStorage.removeItem(STORAGE_KEY);
}

export async function scheduleNotificationsForReminders(
  reminders: Array<{
    id: string;
    benefitTitle: string;
    cardName: string;
    value: number | null;
    remindAt: string;
  }>,
): Promise<void> {
  if (Platform.OS === 'web') return;
  for (const r of reminders) {
    await scheduleReminderNotification(r.id, r.benefitTitle, r.cardName, r.value, r.remindAt).catch(() => {});
  }
}
