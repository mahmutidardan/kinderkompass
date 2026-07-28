import { Appointment, MedicationEntry, TemperatureEntry } from '@/lib/store';

export type HealthTimelineEvent = {
  id: string;
  type: 'temperature' | 'medication' | 'appointment';
  recordedAt: string;
  title: string;
  detail: string;
  illnessCaseId?: string;
};

export function buildHealthTimeline({ childId, illnessCaseId, temperatures, medications, appointments }: { childId: string; illnessCaseId?: string; temperatures: TemperatureEntry[]; medications: MedicationEntry[]; appointments: Appointment[] }) {
  const belongsToCase = <T extends { illnessCaseId?: string }>(entry: T) => illnessCaseId ? entry.illnessCaseId === illnessCaseId : !entry.illnessCaseId;
  return [
    ...temperatures.filter((item) => item.childId === childId && belongsToCase(item)).map((item) => ({ id: item.id, type: 'temperature' as const, recordedAt: item.recordedAt, title: `${item.temperature.toFixed(1).replace('.', ',')} °C`, detail: `Messung · ${item.method}${item.note ? ` · ${item.note}` : ''}`, illnessCaseId: item.illnessCaseId })),
    ...medications.filter((item) => item.childId === childId && belongsToCase(item)).map((item) => ({ id: item.id, type: 'medication' as const, recordedAt: item.recordedAt, title: item.name, detail: item.amount || 'Gabe dokumentiert', illnessCaseId: item.illnessCaseId })),
    ...appointments.filter((item) => item.childId === childId && belongsToCase(item)).map((item) => ({ id: item.id, type: 'appointment' as const, recordedAt: item.scheduledAt, title: item.title, detail: 'Arzttermin', illnessCaseId: item.illnessCaseId })),
  ].sort((first, second) => second.recordedAt.localeCompare(first.recordedAt));
}
