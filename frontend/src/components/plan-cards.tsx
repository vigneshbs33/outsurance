'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ChevronDown, ChevronUp, Heart, Play, Percent } from 'lucide-react';
import type { Plan } from './StressTestModal';
import { formatSimilarityScore, getPlanCosineSimilarity } from '../lib/planCompare';
import { getCriticalDrawbacks } from '../lib/planCriticalPoints';
import { getInsurerLogoSrc, INSURER_BORDER } from '../lib/insurerLogos';
import { useLanguage } from './LanguageProvider';

const INSURER_META: Record<string, { border: string; bg: string; text: string; initials: string }> = {
  'Star Health':   { border: 'border-[#0a4da2]', bg: 'bg-[#0a4da2]', text: 'text-[#0a4da2]', initials: 'SH' },
  'HDFC ERGO':     { border: 'border-[#e21b22]', bg: 'bg-[#e21b22]', text: 'text-[#e21b22]', initials: 'HE' },
  'Niva Bupa':     { border: 'border-[#009b9e]', bg: 'bg-[#009b9e]', text: 'text-[#009b9e]', initials: 'NB' },
  'Care Health':   { border: 'border-[#f0b429]', bg: 'bg-[#4ca848]', text: 'text-[#4ca848]', initials: 'CH' },
  'LIC':           { border: 'border-[#1b365d]', bg: 'bg-[#1b365d]', text: 'text-[#1b365d]', initials: 'LIC' },
  'Bajaj Allianz': { border: 'border-[#006db7]', bg: 'bg-[#006db7]', text: 'text-[#006db7]', initials: 'BA' },
  'ICICI Lombard': { border: 'border-[#e87722]', bg: 'bg-[#e87722]', text: 'text-[#e87722]', initials: 'IL' },
  'Aditya Birla':  { border: 'border-[#c0242a]', bg: 'bg-[#c0242a]', text: 'text-[#c0242a]', initials: 'AB' },
  'ManipalCigna':  { border: 'border-[#0077b6]', bg: 'bg-[#0077b6]', text: 'text-[#0077b6]', initials: 'MC' },
  'Tata AIG':      { border: 'border-[#003087]', bg: 'bg-[#003087]', text: 'text-[#003087]', initials: 'TA' },
  'Max Bupa':      { border: 'border-[#d40f7d]', bg: 'bg-[#d40f7d]', text: 'text-[#d40f7d]', initials: 'MB' },
  'SBI General':   { border: 'border-[#6c287a]', bg: 'bg-[#6c287a]', text: 'text-[#6c287a]', initials: 'SBI' },
};

function getInsurerMeta(ins: string) {
  return INSURER_META[ins] ?? {
    border: 'border-[#f0b429]', bg: 'bg-emerald-600', text: 'text-emerald-600',
    initials: ins.split(' ').map((w: string) => w[0]).join('').slice(0, 3).toUpperCase(),
  };
}

function formatCoverage(amount: number): string {
  if (amount >= 10000000) {
    const cr = amount / 10000000;
    return `₹${cr % 1 === 0 ? cr.toFixed(0) : cr.toFixed(1)} Cr`;
  }
  const lakh = amount / 100000;
  return `₹${lakh % 1 === 0 ? lakh.toFixed(0) : lakh.toFixed(1)} Lakh`;
}

function getPlanFeatures(plan: Plan): string[] {
  const features: string[] = [];
  if (plan.diabetes_day1) features.push('Day-1 cover for Diabetes & Hypertension');
  const wait = (plan.pre_existing_wait_years ?? plan.preexisting_wait_years ?? 3) as number;
  features.push(`Waiting period of ${wait} year${wait !== 1 ? 's' : ''} for existing disease(s)`);
  features.push(plan.room_rent_limit ?? 'Single Private AC Room');
  if (plan.restoration_benefit) features.push('Unlimited Restoration of cover');
  if ((plan.no_claim_bonus_pct ?? 0) > 0) features.push(`${plan.no_claim_bonus_pct}% No Claim Bonus`);
  return features;
}

