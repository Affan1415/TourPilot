'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  Locale,
  defaultLocale,
  locales,
  detectLocale,
  setLocale as saveLocale,
  t as translate,
} from './index';

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale, syncToServer?: boolean) => void;
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

  // Fetch user's language preference from server on mount
  useEffect(() => {
    setMounted(true);

    async function fetchUserLanguage() {
      try {
        const response = await fetch('/api/user/language');
        if (response.ok) {
          const data = await response.json();
          if (data.language && locales.includes(data.language as Locale)) {
            setLocaleState(data.language as Locale);
            saveLocale(data.language);
            if (typeof document !== 'undefined') {
              document.documentElement.lang = data.language;
            }
            return;
          }
        }
      } catch {
        // Ignore errors, fall back to localStorage/browser detection
      }

      // Fall back to localStorage or browser detection
      if (!initialLocale) {
        const detected = detectLocale();
        setLocaleState(detected);
        if (typeof document !== 'undefined') {
          document.documentElement.lang = detected;
        }
      }
    }

    fetchUserLanguage();
  }, [initialLocale]);

  const setLocale = useCallback((newLocale: Locale, syncToServer = true) => {
    if (locales.includes(newLocale)) {
      setLocaleState(newLocale);
      saveLocale(newLocale);
      // Update document lang attribute
      if (typeof document !== 'undefined') {
        document.documentElement.lang = newLocale;
      }

      // Sync to server for authenticated users
      if (syncToServer) {
        fetch('/api/user/language', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ language: newLocale }),
        }).catch(() => {
          // Ignore errors - localStorage is the fallback
        });
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
