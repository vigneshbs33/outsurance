'use client';

import Script from 'next/script';
import { useEffect } from 'react';

declare global {
  interface Window {
    gtranslateSettings?: Record<string, unknown>;
    doGTranslate?: (pair: string) => void;
  }
}

const GT_LANGS = ['en', 'fr', 'it', 'es', 'hi', 'bn', 'ta', 'mr', 'ml', 'kn', 'te'] as const;
export type GTranslateLang = (typeof GT_LANGS)[number];

/** Map app/assessment locale codes to GTranslate language codes. */
export function toGTranslateLang(code: string): GTranslateLang {
  const map: Record<string, GTranslateLang> = {
    en: 'en',
    hi: 'hi',
    bn: 'bn',
    ta: 'ta',
    mr: 'mr',
    ml: 'ml',
    kn: 'kn',
    te: 'te',
    gu: 'hi',
    pa: 'hi',
  };
  return map[code] ?? 'en';
}

/** Switch page language via GTranslate (assessment + global UI). */
export function triggerGTranslate(lang: string) {
  if (typeof window === 'undefined') return;
  const target = toGTranslateLang(lang);
  const pair = `en|${target}`;

  const apply = () => {
    if (typeof window.doGTranslate === 'function') {
      window.doGTranslate(pair);
      return;
    }
    const combo = document.querySelector('.goog-te-combo') as HTMLSelectElement | null;
    if (combo) {
      combo.value = target;
      combo.dispatchEvent(new Event('change'));
    }
  };

  apply();
  window.setTimeout(apply, 400);
  window.setTimeout(apply, 1200);
}

export function GTranslateWidget() {
  useEffect(() => {
    window.gtranslateSettings = {
      default_language: 'en',
      native_language_names: true,
      languages: [...GT_LANGS],
      wrapper_selector: '.gtranslate_wrapper',
      switcher_horizontal_position: 'right',
    };
  }, []);

  return (
    <>
      <div className="gtranslate_wrapper" aria-hidden />
      <Script
        src="https://cdn.gtranslate.net/widgets/latest/float.js"
        strategy="afterInteractive"
      />
    </>
  );
}
