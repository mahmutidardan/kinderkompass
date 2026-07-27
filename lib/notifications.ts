import { Linking, Platform } from 'react-native';

export type NotificationPermissionState = 'unsupported' | 'granted' | 'denied' | 'undetermined';

export type NotificationScheduleResult = {
  status: 'scheduled' | 'unsupported' | 'denied' | 'error';
  ids: string[];
};

export async function configureNotifications() {
  if (Platform.OS === 'web') return;
  const Notifications = await import('expo-notifications');
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('care-reminders', {
      name: 'Mess- und Dokumentationserinnerungen',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      sound: 'default',
    });
  }
}
export async function getNotificationPermissionState(): Promise<NotificationPermissionState> {
  if (Platform.OS === 'web') return 'unsupported';
  const Notifications = await import('expo-notifications');
  const permission = await Notifications.getPermissionsAsync();
  if (permission.granted) return 'granted';
  if (!permission.canAskAgain) return 'denied';
  return 'undetermined';
}

export async function openNotificationSettings() {
  if (Platform.OS !== 'web') await Linking.openSettings();
}

export async function scheduleReminder(date: Date, title: string, body: string) {
  const result = await scheduleReminders([{ date, title, body }]);
  return { ...result, id: result.ids[0] };
}

export async function scheduleReminders(reminders: { date: Date; title: string; body: string }[]): Promise<NotificationScheduleResult> {
  if (Platform.OS === 'web') return { status: 'unsupported', ids: [] };
  try {
    const Notifications = await import('expo-notifications');
    const current = await Notifications.getPermissionsAsync();
    const permission = current.granted ? current : await Notifications.requestPermissionsAsync();
    if (!permission.granted) return { status: 'denied', ids: [] };

    const ids: string[] = [];
    for (const reminder of reminders) {
      const id = await Notifications.scheduleNotificationAsync({
        content: { title: reminder.title, body: reminder.body, sound: 'default' },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: reminder.date,
          channelId: 'care-reminders',
        },
      });
      ids.push(id);
    }
    return { status: 'scheduled', ids };
  } catch {
    return { status: 'error', ids: [] };
  }
}

export async function cancelReminder(id?: string) {
  if (!id || Platform.OS === 'web') return;
  const Notifications = await import('expo-notifications');
  await Notifications.cancelScheduledNotificationAsync(id).catch(() => undefined);
}

export async function cancelReminders(ids: string[] = []) {
  await Promise.all(ids.map(cancelReminder));
}