function InsurerBadge({
  insurer,
  meta,
  compact = false,
}: {
  insurer: string;
  meta: ReturnType<typeof getInsurerMeta>;
  compact?: boolean;
}) {
  const logoSrc = getInsurerLogoSrc(insurer);
  const borderClass = INSURER_BORDER[insurer] ?? meta.border;

  const logoInner = logoSrc ? (
    <Image
      src={logoSrc}
      alt={insurer}
      width={compact ? 48 : 88}
      height={compact ? 32 : 44}
      className="object-contain max-h-full w-auto"
      unoptimized
    />
  ) : (
    <div className={`rounded-full ${meta.bg} flex items-center justify-center text-white font-black ${compact ? 'h-9 w-9 text-[10px]' : 'h-11 w-11 text-xs'}`}>
      {meta.initials}
    </div>
  );

  if (compact) {
    return (
      <div className={`shrink-0 w-[72px] h-[72px] bg-white border-2 ${borderClass} rounded-xl flex items-center justify-center shadow-sm p-2`}>
        {logoInner}
      </div>
    );
  }
  return (
    <div
      className={`w-[140px] shrink-0 self-start bg-white border-2 ${borderClass} rounded-2xl px-3 py-4 flex flex-col items-center justify-center gap-2 shadow-[0_2px_12px_rgba(0,0,0,0.06)] min-h-[7.5rem]`}
    >
      <div className="h-12 w-full flex items-center justify-center px-1">{logoInner}</div>
      <button
        type="button"
        className="text-[10px] font-semibold text-[#0078fd] hover:underline"
      >
        About Insurer &rsaquo;
      </button>
    </div>
  );
}

type SuitabilityBreakdown = {
  budget_fit: number;
  condition_match: number;
  risk_alignment: number;
  age_eligibility: number;
  coverage_adequacy: number;
  family_fit: number;
  cosine_similarity: number;
};

interface PlanCardProps {
  plan: Plan & { suitability_breakdown?: SuitabilityBreakdown };
  isCompared: boolean;
  payYearly: boolean;
  onToggleCompare: (id: number) => void;
  onStressTest: (plan: Plan) => void;
  onViewHospitals?: (plan: Plan) => void;
  router: ReturnType<typeof useRouter>;
}

