export function parseGermanDate(value?: string) {
  if (!value?.trim()) return undefined;
  const match = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(value.trim());
  if (!match) return undefined;
  const [, day, month, year] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day), 12, 0, 0, 0);
  if (date.getFullYear() !== Number(year) || date.getMonth() !== Number(month) - 1 || date.getDate() !== Number(day)) return undefined;
  return date;
}
export function formatGermanDate(value: Date) {
  return new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(value);
}

export function parseTime(value?: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(value?.trim() ?? '');
  if (!match) return undefined;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return undefined;
  return { hours, minutes };
}

export function parseGermanDateTime(dateValue?: string, timeValue?: string) {
  const date = parseGermanDate(dateValue);
  const time = parseTime(timeValue);
  if (!date || !time) return undefined;
  date.setHours(time.hours, time.minutes, 0, 0);
  return date;
}

export function isValidBirthDate(value?: string) {
  if (!value?.trim()) return true;
  const date = parseGermanDate(value);
  return Boolean(date && date.getTime() <= Date.now());
}

export function isoToDateInput(value?: string) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}
