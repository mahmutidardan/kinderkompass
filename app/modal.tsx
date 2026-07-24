import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import Slider from '@react-native-community/slider';
import { AccessibilityInfo, Animated, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Design } from '@/constants/design';
import { InfoButton } from '@/components/info-button';
import { AppButton } from '@/components/ui/app-button';
import { AppDateTimeInput } from '@/components/ui/app-date-time-input';
import { AppInput } from '@/components/ui/app-input';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { buildIntervalSchedule, buildManualSchedule } from '@/lib/night-schedule';
import { cancelReminder, cancelReminders, openNotificationSettings, scheduleReminder, scheduleReminders } from '@/lib/notifications';
import { TemperatureMethod, useStore } from '@/lib/store';
import { getTemperatureGuidance } from '@/lib/temperature-guidance';
import { formatGermanDate, parseGermanDate, parseGermanDateTime } from '@/lib/date-time';

type Kind = 'temperature' | 'medication' | 'night';
type NightMode = 'interval' | 'manual';
const METHODS: TemperatureMethod[] = ['Ohr', 'Stirn', 'Mund', 'Achsel', 'Rektal'];

function formatAlarmTime(value: Date) {
  return new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit' }).format(value);
}

function parseRouteDate(value?: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? '');
  if (!match) return undefined;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12, 0, 0, 0);
  if (
    date.getFullYear() !== Number(match[1])
    || date.getMonth() !== Number(match[2]) - 1
    || date.getDate() !== Number(match[3])
  ) return undefined;
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  return date.getTime() <= today.getTime() ? date : undefined;
}

function isSameCalendarDay(first: Date, second: Date) {
  return first.getFullYear() === second.getFullYear()
    && first.getMonth() === second.getMonth()
    && first.getDate() === second.getDate();
}