export function PlanCard({
  plan,
  isCompared,
  payYearly,
  onToggleCompare,
  onStressTest,
  onViewHospitals,
  router,
}: PlanCardProps) {
  const { t } = useLanguage();
  const [expanded, setExpanded] = useState(false);
  const meta = getInsurerMeta(plan.insurer);
  const criticalPoints = getCriticalDrawbacks(plan);
  const features = getPlanFeatures(plan);
  const displayFeatures = expanded ? features : features.slice(0, 3);
  const knnSim = getPlanCosineSimilarity(plan);
  const aiExplanation =
    plan.plain_english_explanation ||
    `This ${plan.type ?? 'health'} plan scores ${(plan.suitability_score ?? 0).toFixed(1)}/10 for your profile with KNN similarity ${formatSimilarityScore(plan)}.`;

  const monthly = Math.round(plan.annual_premium / 12);
  const displayPremium = payYearly
    ? Math.round(plan.annual_premium).toLocaleString('en-IN')
    : monthly.toLocaleString('en-IN');
  const strikePrice = payYearly
    ? Math.round(plan.annual_premium * 1.18).toLocaleString('en-IN')
    : Math.round(monthly * 1.18).toLocaleString('en-IN');

  return (
    <div className="w-full">
      {/* Mobile: insurer + title row */}
      <div className="md:hidden flex items-start gap-3 mb-3">
        <InsurerBadge insurer={plan.insurer} meta={meta} compact />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-[15px] font-bold text-[#1e293b] leading-tight">{plan.name}</h3>
            <button type="button" className="text-neutral-300 hover:text-red-400 shrink-0" aria-label="Save plan">
              <Heart className="w-4 h-4" strokeWidth={2} />
            </button>
          </div>
          <p className="text-[11px] text-neutral-500 font-medium mt-0.5">{plan.insurer}</p>
        </div>
      </div>

      <div className={`flex-1 bg-white border ${isCompared ? 'border-emerald-400 ring-2 ring-emerald-100' : 'border-neutral-200'} rounded-2xl shadow-[0_4px_24px_rgba(15,23,42,0.08)] hover:shadow-[0_8px_32px_rgba(15,23,42,0.12)] transition-all flex flex-col overflow-hidden`}>
        <div className="p-4 sm:p-5 flex flex-col gap-3.5 flex-1">
          {/* Desktop header */}
          <div className="hidden md:flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <h3 className="text-[15px] font-bold text-[#1e293b] leading-tight truncate">{plan.name}</h3>
              <button type="button" className="text-neutral-300 hover:text-red-400 transition-colors shrink-0" aria-label="Save plan">
                <Heart className="w-4 h-4" strokeWidth={2} />
              </button>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {knnSim > 0 && (
                <span className="text-[10px] font-bold text-teal-700 bg-teal-50 border border-teal-100 px-2 py-0.5 rounded-full">
                  {t('plans.knn')} {knnSim.toFixed(1)}/10
                </span>
              )}
              {plan.suitability_score != null && (
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                  {plan.suitability_score.toFixed(1)} {t('plans.match')}
                </span>
              )}
            </div>
          </div>

          {/* Mobile scores */}
          <div className="md:hidden flex flex-wrap gap-2">
            {knnSim > 0 && (
              <span className="text-[10px] font-bold text-teal-700 bg-teal-50 border border-teal-100 px-2 py-0.5 rounded-full">
                {t('plans.knn')} {knnSim.toFixed(1)}/10
              </span>
            )}
            {plan.suitability_score != null && (
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                {plan.suitability_score.toFixed(1)} {t('plans.match')}
              </span>
            )}
          </div>

          <div className="bg-emerald-50/70 border border-emerald-100 rounded-lg px-3 py-2">
            <p className="text-[11px] text-teal-900 leading-relaxed">
              <span className="font-bold">✦ {t('plans.aiPrefix')} </span>
              {aiExplanation}
            </p>
          </div>

          {criticalPoints.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
              <p className="text-[10px] font-black uppercase tracking-wider text-red-800 mb-1.5">
                {t('plans.criticalTitle')}
              </p>
              <p className="text-[9px] text-red-600 mb-2">{t('plans.criticalSubtitle')}</p>
              <ul className="space-y-1">
                {criticalPoints.map((point, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-[11px] text-red-800 leading-snug">
                    <span className="text-red-500 font-bold shrink-0 mt-0.5">•</span>
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-col lg:flex-row gap-5 justify-between">
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24" aria-hidden>
                    <path d="M19 10.5V20H5V10.5H19ZM20 9H4C3.4 9 3 9.4 3 10V21C3 21.6 3.4 22 4 22H20C20.6 22 21 21.6 21 21V10C21 9.4 20.6 9 20 9Z" />
                    <path d="M12 2C9.8 2 8 3.8 8 6V8H16V6C16 3.8 14.2 2 12 2ZM14 8H10V6C10 4.9 10.9 4 12 4C13.1 4 14 4.9 14 6V8Z" />
                  </svg>
                </div>
                <p className="text-xs text-neutral-600">
                  <span className="font-bold text-neutral-800">
                    {t('plans.cashlessCount', {
                      count: (plan.hospital_network_count ?? 300).toLocaleString('en-IN'),
                    })}
                  </span>{' '}
                  <button
                    type="button"
                    onClick={() => onViewHospitals?.(plan)}
                    className="text-teal-700 font-semibold hover:underline cursor-pointer"
                  >
                    {t('plans.viewList')} &rsaquo;
                  </button>
                </p>
              </div>

              <div className="space-y-1.5 pt-0.5">
                {displayFeatures.map((feat, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <svg className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-xs text-neutral-600 leading-snug">{feat}</span>
                  </div>
                ))}
              </div>

              {expanded && plan.warning_flags && (plan.warning_flags as string[]).length > 0 && (
                <div className="mt-2 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 space-y-0.5">
                  <p className="text-[10px] font-bold text-amber-800 mb-1">Important Notes</p>
                  {(plan.warning_flags as string[]).map((flag: string, i: number) => (
                    <p key={i} className="text-[10px] text-amber-700">• {flag}</p>
                  ))}
                </div>
              )}

              {expanded && plan.suitability_breakdown && (
                <div className="mt-3 pt-3 border-t border-neutral-100">
                  <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-2">Score Breakdown</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                    {([
                      ['Budget Fit', plan.suitability_breakdown.budget_fit],
                      ['Condition Match', plan.suitability_breakdown.condition_match],
                      ['Risk Alignment', plan.suitability_breakdown.risk_alignment],
                      ['Coverage', plan.suitability_breakdown.coverage_adequacy],
                      ['Family Fit', plan.suitability_breakdown.family_fit],
                      ['KNN Similarity', plan.suitability_breakdown.cosine_similarity],
                    ] as [string, number][]).map(([label, val]) => (
                      <div key={label}>
                        <div className="flex justify-between items-center mb-0.5">
                          <span className="text-[10px] text-neutral-500">{label}</span>
                          <span className="text-[10px] font-bold text-neutral-700">{val.toFixed(1)}/10</span>
                        </div>
                        <div className="h-1 bg-neutral-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${val >= 8 ? 'bg-emerald-500' : val >= 5 ? 'bg-amber-400' : 'bg-red-400'}`}
                            style={{ width: `${val * 10}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Pricing — stacks on mobile */}
            <div className="w-full lg:w-[230px] shrink-0 flex flex-col gap-3 border-t lg:border-t-0 border-neutral-100 pt-4 lg:pt-0">
              <div className="flex justify-between items-start gap-4">
                <div>
                  <span className="text-[9px] uppercase font-bold text-neutral-400 tracking-wider block">Cover Amount</span>
                  <div className="flex items-center gap-0.5 mt-0.5">
                    <span className="text-sm font-bold text-neutral-800">{formatCoverage(plan.coverage)}</span>
                    <ChevronDown size={12} className="text-neutral-400" />
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[9px] uppercase font-bold text-neutral-400 tracking-wider block">
                    Premium ({payYearly ? '1 year' : '1 month'})
                  </span>
                  <div className="flex items-baseline justify-end gap-0.5 mt-0.5">
                    <span className="text-[15px] font-black text-slate-800">₹{displayPremium}</span>
                    {!payYearly && <span className="text-xs font-semibold text-neutral-500">/month</span>}
                  </div>
                  <span className="text-[10px] text-neutral-400 line-through">₹{strikePrice} Incl. GST</span>
                </div>
              </div>

              <p className="text-[11px] text-sky-700 bg-sky-50 border border-sky-100 rounded-lg px-2.5 py-1.5 text-center font-medium md:hidden">
                Inclusive of 5% direct discount*
              </p>

              <div className="hidden md:block space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    if (plan.link) window.open(plan.link, '_blank', 'noopener,noreferrer');
                    else router.push(`/buy/${plan.id}`);
                  }}
                  className="w-full bg-[#ff4f18] hover:bg-[#e03d0d] active:scale-[0.98] text-white text-sm font-bold py-3 rounded-xl flex items-center justify-center gap-1.5 shadow-lg shadow-orange-500/25 transition-all cursor-pointer"
                >
                  Customize plan &rsaquo;
                </button>
                <p className="inline-flex w-full items-center justify-center gap-1 text-[10px] text-teal-800 bg-teal-50 border border-teal-100 rounded-full py-1 font-semibold">
                  <Percent size={11} className="text-teal-600" />
                  Inclusive of 5% online discount*
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer — teal bar like PolicyBazaar reference */}
        <div className="bg-[#e6f4f1] border-t border-[#b8ddd6] px-4 sm:px-5 py-2.5">
          <div className="hidden md:flex items-center justify-between">
            <div className="flex items-center gap-3 text-xs">
              <button
                type="button"
                onClick={() => router.push(`/explorer/${plan.id}`)}
                className="font-bold text-[#0078fd] hover:underline cursor-pointer"
              >
                View all features &rsaquo;
              </button>
              <span className="text-[#9ec5be]">|</span>
              <button
                type="button"
                className="font-semibold text-neutral-600 hover:text-neutral-800 cursor-pointer flex items-center gap-1"
              >
                <Play size={11} className="text-emerald-600 fill-emerald-600" />
                Watch plan video
              </button>
              <span className="text-[#9ec5be]">|</span>
              <button
                type="button"
                onClick={() => setExpanded((e) => !e)}
                className="font-semibold text-neutral-500 hover:text-neutral-700 cursor-pointer flex items-center gap-0.5"
              >
                {expanded ? <>Show less <ChevronUp size={11} /></> : 'More on this card'}
              </button>
            </div>
            <button
              type="button"
              onClick={() => onToggleCompare(Number(plan.id))}
              className="flex items-center gap-2 cursor-pointer select-none"
              aria-pressed={isCompared}
            >
              <span
                className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all shrink-0 ${
                  isCompared ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-neutral-300 bg-white hover:border-neutral-400'
                }`}
              >
                {isCompared && (
                  <svg className="w-3 h-3 stroke-current stroke-[3] fill-none" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </span>
              <span className="text-[11px] font-bold text-neutral-600">
                {isCompared ? t('plans.addedToCompare') : t('plans.addToCompare')}
              </span>
            </button>
          </div>

          {/* Mobile footer buttons */}
          <div className="md:hidden flex flex-col gap-2.5">
            <div className="flex items-center justify-center gap-3 text-xs">
              <button
                type="button"
                onClick={() => router.push(`/explorer/${plan.id}`)}
                className="font-bold text-[#0078fd] hover:underline"
              >
                View all features &rsaquo;
              </button>
              <span className="text-neutral-200">|</span>
              <button type="button" onClick={() => setExpanded((e) => !e)} className="font-semibold text-neutral-500">
                {expanded ? 'Less' : 'More'}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onToggleCompare(Number(plan.id))}
                className={`h-11 rounded-xl border text-sm font-bold ${
                  isCompared ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-neutral-300 bg-white text-neutral-800'
                }`}
              >
                {isCompared ? t('plans.addedToCompare') : `+ ${t('plans.addToCompare')}`}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (plan.link) window.open(plan.link, '_blank', 'noopener,noreferrer');
                  else router.push(`/buy/${plan.id}`);
                }}
                className="h-11 rounded-xl bg-[#ff4f18] hover:bg-[#e03d0d] text-white text-sm font-bold"
              >
                Customize plan &rsaquo;
              </button>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

interface InsurerGroupProps {
  insurer: string;
  plans: Plan[];
  compareIds: number[];
  payYearly: boolean;
  onToggleCompare: (id: number) => void;
  onStressTest: (plan: Plan) => void;
  onViewHospitals?: (plan: Plan) => void;
  router: ReturnType<typeof useRouter>;
}

export function InsurerGroup({
  insurer,
  plans,
  compareIds,
  payYearly,
  onToggleCompare,
  onStressTest,
  onViewHospitals,
  router,
}: InsurerGroupProps) {
  const [showMore, setShowMore] = useState(false);
  const top = plans[0];
  const rest = plans.slice(1);
  const meta = getInsurerMeta(insurer);
  const visiblePlans = showMore ? plans : [top];

  return (
    <div className="flex items-start gap-3 w-full">
      {/* Desktop: shared insurer column (~50% of first card, not full stretch) */}
      <div className="hidden md:flex flex-col self-start sticky top-[120px] pt-10">
        <InsurerBadge insurer={insurer} meta={meta} />
      </div>

      <div className="flex-1 min-w-0 space-y-3">
        {visiblePlans.map((p) => (
          <PlanCard
            key={p.id}
            plan={p}
            isCompared={compareIds.includes(Number(p.id))}
            payYearly={payYearly}
            onToggleCompare={onToggleCompare}
            onStressTest={onStressTest}
            onViewHospitals={onViewHospitals}
            router={router}
          />
        ))}
        {rest.length > 0 && (
          <button
            type="button"
            onClick={() => setShowMore((s) => !s)}
            className="w-full py-2.5 text-xs text-[#0078fd] font-bold flex items-center justify-center gap-1 cursor-pointer border border-dashed border-[#0078fd]/25 rounded-xl bg-white/50 hover:bg-blue-50/40 transition-colors"
          >
            {showMore ? (
              <>Hide plans from {insurer} <ChevronUp size={12} /></>
            ) : (
              <>View {rest.length} more plan{rest.length !== 1 ? 's' : ''} from {insurer} <ChevronDown size={12} /></>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
