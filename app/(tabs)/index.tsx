import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ImageBackground, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChildAvatar } from '@/components/child-avatar';
import { EmptyChild } from '@/components/empty-child';
import { ReminderCenter } from '@/components/reminder-center';
import { AppDialog } from '@/components/ui/app-dialog';
import { Design } from '@/constants/design';
import { useConnectivity } from '@/lib/use-connectivity';
import { useStore } from '@/lib/store';
import { getTemperatureGuidance } from '@/lib/temperature-guidance';

const DASHBOARD = Design.dashboard;
const WEEKDAY_LABELS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

function dateKey(value: Date | string) {
  const date = typeof value === 'string' ? new Date(value) : value;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getCurrentWeek(today = new Date()) {
  const mondayOffset = (today.getDay() + 6) % 7;
  const monday = new Date(today);
  monday.setHours(12, 0, 0, 0);
  monday.setDate(today.getDate() - mondayOffset);
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return date;
  });
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

function formatMonth(value: Date) {
  return new Intl.DateTimeFormat('de-DE', { month: 'long', year: 'numeric' }).format(value);
}

function formatSelectedDate(value: Date) {
  return new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(value);
}

function formatMeasurementTime(value: string, selectedIsToday: boolean) {
  if (!selectedIsToday) return `${formatSelectedDate(new Date(value))}, ${formatTime(value)} Uhr`;
  const minutes = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60_000));
  if (minutes < 2) return 'Heute, gerade eben';
  if (minutes < 60) return `Heute, vor ${minutes} Minuten`;
  const hours = Math.floor(minutes / 60);
  return `Heute, vor ${hours} ${hours === 1 ? 'Stunde' : 'Stunden'}`;
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 11) return 'Guten Morgen,';
  if (hour < 18) return 'Guten Tag,';
  return 'Guten Abend,';
}

