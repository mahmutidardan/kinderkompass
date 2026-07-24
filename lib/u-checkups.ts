export type UCheckupStatus = 'upcoming' | 'due' | 'overdue';

export type UCheckup = {
  id: string;
  label: string;
  windowLabel: string;
  start: Date;
  end: Date;
  status: UCheckupStatus;
};

function parseBirthDate(value?: string) {
  if (!value) return undefined;
  const german = value.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  const iso = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  const day = german ? Number(german[1]) : iso ? Number(iso[3]) : undefined;
  const month = german ? Number(german[2]) : iso ? Number(iso[2]) : undefined;
  const year = german ? Number(german[3]) : iso ? Number(iso[1]) : undefined;
  if (!day || !month || !year) return undefined;
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return undefined;
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function addMonths(date: Date, months: number) {
  const result = new Date(date);
  const day = result.getDate();
  result.setDate(1);
  result.setMonth(result.getMonth() + months);
  const lastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(day, lastDay));
  return result;
}

function statusFor(start: Date, end: Date, now: Date): UCheckupStatus {
  if (now < start) return 'upcoming';
  if (now > end) return 'overdue';
  return 'due';
}

export function getUCheckups(birthDate?: string, now = new Date()) {
  const birth = parseBirthDate(birthDate);
  if (!birth) return [];
  const windows: Array<[string, string, Date, Date]> = [
    ['U1', 'direkt nach der Geburt', birth, birth],
    ['U2', '3.–10. Lebenstag', addDays(birth, 3), addDays(birth, 10)],
    ['U3', '4.–5. Lebenswoche', addDays(birth, 28), addDays(birth, 35)],
    ['U4', '3.–4. Lebensmonat', addMonths(birth, 3), addMonths(birth, 4)],
    ['U5', '6.–7. Lebensmonat', addMonths(birth, 6), addMonths(birth, 7)],
    ['U6', '10.–12. Lebensmonat', addMonths(birth, 10), addMonths(birth, 12)],
    ['U7', '21.–24. Lebensmonat', addMonths(birth, 21), addMonths(birth, 24)],
    ['U7a', '34.–36. Lebensmonat', addMonths(birth, 34), addMonths(birth, 36)],
    ['U8', '46.–48. Lebensmonat', addMonths(birth, 46), addMonths(birth, 48)],
    ['U9', '60.–64. Lebensmonat', addMonths(birth, 60), addMonths(birth, 64)],
  ];
  return windows.map(([id, windowLabel, start, end]) => {
    const normalizedEnd = new Date(end);
    normalizedEnd.setHours(23, 59, 59, 999);
    return { id, label: id, windowLabel, start, end: normalizedEnd, status: statusFor(start, normalizedEnd, now) };
  });
}
