'use client';

import React, { useState } from 'react';
import { Languages, X } from 'lucide-react';
import { LOCALE_OPTIONS } from '../i18n/config';
import { useLanguage } from './LanguageProvider';

export function LanguageFab() {
  const { locale, setLocale, t } = useLanguage();
  const [open, setOpen] = useState(false);

  const current = LOCALE_OPTIONS.find((o) => o.code === locale);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-5 right-5 z-[1200] h-12 w-12 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/30 flex items-center justify-center border-2 border-white"
        aria-label={t('language.fabLabel')}
        title={t('language.fabLabel')}
      >
        <Languages size={20} />
      </button>

      {open && (
        <div className="fixed bottom-20 right-5 z-[1200] w-[min(92vw,280px)] bg-white rounded-2xl border border-neutral-200 shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100 bg-emerald-50">
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
              {t('language.choose')}
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="p-1 rounded-lg hover:bg-emerald-100 text-emerald-700"
              aria-label={t('common.close')}
            >
              <X size={16} />
            </button>
          </div>
          <ul className="max-h-[50vh] overflow-y-auto py-1">
            {LOCALE_OPTIONS.map((opt) => {
              const active = opt.code === locale;
              return (
                <li key={opt.code}>
                  <button
                    type="button"
                    onClick={() => {
                      setLocale(opt.code);
                      setOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2.5 flex items-center justify-between gap-2 transition-colors ${
                      active ? 'bg-emerald-50 text-emerald-800' : 'hover:bg-neutral-50 text-neutral-800'
                    }`}
                  >
                    <span className="text-sm font-semibold">{opt.native}</span>
                    <span className="text-[10px] text-neutral-400 uppercase">{opt.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          {current && (
            <p className="px-4 py-2 text-[10px] text-neutral-500 border-t border-neutral-100 bg-neutral-50">
              Active: {current.native}
            </p>
          )}
        </div>
      )}
    </>
  );
}