export default function ModalScreen() {
  const params = useLocalSearchParams<{ kind?: string; inventoryId?: string; entryId?: string; date?: string }>();
  const store = useStore();
  const editingTemperature = store.temperatures.find((item) => item.id === params.entryId);
  const editingMedication = store.medications.find((item) => item.id === params.entryId);
  const initialKind = editingTemperature ? 'temperature' : editingMedication ? 'medication' : (['temperature', 'medication', 'night'].includes(params.kind ?? '') ? params.kind : 'temperature') as Kind;
  const kind = initialKind;
  const {
    activeChild,
    medicationInventory,
    temperatureReminderHours,
    nightAlarmActiveUntil,
    nightAlarmSummary,
    nightNotificationIds,
    temperatureNotificationId,
    addTemperature,
    updateTemperature,
    addMedication,
    updateMedication,
    setTemperatureReminderHours,
    setTemperatureReminderSchedule,
    setNightAlarm,
  } = store;
  const initialInventoryItem = medicationInventory.find((item) => item.id === params.inventoryId);
  const requestedDate = parseRouteDate(params.date);
  const requestedRecordedAt = requestedDate ? new Date(requestedDate) : undefined;
  if (requestedRecordedAt) {
    const now = new Date();
    requestedRecordedAt.setHours(now.getHours(), now.getMinutes(), 0, 0);
  }
  const initialRecordedAt = editingTemperature?.recordedAt ?? editingMedication?.recordedAt ?? requestedRecordedAt?.toISOString() ?? new Date().toISOString();
  const initialRecordedDate = new Date(initialRecordedAt);
  const [temperatureValue, setTemperatureValue] = useState(editingTemperature?.temperature ?? 37.0);
  const temperatureAnimation = useRef(new Animated.Value(editingTemperature?.temperature ?? 37)).current;
  const temperaturePulse = useRef(new Animated.Value(1)).current;
  const [method, setMethod] = useState<TemperatureMethod>(editingTemperature?.method ?? 'Ohr');
  const [note, setNote] = useState(editingTemperature?.note ?? '');
  const [temperatureReminder, setTemperatureReminder] = useState(temperatureReminderHours ? String(temperatureReminderHours).replace('.', ',') : '');
  const [selectedInventoryId, setSelectedInventoryId] = useState<string | undefined>(editingMedication?.medicationId ?? initialInventoryItem?.id);
  const [medicationName, setMedicationName] = useState(editingMedication?.name ?? initialInventoryItem?.name ?? '');
  const [amount, setAmount] = useState(editingMedication?.amount ?? initialInventoryItem?.defaultAmount ?? '');
  const existingMedicationInterval = editingMedication?.reminderAt
    ? Math.max(0, (new Date(editingMedication.reminderAt).getTime() - new Date(editingMedication.recordedAt).getTime()) / 3_600_000)
    : undefined;
  const [medicationReminder, setMedicationReminder] = useState(existingMedicationInterval ? String(Number(existingMedicationInterval.toFixed(2))).replace('.', ',') : initialInventoryItem?.defaultIntervalHours ?? '');
  const [recordedDate, setRecordedDate] = useState(formatGermanDate(initialRecordedDate));
  const [recordedTime, setRecordedTime] = useState(`${String(initialRecordedDate.getHours()).padStart(2, '0')}:${String(initialRecordedDate.getMinutes()).padStart(2, '0')}`);
  const [nightMode, setNightMode] = useState<NightMode>('interval');
  const [nightStart, setNightStart] = useState('22:00');
  const [nightEnd, setNightEnd] = useState('06:00');
  const [nightInterval, setNightInterval] = useState('2');
  const [manualTimes, setManualTimes] = useState(['23:00', '02:00']);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<string>();
  const [reduceMotion, setReduceMotion] = useState(false);
  const editing = Boolean(editingTemperature || editingMedication);
  const selectedRecordedDate = parseGermanDate(recordedDate);
  const isBackdatedSelection = Boolean(selectedRecordedDate && !isSameCalendarDay(selectedRecordedDate, new Date()));

  const title = useMemo(
    () => editing
      ? 'Eintrag korrigieren'
      : kind === 'temperature'
        ? isBackdatedSelection ? 'Messung nachtragen' : 'Messung erfassen'
        : kind === 'medication'
          ? isBackdatedSelection ? 'Gabe nachtragen' : 'Gabe dokumentieren'
          : 'Nachtalarm',
    [editing, isBackdatedSelection, kind],
  );
  const nightAlarmActiveNow = Boolean(nightAlarmActiveUntil && new Date(nightAlarmActiveUntil).getTime() > Date.now());
  const temperatureGuidance = getTemperatureGuidance(temperatureValue, activeChild?.birthDate);
  const temperatureBackground = temperatureAnimation.interpolate({
    inputRange: [34, 35, 36.5, 37.6, temperatureGuidance.feverFrom, 39, 43],
    outputRange: ['#B9D2EA', '#7BA8CC', '#E2F1E5', '#F9E7B7', '#F6D6D0', '#F5C7C7', '#F0A9A9'],
  });
  const nightPreview = useMemo(() => nightMode === 'interval'
    ? buildIntervalSchedule(nightStart, nightEnd, nightInterval)
    : buildManualSchedule(manualTimes), [manualTimes, nightEnd, nightInterval, nightMode, nightStart]);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => undefined);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => subscription.remove();
  }, []);

  function selectInventoryItem(id?: string) {
    setSelectedInventoryId(id);
    const item = medicationInventory.find((candidate) => candidate.id === id);
    setMedicationName(item?.name ?? '');
    setAmount(item?.defaultAmount ?? '');
    setMedicationReminder(item?.defaultIntervalHours ?? '');
  }

  function handleTemperatureChange(next: number) {
    setTemperatureValue(next);
    if (reduceMotion) {
      temperatureAnimation.setValue(next);
      return;
    }
    Animated.timing(temperatureAnimation, { toValue: next, duration: 120, useNativeDriver: false }).start();
    Animated.sequence([
      Animated.spring(temperaturePulse, { toValue: 1.045, speed: 35, bounciness: 8, useNativeDriver: true }),
      Animated.spring(temperaturePulse, { toValue: 1, speed: 35, bounciness: 8, useNativeDriver: true }),
    ]).start();
  }

  async function save() {
    if (!activeChild || saving || feedback) return;
    setErrors({});
    setFeedback(undefined);
    setSaving(true);
    try {
      if (kind === 'temperature') {
        const nextErrors: Record<string, string> = {};
        if (!Number.isFinite(temperatureValue) || temperatureValue < 34 || temperatureValue > 43) {
          nextErrors.temperature = 'Bitte wähle einen Wert zwischen 34,0 und 43,0 °C.';
        }
        const reminderText = temperatureReminder.trim();
        const hours = Number(reminderText.replace(',', '.'));
        if (reminderText && (!Number.isFinite(hours) || hours < 0.5 || hours > 24)) {
          nextErrors.temperatureReminder = 'Bitte einen Abstand zwischen 0,5 und 24 Stunden eingeben.';
        }
        const recordedAt = parseGermanDateTime(recordedDate, recordedTime);
        if (!recordedAt || recordedAt.getTime() > Date.now() + 60_000) {
          nextErrors.recordedAt = 'Bitte wähle einen gültigen Zeitpunkt, der nicht in der Zukunft liegt.';
        }
        if (Object.keys(nextErrors).length) {
          setErrors(nextErrors);
          return;
        }

        const entry = { temperature: temperatureValue, method, note: note.trim() || undefined, recordedAt: recordedAt!.toISOString() };
        const backdatedEntry = !isSameCalendarDay(recordedAt!, new Date());
        if (editingTemperature) {
          updateTemperature(editingTemperature.id, entry);
          setFeedback('Eintrag korrigiert.');
        } else {
          addTemperature(entry);
          setTemperatureReminderHours(reminderText ? hours : undefined);
          let reminderFeedback = '';
          if (backdatedEntry) {
            reminderFeedback = ' Rückwirkend dokumentiert; bestehende Erinnerungen bleiben unverändert.';
          } else {
            await cancelReminder(temperatureNotificationId);
            setTemperatureReminderSchedule();
          }
          if (!backdatedEntry && Number.isFinite(hours) && hours > 0 && !nightAlarmActiveNow) {
            const reminderAt = new Date(recordedAt!.getTime() + hours * 60 * 60 * 1000);
            if (reminderAt.getTime() <= Date.now()) {
              reminderFeedback = ' Der berechnete Erinnerungszeitpunkt liegt bereits zurück; es wurde kein Alarm erstellt.';
            } else {
              const scheduled = await scheduleReminder(reminderAt, 'Erinnerung von Fieberwache', 'Öffne die App, um deine geplante Dokumentation zu prüfen.');
              if (scheduled.status === 'scheduled') {
                setTemperatureReminderSchedule(reminderAt.toISOString(), scheduled.id);
                reminderFeedback = ` Nächste Erinnerung: ${formatAlarmTime(reminderAt)} Uhr.`;
              } else if (scheduled.status === 'unsupported') {
                reminderFeedback = ' Im Browser können keine zuverlässigen Gerätealarme aktiviert werden.';
              } else {
                reminderFeedback = ' Benachrichtigungen sind nicht freigegeben.';
              }
            }
          }
          setFeedback(`Messung gespeichert.${reminderFeedback}`);
        }
      }

      if (kind === 'medication') {
        const nextErrors: Record<string, string> = {};
        if (!medicationName.trim()) nextErrors.medicationName = 'Bitte trage den Namen so ein, wie er auf der Packung steht.';
        if (!amount.trim()) nextErrors.amount = 'Bitte dokumentiere die tatsächlich verabreichte Menge inklusive Einheit.';
        const hours = Number(medicationReminder.replace(',', '.'));
        if (medicationReminder.trim() && (!Number.isFinite(hours) || hours < 0.5 || hours > 24)) {
          nextErrors.medicationReminder = 'Bitte einen Abstand zwischen 0,5 und 24 Stunden eingeben.';
        }
        const recordedAt = parseGermanDateTime(recordedDate, recordedTime);
        if (!recordedAt || recordedAt.getTime() > Date.now() + 60_000) {
          nextErrors.recordedAt = 'Bitte wähle einen gültigen Zeitpunkt, der nicht in der Zukunft liegt.';
        }
        if (Object.keys(nextErrors).length) {
          setErrors(nextErrors);
          return;
        }

        await cancelReminder(editingMedication?.reminderNotificationId);
        const backdatedEntry = !isSameCalendarDay(recordedAt!, new Date());
        const reminderAt = Number.isFinite(hours) && hours > 0 ? new Date(recordedAt!.getTime() + hours * 60 * 60 * 1000) : undefined;
        const scheduled = !backdatedEntry && reminderAt && reminderAt.getTime() > Date.now()
          ? await scheduleReminder(reminderAt, 'Erinnerung von Fieberwache', 'Öffne die App, um deine geplante Dokumentation zu prüfen.')
          : undefined;
        const entry = {
          medicationId: selectedInventoryId,
          name: medicationName.trim(),
          amount: amount.trim(),
          recordedAt: recordedAt!.toISOString(),
          reminderAt: scheduled?.status === 'scheduled' ? reminderAt?.toISOString() : undefined,
          reminderNotificationId: scheduled?.status === 'scheduled' ? scheduled.id : undefined,
        };
        if (editingMedication) updateMedication(editingMedication.id, entry);
        else addMedication(entry);
        const baseFeedback = editing ? 'Eintrag korrigiert.' : 'Gabe gespeichert.';
        const medicationFeedback = backdatedEntry
          ? `${baseFeedback} Rückwirkend dokumentiert; es wurde keine Erinnerung verändert.`
          : !reminderAt
          ? baseFeedback
          : reminderAt.getTime() <= Date.now()
            ? `${baseFeedback} Der berechnete Erinnerungszeitpunkt liegt bereits zurück.`
            : scheduled?.status === 'scheduled'
              ? `${baseFeedback} Erinnerung um ${formatAlarmTime(reminderAt)} Uhr.`
              : `${baseFeedback} Die Geräteerinnerung konnte nicht aktiviert werden.`;
        setFeedback(medicationFeedback);
      }

      if (kind === 'night') {
        const schedule = nightMode === 'interval'
          ? buildIntervalSchedule(nightStart, nightEnd, nightInterval)
          : buildManualSchedule(manualTimes);
        if (schedule.error || schedule.dates.length === 0) {
          setErrors({ night: schedule.error ?? 'Bitte mindestens einen Alarm festlegen.' });
          return;
        }
        await cancelReminders(nightNotificationIds);
        const scheduled = await scheduleReminders(schedule.dates.map((date, index) => ({
          date,
          title: 'Nachtalarm von Fieberwache',
          body: schedule.dates.length > 1
            ? `Geplanter Nachtalarm ${index + 1} von ${schedule.dates.length}. Öffne die App für Details.`
            : 'Öffne die App, um deine geplante Dokumentation zu prüfen.',
        })));
        if (scheduled.status !== 'scheduled') {
          setErrors({ notification: scheduled.status === 'unsupported'
            ? 'Nachtalarme funktionieren nicht zuverlässig in der Browser-Version. Nutze dafür die installierte iPhone- oder Android-App.'
            : 'Benachrichtigungen sind nicht freigegeben. Öffne die Geräteeinstellungen und erlaube sie für Fieberwache.' });
          return;
        }
        const activeUntil = schedule.dates[schedule.dates.length - 1]?.toISOString();
        setNightAlarm(activeUntil, schedule.dates.map(formatAlarmTime).join(' · '), schedule.dates.map((date) => date.toISOString()), scheduled.ids);
        await cancelReminder(temperatureNotificationId);
        setTemperatureReminderSchedule();
        setFeedback(nightAlarmActiveNow ? 'Nachtalarm aktualisiert.' : 'Nachtalarm aktiviert.');
      }
      setTimeout(() => router.back(), 850);
    } finally {
      setSaving(false);
    }
  }

  async function deactivateNightAlarm() {
    if (saving) return;
    setSaving(true);
    await cancelReminders(nightNotificationIds);
    setNightAlarm();
    setFeedback('Nachtalarm ausgeschaltet.');
    setSaving(false);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.safe} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.handle} />
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="Eingabe schließen" onPress={() => router.back()} hitSlop={12}><Text style={styles.close}>Schließen</Text></Pressable>
          <Text style={styles.headerTitle}>{title}</Text>
          <View style={styles.headerSpacer} />
        </View>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.forChild}>Für {activeChild?.name ?? 'das aktive Kinderprofil'}</Text>
          {feedback ? (
            <View accessibilityLiveRegion="polite" style={styles.successBanner}>
              <View style={styles.successIcon}><IconSymbol name="checkmark" size={18} color={Design.colors.sageStrong} /></View>
              <Text style={styles.successText}>{feedback}</Text>
            </View>
          ) : null}
          {errors.notification ? (
            <View accessibilityLiveRegion="polite" style={styles.permissionBanner}>
              <View style={styles.permissionCopy}><Text style={styles.permissionTitle}>Gerätealarm nicht verfügbar</Text><Text style={styles.permissionText}>{errors.notification}</Text></View>
              {Platform.OS !== 'web' ? <AppButton label="Einstellungen öffnen" compact variant="secondary" onPress={openNotificationSettings} /> : null}
            </View>
          ) : null}

          {kind === 'temperature' ? (
            <View style={styles.form}>
              <View style={styles.labelRow}><Text style={styles.label}>Körpertemperatur</Text><InfoButton title="Körpertemperatur" text="Schiebe den Regler auf den gemessenen Wert. Die Farbe ist nur eine Orientierung und ersetzt keine ärztliche Einschätzung." /></View>
              <Animated.View style={[styles.temperatureInputRow, errors.temperature && styles.temperatureInputError, { backgroundColor: temperatureBackground }]}>
                <Animated.View style={{ transform: [{ scale: temperaturePulse }], alignItems: 'center' }}>
                  <View style={styles.temperatureReadout}><Text style={styles.temperatureValue}>{temperatureValue.toFixed(1).replace('.', ',')}</Text><Text style={[styles.unit, { color: temperatureGuidance.color }]}>°C</Text></View>
                  <View style={[styles.temperatureStatusPill, temperatureGuidance.status === 'hypothermia' && styles.statusHypothermia, temperatureGuidance.status === 'low' && styles.statusLow, temperatureGuidance.status === 'normal' && styles.statusNormal, temperatureGuidance.status === 'elevated' && styles.statusElevated, temperatureGuidance.status === 'fever' && styles.statusFever, temperatureGuidance.status === 'highFever' && styles.statusHighFever]}><Text style={[styles.temperatureStatusText, { color: temperatureGuidance.color }]}>{temperatureGuidance.label}</Text></View>
                </Animated.View>
                <Text style={styles.sliderHint}>Mit dem Regler einstellen</Text>
                <Slider
                  accessibilityLabel="Körpertemperatur einstellen"
                  minimumValue={34}
                  maximumValue={43}
                  step={0.1}
                  value={temperatureValue}
                  onValueChange={handleTemperatureChange}
                  minimumTrackTintColor={temperatureGuidance.color}
                  maximumTrackTintColor="#D7D0E3"
                  thumbTintColor={temperatureGuidance.color}
                  style={styles.slider}
                />
                <View style={styles.sliderLabels}><Text style={styles.sliderLabel}>34,0°</Text><Text style={styles.sliderLabel}>43,0°</Text></View>
                <Text style={styles.temperatureGuidance}>{temperatureGuidance.detail}</Text>
              </Animated.View>
              {errors.temperature ? <Text style={styles.inlineError}>{errors.temperature}</Text> : null}
              <Text style={styles.label}>Messmethode</Text>
              <View style={styles.chips}>{METHODS.map((value) => <Pressable accessibilityRole="radio" accessibilityState={{ checked: method === value }} accessibilityLabel={`Messmethode ${value}`} key={value} onPress={() => setMethod(value)} style={[styles.chip, method === value && styles.chipActive]}><Text style={[styles.chipText, method === value && styles.chipTextActive]}>{value}</Text></Pressable>)}</View>
              <View style={styles.dateTimeRow}>
                <AppDateTimeInput label="Datum" value={recordedDate} onChange={setRecordedDate} maximumDate={new Date()} containerStyle={styles.dateField} error={errors.recordedAt} />
                <AppDateTimeInput label="Uhrzeit" mode="time" value={recordedTime} onChange={setRecordedTime} containerStyle={styles.timeField} />
              </View>
              {isBackdatedSelection ? (
                <View style={styles.backdateNotice}>
                  <View style={styles.backdateIcon}><IconSymbol name="calendar-check" size={18} color={Design.colors.primaryDark} /></View>
                  <View style={styles.backdateCopy}><Text style={styles.backdateTitle}>Rückwirkender Eintrag</Text><Text style={styles.backdateText}>Die Messung wird diesem Tag zugeordnet. Bestehende Erinnerungen werden nicht verschoben.</Text></View>
                </View>
              ) : null}
              {!editingTemperature && !isBackdatedSelection ? <AppInput error={errors.temperatureReminder} label="Standard-Erinnerung für jede Messung" optional value={temperatureReminder} onChangeText={setTemperatureReminder} placeholder="z. B. 4" keyboardType="decimal-pad" suffix="Stunden" helper={nightAlarmActiveNow ? 'Nachtalarm aktiv — diese Standard-Erinnerung ist für die aktuelle Messung pausiert.' : 'Wird gespeichert und künftig nach jeder Messung automatisch verwendet.'} /> : null}
              <AppInput label="Notiz" optional value={note} onChangeText={setNote} placeholder="Wie geht es dem Kind?" multiline />
            </View>
          ) : null}

          {kind === 'medication' ? (
            <View style={styles.form}>
              <View style={styles.notice}><View style={styles.noticeHeading}><Text style={styles.noticeTitle}>Nur dokumentieren</Text><InfoButton title="Medikamentengabe" text="Die App dokumentiert deine Eingabe, prüft aber weder Medikament, Menge noch medizinischen Einnahmeabstand." /></View><Text style={styles.noticeCopy}>Die App prüft weder Mittel noch Menge oder Einnahmeabstand.</Text></View>
              {medicationInventory.length > 0 ? (
                <>
                  <Text style={styles.label}>Aus Inventar auswählen</Text>
                  <View style={styles.inventoryChoices}>
                    {medicationInventory.map((item) => {
                      const selected = selectedInventoryId === item.id;
                      return (
                        <Pressable accessibilityRole="radio" accessibilityState={{ checked: selected }} accessibilityLabel={`${item.name} aus Inventar auswählen`} key={item.id} onPress={() => selectInventoryItem(item.id)} style={[styles.inventoryChoice, selected && styles.inventoryChoiceSelected]}>
                          <View style={[styles.inventoryChoiceIcon, selected && styles.inventoryChoiceIconSelected]}><IconSymbol name="pills.fill" size={17} color={selected ? '#FFFFFF' : Design.colors.primaryDark} /></View>
                          <View style={styles.inventoryChoiceCopy}><Text style={[styles.inventoryChoiceName, selected && styles.inventoryChoiceNameSelected]}>{item.name}</Text><Text style={styles.inventoryChoiceMeta}>{item.defaultIntervalHours ? `${item.defaultIntervalHours} Std. voreingestellt` : 'Ohne Erinnerung'}</Text></View>
                          <View style={[styles.choiceRadio, selected && styles.choiceRadioSelected]}>{selected ? <View style={styles.choiceRadioDot} /> : null}</View>
                        </Pressable>
                      );
                    })}
                    <Pressable accessibilityRole="radio" accessibilityState={{ checked: !selectedInventoryId }} accessibilityLabel="Freie Medikamenteneingabe" onPress={() => selectInventoryItem(undefined)} style={[styles.freeChoice, !selectedInventoryId && styles.freeChoiceSelected]}><Text style={styles.freeChoiceText}>＋ Freie Eingabe</Text></Pressable>
                  </View>
                </>
              ) : null}
              <AppInput error={errors.medicationName} label="Name laut Packung" value={medicationName} onChangeText={setMedicationName} placeholder="Selbst eingeben" autoFocus />
              <AppInput error={errors.amount} label="Verabreichte Menge" value={amount} onChangeText={setAmount} placeholder="z. B. eigene Angabe mit Einheit" />
              <View style={styles.dateTimeRow}>
                <AppDateTimeInput label="Datum" value={recordedDate} onChange={setRecordedDate} maximumDate={new Date()} containerStyle={styles.dateField} error={errors.recordedAt} />
                <AppDateTimeInput label="Uhrzeit" mode="time" value={recordedTime} onChange={setRecordedTime} containerStyle={styles.timeField} />
              </View>
              {isBackdatedSelection ? (
                <View style={styles.backdateNotice}>
                  <View style={styles.backdateIcon}><IconSymbol name="calendar-check" size={18} color={Design.colors.primaryDark} /></View>
                  <View style={styles.backdateCopy}><Text style={styles.backdateTitle}>Rückwirkender Eintrag</Text><Text style={styles.backdateText}>Die Gabe wird diesem Tag zugeordnet. Es wird keine nachträgliche Erinnerung ausgelöst.</Text></View>
                </View>
              ) : (
                <AppInput error={errors.medicationReminder} label="Erinnerung in Stunden" optional value={medicationReminder} onChangeText={setMedicationReminder} placeholder="Von dir festgelegtes Intervall" keyboardType="decimal-pad" suffix="Stunden" helper={`${selectedInventoryId ? 'Aus deinem Inventar übernommen und für diese Gabe anpassbar. ' : ''}Die Erinnerung bedeutet nicht, dass eine weitere Gabe medizinisch erlaubt ist.`} />
              )}
            </View>
          ) : null}

          {kind === 'night' ? (
            <View style={styles.form}>
              <View style={styles.nightHero}><View style={styles.nightHeroTop}><View style={styles.moon}><IconSymbol name="moon.stars.fill" size={30} color={Design.colors.primaryDark} /></View><InfoButton title="Nachtalarm" text="Lege mehrere Nachtmessungen als Intervall oder einzelne Uhrzeiten fest. Während des aktiven Nachtplans pausiert die Standard-Erinnerung." /></View><Text style={styles.nightTitle}>Deine Nacht, dein Rhythmus</Text><Text style={styles.nightCopy}>Wähle ein regelmäßiges Intervall oder stelle einzelne Uhrzeiten frei zusammen.</Text></View>
              {nightAlarmActiveNow ? (
                <View style={styles.activeAlarmCard}>
                  <View style={styles.activeAlarmIcon}><IconSymbol name="checkmark" size={20} color={Design.colors.sageStrong} /></View>
                  <View style={styles.activeAlarmCopy}>
                    <Text style={styles.activeAlarmTitle}>Nachtalarm ist aktiv</Text>
                    <Text style={styles.activeAlarmText}>{nightAlarmSummary ? `Geplant: ${nightAlarmSummary}` : 'Die Standard-Erinnerung ist pausiert.'}</Text>
                  </View>
                  <Pressable accessibilityRole="button" accessibilityLabel="Nachtalarm ausschalten" onPress={deactivateNightAlarm} style={styles.deactivateButton}><IconSymbol name="xmark" size={18} color={Design.colors.danger} /></Pressable>
                </View>
              ) : null}
              <View style={styles.nightModeSwitch}>
                {([['interval', 'Im Intervall'], ['manual', 'Manuell']] as [NightMode, string][]).map(([value, label]) => (
                  <Pressable accessibilityRole="radio" accessibilityState={{ checked: nightMode === value }} key={value} onPress={() => setNightMode(value)} style={[styles.nightModeButton, nightMode === value && styles.nightModeButtonActive]}>
                    <Text style={[styles.nightModeText, nightMode === value && styles.nightModeTextActive]}>{label}</Text>
                  </Pressable>
                ))}
              </View>

              {nightMode === 'interval' ? (
                <>
                  <Text style={styles.label}>Zeitraum</Text>
                  <View style={styles.timeRangeRow}>
                    <AppDateTimeInput label="Von" mode="time" value={nightStart} onChange={setNightStart} containerStyle={styles.nightTimeField} />
                    <Text style={styles.rangeArrow}>→</Text>
                    <AppDateTimeInput label="Bis" mode="time" value={nightEnd} onChange={setNightEnd} containerStyle={styles.nightTimeField} />
                  </View>
                  <Text style={styles.label}>Wiederholen alle</Text>
                  <View style={styles.intervalInputWrap}><TextInput value={nightInterval} onChangeText={setNightInterval} placeholder="2" placeholderTextColor="#A4ADAB" keyboardType="decimal-pad" style={styles.intervalInput} /><Text style={styles.intervalUnit}>Stunden</Text></View>
                  <Text style={styles.helper}>Ein Zeitraum wie 22:00 bis 06:00 wird automatisch über Mitternacht geplant.</Text>
                </>
              ) : (
                <>
                  <Text style={styles.label}>Einzelne Alarmzeiten</Text>
                  {manualTimes.map((value, index) => (
                    <View style={styles.manualTimeRow} key={`manual-${index}`}>
                      <AppDateTimeInput
                        containerStyle={styles.manualTimeInput}
                        label={`Uhrzeit ${index + 1}`}
                        mode="time"
                        value={value}
                        onChange={(next) => setManualTimes((current) => current.map((item, itemIndex) => itemIndex === index ? next : item))}
                      />
                      <Pressable accessibilityRole="button" accessibilityLabel={`Uhrzeit ${index + 1} entfernen`} onPress={() => setManualTimes((current) => current.filter((_, itemIndex) => itemIndex !== index))} style={styles.removeTimeButton}>
                        <Text style={styles.removeTimeText}>−</Text>
                      </Pressable>
                    </View>
                  ))}
                  <Pressable disabled={manualTimes.length >= 12} onPress={() => setManualTimes((current) => [...current, ''])} style={[styles.addTimeButton, manualTimes.length >= 12 && { opacity: 0.4 }]}>
                    <Text style={styles.addTimeText}>＋ Weitere Uhrzeit</Text>
                  </Pressable>
                  <Text style={styles.helper}>Vergangene Uhrzeiten werden für den nächsten Tag geplant.</Text>
                </>
              )}

              <View style={[styles.previewCard, nightPreview.error && styles.previewCardError]}>
                <View style={styles.previewBadge}><Text style={styles.previewBadgeText}>{nightPreview.error ? '!' : nightPreview.dates.length}</Text></View>
                <View style={styles.previewCopy}>
                  <Text style={styles.previewTitle}>{nightPreview.error ? 'Zeitplan noch unvollständig' : `${nightPreview.dates.length} ${nightPreview.dates.length === 1 ? 'Alarm' : 'Alarme'} geplant`}</Text>
                  <Text style={styles.previewTimes}>{nightPreview.error ?? nightPreview.dates.map(formatAlarmTime).join(' · ')}</Text>
                </View>
              </View>
              {errors.night ? <Text accessibilityLiveRegion="polite" style={styles.inlineError}>{errors.night}</Text> : null}
            </View>
          ) : null}
        </ScrollView>
        <View style={styles.footer}><AppButton label={feedback ? 'Gespeichert' : saving ? 'Wird gespeichert …' : editing ? 'Änderungen speichern' : kind === 'night' ? (nightAlarmActiveNow ? 'Nachtalarm aktualisieren' : 'Alarm aktivieren') : 'Speichern'} onPress={save} disabled={saving || Boolean(feedback)} /></View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Design.colors.background },
  handle: { width: 42, height: 5, borderRadius: 3, backgroundColor: '#D9D3DC', alignSelf: 'center', marginTop: 8, marginBottom: 1 },
  header: { height: 54, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  close: { color: Design.colors.primaryDark, fontSize: 14, lineHeight: 19, fontFamily: Design.fonts.bold },
  headerTitle: { color: Design.colors.ink, fontSize: 17, lineHeight: 23, fontFamily: Design.fonts.bold },
  headerSpacer: { width: 65 },
  content: { width: '100%', maxWidth: 620, alignSelf: 'center', padding: 20, paddingTop: 12, paddingBottom: 35, gap: 18 },
  forChild: { color: Design.colors.inkSoft, textAlign: 'center', fontSize: 13, lineHeight: 18, fontFamily: Design.fonts.semiBold },
  segmented: { flexDirection: 'row', padding: 5, borderRadius: 20, backgroundColor: Design.colors.backgroundMuted },
  segment: { flex: 1, minHeight: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  segmentActive: { backgroundColor: Design.colors.surface },
  segmentText: { color: Design.colors.inkSoft, fontSize: 12, lineHeight: 17, fontFamily: Design.fonts.semiBold },
  segmentTextActive: { color: Design.colors.primaryDark, fontFamily: Design.fonts.bold },
  successBanner: { borderRadius: Design.radius.medium, backgroundColor: Design.colors.sage, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  successIcon: { width: 34, height: 34, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.7)', alignItems: 'center', justifyContent: 'center' },
  successText: { flex: 1, color: Design.colors.ink, fontSize: 13, lineHeight: 19, fontFamily: Design.fonts.bold },
  permissionBanner: { borderRadius: Design.radius.medium, backgroundColor: Design.colors.dangerSoft, padding: 15, gap: 12, borderWidth: 1, borderColor: '#E9C7C1' },
  permissionCopy: { gap: 3 },
  permissionTitle: { color: Design.colors.danger, fontSize: 14, lineHeight: 19, fontFamily: Design.fonts.bold },
  permissionText: { color: Design.colors.inkSoft, fontSize: 12, lineHeight: 18, fontFamily: Design.fonts.regular },
  form: { gap: 14 },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { color: Design.colors.ink, fontSize: 13, lineHeight: 18, fontFamily: Design.fonts.bold, marginTop: 7 },
  temperatureInputRow: { minHeight: 218, borderRadius: Design.radius.hero, backgroundColor: Design.colors.primarySoft, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 19, paddingVertical: 19 },
  temperatureInputError: { borderWidth: 1.5, borderColor: Design.colors.danger },
  inlineError: { color: Design.colors.danger, fontSize: 12, lineHeight: 17, fontFamily: Design.fonts.semiBold },
  temperatureReadout: { flexDirection: 'row', alignItems: 'flex-start' },
  temperatureValue: { color: Design.colors.ink, fontSize: 54, lineHeight: 62, fontFamily: Design.fonts.bold, letterSpacing: -2.2 },
  unit: { color: Design.colors.primary, fontSize: 23, fontFamily: Design.fonts.bold, marginLeft: 6 },
  temperatureStatusPill: { borderRadius: 14, paddingHorizontal: 12, paddingVertical: 6, marginTop: 3 },
  statusHypothermia: { backgroundColor: 'rgba(255,255,255,0.72)' },
  statusLow: { backgroundColor: 'rgba(255,255,255,0.68)' },
  statusNormal: { backgroundColor: 'rgba(255,255,255,0.65)' },
  statusElevated: { backgroundColor: 'rgba(255,255,255,0.58)' },
  statusFever: { backgroundColor: 'rgba(255,255,255,0.58)' },
  statusHighFever: { backgroundColor: 'rgba(255,255,255,0.62)' },
  temperatureStatusText: { fontSize: 12, lineHeight: 17, fontFamily: Design.fonts.bold },
  sliderHint: { color: Design.colors.inkSoft, fontSize: 12, lineHeight: 17, fontFamily: Design.fonts.regular, marginTop: 8, marginBottom: 1 },
  slider: { width: '100%', height: 44 },
  sliderLabels: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', marginTop: -2 },
  sliderLabel: { color: Design.colors.inkSoft, fontSize: 11, lineHeight: 15, fontFamily: Design.fonts.semiBold },
  temperatureGuidance: { color: Design.colors.inkSoft, fontSize: 12, lineHeight: 18, textAlign: 'center', fontFamily: Design.fonts.regular, marginTop: 6 },
  input: { minHeight: 54, backgroundColor: Design.colors.surface, borderWidth: 0, borderRadius: 17, paddingHorizontal: 16, color: Design.colors.ink, fontSize: 14, fontFamily: Design.fonts.semiBold, shadowColor: Design.colors.shadow, shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
  multiline: { minHeight: 84, paddingTop: 14, textAlignVertical: 'top' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { minHeight: 44, paddingHorizontal: 15, borderRadius: 16, backgroundColor: Design.colors.surface, alignItems: 'center', justifyContent: 'center' },
  chipActive: { backgroundColor: Design.colors.lavender },
  chipText: { color: Design.colors.inkSoft, fontSize: 12, fontFamily: Design.fonts.bold },
  chipTextActive: { color: Design.colors.primaryDark, fontFamily: Design.fonts.bold },
  dateTimeRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', gap: 10 },
  dateField: { flexGrow: 1, flexBasis: 190 },
  timeField: { flexGrow: 1, flexBasis: 140 },
  backdateNotice: { minHeight: 70, borderRadius: Design.radius.medium, borderWidth: 1, borderColor: '#D7CEE8', backgroundColor: Design.colors.primarySoft, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  backdateIcon: { width: 38, height: 38, borderRadius: 14, backgroundColor: Design.colors.surface, alignItems: 'center', justifyContent: 'center' },
  backdateCopy: { flex: 1, gap: 2 },
  backdateTitle: { color: Design.colors.primaryDark, fontSize: 13, lineHeight: 18, fontFamily: Design.fonts.bold },
  backdateText: { color: Design.colors.inkSoft, fontSize: 12, lineHeight: 17, fontFamily: Design.fonts.regular },
  helper: { color: Design.colors.inkSoft, fontSize: 12, lineHeight: 18, marginTop: -3, fontFamily: Design.fonts.regular },
  notice: { backgroundColor: Design.colors.accentSoft, borderRadius: 20, padding: 17, gap: 4, marginBottom: 3 },
  noticeHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  noticeTitle: { color: Design.colors.danger, fontSize: 14, lineHeight: 19, fontFamily: Design.fonts.bold },
  noticeCopy: { color: '#795B53', fontSize: 12, lineHeight: 18, fontFamily: Design.fonts.regular },
  inventoryChoices: { gap: 8 },
  inventoryChoice: { minHeight: 68, borderRadius: 20, backgroundColor: Design.colors.surface, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: 'transparent' },
  inventoryChoiceSelected: { backgroundColor: Design.colors.primarySoft, borderColor: '#C8BFE2' },
  inventoryChoiceIcon: { width: 40, height: 40, borderRadius: 14, backgroundColor: Design.colors.accentSoft, alignItems: 'center', justifyContent: 'center', marginRight: 11 },
  inventoryChoiceIconSelected: { backgroundColor: Design.colors.primaryDark },
  inventoryChoiceEmoji: { color: Design.colors.primaryDark, fontSize: 14, fontFamily: Design.fonts.extraBold },
  inventoryChoiceCopy: { flex: 1 },
  inventoryChoiceName: { color: Design.colors.ink, fontSize: 14, lineHeight: 19, fontFamily: Design.fonts.bold },
  inventoryChoiceNameSelected: { color: Design.colors.primaryDark },
  inventoryChoiceMeta: { color: Design.colors.inkSoft, fontSize: 11, lineHeight: 16, fontFamily: Design.fonts.regular, marginTop: 2 },
  choiceRadio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#D5D0DA', alignItems: 'center', justifyContent: 'center' },
  choiceRadioSelected: { borderColor: Design.colors.primary },
  choiceRadioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Design.colors.primary },
  freeChoice: { height: 48, borderRadius: 16, borderWidth: 1, borderStyle: 'dashed', borderColor: '#D5D0DA', alignItems: 'center', justifyContent: 'center' },
  freeChoiceSelected: { backgroundColor: Design.colors.surface, borderColor: Design.colors.primary },
  freeChoiceText: { color: Design.colors.primaryDark, fontSize: 12, lineHeight: 17, fontFamily: Design.fonts.bold },
  nightHero: { backgroundColor: Design.colors.primarySoft, borderRadius: Design.radius.large, padding: 26, alignItems: 'center', gap: 8, marginBottom: 5 },
  nightHeroTop: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  activeAlarmCard: { backgroundColor: Design.colors.sage, borderRadius: 20, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 11 },
  activeAlarmIcon: { width: 36, height: 36, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.7)', alignItems: 'center', justifyContent: 'center' },
  activeAlarmIconText: { color: '#4D8B72', fontSize: 19, fontFamily: Design.fonts.extraBold },
  activeAlarmCopy: { flex: 1, gap: 2 },
  activeAlarmTitle: { color: Design.colors.ink, fontSize: 14, lineHeight: 19, fontFamily: Design.fonts.bold },
  activeAlarmText: { color: Design.colors.inkSoft, fontSize: 12, lineHeight: 18, fontFamily: Design.fonts.regular },
  deactivateButton: { width: 44, height: 44, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.72)', alignItems: 'center', justifyContent: 'center' },
  moon: { width: 54, height: 54, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.68)', alignItems: 'center', justifyContent: 'center' },
  nightTitle: { color: Design.colors.ink, ...Design.type.section, fontFamily: Design.fonts.bold, textAlign: 'center' },
  nightCopy: { color: Design.colors.inkSoft, fontSize: 12, lineHeight: 18, textAlign: 'center', fontFamily: Design.fonts.regular },
  nightModeSwitch: { flexDirection: 'row', backgroundColor: Design.colors.backgroundMuted, padding: 5, borderRadius: 20, marginBottom: 2 },
  nightModeButton: { flex: 1, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  nightModeButtonActive: { backgroundColor: '#FFFFFF', shadowColor: Design.colors.shadow, shadowOpacity: 0.06, shadowRadius: 7, shadowOffset: { width: 0, height: 3 } },
  nightModeText: { color: Design.colors.inkSoft, fontSize: 12, fontFamily: Design.fonts.bold },
  nightModeTextActive: { color: Design.colors.primaryDark, fontFamily: Design.fonts.extraBold },
  timeRangeRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  nightTimeField: { flex: 1 },
  timeFieldWrap: { flex: 1, backgroundColor: Design.colors.surface, borderRadius: 18, paddingHorizontal: 14, paddingTop: 9, paddingBottom: 8, shadowColor: Design.colors.shadow, shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
  timeFieldLabel: { color: Design.colors.primaryDark, fontSize: 11, lineHeight: 15, fontFamily: Design.fonts.bold },
  rangeInput: { height: 36, color: Design.colors.ink, fontSize: 20, fontFamily: Design.fonts.bold, padding: 0 },
  rangeArrow: { color: Design.colors.primary, fontSize: 20, fontFamily: Design.fonts.bold },
  intervalInputWrap: { height: 57, borderRadius: 18, backgroundColor: Design.colors.surface, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, shadowColor: Design.colors.shadow, shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
  intervalInput: { flex: 1, color: Design.colors.ink, fontSize: 20, fontFamily: Design.fonts.extraBold },
  intervalUnit: { color: Design.colors.inkSoft, fontSize: 13, fontFamily: Design.fonts.bold },
  manualTimeRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 9 },
  manualTimeInput: { flex: 1 },
  removeTimeButton: { width: 48, height: 54, borderRadius: 17, backgroundColor: Design.colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  removeTimeText: { color: Design.colors.danger, fontSize: 23, lineHeight: 25, fontFamily: Design.fonts.extraBold },
  addTimeButton: { height: 48, borderRadius: 16, borderWidth: 1, borderStyle: 'dashed', borderColor: '#C9C1DC', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.45)' },
  addTimeText: { color: Design.colors.primary, fontSize: 12, fontFamily: Design.fonts.extraBold },
  previewCard: { backgroundColor: Design.colors.sage, borderRadius: 20, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 11, marginTop: 4 },
  previewCardError: { backgroundColor: Design.colors.accentSoft },
  previewBadge: { width: 36, height: 36, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.65)', alignItems: 'center', justifyContent: 'center' },
  previewBadgeText: { color: Design.colors.primaryDark, fontSize: 15, fontFamily: Design.fonts.extraBold },
  previewCopy: { flex: 1, gap: 1 },
  previewTitle: { color: Design.colors.ink, fontSize: 13, lineHeight: 18, fontFamily: Design.fonts.bold },
  previewTimes: { color: Design.colors.inkSoft, fontSize: 12, lineHeight: 18, fontFamily: Design.fonts.regular },
  footer: { padding: 16, paddingBottom: Platform.OS === 'ios' ? 8 : 16, borderTopWidth: 0, backgroundColor: Design.colors.surface, shadowColor: Design.colors.shadow, shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: -4 } },
  saveButton: { backgroundColor: Design.colors.primaryDark, borderRadius: 18, minHeight: 55, alignItems: 'center', justifyContent: 'center' },
  saveButtonText: { color: '#FFFFFF', fontSize: 15, fontFamily: Design.fonts.extraBold },
});
