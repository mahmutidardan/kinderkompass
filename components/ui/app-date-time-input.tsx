import Slider from '@react-native-community/slider';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import { AppDialog } from '@/components/ui/app-dialog';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Design } from '@/constants/design';
import { formatGermanDate, parseGermanDate, parseTime } from '@/lib/date-time';

type Props = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  mode?: 'date' | 'time';
  optional?: boolean;
  error?: string;
  containerStyle?: StyleProp<ViewStyle>;
  maximumDate?: Date;
  minimumDate?: Date;
  appearance?: 'default' | 'reference';
};

const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const MONTH_FORMATTER = new Intl.DateTimeFormat('de-DE', { month: 'long' });
const MONTH_NAMES = Array.from(
  { length: 12 },
  (_, month) => MONTH_FORMATTER.format(new Date(2024, month, 1, 12)),
);
const YEAR_GRID_ROW_HEIGHT = 52;
const DEFAULT_MINIMUM_YEAR = 1900;
const DEFAULT_MAXIMUM_YEAR = 2100;

function startOfDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate(), 12, 0, 0, 0);
}

function clampDate(value: Date, minimumDate?: Date, maximumDate?: Date) {
  const normalized = startOfDay(value);
  const minimum = minimumDate ? startOfDay(minimumDate) : undefined;
  const maximum = maximumDate ? startOfDay(maximumDate) : undefined;
  if (minimum && normalized.getTime() < minimum.getTime()) return minimum;
  if (maximum && normalized.getTime() > maximum.getTime()) return maximum;
  return normalized;
}

function isSameDay(first: Date, second: Date) {
  return first.getFullYear() === second.getFullYear()
    && first.getMonth() === second.getMonth()
    && first.getDate() === second.getDate();
}

function dateIsAllowed(value: Date, minimumDate?: Date, maximumDate?: Date) {
  const time = startOfDay(value).getTime();
  if (minimumDate && time < startOfDay(minimumDate).getTime()) return false;
  if (maximumDate && time > startOfDay(maximumDate).getTime()) return false;
  return true;
}

function buildMonthDays(month: Date) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1, 12);
  const leading = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  return Array.from({ length: 42 }, (_, index) => {
    const day = index - leading + 1;
    return day > 0 && day <= daysInMonth
      ? new Date(month.getFullYear(), month.getMonth(), day, 12)
      : undefined;
  });
}

function monthHasAllowedDay(year: number, month: number, minimumDate?: Date, maximumDate?: Date) {
  const first = new Date(year, month, 1, 12);
  const last = new Date(year, month + 1, 0, 12);
  if (minimumDate && last.getTime() < startOfDay(minimumDate).getTime()) return false;
  if (maximumDate && first.getTime() > startOfDay(maximumDate).getTime()) return false;
  return true;
}

function yearHasAllowedDay(year: number, minimumDate?: Date, maximumDate?: Date) {
  const first = new Date(year, 0, 1, 12);
  const last = new Date(year, 11, 31, 12);
  if (minimumDate && last.getTime() < startOfDay(minimumDate).getTime()) return false;
  if (maximumDate && first.getTime() > startOfDay(maximumDate).getTime()) return false;
  return true;
}

function pad(value: number) {
  return String(Math.round(value)).padStart(2, '0');
}

