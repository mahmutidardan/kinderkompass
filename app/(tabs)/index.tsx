import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ImageBackground, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppShell } from '@/components/app-shell';
import { ChildAvatar } from '@/components/child-avatar';
import { EmptyChild } from '@/components/empty-child';
import { InfoButton } from '@/components/info-button';
import { ReminderCenter } from '@/components/reminder-center';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Design } from '@/constants/design';
import { useStore } from '@/lib/store';
import { getTemperatureGuidance } from '@/lib/temperature-guidance';

type DayEntry = {
  type: 'temp' | 'med';
  id: string;
  at: string;
  label: string;
  detail: string;
  color: string;
};

type TimelineGroup = { time: string; entries: DayEntry[] };

const WEEKDAY_LABELS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

function formatTime(value: string) {
  return new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

function dateKey(value: Date | string) {
  const date = typeof value === 'string' ? new Date(value) : value;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getWeek(offset = 0, today = new Date()) {
  const mondayOffset = (today.getDay() + 6) % 7;
  const monday = new Date(today);
  monday.setHours(12, 0, 0, 0);
  monday.setDate(today.getDate() - mondayOffset + offset * 7);
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return date;
  });
}

function formatHeaderDate(date: Date) {
  return new Intl.DateTimeFormat('de-DE', { weekday: 'long', day: 'numeric', month: 'long' }).format(date);
}

function formatSelectedTitle(date: Date) {
  if (dateKey(date) === dateKey(new Date())) return 'Heute';
  return new Intl.DateTimeFormat('de-DE', { weekday: 'long' }).format(date);
}

function formatSelectedDate(date: Date) {
  return new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
}

function formatWeekRange(days: Date[]) {
  const first = days[0];
  const last = days.at(-1);
  if (!first || !last) return '';
  const short = new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit' });
  return `${short.format(first)} – ${short.format(last)}`;
}

function groupEntries(entries: DayEntry[]) {
  return entries.reduce<TimelineGroup[]>((groups, entry) => {
    const time = formatTime(entry.at);
    const current = groups.at(-1);
    if (current?.time === time) current.entries.push(entry);
    else groups.push({ time, entries: [entry] });
    return groups;
  }, []);
}

