export type TemperatureStatus = 'hypothermia' | 'low' | 'normal' | 'elevated' | 'fever' | 'highFever';

export type TemperatureGuidance = {
  status: TemperatureStatus;
  label: string;
  detail: string;
  color: string;
  feverFrom: number;
  highFeverFrom: number;
  ageMonths?: number;
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
  return date;
}

function ageInMonths(birthDate?: string, now = new Date()) {
  const date = parseBirthDate(birthDate);
  if (!date || date > now) return undefined;
  const months = (now.getFullYear() - date.getFullYear()) * 12 + now.getMonth() - date.getMonth();
  return now.getDate() < date.getDate() ? months - 1 : months;
}

/**
 * Orientation values based on gesund.bund.de and kindergesundheit-info.de:
 * below 35.0 °C is too low, normal 36.5–37.5 °C, elevated 37.6–38.4 °C,
 * fever from 38.5 °C, high fever from 39.0 °C. In the first 3 months,
 * 38.0 °C is already fever.
 */
export function getTemperatureGuidance(value: number, birthDate?: string): TemperatureGuidance {
  const months = ageInMonths(birthDate);
  const feverFrom = months !== undefined && months < 3 ? 38 : 38.5;
  const highFeverFrom = 39;
  const status: TemperatureStatus = value >= highFeverFrom
    ? 'highFever'
    : value >= feverFrom
      ? 'fever'
      : value >= 37.6
        ? 'elevated'
        : value >= 36.5
          ? 'normal'
          : value >= 35
            ? 'low'
            : 'hypothermia';

  const label = status === 'hypothermia'
    ? 'Unterkühlungsbereich'
    : status === 'low'
      ? 'Niedrige Temperatur'
      : status === 'highFever'
    ? 'Hohes Fieber'
    : status === 'fever'
      ? 'Fieber'
      : status === 'elevated'
        ? 'Erhöhte Temperatur'
        : 'Im Normalbereich';
  const detail = status === 'hypothermia'
    ? 'Unter 35,0 °C: Unterkühlung möglich – Messung prüfen und ärztlich abklären.'
    : status === 'low'
      ? 'Unter 36,5 °C: ungewöhnlich niedrig – bitte Messung und Befinden prüfen.'
      : months !== undefined && months < 3 && status !== 'normal'
    ? 'Unter 3 Monaten: ab 38,0 °C bitte sofort ärztlich abklären.'
    : status === 'highFever'
      ? 'Ab 39,0 °C: Zustand und weitere Symptome besonders beobachten.'
      : status === 'fever'
        ? `Fieberbereich ab ${feverFrom.toFixed(1).replace('.', ',')} °C.`
        : status === 'elevated'
          ? 'Leicht erhöhte Temperatur – Verlauf und Befinden beachten.'
          : 'Orientierungsbereich für gesunde Kinder.';
  const color = status === 'hypothermia'
    ? '#2E5C96'
    : status === 'low'
      ? '#4C88B8'
      : status === 'highFever'
    ? '#C94E4E'
    : status === 'fever'
      ? '#E98270'
      : status === 'elevated'
        ? '#E3B24F'
        : '#5DA37F';
  return { status, label, detail, color, feverFrom, highFeverFrom, ageMonths: months };
}
