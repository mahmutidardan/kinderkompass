export type NightScheduleResult = {
  dates: Date[];
  error?: string;
};

function parseClock(value: string) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return undefined;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return undefined;
  return hours * 60 + minutes;
}

function dateAtMinutes(base: Date, minutes: number) {
  const date = new Date(base);
  date.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return date;
}

function endForWindow(start: Date, startMinutes: number, endMinutes: number) {
  const end = dateAtMinutes(start, endMinutes);
  if (endMinutes < startMinutes) end.setDate(end.getDate() + 1);
  return end;
}

export function buildIntervalSchedule(startValue: string, endValue: string, intervalValue: string, now = new Date()): NightScheduleResult {
  const startMinutes = parseClock(startValue);
  const endMinutes = parseClock(endValue);
  const intervalHours = Number(intervalValue.replace(',', '.'));

  if (startMinutes === undefined || endMinutes === undefined) {
    return { dates: [], error: 'Bitte Start und Ende im Format HH:MM eingeben.' };
  }
  if (startMinutes === endMinutes) {
    return { dates: [], error: 'Start- und Endzeit müssen unterschiedlich sein.' };
  }
  if (!Number.isFinite(intervalHours) || intervalHours < 0.5 || intervalHours > 12) {
    return { dates: [], error: 'Bitte ein Intervall zwischen 0,5 und 12 Stunden eingeben.' };
  }

  const todayStart = dateAtMinutes(now, startMinutes);
  const todayEnd = endForWindow(todayStart, startMinutes, endMinutes);
  const previousStart = new Date(todayStart);
  previousStart.setDate(previousStart.getDate() - 1);
  const previousEnd = endForWindow(previousStart, startMinutes, endMinutes);

  let windowStart: Date;
  let windowEnd: Date;
  if (now >= previousStart && now <= previousEnd) {
    windowStart = previousStart;
    windowEnd = previousEnd;
  } else if (now >= todayStart && now <= todayEnd) {
    windowStart = todayStart;
    windowEnd = todayEnd;
  } else if (now < todayStart) {
    windowStart = todayStart;
    windowEnd = todayEnd;
  } else {
    windowStart = new Date(todayStart);
    windowStart.setDate(windowStart.getDate() + 1);
    windowEnd = endForWindow(windowStart, startMinutes, endMinutes);
  }

  const intervalMilliseconds = intervalHours * 60 * 60 * 1000;
  const dates: Date[] = [];
  for (let timestamp = windowStart.getTime(); timestamp <= windowEnd.getTime() && dates.length < 24; timestamp += intervalMilliseconds) {
    if (timestamp > now.getTime() + 1000) dates.push(new Date(timestamp));
  }

  if (dates.length === 0) return { dates: [], error: 'In diesem Zeitraum liegt kein zukünftiger Alarm.' };
  return { dates };
}

export function buildManualSchedule(values: string[], now = new Date()): NightScheduleResult {
  const enteredValues = values.map((value) => value.trim()).filter(Boolean);
  if (enteredValues.length === 0) return { dates: [], error: 'Bitte mindestens eine Uhrzeit eingeben.' };

  const minutes = enteredValues.map(parseClock);
  if (minutes.some((value) => value === undefined)) {
    return { dates: [], error: 'Bitte alle Uhrzeiten im Format HH:MM eingeben.' };
  }

  const uniqueMinutes = [...new Set(minutes as number[])];
  if (uniqueMinutes.length > 12) return { dates: [], error: 'Pro Nacht sind höchstens 12 manuelle Alarme möglich.' };

  const dates = uniqueMinutes.map((value) => {
    const date = dateAtMinutes(now, value);
    if (date.getTime() <= now.getTime() + 1000) date.setDate(date.getDate() + 1);
    return date;
  }).sort((a, b) => a.getTime() - b.getTime());

  return { dates };
}