export default function HomeScreen() {
  const { activeChild, temperatures, medications, nightAlarmActive } = useStore();
  const [todayKey, setTodayKey] = useState(() => dateKey(new Date()));
  const [weekOffset, setWeekOffset] = useState(0);
  const weekDays = useMemo(() => getWeek(weekOffset, new Date(`${todayKey}T12:00:00`)), [todayKey, weekOffset]);
  const [selectedDateKey, setSelectedDateKey] = useState(todayKey);
  useEffect(() => {
    const interval = setInterval(() => setTodayKey(dateKey(new Date())), 60_000);
    return () => clearInterval(interval);
  }, []);
  const selectedDate = weekDays.find((day) => dateKey(day) === selectedDateKey) ?? weekDays[0] ?? new Date();
  const selectedIsToday = selectedDateKey === dateKey(new Date());
  const selectedIsFuture = selectedDateKey > dateKey(new Date());
  const canDocumentSelectedDate = !selectedIsFuture;
  const selectedDateLabel = formatSelectedDate(selectedDate);
  const temperatureEntryRoute = `/modal?kind=temperature&date=${selectedDateKey}` as const;
  const medicationEntryRoute = `/modal?kind=medication&date=${selectedDateKey}` as const;

  function changeWeek(offset: -1 | 1) {
    const nextOffset = weekOffset + offset;
    if (nextOffset > 0) return;
    const nextSelectedDate = new Date(selectedDate);
    nextSelectedDate.setDate(nextSelectedDate.getDate() + offset * 7);
    setWeekOffset(nextOffset);
    setSelectedDateKey(dateKey(nextSelectedDate));
  }

  const childTemperatures = temperatures
    .filter((item) => item.childId === activeChild?.id)
    .sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));
  const childMedications = medications
    .filter((item) => item.childId === activeChild?.id)
    .sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));
  const selectedTemperatures = childTemperatures.filter((item) => dateKey(item.recordedAt) === selectedDateKey);
  const selectedLatest = selectedTemperatures.at(-1);
  const latestGuidance = selectedLatest ? getTemperatureGuidance(selectedLatest.temperature, activeChild?.birthDate) : undefined;
  const allEntries: DayEntry[] = [
    ...childTemperatures.map((item) => ({
      type: 'temp' as const,
      id: item.id,
      at: item.recordedAt,
      label: `${item.temperature.toFixed(1).replace('.', ',')} °C`,
      detail: `Temperatur · ${item.method}${item.note ? ` · ${item.note}` : ''}`,
      color: getTemperatureGuidance(item.temperature, activeChild?.birthDate).color,
    })),
    ...childMedications.map((item) => ({
      type: 'med' as const,
      id: item.id,
      at: item.recordedAt,
      label: item.name,
      detail: item.amount || 'Gabe dokumentiert',
      color: Design.colors.peachStrong,
    })),
  ].sort((a, b) => a.at.localeCompare(b.at));
  const selectedEntries = allEntries.filter((entry) => dateKey(entry.at) === selectedDateKey);
  const timelineGroups = groupEntries(selectedEntries);
  const daysWithEntries = new Set(allEntries.map((entry) => dateKey(entry.at)));

  const avatar = activeChild ? (
    <Pressable accessibilityLabel="Kinderprofil öffnen" style={styles.avatar} onPress={() => router.push('/familie')}>
      <ChildAvatar child={activeChild} size={47} />
      <View style={styles.avatarDot} />
    </Pressable>
  ) : undefined;

  return (
    <AppShell eyebrow={formatHeaderDate(selectedDate)} title={formatSelectedTitle(selectedDate)} action={avatar}>
      {!activeChild ? <EmptyChild /> : (
        <>
          <View style={styles.weekSection}>
            <View style={styles.sectionTopline}>
              <View>
                <Text style={styles.sectionKicker}>{weekOffset === 0 ? 'Diese Woche' : 'Vergangene Woche'}</Text>
                <Text style={styles.weekHint}>{formatWeekRange(weekDays)}</Text>
              </View>
              <View style={styles.weekHeaderActions}>
                <Pressable accessibilityRole="button" accessibilityLabel="Eine Woche zurück" onPress={() => changeWeek(-1)} style={({ pressed }) => [styles.weekNavButton, pressed && styles.weekNavButtonPressed]}>
                  <IconSymbol name="chevron.left" size={18} color={Design.colors.primaryDark} />
                </Pressable>
                <Pressable accessibilityRole="button" accessibilityLabel="Eine Woche vor" accessibilityState={{ disabled: weekOffset === 0 }} disabled={weekOffset === 0} onPress={() => changeWeek(1)} style={({ pressed }) => [styles.weekNavButton, weekOffset === 0 && styles.weekNavButtonDisabled, pressed && styles.weekNavButtonPressed]}>
                  <IconSymbol name="chevron.right" size={18} color={Design.colors.primaryDark} />
                </Pressable>
                <InfoButton title="Wochenübersicht" text="Blättere zu vergangenen Wochen und wähle einen Tag aus. Dort kannst du Messungen und Medikamentengaben ansehen oder nachtragen." />
              </View>
            </View>
            <View style={styles.weekRow}>
              {weekDays.map((day, index) => {
                const key = dateKey(day);
                const selected = key === selectedDateKey;
                const today = key === dateKey(new Date());
                const hasEntries = daysWithEntries.has(key);
                return (
                  <Pressable
                    key={key}
                    accessibilityLabel={`${WEEKDAY_LABELS[index]}, ${day.getDate()}. auswählen`}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => setSelectedDateKey(key)}
                    style={styles.dayButton}>
                    <Text style={[styles.dayName, selected && styles.dayNameSelected]}>{WEEKDAY_LABELS[index]}</Text>
                    <View style={[styles.dayCircle, today && !selected && styles.dayCircleToday, selected && styles.dayCircleSelected]}>
                      <Text style={[styles.dayNumber, selected && styles.dayNumberSelected]}>{day.getDate()}</Text>
                    </View>
                    <View style={[styles.dayDot, hasEntries && styles.dayDotFilled, selected && hasEntries && styles.dayDotSelected]} />
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.measurementCard}>
            <View style={styles.measurementCopy}>
              <View style={styles.measurementHeading}>
                <View style={[styles.measurementIcon, latestGuidance && { backgroundColor: `${latestGuidance.color}20` }]}>
                  <IconSymbol name="thermometer.medium" size={19} color={latestGuidance?.color ?? Design.colors.primary} />
                </View>
                <View>
                  <Text style={styles.measurementEyebrow}>{selectedIsToday ? 'Letzte Messung heute' : 'Letzte Messung'}</Text>
                  <Text style={[styles.measurementValue, latestGuidance && { color: latestGuidance.color }]}>
                    {selectedLatest ? `${selectedLatest.temperature.toFixed(1).replace('.', ',')} °C` : 'Keine Messung'}
                  </Text>
                </View>
              </View>
              <Text style={styles.measurementMeta}>
                {selectedLatest ? `${latestGuidance?.label} · ${selectedLatest.method} · ${formatTime(selectedLatest.recordedAt)} Uhr` : `Für ${activeChild.name} wurde an diesem Tag nichts gemessen.`}
              </Text>
            </View>
            {canDocumentSelectedDate ? (
              <Pressable
                accessibilityLabel={selectedIsToday ? 'Neue Temperaturmessung' : `Temperaturmessung für den ${selectedDateLabel} nachtragen`}
                onPress={() => router.push(temperatureEntryRoute)}
                style={styles.measurementAdd}>
                <IconSymbol name="plus" size={24} color="#FFFFFF" />
              </Pressable>
            ) : null}
          </View>

          {canDocumentSelectedDate ? (
            <View style={styles.quickSection}>
              <View style={styles.sectionTopline}>
                <View>
                  <Text style={styles.sectionTitle}>{selectedIsToday ? 'Schnell eintragen' : 'Für diesen Tag nachtragen'}</Text>
                  {!selectedIsToday ? <Text style={styles.backdateHint}>Datum wird auf {selectedDateLabel} voreingestellt</Text> : null}
                </View>
                <InfoButton
                  title={selectedIsToday ? 'Schnell eintragen' : 'Rückwirkend dokumentieren'}
                  text={selectedIsToday
                    ? 'Dokumentiere eine Messung oder Medikamentengabe. Unter Nacht kannst du deinen individuellen Nachtalarm verwalten.'
                    : 'Trage Messungen und Medikamentengaben für diesen vergangenen Tag nach. Datum und Uhrzeit lassen sich im Formular noch anpassen; bestehende Erinnerungen bleiben unverändert.'}
                />
              </View>
              <View style={styles.quickActions}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={selectedIsToday ? 'Temperaturmessung eintragen' : `Temperaturmessung für den ${selectedDateLabel} nachtragen`}
                  style={[styles.quickAction, styles.quickActionPrimary]}
                  onPress={() => router.push(temperatureEntryRoute)}>
                  <View style={[styles.quickIcon, { backgroundColor: Design.colors.lavender }]}><IconSymbol name="thermometer.medium" size={20} color={Design.colors.primaryDark} /></View>
                  <View style={styles.quickPrimaryCopy}>
                    <Text style={styles.quickPrimaryLabel}>{selectedIsToday ? 'Temperatur messen' : 'Temperatur nachtragen'}</Text>
                    <Text style={styles.quickPrimaryMeta}>{selectedIsToday ? 'Regler öffnen und Messung dokumentieren' : `${selectedDateLabel} · Uhrzeit im Formular wählen`}</Text>
                  </View>
                  <IconSymbol name="chevron.right" size={20} color={Design.colors.primaryDark} />
                </Pressable>
                <View style={styles.quickSecondaryRow}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={selectedIsToday ? 'Medikamentengabe eintragen' : `Medikamentengabe für den ${selectedDateLabel} nachtragen`}
                    style={styles.quickAction}
                    onPress={() => router.push(medicationEntryRoute)}>
                    <View style={[styles.quickIcon, { backgroundColor: Design.colors.peach }]}><IconSymbol name="pills.fill" size={20} color={Design.colors.peachStrong} /></View>
                    <Text style={styles.quickLabel}>{selectedIsToday ? 'Medikament' : 'Medikament nachtragen'}</Text>
                  </Pressable>
                  {selectedIsToday ? <Pressable accessibilityRole="button" accessibilityLabel="Arzttermin planen" style={styles.quickAction} onPress={() => router.push('/termine')}>
                    <View style={[styles.quickIcon, { backgroundColor: Design.colors.yellow }]}><IconSymbol name="calendar" size={20} color={Design.colors.gold} /></View>
                    <Text style={styles.quickLabel}>Arzttermin</Text>
                  </Pressable> : null}
                </View>
                {selectedIsToday ? <Pressable accessibilityRole="button" accessibilityLabel={nightAlarmActive ? 'Aktiven Nachtalarm verwalten' : 'Nachtalarm einrichten'} accessibilityState={{ selected: nightAlarmActive }} style={[styles.nightQuickAction, nightAlarmActive && styles.quickActionActive]} onPress={() => router.push('/modal?kind=night')}>
                  <View style={[styles.quickIcon, { backgroundColor: Design.colors.sage }]}><IconSymbol name="moon.stars.fill" size={20} color={Design.colors.sageStrong} /></View>
                  <View style={styles.quickPrimaryCopy}><Text style={[styles.quickPrimaryLabel, nightAlarmActive && styles.quickLabelActive]}>{nightAlarmActive ? 'Nachtalarm aktiv' : 'Nachtalarm'}</Text><Text style={styles.quickPrimaryMeta}>{nightAlarmActive ? 'Zeitplan ansehen oder ändern' : 'Intervall oder einzelne Uhrzeiten festlegen'}</Text></View>
                  <IconSymbol name="chevron.right" size={19} color={Design.colors.inkFaint} />
                </Pressable> : null}
              </View>
            </View>
          ) : null}

          {selectedIsToday ? <ReminderCenter /> : null}

          <View style={styles.timelineHeader}>
            <View><Text style={styles.sectionTitle}>Tagesverlauf</Text><Text style={styles.timelineSubtitle}>{selectedEntries.length} {selectedEntries.length === 1 ? 'Eintrag' : 'Einträge'} für {activeChild.name}</Text></View>
            <View style={styles.timelineHeaderActions}>
              <Pressable accessibilityRole="button" accessibilityLabel="Alle Verlaufseinträge ansehen" onPress={() => router.push('/verlauf')} style={styles.linkButton}><Text style={styles.link}>Alle ansehen</Text></Pressable>
              <InfoButton title="Tagesverlauf" text="Messungen und Medikamentengaben werden nach ihrer Uhrzeit gruppiert. Der Haken zeigt, dass der Eintrag dokumentiert wurde." />
            </View>
          </View>

          {timelineGroups.length === 0 ? (
            <View style={styles.emptyTimeline}>
              <View style={styles.emptyIcon}><IconSymbol name="checkmark" size={20} color={Design.colors.primary} /></View>
              <Text style={styles.emptyTitle}>Noch keine Einträge</Text>
              <Text style={styles.emptyText}>
                {selectedIsToday
                  ? 'Neue Messungen und Gaben erscheinen hier automatisch nach Uhrzeit.'
                  : selectedIsFuture
                    ? 'Für zukünftige Tage können noch keine Einträge dokumentiert werden.'
                    : 'Für diesen Tag wurden noch keine Messungen oder Gaben gespeichert. Du kannst sie oben nachtragen.'}
              </Text>
            </View>
          ) : (
            <View style={styles.timeline}>
              {timelineGroups.map((group, groupIndex) => (
                <View key={`${group.time}-${groupIndex}`} style={styles.timeGroup}>
                  <View style={styles.timeHeader}>
                    <Text style={styles.groupTime}>{group.time}</Text>
                    <View style={styles.timeLine} />
                    <View style={styles.childTag}><ChildAvatar child={activeChild} size={20} /><Text style={styles.childTagText}>{activeChild.name}</Text></View>
                  </View>
                  <View style={styles.eventCard}>
                    {group.entries.map((item, index) => (
                      <Pressable accessibilityRole="button" accessibilityLabel={`${item.label}, ${item.detail}, bearbeiten`} onPress={() => router.push(`/modal?kind=${item.type === 'med' ? 'medication' : 'temperature'}&entryId=${item.id}`)} key={`${item.type}-${item.id}`} style={({ pressed }) => [styles.eventRow, index < group.entries.length - 1 && styles.eventRowDivider, pressed && styles.eventRowPressed]}>
                        <View style={[styles.eventIcon, { backgroundColor: `${item.color}1A` }]}>
                          <IconSymbol name={item.type === 'med' ? 'pills.fill' : 'thermometer.medium'} size={19} color={item.color} />
                        </View>
                        <View style={styles.eventCopy}><Text style={styles.eventLabel}>{item.label}</Text><Text style={styles.eventDetail}>{item.detail}</Text></View>
                        <View style={styles.rowChevron}><IconSymbol name="chevron.right" size={18} color={Design.colors.inkFaint} /></View>
                      </Pressable>
                    ))}
                  </View>
                </View>
              ))}
            </View>
          )}

          {selectedIsToday && nightAlarmActive ? (
            <Pressable style={styles.nightDivider} onPress={() => router.push('/modal?kind=night')}>
              <View style={styles.nightLine} />
              <View style={styles.nightLabel}><IconSymbol name="moon.stars.fill" size={17} color="#4F8373" /><Text style={styles.nightLabelText}>Nachtalarm aktiv</Text></View>
              <View style={styles.nightLine} />
            </Pressable>
          ) : null}

          <ImageBackground source={require('../../docs/stitch/gentle-child-health-tracker/assets/stitch-asset-03.jpg')} imageStyle={styles.careImage} style={styles.careNote}>
            <View style={styles.careOverlay} />
            <View style={styles.careCopy}><Text style={styles.careTitle}>Du kennst dein Kind am besten</Text><Text style={styles.careText}>Bei Unsicherheit oder deutlicher Veränderung bitte ärztlichen Rat einholen.</Text></View>
          </ImageBackground>
        </>
      )}
    </AppShell>
  );
}

const styles = StyleSheet.create({
  avatar: { width: 50, height: 50, borderRadius: 20, backgroundColor: Design.colors.yellow, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: Design.colors.surface, ...Design.shadow.card },
  avatarDot: { position: 'absolute', width: 12, height: 12, borderRadius: 6, backgroundColor: Design.colors.sageStrong, borderWidth: 2, borderColor: Design.colors.surface, right: -1, bottom: -1 },
  sectionTopline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  sectionKicker: { color: Design.colors.ink, fontSize: 16, lineHeight: 21, fontFamily: Design.fonts.bold, letterSpacing: -0.2 },
  weekHint: { color: Design.colors.inkSoft, fontSize: 12, lineHeight: 17, fontFamily: Design.fonts.regular, marginTop: 2 },
  weekHeaderActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  weekNavButton: { width: 44, height: 44, borderRadius: 15, backgroundColor: Design.colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  weekNavButtonPressed: { opacity: 0.7, transform: [{ scale: 0.97 }] },
  weekNavButtonDisabled: { opacity: 0.32 },
  weekSection: { paddingHorizontal: 2, gap: 13 },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dayButton: { width: 40, minHeight: 65, alignItems: 'center', justifyContent: 'center', gap: 5 },
  dayName: { color: Design.colors.inkSoft, fontSize: 11, lineHeight: 15, fontFamily: Design.fonts.semiBold },
  dayNameSelected: { color: Design.colors.primaryDark },
  dayCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'transparent' },
  dayCircleToday: { borderColor: Design.colors.primary },
  dayCircleSelected: { backgroundColor: Design.colors.primary, borderColor: Design.colors.primary },
  dayNumber: { color: Design.colors.ink, fontSize: 14, lineHeight: 19, fontFamily: Design.fonts.bold },
  dayNumberSelected: { color: '#FFFFFF' },
  dayDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: 'transparent' },
  dayDotFilled: { backgroundColor: Design.colors.peachStrong },
  dayDotSelected: { backgroundColor: Design.colors.primarySoft },
  measurementCard: { minHeight: 128, borderRadius: Design.radius.hero, padding: 20, backgroundColor: Design.colors.surface, flexDirection: 'row', alignItems: 'center', gap: 16, borderWidth: 1, borderColor: Design.colors.border, ...Design.shadow.card },
  measurementCopy: { flex: 1, gap: 9 },
  measurementHeading: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  measurementIcon: { width: 58, height: 58, borderRadius: 20, backgroundColor: Design.colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  measurementEyebrow: { color: Design.colors.primaryDark, fontSize: 12, lineHeight: 16, fontFamily: Design.fonts.semiBold },
  measurementValue: { color: Design.colors.ink, fontSize: 30, lineHeight: 35, fontFamily: Design.fonts.bold, letterSpacing: -0.9 },
  measurementMeta: { color: Design.colors.inkSoft, fontSize: 12, lineHeight: 18, fontFamily: Design.fonts.regular },
  measurementAdd: { width: 52, height: 52, borderRadius: 18, backgroundColor: Design.colors.primary, alignItems: 'center', justifyContent: 'center', ...Design.shadow.floating },
  quickSection: { gap: 12 },
  sectionTitle: { color: Design.colors.ink, ...Design.type.section, fontFamily: Design.fonts.bold },
  backdateHint: { color: Design.colors.inkSoft, fontSize: 12, lineHeight: 17, fontFamily: Design.fonts.regular, marginTop: 2 },
  quickActions: { gap: 12 },
  quickAction: { flex: 1, minHeight: 104, borderRadius: Design.radius.large, backgroundColor: Design.colors.surface, alignItems: 'flex-start', justifyContent: 'space-between', padding: 14, gap: 8, borderWidth: 1, borderColor: Design.colors.border, ...Design.shadow.card },
  quickActionPrimary: { minHeight: 88, flex: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', backgroundColor: Design.colors.primarySoft, borderColor: 'transparent', paddingHorizontal: 17, ...Design.shadow.card },
  quickPrimaryCopy: { flex: 1, gap: 2 },
  quickPrimaryLabel: { color: Design.colors.ink, fontSize: 14, lineHeight: 19, fontFamily: Design.fonts.bold },
  quickPrimaryMeta: { color: Design.colors.inkSoft, fontSize: 12, lineHeight: 17, fontFamily: Design.fonts.regular },
  quickSecondaryRow: { flexDirection: 'row', gap: 10 },
  quickActionActive: { backgroundColor: Design.colors.sage, borderColor: Design.colors.borderStrong },
  nightQuickAction: { minHeight: 70, borderRadius: Design.radius.large, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: Design.colors.surface, borderWidth: 1, borderColor: Design.colors.border },
  quickIcon: { width: 40, height: 40, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  quickLabel: { color: Design.colors.ink, fontSize: 12, lineHeight: 17, fontFamily: Design.fonts.bold },
  quickLabelActive: { color: Design.colors.sageStrong },
  timelineHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 10 },
  timelineSubtitle: { color: Design.colors.inkSoft, fontSize: 12, lineHeight: 17, fontFamily: Design.fonts.regular, marginTop: 2 },
  timelineHeaderActions: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  link: { color: Design.colors.primaryDark, fontSize: 12, lineHeight: 17, fontFamily: Design.fonts.bold },
  linkButton: { minHeight: 44, justifyContent: 'center' },
  timeline: { gap: 18 },
  timeGroup: { gap: 8 },
  timeHeader: { minHeight: 28, flexDirection: 'row', alignItems: 'center', gap: 10 },
  groupTime: { color: Design.colors.primaryDark, fontSize: 12, lineHeight: 17, fontFamily: Design.fonts.bold },
  timeLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: Design.colors.border },
  childTag: { minHeight: 30, borderRadius: 15, backgroundColor: Design.colors.primarySoft, flexDirection: 'row', alignItems: 'center', gap: 6, paddingRight: 10, paddingLeft: 4 },
  childTagText: { color: Design.colors.primaryDark, fontSize: 11, lineHeight: 15, fontFamily: Design.fonts.semiBold },
  eventCard: { backgroundColor: Design.colors.surface, borderRadius: Design.radius.large, paddingHorizontal: 16, borderWidth: 1, borderColor: 'rgba(72,61,77,0.045)', ...Design.shadow.card },
  eventRow: { minHeight: 78, flexDirection: 'row', alignItems: 'center' },
  eventRowPressed: { opacity: 0.7 },
  eventRowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Design.colors.border },
  eventIcon: { width: 42, height: 42, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  eventCopy: { flex: 1 },
  eventLabel: { color: Design.colors.ink, fontSize: 15, lineHeight: 20, fontFamily: Design.fonts.bold },
  eventDetail: { color: Design.colors.inkSoft, fontSize: 12, lineHeight: 17, fontFamily: Design.fonts.regular, marginTop: 2 },
  rowChevron: { width: 32, height: 44, alignItems: 'flex-end', justifyContent: 'center', marginLeft: 8 },
  emptyTimeline: { borderRadius: Design.radius.large, backgroundColor: Design.colors.surface, padding: 26, alignItems: 'center', gap: 6, borderWidth: 1, borderColor: Design.colors.border },
  emptyIcon: { width: 46, height: 46, borderRadius: 17, backgroundColor: Design.colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  emptyTitle: { color: Design.colors.ink, fontSize: 15, lineHeight: 20, fontFamily: Design.fonts.bold },
  emptyText: { textAlign: 'center', color: Design.colors.inkSoft, fontSize: 13, lineHeight: 19, fontFamily: Design.fonts.regular },
  nightDivider: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  nightLine: { flex: 1, height: 1, backgroundColor: Design.colors.borderStrong },
  nightLabel: { minHeight: 40, borderRadius: 20, paddingHorizontal: 14, backgroundColor: Design.colors.sage, flexDirection: 'row', alignItems: 'center', gap: 8 },
  nightLabelText: { color: Design.colors.sageStrong, fontSize: 12, lineHeight: 17, fontFamily: Design.fonts.bold },
  careNote: { minHeight: 176, borderRadius: Design.radius.hero, overflow: 'hidden', justifyContent: 'center', padding: 22 },
  careImage: { borderRadius: Design.radius.hero },
  careOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(42,96,56,0.72)' },
  careCopy: { maxWidth: 230, gap: 5 },
  careTitle: { color: '#FFFFFF', fontSize: 19, lineHeight: 25, fontFamily: Design.fonts.bold },
  careText: { color: 'rgba(255,255,255,0.86)', fontSize: 12, lineHeight: 18, fontFamily: Design.fonts.regular },
});