export default function HomeScreen() {
  const {
    activeChild,
    temperatures,
    nightAlarmActive,
    storageError,
    syncStatus,
  } = useStore();
  const connected = useConnectivity();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const desktop = width >= 768;
  const scrollRef = useRef<ScrollView>(null);
  const [todayKey, setTodayKey] = useState(() => dateKey(new Date()));
  const [selectedDateKey, setSelectedDateKey] = useState(todayKey);
  const [remindersY, setRemindersY] = useState(0);
  const [captureMenuOpen, setCaptureMenuOpen] = useState(false);
  const weekDays = useMemo(() => getCurrentWeek(new Date(`${todayKey}T12:00:00`)), [todayKey]);

  useEffect(() => {
    const interval = setInterval(() => setTodayKey(dateKey(new Date())), 60_000);
    return () => clearInterval(interval);
  }, []);

  const selectedDate = weekDays.find((day) => dateKey(day) === selectedDateKey) ?? weekDays[0] ?? new Date();
  const selectedIsToday = selectedDateKey === todayKey;
  const selectedIsFuture = selectedDateKey > todayKey;
  const temperatureEntryRoute = `/modal?kind=temperature&date=${selectedDateKey}` as const;
  const medicationEntryRoute = `/modal?kind=medication&date=${selectedDateKey}` as const;
  const latestMeasurement = temperatures
    .filter((item) => item.childId === activeChild?.id && dateKey(item.recordedAt) === selectedDateKey)
    .sort((a, b) => a.recordedAt.localeCompare(b.recordedAt))
    .at(-1);
  const guidance = latestMeasurement ? getTemperatureGuidance(latestMeasurement.temperature, activeChild?.birthDate) : undefined;

  function openCapture(path: string) {
    setCaptureMenuOpen(false);
    router.push(path as never);
  }

  function showReminders() {
    scrollRef.current?.scrollTo({ y: Math.max(0, remindersY - 20), animated: true });
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.topBar}>
        <View style={[styles.topBarInner, { paddingHorizontal: desktop ? DASHBOARD.spacing.desktop : DASHBOARD.spacing.mobile }]}>
          <Pressable accessibilityRole="button" accessibilityLabel="Kinderprofil öffnen" onPress={() => router.push('/familie')} style={styles.identity}>
            <View style={styles.avatarRing}>
              {activeChild ? <ChildAvatar child={activeChild} size={40} /> : <MaterialIcons name="person" size={24} color={DASHBOARD.colors.primary} />}
            </View>
            <View>
              <Text style={styles.greeting}>{greeting()}</Text>
              <Text style={styles.identityTitle} numberOfLines={1}>{activeChild ? `${activeChild.name} & Familie` : 'Deine Familie'}</Text>
            </View>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Aktive Erinnerungen anzeigen" onPress={showReminders} style={({ pressed }) => [styles.notificationButton, pressed && styles.pressed]}>
            <MaterialIcons name="notifications-none" size={24} color={DASHBOARD.colors.primary} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          {
            paddingHorizontal: desktop ? DASHBOARD.spacing.desktop : DASHBOARD.spacing.mobile,
            paddingBottom: 128 + insets.bottom,
          },
        ]}>
        {storageError || syncStatus === 'error' ? (
          <View accessibilityLiveRegion="polite" style={styles.errorBanner}>
            <Text style={styles.errorTitle}>{storageError ? 'Speicherung unterbrochen' : 'Synchronisierung pausiert'}</Text>
            <Text style={styles.errorText}>{storageError ?? 'Die lokalen Daten bleiben erhalten und werden später erneut synchronisiert.'}</Text>
          </View>
        ) : null}
        {connected === false ? (
          <View accessibilityLiveRegion="polite" style={styles.offlineBanner}>
            <Text style={styles.offlineTitle}>Offline-Modus</Text>
            <Text style={styles.offlineText}>Du kannst weiter dokumentieren. Die Synchronisierung wird später fortgesetzt.</Text>
          </View>
        ) : null}

        {!activeChild ? <EmptyChild /> : (
          <>
            <View style={styles.calendarSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.pageTitle}>{selectedIsToday ? 'Heute' : formatSelectedDate(selectedDate)}</Text>
                <Text style={styles.monthLabel}>{formatMonth(selectedDate)}</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.calendarStrip}>
                {weekDays.map((day, index) => {
                  const key = dateKey(day);
                  const selected = key === selectedDateKey;
                  return (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`${WEEKDAY_LABELS[index]}, ${formatSelectedDate(day)} auswählen`}
                      accessibilityState={{ selected, disabled: key > todayKey }}
                      disabled={key > todayKey}
                      key={key}
                      onPress={() => setSelectedDateKey(key)}
                      style={({ pressed }) => [styles.calendarDay, selected && styles.calendarDayActive, key > todayKey && styles.calendarDayDisabled, pressed && styles.pressed]}>
                      <Text style={[styles.calendarWeekday, selected && styles.calendarTextActive]}>{WEEKDAY_LABELS[index]}</Text>
                      <Text style={[styles.calendarNumber, selected && styles.calendarTextActive]}>{day.getDate()}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            <View style={[styles.measurementCard, desktop && styles.measurementCardDesktop]}>
              <View style={styles.measurementMain}>
                <View style={styles.measurementIcon}>
                  <MaterialIcons name="device-thermostat" size={36} color={DASHBOARD.colors.onSecondaryContainer} />
                </View>
                <View style={styles.measurementCopy}>
                  <Text style={styles.measurementLabel}>LETZTE MESSUNG</Text>
                  {latestMeasurement ? (
                    <>
                      <View style={styles.measurementValueRow}>
                        <Text style={styles.measurementValue}>{latestMeasurement.temperature.toFixed(1).replace('.', ',')}</Text>
                        <Text style={styles.measurementUnit}>°C</Text>
                        <View style={styles.statusPill}><Text style={styles.statusText}>{guidance?.label ?? 'Dokumentiert'}</Text></View>
                      </View>
                      <Text style={styles.measurementMeta}>{formatMeasurementTime(latestMeasurement.recordedAt, selectedIsToday)}</Text>
                    </>
                  ) : (
                    <>
                      <Text style={styles.emptyMeasurement}>Noch keine Messung</Text>
                      <Text style={styles.measurementMeta}>{selectedIsToday ? 'Heute wurde noch kein Wert erfasst.' : 'Für diesen Tag ist kein Wert gespeichert.'}</Text>
                    </>
                  )}
                </View>
              </View>
              {!selectedIsFuture ? (
                <Pressable accessibilityRole="button" accessibilityLabel="Fieber messen" onPress={() => router.push(temperatureEntryRoute)} style={({ pressed }) => [styles.measureButton, desktop && styles.measureButtonDesktop, pressed && styles.pressed]}>
                  <MaterialIcons name="add" size={20} color={DASHBOARD.colors.onPrimary} />
                  <Text style={styles.measureButtonText}>{selectedIsToday ? 'Fieber messen' : 'Messung nachtragen'}</Text>
                </Pressable>
              ) : null}
            </View>

            {!selectedIsFuture ? (
              <View style={styles.quickSection}>
                <Text style={styles.sectionTitle}>{selectedIsToday ? 'Schnell eintragen' : 'Für diesen Tag nachtragen'}</Text>
                <View style={styles.quickGrid}>
                  <Pressable accessibilityRole="button" accessibilityLabel="Temperatur eintragen" onPress={() => router.push(temperatureEntryRoute)} style={({ pressed }) => [styles.quickTile, styles.quickTileHalf, pressed && styles.pressed]}>
                    <View style={[styles.quickIcon, { backgroundColor: DASHBOARD.colors.primarySoft }]}><MaterialIcons name="device-thermostat" size={24} color={DASHBOARD.colors.primary} /></View>
                    <Text style={styles.quickLabel}>Temperatur</Text>
                  </Pressable>
                  <Pressable accessibilityRole="button" accessibilityLabel="Medikament eintragen" onPress={() => router.push(medicationEntryRoute)} style={({ pressed }) => [styles.quickTile, styles.quickTileHalf, pressed && styles.pressed]}>
                    <View style={[styles.quickIcon, { backgroundColor: DASHBOARD.colors.secondarySoft }]}><MaterialIcons name="medical-services" size={24} color={DASHBOARD.colors.secondary} /></View>
                    <Text style={styles.quickLabel}>Medikament</Text>
                  </Pressable>
                  <Pressable accessibilityRole="button" accessibilityLabel="Arzttermin planen" onPress={() => router.push('/termine')} style={({ pressed }) => [styles.quickTile, styles.quickTileWide, pressed && styles.pressed]}>
                    <View style={[styles.quickIcon, { backgroundColor: DASHBOARD.colors.secondaryContainerSoft }]}><MaterialIcons name="calendar-today" size={24} color={DASHBOARD.colors.secondary} /></View>
                    <Text style={styles.quickLabel}>Arzttermin</Text>
                  </Pressable>
                </View>
              </View>
            ) : null}

            {selectedIsToday ? (
              <View onLayout={(event) => setRemindersY(event.nativeEvent.layout.y)}>
                <ReminderCenter appearance="dashboard" />
              </View>
            ) : null}

            <ImageBackground source={require('../../docs/stitch/gentle-child-health-tracker/assets/stitch-asset-03.jpg')} imageStyle={styles.motivationImage} style={styles.motivationCard}>
              <LinearGradient colors={[DASHBOARD.colors.overlay, DASHBOARD.colors.overlayTransparent]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={styles.motivationOverlay} />
              <View style={styles.motivationCopy}>
                <Text style={styles.motivationTitle}>Du machst das toll!</Text>
                <Text style={styles.motivationText}>Kleine Schritte geben Sicherheit im Familienalltag.</Text>
              </View>
            </ImageBackground>
          </>
        )}
      </ScrollView>

      {activeChild ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Schnell erfassen" onPress={() => setCaptureMenuOpen(true)} style={({ pressed }) => [styles.fab, { bottom: 96 + insets.bottom }, pressed && styles.pressed]}>
          <MaterialIcons name="add" size={30} color={DASHBOARD.colors.onPrimary} />
        </Pressable>
      ) : null}

      <AppDialog visible={captureMenuOpen} title="Schnell erfassen" subtitle={`Was möchtest du für ${activeChild?.name ?? 'dein Kind'} dokumentieren?`} onClose={() => setCaptureMenuOpen(false)}>
        <View style={styles.captureMenu}>
          <Pressable accessibilityRole="button" onPress={() => openCapture('/modal?kind=temperature')} style={styles.captureAction}><View style={styles.captureIcon}><MaterialIcons name="device-thermostat" size={24} color={DASHBOARD.colors.primary} /></View><View style={styles.captureCopy}><Text style={styles.captureTitle}>Temperatur</Text><Text style={styles.captureMeta}>Messung mit dem Regler erfassen</Text></View><MaterialIcons name="chevron-right" size={22} color={DASHBOARD.colors.outline} /></Pressable>
          <Pressable accessibilityRole="button" onPress={() => openCapture('/modal?kind=medication')} style={styles.captureAction}><View style={styles.captureIcon}><MaterialIcons name="medical-services" size={24} color={DASHBOARD.colors.secondary} /></View><View style={styles.captureCopy}><Text style={styles.captureTitle}>Medikament</Text><Text style={styles.captureMeta}>Gabe aus dem Inventar dokumentieren</Text></View><MaterialIcons name="chevron-right" size={22} color={DASHBOARD.colors.outline} /></Pressable>
          <Pressable accessibilityRole="button" accessibilityState={{ selected: nightAlarmActive }} onPress={() => openCapture('/modal?kind=night')} style={styles.captureAction}><View style={styles.captureIcon}><MaterialIcons name="bedtime" size={24} color={DASHBOARD.colors.primary} /></View><View style={styles.captureCopy}><Text style={styles.captureTitle}>{nightAlarmActive ? 'Nachtalarm aktiv' : 'Nachtalarm'}</Text><Text style={styles.captureMeta}>Intervall oder einzelne Uhrzeiten verwalten</Text></View><MaterialIcons name="chevron-right" size={22} color={DASHBOARD.colors.outline} /></Pressable>
        </View>
      </AppDialog>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: DASHBOARD.colors.background },
  topBar: { height: 64, backgroundColor: DASHBOARD.colors.translucentHeader, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: DASHBOARD.colors.borderSoft, zIndex: 5 },
  topBarInner: { width: '100%', maxWidth: 800, height: 64, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  identity: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  avatarRing: { width: 44, height: 44, borderRadius: 22, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: DASHBOARD.colors.primaryContainer, borderWidth: 2, borderColor: DASHBOARD.colors.primarySoft },
  greeting: { color: DASHBOARD.colors.onSurfaceVariant, fontSize: 12, lineHeight: 14, letterSpacing: 0.24, fontFamily: Design.fonts.dashboardMedium },
  identityTitle: { color: DASHBOARD.colors.primary, fontSize: 18, lineHeight: 24, fontFamily: Design.fonts.dashboardSemiBold, maxWidth: 230 },
  notificationButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: DASHBOARD.colors.primaryContainer, alignItems: 'center', justifyContent: 'center' },
  content: { width: '100%', maxWidth: 800, alignSelf: 'center', paddingTop: 16, gap: 32 },
  errorBanner: { borderRadius: 12, padding: 16, backgroundColor: Design.colors.dangerSoft, gap: 4 },
  errorTitle: { color: Design.colors.danger, fontSize: 14, lineHeight: 18, fontFamily: Design.fonts.dashboardSemiBold },
  errorText: { color: DASHBOARD.colors.onSurfaceVariant, fontSize: 14, lineHeight: 20, fontFamily: Design.fonts.dashboardRegular },
  offlineBanner: { borderRadius: 12, padding: 16, backgroundColor: Design.colors.yellow, gap: 4 },
  offlineTitle: { color: Design.colors.gold, fontSize: 14, lineHeight: 18, fontFamily: Design.fonts.dashboardSemiBold },
  offlineText: { color: DASHBOARD.colors.onSurfaceVariant, fontSize: 14, lineHeight: 20, fontFamily: Design.fonts.dashboardRegular },
  calendarSection: { gap: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 },
  pageTitle: { color: DASHBOARD.colors.onSurface, fontSize: 24, lineHeight: 32, letterSpacing: -0.48, fontFamily: Design.fonts.dashboardBold },
  monthLabel: { color: DASHBOARD.colors.primary, fontSize: 14, lineHeight: 16, letterSpacing: 0.14, textTransform: 'capitalize', fontFamily: Design.fonts.dashboardSemiBold },
  calendarStrip: { gap: 12, paddingVertical: 8 },
  calendarDay: { width: 56, height: 80, flexShrink: 0, borderRadius: 12, backgroundColor: DASHBOARD.colors.surfaceVariantSoft, alignItems: 'center', justifyContent: 'center', gap: 4 },
  calendarDayActive: { backgroundColor: DASHBOARD.colors.primary, ...DASHBOARD.shadow.active },
  calendarDayDisabled: { opacity: 1 },
  calendarWeekday: { color: DASHBOARD.colors.onSurfaceVariant, fontSize: 12, lineHeight: 14, letterSpacing: 0.24, fontFamily: Design.fonts.dashboardMedium },
  calendarNumber: { color: DASHBOARD.colors.onSurfaceVariant, fontSize: 20, lineHeight: 28, fontFamily: Design.fonts.dashboardSemiBold },
  calendarTextActive: { color: DASHBOARD.colors.onPrimary },
  measurementCard: { borderRadius: DASHBOARD.radius.card, padding: 24, backgroundColor: Design.colors.surface, gap: 24, ...DASHBOARD.shadow.card },
  measurementCardDesktop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  measurementMain: { flexDirection: 'row', alignItems: 'center', gap: 24, flex: 1 },
  measurementIcon: { width: 64, height: 64, borderRadius: 16, backgroundColor: DASHBOARD.colors.secondaryContainer, alignItems: 'center', justifyContent: 'center' },
  measurementCopy: { flex: 1 },
  measurementLabel: { color: DASHBOARD.colors.onSurfaceVariant, fontSize: 12, lineHeight: 14, letterSpacing: 1, fontFamily: Design.fonts.dashboardSemiBold },
  measurementValueRow: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 },
  measurementValue: { color: DASHBOARD.colors.onSurface, fontSize: 28, lineHeight: 36, letterSpacing: -0.56, fontFamily: Design.fonts.dashboardBold },
  measurementUnit: { color: DASHBOARD.colors.onSurfaceVariant, fontSize: 20, lineHeight: 28, fontFamily: Design.fonts.dashboardSemiBold },
  statusPill: { borderRadius: DASHBOARD.radius.round, backgroundColor: DASHBOARD.colors.secondaryContainer, paddingHorizontal: 8, paddingVertical: 2 },
  statusText: { color: DASHBOARD.colors.onSecondaryContainer, fontSize: 12, lineHeight: 14, fontFamily: Design.fonts.dashboardSemiBold },
  emptyMeasurement: { color: DASHBOARD.colors.onSurface, fontSize: 22, lineHeight: 30, fontFamily: Design.fonts.dashboardBold, marginTop: 2 },
  measurementMeta: { color: DASHBOARD.colors.outline, fontSize: 14, lineHeight: 20, fontFamily: Design.fonts.dashboardRegular },
  measureButton: { width: '100%', minHeight: 52, borderRadius: DASHBOARD.radius.round, paddingHorizontal: 24, paddingVertical: 16, backgroundColor: DASHBOARD.colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  measureButtonDesktop: { width: undefined, alignSelf: 'center' },
  measureButtonText: { color: DASHBOARD.colors.onPrimary, fontSize: 14, lineHeight: 16, letterSpacing: 0.14, fontFamily: Design.fonts.dashboardSemiBold },
  quickSection: { gap: 16 },
  sectionTitle: { color: DASHBOARD.colors.onSurface, fontSize: 24, lineHeight: 32, fontFamily: Design.fonts.dashboardBold },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  quickTile: { minHeight: 112, borderRadius: DASHBOARD.radius.card, padding: 16, backgroundColor: Design.colors.surface, alignItems: 'center', justifyContent: 'center', gap: 8, ...DASHBOARD.shadow.card },
  quickTileHalf: { flexGrow: 1, flexBasis: '43%' },
  quickTileWide: { flexGrow: 1, flexBasis: '100%' },
  quickIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  quickLabel: { color: DASHBOARD.colors.onSurface, fontSize: 14, lineHeight: 16, letterSpacing: 0.14, fontFamily: Design.fonts.dashboardSemiBold },
  motivationCard: { height: 192, borderRadius: DASHBOARD.radius.hero, overflow: 'hidden', justifyContent: 'center', padding: 32 },
  motivationImage: { borderRadius: DASHBOARD.radius.hero },
  motivationOverlay: { ...StyleSheet.absoluteFillObject },
  motivationCopy: { maxWidth: 210, gap: 8 },
  motivationTitle: { color: DASHBOARD.colors.onPrimary, fontSize: 18, lineHeight: 24, fontFamily: Design.fonts.dashboardSemiBold },
  motivationText: { color: DASHBOARD.colors.whiteSoft, fontSize: 14, lineHeight: 20, fontFamily: Design.fonts.dashboardRegular },
  fab: { position: 'absolute', right: 24, width: 56, height: 56, borderRadius: 16, backgroundColor: DASHBOARD.colors.primary, alignItems: 'center', justifyContent: 'center', zIndex: 10, ...Design.shadow.floating },
  pressed: { opacity: 0.84, transform: [{ scale: 0.96 }] },
  captureMenu: { gap: 8 },
  captureAction: { minHeight: 72, borderRadius: 16, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: DASHBOARD.colors.background },
  captureIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: DASHBOARD.colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  captureCopy: { flex: 1, gap: 2 },
  captureTitle: { color: DASHBOARD.colors.onSurface, fontSize: 15, lineHeight: 20, fontFamily: Design.fonts.dashboardSemiBold },
  captureMeta: { color: DASHBOARD.colors.onSurfaceVariant, fontSize: 12, lineHeight: 18, fontFamily: Design.fonts.dashboardRegular },
});
