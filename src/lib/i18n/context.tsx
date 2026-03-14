'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  Locale,
  defaultLocale,
  locales,
  translations,
  detectLocale,
  setLocale as saveLocale,
  t as translate,
} from './index';

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  locales: readonly Locale[];
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

interface I18nProviderProps {
  children: React.ReactNode;
  initialLocale?: Locale;
}

export function I18nProvider({ children, initialLocale }: I18nProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale ?? defaultLocale);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!initialLocale) {
      const detected = detectLocale();
      setLocaleState(detected);
    }
  }, [initialLocale]);

  const setLocale = useCallback((newLocale: Locale) => {
    if (locales.includes(newLocale)) {
      setLocaleState(newLocale);
      saveLocale(newLocale);
      // Update document lang attribute
      if (typeof document !== 'undefined') {
        document.documentElement.lang = newLocale;
      }
    }
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => {
      return translate(locale, key, params);
    },
    [locale]
  );

  // Prevent hydration mismatch by using default locale until mounted
  const contextValue: I18nContextType = {
    locale: mounted ? locale : defaultLocale,
    setLocale,
    t,
    locales,
  };

  return <I18nContext.Provider value={contextValue}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextType {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}

// Hook for just translation function (common use case)
export function useTranslation() {
  const { t, locale } = useI18n();
  return { t, locale };
}
