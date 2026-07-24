import { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { InfoButton } from '@/components/info-button';
import { AppButton } from '@/components/ui/app-button';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Design } from '@/constants/design';
import {
  cancelReminder,
  cancelReminders,
  getNotificationPermissionState,
  NotificationPermissionState,
  openNotificationSettings,
} from '@/lib/notifications';
import { useStore } from '@/lib/store';

type ReminderItem = {
  id: string;
  at: string;
  label: string;
  detail: string;
  kind: 'temperature' | 'night' | 'medication' | 'appointment';
  notificationId?: string;
};

function formatReminderDate(value: string) {
  const date = new Date(value);
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  const sameDay = (candidate: Date, target: Date) => candidate.toDateString() === target.toDateString();
  const day = sameDay(date, today) ? 'Heute' : sameDay(date, tomorrow) ? 'Morgen' : new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit' }).format(date);
  const time = new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit' }).format(date);
  return `${day} · ${time} Uhr`;
}

export function ReminderCenter() {
  const {
    activeChild,
    temperatureReminderAt,
    temperatureNotificationId,
    setTemperatureReminderSchedule,
    nightAlarmTimes,
    nightNotificationIds,
    setNightAlarm,
    medications,
    clearMedicationReminder,
    appointments,
    clearAppointmentReminder,
  } = useStore();
  const [permission, setPermission] = useState<NotificationPermissionState>(Platform.OS === 'web' ? 'unsupported' : 'undetermined');
  const [workingId, setWorkingId] = useState<string>();

  useEffect(() => {
    getNotificationPermissionState().then(setPermission).catch(() => setPermission('denied'));
  }, []);

  const reminders = useMemo(() => {
    const now = Date.now();
    const items: ReminderItem[] = [];
    if (temperatureReminderAt && new Date(temperatureReminderAt).getTime() > now) {
      items.push({
        id: 'temperature',
        at: temperatureReminderAt,
        label: 'Nächste Temperaturmessung',
        detail: 'Allgemeiner Messabstand',
        kind: 'temperature',
        notificationId: temperatureNotificationId,
      });
    }
    (nightAlarmTimes ?? []).filter((at) => new Date(at).getTime() > now).forEach((at, index) => {
      items.push({
        id: `night-${index}`,
        at,
        label: 'Nachtmessung',
        detail: 'Aktiver Nachtplan',
        kind: 'night',
        notificationId: nightNotificationIds?.[index],
      });
    });
    medications
      .filter((item) => item.childId === activeChild?.id && item.reminderAt && new Date(item.reminderAt).getTime() > now)
      .forEach((item) => items.push({
        id: item.id,
        at: item.reminderAt!,
        label: item.name,
        detail: 'Von dir festgelegte Medikamentenerinnerung',
        kind: 'medication',
        notificationId: item.reminderNotificationId,
      }));
    appointments
      .filter((item) => item.childId === activeChild?.id && item.reminderNotificationId && item.reminderMinutes !== undefined)
      .forEach((item) => {
        const reminderAt = new Date(new Date(item.scheduledAt).getTime() - item.reminderMinutes! * 60_000);
        if (reminderAt.getTime() > now) {
          items.push({
            id: item.id,
            at: reminderAt.toISOString(),
            label: item.title,
            detail: 'Terminerinnerung',
            kind: 'appointment',
            notificationId: item.reminderNotificationId,
          });
        }
      });
    return items.sort((a, b) => a.at.localeCompare(b.at));
  }, [activeChild?.id, appointments, medications, nightAlarmTimes, nightNotificationIds, temperatureNotificationId, temperatureReminderAt]);

  async function disable(item: ReminderItem) {
    setWorkingId(item.id);
    if (item.kind === 'temperature') {
      await cancelReminder(item.notificationId);
      setTemperatureReminderSchedule();
    } else if (item.kind === 'night') {
      await cancelReminders(nightNotificationIds);
      setNightAlarm();
    } else if (item.kind === 'medication') {
      await cancelReminder(item.notificationId);
      clearMedicationReminder(item.id);
    } else {
      await cancelReminder(item.notificationId);
      clearAppointmentReminder(item.id);
    }
    setWorkingId(undefined);
  }

  return (
    <View style={styles.section}>
      <View style={styles.heading}>
        <View><Text style={styles.title}>Aktive Erinnerungen</Text><Text style={styles.subtitle}>{reminders.length ? `${reminders.length} geplant` : 'Alles ruhig'}</Text></View>
        <InfoButton title="Aktive Erinnerungen" text="Hier siehst und stoppst du alle aktuell geplanten Mess-, Nacht-, Medikamenten- und Terminerinnerungen." />
      </View>
      {permission === 'unsupported' ? (
        <View style={styles.webNotice}>
          <IconSymbol name="triangle-alert" size={20} color={Design.colors.gold} />
          <Text style={styles.webText}>Im Browser kann Fieberwache dein Handy nicht zuverlässig wecken. Gerätealarme funktionieren nur in der installierten App.</Text>
        </View>
      ) : permission === 'denied' ? (
        <View style={styles.permissionNotice}>
          <View style={styles.permissionCopy}><Text style={styles.permissionTitle}>Benachrichtigungen sind aus</Text><Text style={styles.permissionText}>Aktiviere sie in den Geräteeinstellungen, damit geplante Alarme erscheinen.</Text></View>
          <AppButton label="Einstellungen" variant="secondary" compact onPress={openNotificationSettings} />
        </View>
      ) : null}
      {reminders.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}><IconSymbol name="bell.fill" size={20} color={Design.colors.primary} /></View>
          <View style={styles.emptyCopy}><Text style={styles.emptyTitle}>Keine Gerätealarme geplant</Text><Text style={styles.emptyText}>Neue Erinnerungen erscheinen hier direkt nach dem Speichern.</Text></View>
        </View>
      ) : (
        <View style={styles.list}>
          {reminders.map((item, index) => (
            <View key={item.id} style={[styles.row, index < reminders.length - 1 && styles.divider]}>
              <View style={[styles.icon, item.kind === 'night' && styles.nightIcon]}><IconSymbol name={item.kind === 'night' ? 'moon.stars.fill' : 'bell.fill'} size={18} color={item.kind === 'night' ? Design.colors.sageStrong : Design.colors.primaryDark} /></View>
              <View style={styles.copy}><Text style={styles.label}>{item.label}</Text><Text style={styles.meta}>{formatReminderDate(item.at)} · {item.detail}</Text></View>
              <Pressable accessibilityRole="button" accessibilityLabel={`${item.label} ausschalten`} disabled={workingId === item.id} onPress={() => disable(item)} style={({ pressed }) => [styles.stop, pressed && styles.pressed, workingId === item.id && styles.disabled]}><IconSymbol name="xmark" size={18} color={Design.colors.danger} /></Pressable>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 12 },
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  title: { color: Design.colors.ink, ...Design.type.section, fontFamily: Design.fonts.bold },
  subtitle: { color: Design.colors.inkSoft, fontSize: 12, lineHeight: 17, fontFamily: Design.fonts.regular, marginTop: 2 },
  webNotice: { borderRadius: Design.radius.medium, backgroundColor: Design.colors.yellow, padding: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  webText: { flex: 1, color: Design.colors.inkSoft, fontSize: 12, lineHeight: 18, fontFamily: Design.fonts.regular },
  permissionNotice: { borderRadius: Design.radius.medium, backgroundColor: Design.colors.dangerSoft, padding: 14, gap: 12 },
  permissionCopy: { gap: 2 },
  permissionTitle: { color: Design.colors.danger, fontSize: 13, lineHeight: 18, fontFamily: Design.fonts.bold },
  permissionText: { color: Design.colors.inkSoft, fontSize: 12, lineHeight: 18, fontFamily: Design.fonts.regular },
  list: { backgroundColor: Design.colors.surface, borderRadius: Design.radius.large, paddingHorizontal: 15, borderWidth: 1, borderColor: Design.colors.border, ...Design.shadow.card },
  row: { minHeight: 78, flexDirection: 'row', alignItems: 'center', gap: 11 },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Design.colors.border },
  icon: { width: 42, height: 42, borderRadius: 16, backgroundColor: Design.colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  nightIcon: { backgroundColor: Design.colors.sage },
  copy: { flex: 1, gap: 2 },
  label: { color: Design.colors.ink, fontSize: 13, lineHeight: 18, fontFamily: Design.fonts.bold },
  meta: { color: Design.colors.inkSoft, fontSize: 12, lineHeight: 17, fontFamily: Design.fonts.regular },
  stop: { width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: Design.colors.dangerSoft },
  pressed: { opacity: 0.75 },
  disabled: { opacity: 0.4 },
  empty: { borderRadius: Design.radius.large, backgroundColor: Design.colors.surface, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: Design.colors.border },
  emptyIcon: { width: 42, height: 42, borderRadius: 16, backgroundColor: Design.colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  emptyCopy: { flex: 1, gap: 2 },
  emptyTitle: { color: Design.colors.ink, fontSize: 13, lineHeight: 18, fontFamily: Design.fonts.bold },
  emptyText: { color: Design.colors.inkSoft, fontSize: 12, lineHeight: 18, fontFamily: Design.fonts.regular },
});
