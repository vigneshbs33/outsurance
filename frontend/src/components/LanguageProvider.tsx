'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  type AppLocale,
  localeToIntake,
  intakeToLocale,
} from '../i18n/config';
import { translate } from '../i18n/translate';
import { IntakeLanguage } from '../enums/assessment.enum';
import { triggerGTranslate } from './GTranslateWidget';

type LanguageContextValue = {
  locale: AppLocale;
  setLocale: (locale: AppLocale) => void;
  t: (path: string, params?: Record<string, string | number>) => string;
  intakeLanguage: IntakeLanguage;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<AppLocale>(DEFAULT_LOCALE);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY) as AppLocale | null;
    if (stored && ['en', 'hi', 'kn', 'ta', 'te', 'mr', 'bn', 'gu', 'ml', 'pa'].includes(stored)) {
      setLocaleState(stored);
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    document.documentElement.lang = locale === 'en' ? 'en' : locale;
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    triggerGTranslate(locale);
  }, [locale, ready]);

  const setLocale = useCallback((next: AppLocale) => {
    setLocaleState(next);
    triggerGTranslate(next);
  }, []);

  const t = useCallback(
    (path: string, params?: Record<string, string | number>) => translate(locale, path, params),
    [locale]
  );

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      t,
      intakeLanguage: localeToIntake(locale),
    }),
    [locale, setLocale, t]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}

/** Sync assessment page language pick with global locale. */
export function useSyncIntakeLanguage(intake: IntakeLanguage, onChange?: (l: IntakeLanguage) => void) {
  const { setLocale } = useLanguage();
  return useCallback(
    (code: IntakeLanguage) => {
      onChange?.(code);
      setLocale(intakeToLocale(code));
    },
    [onChange, setLocale]
  );
}
