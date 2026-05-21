'use client';

import React from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useLanguage } from './LanguageProvider';

interface AssessmentStepShellProps {
  step: number;
  totalSteps?: number;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  showBack?: boolean;
  showContinue?: boolean;
  showCancel?: boolean;
  continueLabel?: string;
  continueDisabled?: boolean;
  onBack?: () => void;
  onContinue?: () => void;
  onCancel?: () => void;
  hideNav?: boolean;
  topNote?: string;
}

export function AssessmentStepShell({
  step,
  totalSteps = 9,
  title,
  subtitle,
  children,
  showBack = false,
  showContinue = false,
  showCancel = false,
  continueLabel,
  continueDisabled = false,
  onBack,
  onContinue,
  onCancel,
  hideNav = false,
  topNote,
}: AssessmentStepShellProps) {
  const { t } = useLanguage();
  const progress = Math.min(100, Math.round((step / totalSteps) * 100));
  const continueText = continueLabel ?? t('common.continue');

  return (
    <div className="flex flex-col min-h-[calc(100vh-2rem)] w-full max-w-lg mx-auto px-4 sm:px-6 py-6 sm:py-10">
      {showCancel && onCancel && (
        <div className="flex justify-end mb-2">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center gap-1 text-xs font-bold text-neutral-500 hover:text-red-600 px-2 py-1 rounded-lg hover:bg-red-50"
          >
            <X size={14} />
            {t('assessment.cancelReassessment')}
          </button>
        </div>
      )}

      {topNote && (
        <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2 mb-4 text-center">
          {topNote}
        </p>
      )}

      <div className="mb-8">
        <div className="h-1 w-full bg-neutral-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-600 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 mt-2 text-center">
          {t('common.stepOf', { step, total: totalSteps })}
        </p>
      </div>

      <div className="flex-1 flex flex-col">
        <h1 className="font-[var(--font-serif)] text-2xl sm:text-[1.75rem] font-bold text-teal-800 text-center leading-tight mb-2">
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm text-neutral-500 text-center mb-6 leading-relaxed">{subtitle}</p>
        )}

        <div className="flex-1">{children}</div>

        {!hideNav && (showBack || showContinue) && (
          <div className="mt-8 pt-4 space-y-3 sticky bottom-0 bg-white pb-2">
            {showContinue && (
              <button
                type="button"
                onClick={onContinue}
                disabled={continueDisabled}
                className="w-full h-12 rounded-xl bg-[#ff4f18] hover:bg-[#e03d0d] disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold flex items-center justify-center gap-1 shadow-md shadow-orange-500/20 transition-colors"
              >
                {continueText}
                <ChevronRight size={16} />
              </button>
            )}
            {showBack && (
              <button
                type="button"
                onClick={onBack}
                className="w-full h-11 rounded-xl border border-neutral-200 text-neutral-600 text-sm font-semibold flex items-center justify-center gap-1 hover:border-emerald-300 transition-colors"
              >
                <ChevronLeft size={16} />
                {t('common.back')}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
