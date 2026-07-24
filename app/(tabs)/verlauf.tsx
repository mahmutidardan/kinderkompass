import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, Line, Path, Rect, Stop, Text as SvgText } from 'react-native-svg';

import { AppShell } from '@/components/app-shell';
import { EmptyChild } from '@/components/empty-child';
import { InfoButton } from '@/components/info-button';
import { AppButton } from '@/components/ui/app-button';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Design } from '@/constants/design';
import { cancelReminder } from '@/lib/notifications';
import { useStore } from '@/lib/store';
import { getTemperatureGuidance } from '@/lib/temperature-guidance';

type ChartPoint = { x: number; y: number };
type Range = '24h' | '7d' | '30d' | 'all';
const RANGES: { value: Range; label: string; milliseconds?: number }[] = [
  { value: '24h', label: '24 Std.', milliseconds: 24 * 60 * 60 * 1000 },
  { value: '7d', label: '7 Tage', milliseconds: 7 * 24 * 60 * 60 * 1000 },
  { value: '30d', label: '30 Tage', milliseconds: 30 * 24 * 60 * 60 * 1000 },
  { value: 'all', label: 'Alles' },
];

function smoothPath(points: ChartPoint[]) {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  return points.slice(1).reduce((path, point, index) => {
    const previous = points[index];
    const middle = (point.x - previous.x) / 2;
    return `${path} C ${previous.x + middle} ${previous.y}, ${point.x - middle} ${point.y}, ${point.x} ${point.y}`;
  }, `M ${points[0].x} ${points[0].y}`);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

function isToday(value: string) {
  const date = new Date(value);
  const now = new Date();
  return date.getDate() === now.getDate() && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
}

function formatMedicationDay(value: string) {
  if (isToday(value)) return 'Heute';
  return new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit' }).format(new Date(value));
}

export default function VerlaufScreen() {
  const { activeChild, temperatures, medications, deleteTemperature, deleteMedication } = useStore();
  const [chartWidth, setChartWidth] = useState(320);
  const [range, setRange] = useState<Range>('7d');
  const [selectedChartId, setSelectedChartId] = useState<string>();
  const [pendingDelete, setPendingDelete] = useState<{ id: string; type: 'temp' | 'med'; label: string }>();
  const rangeConfig = RANGES.find((item) => item.value === range)!;
  const cutoff = rangeConfig.milliseconds ? Date.now() - rangeConfig.milliseconds : 0;
  const temps = temperatures.filter((item) => item.childId === activeChild?.id).sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));
  const meds = medications.filter((item) => item.childId === activeChild?.id).sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));
  const filteredTemps = temps.filter((item) => new Date(item.recordedAt).getTime() >= cutoff);
  const filteredMeds = meds.filter((item) => new Date(item.recordedAt).getTime() >= cutoff);
  const chartTemps = filteredTemps.slice(-20);
  const recentMeds = filteredMeds.slice(0, 12);
  const todayTemps = temps.filter((item) => isToday(item.recordedAt)).length;
  const todayMeds = meds.filter((item) => isToday(item.recordedAt)).length;
  const allEntries = [
    ...filteredTemps.map((item) => ({ id: item.id, at: item.recordedAt, value: `${item.temperature.toFixed(1).replace('.', ',')} °C`, detail: `Messung · ${item.method}${item.note ? ` · ${item.note}` : ''}`, type: 'temp' as const, notificationId: undefined })),
    ...filteredMeds.map((item) => ({ id: item.id, at: item.recordedAt, value: item.name, detail: item.amount || 'Menge nicht angegeben', type: 'med' as const, notificationId: item.reminderNotificationId })),
  ].sort((a, b) => b.at.localeCompare(a.at));
  const selectedChartEntry = chartTemps.find((item) => item.id === selectedChartId) ?? chartTemps.at(-1);
  const feverFrom = getTemperatureGuidance(38.5, activeChild?.birthDate).feverFrom;
  const chartHeight = 205;
  const chartPadding = { left: 31, right: 10, top: 12, bottom: 27 };
  const plotWidth = Math.max(1, chartWidth - chartPadding.left - chartPadding.right);
  const plotHeight = chartHeight - chartPadding.top - chartPadding.bottom;
  const temperatureY = (value: number) => chartPadding.top + ((42 - Math.min(42, Math.max(34, value))) / 8) * plotHeight;
  const chartPoints = chartTemps.map((item, index) => ({
    x: chartPadding.left + (chartTemps.length === 1 ? plotWidth / 2 : (index / (chartTemps.length - 1)) * plotWidth),
    y: temperatureY(item.temperature),
  }));
  const linePath = smoothPath(chartPoints);
  const areaPath = chartPoints.length > 1 ? `${linePath} L ${chartPoints.at(-1)?.x} ${chartPadding.top + plotHeight} L ${chartPoints[0].x} ${chartPadding.top + plotHeight} Z` : '';
  const timeLabelIndices = new Set([0, Math.floor((chartTemps.length - 1) / 2), chartTemps.length - 1]);

  async function confirmDeleteEntry() {
    if (!pendingDelete) return;
    const entry = allEntries.find((item) => item.id === pendingDelete.id && item.type === pendingDelete.type);
    if (pendingDelete.type === 'med') {
      await cancelReminder(entry?.notificationId);
      deleteMedication(pendingDelete.id);
    } else {
      deleteTemperature(pendingDelete.id);
    }
    setPendingDelete(undefined);
  }

  return (
    <AppShell eyebrow={activeChild ? `Gesundheitstagebuch · ${activeChild.name}` : 'Gesundheitstagebuch'} title="Dein Verlauf">
      {!activeChild ? <EmptyChild /> : (
        <>
          <View accessibilityRole="tablist" style={styles.rangeSwitch}>
            {RANGES.map((item) => (
              <Pressable accessibilityRole="tab" accessibilityState={{ selected: range === item.value }} key={item.value} onPress={() => setRange(item.value)} style={[styles.rangeButton, range === item.value && styles.rangeButtonActive]}>
                <Text style={[styles.rangeText, range === item.value && styles.rangeTextActive]}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: Design.colors.primarySoft }]}>
              <View style={[styles.statIcon, { backgroundColor: Design.colors.lavender }]}><IconSymbol name="thermometer.medium" size={20} color={Design.colors.primaryDark} /></View>
              <Text style={styles.statValue}>{todayTemps}</Text>
              <Text style={styles.statLabel}>Messungen heute</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: Design.colors.accentSoft }]}>
              <View style={[styles.statIcon, { backgroundColor: Design.colors.peach }]}><IconSymbol name="pills.fill" size={20} color={Design.colors.peachStrong} /></View>
              <Text style={styles.statValue}>{todayMeds}</Text>
              <Text style={styles.statLabel}>Gaben heute</Text>
            </View>
          </View>

          <LinearGradient colors={['#FFFFFF', '#F3F0FA']} style={styles.chartCard}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.cardTitle}>Temperatur</Text>
                <Text style={styles.cardMeta}>{chartTemps.length === 1 ? 'Letzte Messung' : `Sanfter Verlauf · ${chartTemps.length} Messungen`}</Text>
              </View>
              <View style={styles.chartHeaderActions}><InfoButton title="Temperaturverlauf" text="Die Kurve verbindet die letzten Messungen. Die farbigen Zonen markieren niedrige, normale, erhöhte und fiebrige Temperaturbereiche." />{chartTemps.length > 0 ? <View style={styles.latestPill}><Text style={styles.latest}>{chartTemps.at(-1)?.temperature.toFixed(1).replace('.', ',')}°</Text></View> : null}</View>
            </View>
            {chartTemps.length === 0 ? (
              <View style={styles.chartEmpty}><Text style={styles.emptyText}>Nach der ersten Messung wird hier der Verlauf sichtbar.</Text></View>
            ) : (
              <>
                {selectedChartEntry ? (
                  <View style={styles.selectedPoint}>
                    <View><Text style={styles.selectedValue}>{selectedChartEntry.temperature.toFixed(1).replace('.', ',')} °C</Text><Text style={styles.selectedMeta}>{formatDate(selectedChartEntry.recordedAt)} · {selectedChartEntry.method}</Text></View>
                    <Text style={[styles.selectedStatus, { color: getTemperatureGuidance(selectedChartEntry.temperature, activeChild.birthDate).color }]}>{getTemperatureGuidance(selectedChartEntry.temperature, activeChild.birthDate).label}</Text>
                  </View>
                ) : null}
                <View style={styles.lineChart} onLayout={(event) => setChartWidth(event.nativeEvent.layout.width)}>
                <Svg width="100%" height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
                  <Defs><SvgLinearGradient id="temperatureArea" x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor={Design.colors.primary} stopOpacity="0.28" /><Stop offset="1" stopColor={Design.colors.primary} stopOpacity="0.02" /></SvgLinearGradient></Defs>
                  <Rect x={chartPadding.left} y={chartPadding.top} width={plotWidth} height={temperatureY(feverFrom) - chartPadding.top} fill="#FCE9E7" rx="8" />
                  <Rect x={chartPadding.left} y={temperatureY(feverFrom)} width={plotWidth} height={temperatureY(37.6) - temperatureY(feverFrom)} fill="#FBF1D8" />
                  <Rect x={chartPadding.left} y={temperatureY(37.6)} width={plotWidth} height={temperatureY(36.5) - temperatureY(37.6)} fill="#E8F3EC" />
                  <Rect x={chartPadding.left} y={temperatureY(36.5)} width={plotWidth} height={chartPadding.top + plotHeight - temperatureY(36.5)} fill="#E9F1F8" rx="8" />
                  {[35, 38, 41].map((value) => <Line key={value} x1={chartPadding.left} x2={chartPadding.left + plotWidth} y1={temperatureY(value)} y2={temperatureY(value)} stroke="#FFFFFF" strokeWidth="1" strokeDasharray="4 5" />)}
                  {[35, 38, 41].map((value) => <SvgText key={`label-${value}`} x="1" y={temperatureY(value) + 4} fill="#746F7A" fontSize="11">{value}°</SvgText>)}
                  {areaPath ? <Path d={areaPath} fill="url(#temperatureArea)" /> : null}
                  <Path d={linePath} fill="none" stroke={Design.colors.primaryDark} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
                  {chartTemps.map((item, index) => {
                    const point = chartPoints[index];
                    const tone = getTemperatureGuidance(item.temperature, activeChild.birthDate).color;
                    return <Circle accessibilityLabel={`${item.temperature.toFixed(1)} Grad am ${formatDate(item.recordedAt)}`} onPress={() => setSelectedChartId(item.id)} key={item.id} cx={point.x} cy={point.y} r={selectedChartEntry?.id === item.id ? 7 : 5.5} fill={tone} stroke="#FFFFFF" strokeWidth="3" />;
                  })}
                  {chartTemps.map((item, index) => timeLabelIndices.has(index) ? <SvgText key={`time-${item.id}`} x={chartPoints[index].x} y={chartHeight - 6} fill="#746F7A" fontSize="11" textAnchor={index === 0 ? 'start' : index === chartTemps.length - 1 ? 'end' : 'middle'}>{formatTime(item.recordedAt).slice(0, 5)}</SvgText> : null)}
                </Svg>
              </View>
              </>
            )}
          </LinearGradient>

          <LinearGradient colors={['#FFF8F4', '#F7EFF4']} style={styles.medChartCard}>
            <View style={styles.cardHeader}><View><Text style={styles.cardTitle}>Medikamentenverlauf</Text><Text style={styles.cardMeta}>{recentMeds.length ? `Letzte ${recentMeds.length} dokumentierte Gaben` : 'Noch keine Gabe dokumentiert'}</Text></View><InfoButton title="Medikamentenverlauf" text="Die Zeitleiste zeigt, wann welches Medikament mit welcher eingetragenen Menge verabreicht wurde." /></View>
            {recentMeds.length === 0 ? <View style={styles.medEmpty}><Text style={styles.emptyText}>Dokumentierte Medikamentengaben erscheinen hier als Zeitleiste.</Text></View> : <View style={styles.medTimeline}>{recentMeds.map((item, index) => (
              <View key={item.id} style={styles.medTimelineRow}>
                <View style={styles.medTime}><Text style={styles.medClock}>{formatTime(item.recordedAt)}</Text><Text style={styles.medDay}>{formatMedicationDay(item.recordedAt)}</Text></View>
                <View style={styles.medRail}><View style={styles.medDot}><IconSymbol name="pills.fill" size={13} color={Design.colors.peachStrong} /></View>{index < recentMeds.length - 1 ? <View style={styles.medLine} /> : null}</View>
                <View style={styles.medEvent}><Text style={styles.medEventName}>{item.name}</Text><Text style={styles.medEventAmount}>{item.amount || 'Menge nicht angegeben'}</Text></View>
              </View>
            ))}</View>}
          </LinearGradient>

          <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Alle Einträge</Text><View style={styles.sectionActions}><View style={styles.countPill}><Text style={styles.countText}>{allEntries.length}</Text></View><InfoButton title="Alle Einträge" text="Hier findest du alle gespeicherten Temperaturmessungen und Medikamentengaben für das aktive Kinderprofil." /></View></View>
          {pendingDelete ? (
            <View style={styles.deleteConfirm}>
              <View style={styles.deleteConfirmCopy}><Text style={styles.deleteConfirmTitle}>{pendingDelete.label} löschen?</Text><Text style={styles.deleteConfirmText}>Der Eintrag und eine zugehörige Erinnerung werden dauerhaft entfernt.</Text></View>
              <View style={styles.deleteConfirmActions}><AppButton label="Abbrechen" variant="secondary" compact onPress={() => setPendingDelete(undefined)} style={styles.deleteButton} /><AppButton label="Löschen" variant="danger" compact onPress={confirmDeleteEntry} style={styles.deleteButton} /></View>
            </View>
          ) : null}
          {allEntries.length === 0 ? (
            <View style={styles.emptyCard}><Text style={styles.emptyText}>Noch keine Einträge für {activeChild.name}.</Text></View>
          ) : (
            <View style={styles.list}>
              {allEntries.map((entry, index) => (
                <View key={`${entry.type}-${entry.id}`} style={[styles.row, index === allEntries.length - 1 && styles.lastRow]}>
                  <View style={[styles.marker, entry.type === 'med' ? styles.medMarker : styles.tempMarker]}>
                    <IconSymbol name={entry.type === 'med' ? 'pills.fill' : 'thermometer.medium'} size={18} color={entry.type === 'med' ? Design.colors.peachStrong : Design.colors.primary} />
                  </View>
                  <View style={styles.rowCopy}>
                    <Text style={styles.value}>{entry.value}</Text>
                    <Text style={styles.detail}>{entry.detail}</Text>
                  </View>
                  <View style={styles.rowEnd}><Text style={styles.date}>{formatDate(entry.at)}</Text><View style={styles.rowActions}><Pressable accessibilityRole="button" accessibilityLabel={`${entry.value} bearbeiten`} onPress={() => router.push(`/modal?kind=${entry.type === 'med' ? 'medication' : 'temperature'}&entryId=${entry.id}`)} style={styles.rowAction}><IconSymbol name="pencil" size={16} color={Design.colors.primaryDark} /></Pressable><Pressable accessibilityRole="button" accessibilityLabel={`${entry.value} löschen`} onPress={() => setPendingDelete({ id: entry.id, type: entry.type, label: entry.value })} style={[styles.rowAction, styles.rowDelete]}><IconSymbol name="trash.fill" size={16} color={Design.colors.danger} /></Pressable></View></View>
                </View>
              ))}
            </View>
          )}
        </>
      )}
    </AppShell>
  );
}

