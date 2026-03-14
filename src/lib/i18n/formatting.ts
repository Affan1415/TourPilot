// Locale-aware formatting utilities for TourPilot
import { Locale } from './index';

// Currency formatting
const currencyFormats: Record<Locale, Intl.NumberFormatOptions> = {
  en: { style: 'currency', currency: 'USD' },
  es: { style: 'currency', currency: 'USD' }, // Using USD for consistency, can be changed per locale
};

export function formatCurrency(amount: number, locale: Locale): string {
  return new Intl.NumberFormat(locale, currencyFormats[locale]).format(amount);
}

// Number formatting
export function formatNumber(num: number, locale: Locale, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(locale, options).format(num);
}

// Percentage formatting
export function formatPercent(value: number, locale: Locale, decimals = 1): string {
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value / 100);
}

// Date formatting options
type DateStyle = 'short' | 'medium' | 'long' | 'full';

export function formatDate(
  date: Date | string | number,
  locale: Locale,
  style: DateStyle = 'medium'
): string {
  const d = date instanceof Date ? date : new Date(date);
  return new Intl.DateTimeFormat(locale, { dateStyle: style }).format(d);
}

export function formatTime(
  date: Date | string | number,
  locale: Locale,
  style: DateStyle = 'short'
): string {
  const d = date instanceof Date ? date : new Date(date);
  return new Intl.DateTimeFormat(locale, { timeStyle: style }).format(d);
}

export function formatDateTime(
  date: Date | string | number,
  locale: Locale,
  dateStyle: DateStyle = 'medium',
  timeStyle: DateStyle = 'short'
): string {
  const d = date instanceof Date ? date : new Date(date);
  return new Intl.DateTimeFormat(locale, { dateStyle, timeStyle }).format(d);
}

// Relative time formatting
const relativeTimeFormat: Record<Locale, Intl.RelativeTimeFormat> = {
  en: new Intl.RelativeTimeFormat('en', { numeric: 'auto' }),
  es: new Intl.RelativeTimeFormat('es', { numeric: 'auto' }),
};

type TimeUnit = 'second' | 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year';

const timeUnits: { unit: TimeUnit; ms: number }[] = [
  { unit: 'year', ms: 31536000000 },
  { unit: 'month', ms: 2628000000 },
  { unit: 'week', ms: 604800000 },
  { unit: 'day', ms: 86400000 },
  { unit: 'hour', ms: 3600000 },
  { unit: 'minute', ms: 60000 },
  { unit: 'second', ms: 1000 },
];

export function formatRelativeTime(date: Date | string | number, locale: Locale): string {
  const d = date instanceof Date ? date : new Date(date);
  const diff = d.getTime() - Date.now();
  const absDiff = Math.abs(diff);

  for (const { unit, ms } of timeUnits) {
    if (absDiff >= ms || unit === 'second') {
      const value = Math.round(diff / ms);
      return relativeTimeFormat[locale].format(value, unit);
    }
  }

  return relativeTimeFormat[locale].format(0, 'second');
}

// Duration formatting (e.g., "2 hours 30 minutes")
export function formatDuration(minutes: number, locale: Locale): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  const parts: string[] = [];

  if (hours > 0) {
    if (locale === 'es') {
      parts.push(`${hours} ${hours === 1 ? 'hora' : 'horas'}`);
    } else {
      parts.push(`${hours} ${hours === 1 ? 'hour' : 'hours'}`);
    }
  }

  if (mins > 0) {
    if (locale === 'es') {
      parts.push(`${mins} ${mins === 1 ? 'minuto' : 'minutos'}`);
    } else {
      parts.push(`${mins} ${mins === 1 ? 'minute' : 'minutes'}`);
    }
  }

  return parts.join(' ') || (locale === 'es' ? '0 minutos' : '0 minutes');
}

// Short duration (e.g., "2h 30m")
export function formatDurationShort(minutes: number, locale: Locale): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  const parts: string[] = [];

  if (hours > 0) {
    parts.push(`${hours}h`);
  }

  if (mins > 0) {
    parts.push(`${mins}m`);
  }

  return parts.join(' ') || '0m';
}

// List formatting
export function formatList(items: string[], locale: Locale, type: 'conjunction' | 'disjunction' = 'conjunction'): string {
  return new Intl.ListFormat(locale, { style: 'long', type }).format(items);
}

// Plural rules
const pluralRules: Record<Locale, Intl.PluralRules> = {
  en: new Intl.PluralRules('en'),
  es: new Intl.PluralRules('es'),
};

export function getPluralForm(count: number, locale: Locale): Intl.LDMLPluralRule {
  return pluralRules[locale].select(count);
}

// Helper for pluralized strings
export function pluralize(
  count: number,
  locale: Locale,
  singular: string,
  plural: string
): string {
  const form = getPluralForm(count, locale);
  return form === 'one' ? singular : plural;
}

// Day and month names
export function getDayNames(locale: Locale, format: 'long' | 'short' | 'narrow' = 'long'): string[] {
  const formatter = new Intl.DateTimeFormat(locale, { weekday: format });
  const days: string[] = [];

  // Start from a known Sunday (Jan 4, 1970 was a Sunday)
  for (let i = 0; i < 7; i++) {
    const date = new Date(1970, 0, 4 + i);
    days.push(formatter.format(date));
  }

  return days;
}

export function getMonthNames(locale: Locale, format: 'long' | 'short' | 'narrow' = 'long'): string[] {
  const formatter = new Intl.DateTimeFormat(locale, { month: format });
  const months: string[] = [];

  for (let i = 0; i < 12; i++) {
    const date = new Date(2000, i, 1);
    months.push(formatter.format(date));
  }

  return months;
}
