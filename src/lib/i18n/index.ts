// i18n Configuration for TourPilot
// Supports English and Spanish with extensible architecture

export const defaultLocale = 'en';
export const locales = ['en', 'es'] as const;
export type Locale = (typeof locales)[number];

export const localeNames: Record<Locale, string> = {
  en: 'English',
  es: 'Español',
};

export const localeFlags: Record<Locale, string> = {
  en: '🇺🇸',
  es: '🇪🇸',
};

// Import translations
import enCommon from '@/locales/en/common.json';
import esCommon from '@/locales/es/common.json';

export const translations: Record<Locale, typeof enCommon> = {
  en: enCommon,
  es: esCommon,
};

// Type-safe translation key paths
type NestedKeyOf<T> = T extends object
  ? {
      [K in keyof T]: K extends string
        ? T[K] extends object
          ? `${K}.${NestedKeyOf<T[K]>}`
          : K
        : never;
    }[keyof T]
  : never;

export type TranslationKey = NestedKeyOf<typeof enCommon>;

// Get nested value from object by dot notation path
function getNestedValue(obj: Record<string, unknown>, path: string): string {
  const keys = path.split('.');
  let current: unknown = obj;

  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = (current as Record<string, unknown>)[key];
    } else {
      return path; // Return the key if not found
    }
  }

  return typeof current === 'string' ? current : path;
}

// Translation function
export function t(locale: Locale, key: string, params?: Record<string, string | number>): string {
  const translation = getNestedValue(translations[locale] as Record<string, unknown>, key);

  if (!params) {
    return translation;
  }

  // Replace placeholders like {{name}} with actual values
  return translation.replace(/\{\{(\w+)\}\}/g, (_, paramKey) => {
    return params[paramKey]?.toString() ?? `{{${paramKey}}}`;
  });
}

// Detect user's preferred locale from browser
export function detectLocale(): Locale {
  if (typeof window === 'undefined') {
    return defaultLocale;
  }

  // Check localStorage first
  const stored = localStorage.getItem('locale');
  if (stored && locales.includes(stored as Locale)) {
    return stored as Locale;
  }

  // Check browser language
  const browserLang = navigator.language.split('-')[0];
  if (locales.includes(browserLang as Locale)) {
    return browserLang as Locale;
  }

  return defaultLocale;
}

// Save locale preference
export function setLocale(locale: Locale): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('locale', locale);
  }
}

// Get locale from storage
export function getStoredLocale(): Locale | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const stored = localStorage.getItem('locale');
  return stored && locales.includes(stored as Locale) ? (stored as Locale) : null;
}