export function AppDateTimeInput({
  label,
  value,
  onChange,
  mode = 'date',
  optional,
  error,
  containerStyle,
  maximumDate,
  minimumDate,
  appearance = 'default',
}: Props) {
  const reference = appearance === 'reference';
  const parsedTime = parseTime(value);
  const initialDate = clampDate(parseGermanDate(value) ?? new Date(), minimumDate, maximumDate);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [calendarView, setCalendarView] = useState<'days' | 'months' | 'years'>('days');
  const [draftDate, setDraftDate] = useState(initialDate);
  const [visibleMonth, setVisibleMonth] = useState(new Date(initialDate.getFullYear(), initialDate.getMonth(), 1, 12));
  const [draftHour, setDraftHour] = useState(parsedTime?.hours ?? 10);
  const [draftMinute, setDraftMinute] = useState(parsedTime?.minutes ?? 0);
  const yearScrollRef = useRef<ScrollView>(null);
  const monthDays = useMemo(() => buildMonthDays(visibleMonth), [visibleMonth]);
  const yearRange = useMemo(() => {
    const minimumYear = Math.min(
      minimumDate?.getFullYear() ?? DEFAULT_MINIMUM_YEAR,
      visibleMonth.getFullYear(),
    );
    const maximumYear = Math.max(
      maximumDate?.getFullYear() ?? DEFAULT_MAXIMUM_YEAR,
      visibleMonth.getFullYear(),
    );
    return Array.from({ length: maximumYear - minimumYear + 1 }, (_, index) => minimumYear + index);
  }, [maximumDate, minimumDate, visibleMonth]);
  const today = startOfDay(new Date());
  const displayValue = value || (mode === 'date' ? 'Datum auswählen' : 'Uhrzeit auswählen');

  useEffect(() => {
    if (!pickerOpen || calendarView !== 'years') return;
    const selectedIndex = yearRange.indexOf(visibleMonth.getFullYear());
    const row = Math.floor(Math.max(0, selectedIndex) / 3);
    const timer = setTimeout(() => {
      yearScrollRef.current?.scrollTo({ y: Math.max(0, row * YEAR_GRID_ROW_HEIGHT - YEAR_GRID_ROW_HEIGHT * 2), animated: false });
    }, 0);
    return () => clearTimeout(timer);
  }, [calendarView, pickerOpen, visibleMonth, yearRange]);

  function openPicker() {
    if (mode === 'date') {
      const next = clampDate(parseGermanDate(value) ?? new Date(), minimumDate, maximumDate);
      setDraftDate(next);
      setVisibleMonth(new Date(next.getFullYear(), next.getMonth(), 1, 12));
      setCalendarView('days');
    } else {
      const next = parseTime(value);
      setDraftHour(next?.hours ?? 10);
      setDraftMinute(next?.minutes ?? 0);
    }
    setPickerOpen(true);
  }

  function confirm() {
    onChange(mode === 'date' ? formatGermanDate(draftDate) : `${pad(draftHour)}:${pad(draftMinute)}`);
    setPickerOpen(false);
  }

  function changeMonth(offset: number) {
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1, 12));
  }

  function monthHasAllowedDate(offset: number) {
    const target = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + offset, 1, 12);
    return monthHasAllowedDay(target.getFullYear(), target.getMonth(), minimumDate, maximumDate);
  }

  function selectVisibleMonth(year: number, month: number) {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const next = clampDate(
      new Date(year, month, Math.min(draftDate.getDate(), daysInMonth), 12),
      minimumDate,
      maximumDate,
    );
    setDraftDate(next);
    setVisibleMonth(new Date(next.getFullYear(), next.getMonth(), 1, 12));
    setCalendarView('days');
  }

  function selectYear(year: number) {
    let month = visibleMonth.getMonth();
    if (!monthHasAllowedDay(year, month, minimumDate, maximumDate)) {
      if (minimumDate?.getFullYear() === year) month = minimumDate.getMonth();
      if (maximumDate?.getFullYear() === year) month = maximumDate.getMonth();
    }
    selectVisibleMonth(year, month);
  }

  return (
    <View style={[styles.container, containerStyle]}>
      <Text style={[styles.label, reference && styles.referenceLabel]}>{label}{optional ? <Text style={styles.optional}> (optional)</Text> : null}</Text>
      <Pressable
        accessibilityLabel={`${label}: ${value || 'nicht ausgewählt'}. ${mode === 'date' ? 'Kalender' : 'Uhrzeitregler'} öffnen`}
        accessibilityRole="button"
        onPress={openPicker}
        style={({ pressed }) => [styles.inputShell, reference && styles.referenceInputShell, error && styles.inputError, pressed && styles.inputPressed]}>
        <View style={styles.leadingIcon}>
          <IconSymbol name={mode === 'date' ? 'calendar' : 'clock.fill'} size={19} color={Design.colors.primaryDark} />
        </View>
        <Text style={[styles.value, reference && styles.referenceValue, !value && styles.placeholder]} numberOfLines={1}>{displayValue}</Text>
        <IconSymbol name="chevron.down" size={17} color={Design.colors.inkFaint} />
      </Pressable>
      {error ? <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}

      <AppDialog
        visible={pickerOpen}
        title={mode === 'date' ? `${label} auswählen` : `${label} einstellen`}
        subtitle={mode === 'date' ? 'Wähle den passenden Tag im Kalender.' : 'Stelle Stunde und Minute mit den Reglern ein.'}
        onClose={() => setPickerOpen(false)}
        footer={<AppButton label={mode === 'date' ? 'Datum übernehmen' : 'Uhrzeit übernehmen'} onPress={confirm} />}>
        {mode === 'date' ? (
          <>
            <View style={styles.monthHeader}>
              <Pressable
                accessibilityLabel="Vorheriger Monat"
                accessibilityRole="button"
                disabled={!monthHasAllowedDate(-1)}
                onPress={() => changeMonth(-1)}
                style={({ pressed }) => [styles.monthButton, !monthHasAllowedDate(-1) && styles.disabled, pressed && styles.inputPressed]}>
                <IconSymbol name="chevron.left" size={19} color={Design.colors.primaryDark} />
              </Pressable>
              <View style={styles.monthAndYear}>
                <Pressable
                  accessibilityLabel={`Monat ${MONTH_FORMATTER.format(visibleMonth)} auswählen`}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: calendarView === 'months' }}
                  onPress={() => setCalendarView((current) => current === 'months' ? 'days' : 'months')}
                  style={({ pressed }) => [styles.periodButton, calendarView === 'months' && styles.periodButtonActive, pressed && styles.inputPressed]}>
                  <Text style={[styles.periodButtonText, calendarView === 'months' && styles.periodButtonTextActive]}>{MONTH_FORMATTER.format(visibleMonth)}</Text>
                  <IconSymbol name="chevron.down" size={14} color={calendarView === 'months' ? '#FFFFFF' : Design.colors.primaryDark} />
                </Pressable>
                <Pressable
                  accessibilityLabel={`Jahr ${visibleMonth.getFullYear()} auswählen`}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: calendarView === 'years' }}
                  onPress={() => setCalendarView((current) => current === 'years' ? 'days' : 'years')}
                  style={({ pressed }) => [styles.periodButton, calendarView === 'years' && styles.periodButtonActive, pressed && styles.inputPressed]}>
                  <Text style={[styles.periodButtonText, calendarView === 'years' && styles.periodButtonTextActive]}>{visibleMonth.getFullYear()}</Text>
                  <IconSymbol name="chevron.down" size={14} color={calendarView === 'years' ? '#FFFFFF' : Design.colors.primaryDark} />
                </Pressable>
              </View>
              <Pressable
                accessibilityLabel="Nächster Monat"
                accessibilityRole="button"
                disabled={!monthHasAllowedDate(1)}
                onPress={() => changeMonth(1)}
                style={({ pressed }) => [styles.monthButton, !monthHasAllowedDate(1) && styles.disabled, pressed && styles.inputPressed]}>
                <IconSymbol name="chevron.right" size={19} color={Design.colors.primaryDark} />
              </Pressable>
            </View>
            {calendarView === 'months' ? (
              <View accessibilityLabel="Monat auswählen" style={styles.monthGrid}>
                {MONTH_NAMES.map((monthName, month) => {
                  const allowed = monthHasAllowedDay(visibleMonth.getFullYear(), month, minimumDate, maximumDate);
                  const selected = month === visibleMonth.getMonth();
                  return (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ disabled: !allowed, selected }}
                      disabled={!allowed}
                      key={monthName}
                      onPress={() => selectVisibleMonth(visibleMonth.getFullYear(), month)}
                      style={({ pressed }) => [
                        styles.monthOption,
                        selected && styles.periodOptionSelected,
                        !allowed && styles.disabled,
                        pressed && styles.inputPressed,
                      ]}>
                      <Text style={[styles.periodOptionText, selected && styles.periodOptionTextSelected]}>{monthName}</Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : calendarView === 'years' ? (
              <View style={styles.yearSelector}>
                <Text style={styles.selectorHint}>Jahr direkt auswählen</Text>
                <ScrollView
                  accessibilityLabel="Jahresauswahl"
                  nestedScrollEnabled
                  ref={yearScrollRef}
                  showsVerticalScrollIndicator={false}
                  style={styles.yearScroll}
                  contentContainerStyle={styles.yearGrid}>
                  {yearRange.map((year) => {
                    const allowed = yearHasAllowedDay(year, minimumDate, maximumDate);
                    const selected = year === visibleMonth.getFullYear();
                    return (
                      <View key={year} style={styles.yearCell}>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityState={{ disabled: !allowed, selected }}
                          disabled={!allowed}
                          onPress={() => selectYear(year)}
                          style={({ pressed }) => [
                            styles.yearOption,
                            selected && styles.periodOptionSelected,
                            !allowed && styles.disabled,
                            pressed && styles.inputPressed,
                          ]}>
                          <Text style={[styles.periodOptionText, selected && styles.periodOptionTextSelected]}>{year}</Text>
                        </Pressable>
                      </View>
                    );
                  })}
                </ScrollView>
              </View>
            ) : (
              <View style={styles.calendarGrid}>
                {WEEKDAYS.map((weekday) => <View key={weekday} style={styles.calendarCell}><Text style={styles.weekday}>{weekday}</Text></View>)}
                {monthDays.map((date, index) => {
                  const allowed = Boolean(date && dateIsAllowed(date, minimumDate, maximumDate));
                  const selected = Boolean(date && isSameDay(date, draftDate));
                  const currentDay = Boolean(date && isSameDay(date, today));
                  return (
                    <View key={`${visibleMonth.toISOString()}-${index}`} style={styles.calendarCell}>
                      {date ? (
                        <Pressable
                          accessibilityLabel={`${formatGermanDate(date)}${currentDay ? ', heute' : ''}`}
                          accessibilityRole="button"
                          accessibilityState={{ disabled: !allowed, selected }}
                          disabled={!allowed}
                          onPress={() => setDraftDate(date)}
                          style={({ pressed }) => [
                            styles.dayButton,
                            currentDay && styles.todayButton,
                            selected && styles.selectedDay,
                            !allowed && styles.disabled,
                            pressed && styles.inputPressed,
                          ]}>
                          <Text style={[styles.dayText, currentDay && styles.todayText, selected && styles.selectedDayText]}>{date.getDate()}</Text>
                        </Pressable>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            )}
            {calendarView === 'days' && dateIsAllowed(today, minimumDate, maximumDate) ? (
              <Pressable accessibilityRole="button" onPress={() => { setDraftDate(today); setVisibleMonth(new Date(today.getFullYear(), today.getMonth(), 1, 12)); }} style={styles.todayShortcut}>
                <IconSymbol name="calendar-check" size={18} color={Design.colors.primaryDark} />
                <Text style={styles.todayShortcutText}>Heute auswählen</Text>
              </Pressable>
            ) : null}
          </>
        ) : (
          <>
            <View style={styles.timeHero}>
              <IconSymbol name="clock.fill" size={22} color={Design.colors.primaryDark} />
              <Text accessibilityLiveRegion="polite" style={styles.timeValue}>{pad(draftHour)}:{pad(draftMinute)}</Text>
              <Text style={styles.timeSuffix}>Uhr</Text>
            </View>
            <View style={styles.sliderSection}>
              <View style={styles.sliderHeading}><Text style={styles.sliderLabel}>Stunde</Text><Text style={styles.sliderNumber}>{pad(draftHour)}</Text></View>
              <Slider
                accessibilityLabel="Stunde"
                maximumTrackTintColor={Design.colors.border}
                maximumValue={23}
                minimumTrackTintColor={Design.colors.primary}
                minimumValue={0}
                onValueChange={setDraftHour}
                step={1}
                thumbTintColor={Design.colors.primaryDark}
                value={draftHour}
              />
              <View style={styles.sliderScale}><Text style={styles.scaleText}>00</Text><Text style={styles.scaleText}>12</Text><Text style={styles.scaleText}>23</Text></View>
            </View>
            <View style={styles.sliderSection}>
              <View style={styles.sliderHeading}><Text style={styles.sliderLabel}>Minute</Text><Text style={styles.sliderNumber}>{pad(draftMinute)}</Text></View>
              <Slider
                accessibilityLabel="Minute"
                maximumTrackTintColor={Design.colors.border}
                maximumValue={59}
                minimumTrackTintColor={Design.colors.primary}
                minimumValue={0}
                onValueChange={setDraftMinute}
                step={1}
                thumbTintColor={Design.colors.primaryDark}
                value={draftMinute}
              />
              <View style={styles.minuteShortcuts}>
                {[0, 15, 30, 45].map((minute) => (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected: Math.round(draftMinute) === minute }}
                    key={minute}
                    onPress={() => setDraftMinute(minute)}
                    style={[styles.minuteButton, Math.round(draftMinute) === minute && styles.minuteButtonActive]}>
                    <Text style={[styles.minuteButtonText, Math.round(draftMinute) === minute && styles.minuteButtonTextActive]}>:{pad(minute)}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </>
        )}
      </AppDialog>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 7 },
  label: { color: Design.colors.ink, fontSize: 13, lineHeight: 18, fontFamily: Design.fonts.bold },
  optional: { color: Design.colors.inkSoft, fontFamily: Design.fonts.regular },
  inputShell: {
    minHeight: Design.size.input,
    borderRadius: Design.radius.medium,
    borderWidth: 1,
    borderColor: Design.colors.border,
    backgroundColor: Design.colors.surface,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  inputError: { borderColor: Design.colors.danger, backgroundColor: Design.colors.dangerSoft },
  inputPressed: { opacity: 0.72, transform: [{ scale: 0.99 }] },
  leadingIcon: { width: 36, height: 36, borderRadius: 13, backgroundColor: Design.colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  value: { flex: 1, color: Design.colors.ink, fontSize: 14, lineHeight: 20, fontFamily: Design.fonts.semiBold },
  referenceLabel: { fontFamily: Design.fonts.referenceHeadlineSemiBold, fontSize: 14, lineHeight: 20 },
  referenceInputShell: { minHeight: 52, borderRadius: 16, borderColor: Design.colors.referenceOutlineVariantSoft, backgroundColor: Design.colors.surface, shadowColor: Design.colors.shadow, shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 1 },
  referenceValue: { fontFamily: Design.fonts.referenceBodyMedium, fontSize: 15, lineHeight: 21 },
  placeholder: { color: Design.colors.inkFaint, fontFamily: Design.fonts.medium },
  error: { color: Design.colors.danger, fontSize: 12, lineHeight: 17, fontFamily: Design.fonts.semiBold },
  monthHeader: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  monthButton: { width: 48, height: 48, borderRadius: 16, backgroundColor: Design.colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  monthAndYear: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  periodButton: { minHeight: 44, paddingHorizontal: 10, borderRadius: 14, backgroundColor: Design.colors.backgroundMuted, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  periodButtonActive: { backgroundColor: Design.colors.primaryDark },
  periodButtonText: { color: Design.colors.primaryDark, fontSize: 13, lineHeight: 18, textTransform: 'capitalize', fontFamily: Design.fonts.extraBold },
  periodButtonTextActive: { color: '#FFFFFF' },
  disabled: { opacity: 0.28 },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calendarCell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  weekday: { color: Design.colors.inkFaint, fontSize: 11, lineHeight: 15, fontFamily: Design.fonts.bold },
  dayButton: { width: '84%', aspectRatio: 1, borderRadius: Design.radius.round, alignItems: 'center', justifyContent: 'center' },
  todayButton: { borderWidth: 1, borderColor: Design.colors.primary },
  selectedDay: { borderColor: Design.colors.primaryDark, backgroundColor: Design.colors.primaryDark },
  dayText: { color: Design.colors.ink, fontSize: 13, lineHeight: 18, fontFamily: Design.fonts.semiBold },
  todayText: { color: Design.colors.primaryDark, fontFamily: Design.fonts.extraBold },
  selectedDayText: { color: '#FFFFFF', fontFamily: Design.fonts.extraBold },
  monthGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingVertical: 4 },
  monthOption: { width: '31%', minHeight: 48, flexGrow: 1, borderRadius: 15, borderWidth: 1, borderColor: Design.colors.border, backgroundColor: Design.colors.surface, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  periodOptionSelected: { borderColor: Design.colors.primaryDark, backgroundColor: Design.colors.primaryDark },
  periodOptionText: { color: Design.colors.ink, fontSize: 13, lineHeight: 18, textAlign: 'center', fontFamily: Design.fonts.bold },
  periodOptionTextSelected: { color: '#FFFFFF', fontFamily: Design.fonts.extraBold },
  yearSelector: { gap: 8 },
  selectorHint: { color: Design.colors.inkSoft, fontSize: 12, lineHeight: 17, textAlign: 'center', fontFamily: Design.fonts.semiBold },
  yearScroll: { height: 260, borderRadius: Design.radius.medium, borderWidth: 1, borderColor: Design.colors.border, backgroundColor: Design.colors.backgroundMuted },
  yearGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 8 },
  yearCell: { width: '33.333%', height: YEAR_GRID_ROW_HEIGHT, padding: 4 },
  yearOption: { flex: 1, minHeight: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  todayShortcut: { minHeight: 48, borderRadius: 16, backgroundColor: Design.colors.primarySoft, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  todayShortcutText: { color: Design.colors.primaryDark, fontSize: 13, lineHeight: 18, fontFamily: Design.fonts.bold },
  timeHero: { minHeight: 94, borderRadius: Design.radius.large, backgroundColor: Design.colors.primarySoft, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  timeValue: { color: Design.colors.primaryDark, fontSize: 38, lineHeight: 44, letterSpacing: -1.2, fontFamily: Design.fonts.extraBold },
  timeSuffix: { alignSelf: 'flex-end', marginBottom: 24, color: Design.colors.inkSoft, fontSize: 12, lineHeight: 17, fontFamily: Design.fonts.bold },
  sliderSection: { gap: 8, borderRadius: Design.radius.medium, borderWidth: 1, borderColor: Design.colors.border, backgroundColor: Design.colors.surface, padding: Design.spacing.md },
  sliderHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sliderLabel: { color: Design.colors.ink, fontSize: 14, lineHeight: 20, fontFamily: Design.fonts.bold },
  sliderNumber: { minWidth: 42, color: Design.colors.primaryDark, fontSize: 17, lineHeight: 22, textAlign: 'right', fontFamily: Design.fonts.extraBold },
  sliderScale: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4 },
  scaleText: { color: Design.colors.inkFaint, fontSize: 11, lineHeight: 15, fontFamily: Design.fonts.semiBold },
  minuteShortcuts: { flexDirection: 'row', gap: 7 },
  minuteButton: { flex: 1, minHeight: 44, borderRadius: 14, backgroundColor: Design.colors.backgroundMuted, alignItems: 'center', justifyContent: 'center' },
  minuteButtonActive: { backgroundColor: Design.colors.primaryDark },
  minuteButtonText: { color: Design.colors.inkSoft, fontSize: 12, lineHeight: 17, fontFamily: Design.fonts.bold },
  minuteButtonTextActive: { color: '#FFFFFF' },
});