const styles = StyleSheet.create({
  rangeSwitch: { flexDirection: 'row', borderRadius: Design.radius.medium, backgroundColor: Design.colors.backgroundMuted, padding: 5, gap: 3 },
  rangeButton: { flex: 1, minHeight: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  rangeButtonActive: { backgroundColor: Design.colors.surface, ...Design.shadow.card },
  rangeText: { color: Design.colors.inkSoft, fontSize: 12, lineHeight: 17, fontFamily: Design.fonts.semiBold },
  rangeTextActive: { color: Design.colors.primaryDark, fontFamily: Design.fonts.bold },
  statsRow: { flexDirection: 'row', gap: 12 },
  statCard: { flex: 1, borderRadius: Design.radius.large, padding: 17, minHeight: 136 },
  statIcon: { width: 42, height: 42, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 11 },
  statValue: { color: Design.colors.ink, fontSize: 25, lineHeight: 31, fontFamily: Design.fonts.bold, letterSpacing: -0.5 },
  statLabel: { color: Design.colors.inkSoft, fontSize: 12, lineHeight: 17, fontFamily: Design.fonts.regular },
  chartCard: { borderRadius: Design.radius.hero, padding: 21, gap: 19, borderWidth: 1, borderColor: 'rgba(72,61,77,0.045)', ...Design.shadow.card },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  chartHeaderActions: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  cardTitle: { color: Design.colors.ink, ...Design.type.section, fontFamily: Design.fonts.bold },
  cardMeta: { color: Design.colors.inkSoft, fontSize: 12, lineHeight: 17, fontFamily: Design.fonts.regular, marginTop: 2 },
  latestPill: { backgroundColor: Design.colors.primarySoft, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 14 },
  latest: { color: Design.colors.primaryDark, fontSize: 17, lineHeight: 23, fontFamily: Design.fonts.bold },
  lineChart: { width: '100%', height: 205, borderRadius: 18, overflow: 'hidden' },
  selectedPoint: { borderRadius: Design.radius.medium, backgroundColor: 'rgba(255,255,255,0.72)', paddingHorizontal: 14, paddingVertical: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  selectedValue: { color: Design.colors.ink, fontSize: 16, lineHeight: 22, fontFamily: Design.fonts.bold },
  selectedMeta: { color: Design.colors.inkSoft, fontSize: 12, lineHeight: 17, fontFamily: Design.fonts.regular, marginTop: 2 },
  selectedStatus: { fontSize: 12, lineHeight: 17, fontFamily: Design.fonts.bold, textAlign: 'right' },
  chartEmpty: { height: 150, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  medChartCard: { borderRadius: Design.radius.hero, padding: 21, gap: 17, borderWidth: 1, borderColor: 'rgba(72,61,77,0.045)', ...Design.shadow.card },
  medEmpty: { minHeight: 100, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  medTimeline: { paddingTop: 2 },
  medTimelineRow: { minHeight: 67, flexDirection: 'row', alignItems: 'stretch' },
  medTime: { width: 54, alignItems: 'flex-end', paddingTop: 5, paddingRight: 9 },
  medClock: { color: Design.colors.ink, fontSize: 12, lineHeight: 17, fontFamily: Design.fonts.bold },
  medDay: { color: Design.colors.inkSoft, fontSize: 11, lineHeight: 15, fontFamily: Design.fonts.regular, marginTop: 1 },
  medRail: { width: 32, alignItems: 'center', position: 'relative' },
  medDot: { width: 30, height: 30, borderRadius: 11, backgroundColor: Design.colors.peach, borderWidth: 3, borderColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  medLine: { position: 'absolute', top: 29, bottom: -1, width: 2, backgroundColor: '#E9CFC8' },
  medEvent: { flex: 1, minHeight: 48, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.78)', paddingHorizontal: 13, paddingVertical: 9, marginLeft: 7, marginBottom: 10 },
  medEventName: { color: Design.colors.ink, fontSize: 13, lineHeight: 18, fontFamily: Design.fonts.bold },
  medEventAmount: { color: Design.colors.inkSoft, fontSize: 12, lineHeight: 17, fontFamily: Design.fonts.regular, marginTop: 2 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionActions: { flexDirection: 'row', alignItems: 'center', gap: 9, marginLeft: 'auto' },
  sectionTitle: { color: Design.colors.ink, ...Design.type.section, fontFamily: Design.fonts.bold },
  deleteConfirm: { backgroundColor: Design.colors.dangerSoft, borderRadius: Design.radius.large, padding: 15, gap: 12, borderWidth: 1, borderColor: '#E9C7C1' },
  deleteConfirmCopy: { gap: 3 },
  deleteConfirmTitle: { color: Design.colors.danger, fontSize: 14, lineHeight: 19, fontFamily: Design.fonts.bold },
  deleteConfirmText: { color: Design.colors.inkSoft, fontSize: 12, lineHeight: 18, fontFamily: Design.fonts.regular },
  deleteConfirmActions: { flexDirection: 'row', gap: 9 },
  deleteButton: { flex: 1 },
  countPill: { minWidth: 24, height: 24, borderRadius: 12, backgroundColor: Design.colors.primarySoft, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 7 },
  countText: { color: Design.colors.primary, fontSize: 11, fontFamily: Design.fonts.extraBold },
  list: { backgroundColor: Design.colors.surface, borderRadius: Design.radius.large, paddingHorizontal: 17, borderWidth: 1, borderColor: 'rgba(72,61,77,0.045)', ...Design.shadow.card },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 96, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Design.colors.border },
  lastRow: { borderBottomWidth: 0 },
  marker: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  tempMarker: { backgroundColor: Design.colors.primarySoft },
  medMarker: { backgroundColor: Design.colors.accentSoft },
  rowCopy: { flex: 1 },
  value: { color: Design.colors.ink, fontSize: 15, lineHeight: 20, fontFamily: Design.fonts.bold },
  detail: { color: Design.colors.inkSoft, fontSize: 12, lineHeight: 17, fontFamily: Design.fonts.regular, marginTop: 1 },
  date: { color: Design.colors.inkSoft, fontSize: 11, lineHeight: 16, fontFamily: Design.fonts.semiBold, textAlign: 'right', maxWidth: 78 },
  rowEnd: { alignItems: 'flex-end', gap: 5, marginLeft: 8 },
  rowActions: { flexDirection: 'row', gap: 5 },
  rowAction: { width: 40, height: 40, borderRadius: 14, backgroundColor: Design.colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  rowDelete: { backgroundColor: Design.colors.dangerSoft },
  emptyCard: { backgroundColor: Design.colors.surface, borderRadius: 24, padding: 24 },
  emptyText: { color: Design.colors.inkSoft, fontSize: 12, lineHeight: 18, textAlign: 'center', fontFamily: Design.fonts.regular },
});
