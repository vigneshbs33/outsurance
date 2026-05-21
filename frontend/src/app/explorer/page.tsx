'use client';

import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Sidebar from '../../components/Sidebar';
import { fetchAllPlans, rankAllPlans } from '../../lib/api';
import { supabase, getLatestRecommendation } from '../../lib/supabase';
import { useCompare } from '../../lib/compare';
import StressTestModal, { Plan } from '../../components/StressTestModal';
import CompareDrawer from '../../components/CompareDrawer';
import { FilterPlansModal, FilterState } from '../../components/FilterPlansModal';
import { InsurerGroup } from '../../components/plan-cards';
import { ExplorerCoverageBar } from '../../components/ExplorerCoverageBar';
import { CashlessHospitalsModal } from '../../components/CashlessHospitalsModal';
import { parseProfileFromFullName } from '../../lib/profileMeta';
import { getPlanCosineSimilarity, mergeScoredPlans, mergeRecommendationScores } from '../../lib/planCompare';
import { useLanguage } from '../../components/LanguageProvider';
import { ChevronDown, SlidersHorizontal, Sparkles } from 'lucide-react';
import {
  SortByOption, CoverOption, RoomRentOption, PolicyBenefitOption,
  ExistingDiseaseWaitOption, PremiumOption, PortabilityOption,
  MaternityWaitOption, PolicyPeriodOption, MaternityCoverOption,
} from '../../enums/filters.enum';

const DEFAULT_FILTERS: FilterState = {
  sortBy: SortByOption.RELEVANCE,
  cover: CoverOption.RECOMMENDED,
  roomRent: RoomRentOption.NO_PREFERENCE,
  benefits: [],
  existingDiseaseWait: ExistingDiseaseWaitOption.NO_PREFERENCE,
  premiumPerMonth: PremiumOption.NO_PREFERENCE,
  portability: PortabilityOption.NO_PREFERENCE,
  maternityWait: MaternityWaitOption.NO_PREFERENCE,
  policyPeriod: PolicyPeriodOption.ONE_YEAR,
  selectedInsurers: [],
  maternityCover: MaternityCoverOption.NO_PREFERENCE,
};

function ExplorerContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [query, setQuery] = useState(searchParams.get('search') || '');
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [cashlessOnly, setCashlessOnly] = useState(false);
  const [payYearly, setPayYearly] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [selectedPlanForStress, setSelectedPlanForStress] = useState<Plan | null>(null);
  const [isCompareDrawerOpen, setIsCompareDrawerOpen] = useState(false);
  const [compareNotice, setCompareNotice] = useState<string | null>(null);
  const [hospitalPlan, setHospitalPlan] = useState<Plan | null>(null);
  const [profileCity, setProfileCity] = useState('');
  const planIds = useMemo(() => plans.map((p) => Number(p.id)), [plans]);
  const { compareIds, toggleCompare, clearCompare } = useCompare(planIds);

  const handleToggleCompare = (id: number) => {
    const ok = toggleCompare(id);
    if (!ok) {
      setCompareNotice(t('explorer.compareLimit'));
      setTimeout(() => setCompareNotice(null), 3500);
    }
  };

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push('/login');
        return;
      }
      Promise.all([
        fetchAllPlans(),
        getLatestRecommendation(user.id),
        supabase.from('profiles').select('full_name, city').eq('id', user.id).maybeSingle(),
        supabase
          .from('assessment_sessions')
          .select('age, bmi, smoker, hba1c, bp_systolic, has_diabetes, has_hypertension, chronic_count, monthly_budget, income_lakh')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ])
        .then(async ([allPlans, recommendation, profileRes, assessmentRes]) => {
          const profileRow = profileRes.data;
          if (profileRow?.city) {
            setProfileCity(profileRow.city as string);
          } else if (profileRow?.full_name) {
            const { meta } = parseProfileFromFullName(profileRow.full_name as string);
            if (meta?.city) setProfileCity(String(meta.city));
          }
          let merged = mergeRecommendationScores(allPlans as Plan[], recommendation);
          const assess = assessmentRes.data;
          const scoredCount = merged.filter((p) => getPlanCosineSimilarity(p) > 0).length;
          if (scoredCount < 10 && assess?.age && assess?.bmi && assess?.hba1c) {
            try {
              const ranked = await rankAllPlans({
                age: assess.age,
                bmi: assess.bmi,
                smoker: assess.smoker ? 1 : 0,
                hba1c: assess.hba1c,
                bp_systolic: assess.bp_systolic ?? 120,
                diabetes: assess.has_diabetes ? 1 : 0,
                hypertension: assess.has_hypertension ? 1 : 0,
                chronic_count: assess.chronic_count ?? 0,
                monthly_budget: assess.monthly_budget ?? 3000,
                income_lakh: assess.income_lakh ?? 8,
              });
              if (ranked.scored_plans?.length) {
                merged = mergeScoredPlans(allPlans as Plan[], ranked.scored_plans as Plan[]);
              }
            } catch {
              /* keep recommendation merge */
            }
          }
          setPlans(merged);
        })
        .finally(() => setLoading(false));
    });
  }, [router]);

  const filteredPlans = useMemo<Plan[]>(() => {
    let list = [...plans];
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.insurer.toLowerCase().includes(q) ||
          (p.type ?? '').toLowerCase().includes(q)
      );
    }

    if (cashlessOnly) list = list.filter((p) => (p.hospital_network_count ?? 0) >= 10000);

    if (filters.cover !== CoverOption.RECOMMENDED) {
      if (filters.cover === CoverOption.BELOW_5_LAKH) list = list.filter((p) => p.coverage < 500000);
      else if (filters.cover === CoverOption.FIVE_TO_NINE_LAKH)
        list = list.filter((p) => p.coverage >= 500000 && p.coverage <= 900000);
      else if (filters.cover === CoverOption.TEN_TO_TWENTY_FOUR_LAKH)
        list = list.filter((p) => p.coverage >= 1000000 && p.coverage <= 2400000);
      else if (filters.cover === CoverOption.TWENTY_FIVE_TO_NINETY_NINE_LAKH)
        list = list.filter((p) => p.coverage >= 2500000 && p.coverage <= 9900000);
      else if (filters.cover === CoverOption.ONE_TO_TWO_CR)
        list = list.filter((p) => p.coverage >= 10000000 && p.coverage <= 20000000);
      else if (filters.cover === CoverOption.TWO_TO_SIX_CR)
        list = list.filter((p) => p.coverage >= 20000000);
    }

    filters.benefits.forEach((b: string) => {
      if (b === PolicyBenefitOption.DIABETES_COVERED) list = list.filter((p) => p.diabetes_day1);
      else if (b === PolicyBenefitOption.NO_CLAIM_BONUS)
        list = list.filter((p) => (p.no_claim_bonus_pct ?? 0) > 0);
      else if (b === PolicyBenefitOption.RESTORATION_BENEFITS)
        list = list.filter((p) => p.restoration_benefit);
      else if (b === PolicyBenefitOption.FREE_HEALTH_CHECKUP)
        list = list.filter((p) =>
          p.coverage_highlights?.some((h: string) => h.toLowerCase().includes('check'))
        );
      else if (b === PolicyBenefitOption.DOCTOR_CONSULTATION_PHARMACY)
        list = list.filter((p) => p.pros?.some((h: string) => h.toLowerCase().includes('opd')));
      else if (b === PolicyBenefitOption.DAY_CARE_TREATMENTS)
        list = list.filter((p) =>
          p.coverage_highlights?.some((h: string) => h.toLowerCase().includes('day care'))
        );
    });

    if (filters.premiumPerMonth !== PremiumOption.NO_PREFERENCE) {
      if (filters.premiumPerMonth === PremiumOption.BELOW_1K)
        list = list.filter((p) => p.annual_premium / 12 < 1000);
      else if (filters.premiumPerMonth === PremiumOption.ONE_TO_TWO_K)
        list = list.filter((p) => p.annual_premium / 12 >= 1000 && p.annual_premium / 12 <= 2000);
      else if (filters.premiumPerMonth === PremiumOption.TWO_TO_FOUR_K)
        list = list.filter((p) => p.annual_premium / 12 >= 2000 && p.annual_premium / 12 <= 4000);
      else if (filters.premiumPerMonth === PremiumOption.ABOVE_FOURK)
        list = list.filter((p) => p.annual_premium / 12 > 4000);
    }

    if (filters.existingDiseaseWait !== ExistingDiseaseWaitOption.NO_PREFERENCE) {
      const maxWait =
        filters.existingDiseaseWait === ExistingDiseaseWaitOption.NO_WAITING_PERIOD
          ? 0
          : filters.existingDiseaseWait === ExistingDiseaseWaitOption.ONE_YEAR
            ? 1
            : filters.existingDiseaseWait === ExistingDiseaseWaitOption.TWO_YEARS
              ? 2
              : 3;
      list = list.filter(
        (p) => (p.pre_existing_wait_years ?? p.preexisting_wait_years ?? 4) <= maxWait
      );
    }

    if (filters.selectedInsurers.length > 0) {
      list = list.filter((p) =>
        filters.selectedInsurers.some(
          (ins: string) => ins.toLowerCase() === p.insurer?.toLowerCase()
        )
      );
    }

    if (filters.sortBy === SortByOption.PREMIUM_LOW_TO_HIGH)
      list.sort((a, b) => a.annual_premium - b.annual_premium);
    else if (filters.sortBy === SortByOption.CASHLESS_HOSPITALS)
      list.sort((a, b) => (b.hospital_network_count ?? 0) - (a.hospital_network_count ?? 0));
    else list.sort((a, b) => (b.suitability_score ?? 0) - (a.suitability_score ?? 0));

    return list;
  }, [plans, query, filters, cashlessOnly]);

  const groupedByInsurer = useMemo(() => {
    const map = new Map<string, Plan[]>();
    filteredPlans.forEach((p) => {
      const existing = map.get(p.insurer) ?? [];
      map.set(p.insurer, [...existing, p]);
    });
    return Array.from(map.entries()).map(([insurer, insurerPlans]) => ({
      insurer,
      plans: insurerPlans,
    }));
  }, [filteredPlans]);

  const comparedPlansList = useMemo(
    () => plans.filter((p) => compareIds.includes(Number(p.id))),
    [plans, compareIds]
  );

  const activeFilterCount = [
    filters.cover !== CoverOption.RECOMMENDED,
    filters.sortBy !== SortByOption.RELEVANCE,
    filters.benefits.length > 0,
    filters.premiumPerMonth !== PremiumOption.NO_PREFERENCE,
    filters.existingDiseaseWait !== ExistingDiseaseWaitOption.NO_PREFERENCE,
    filters.selectedInsurers.length > 0,
    cashlessOnly,
  ].filter(Boolean).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f4f6f8] flex items-center justify-center">
        <span className="h-8 w-8 border-2 border-emerald-500 border-t-transparent animate-spin rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f6f8] lg:flex relative">
      <Sidebar />
      <main className="flex-1 flex flex-col">
        <ExplorerCoverageBar />

        <div className="bg-white border-b border-neutral-100 px-4 sm:px-6 py-3 sticky top-0 z-30 shadow-sm">
          <div className="max-w-[960px] mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-black text-neutral-800">{t('explorer.title')}</h1>
              <p className="text-xs text-neutral-500">
                {t('explorer.plansCount', { filtered: filteredPlans.length, total: plans.length })}
              </p>
            </div>
            <div className="flex flex-col min-[420px]:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
              <input
                className="px-3 py-2 border border-neutral-200 rounded-lg text-xs w-full sm:w-48 outline-none focus:border-emerald-400"
                placeholder={t('explorer.searchPlaceholder')}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <div className="flex items-center justify-between sm:justify-start gap-2">
                <div className="flex items-center gap-1.5 bg-neutral-50 border border-neutral-200 rounded-lg px-2.5 py-1.5 shrink-0">
                  <span className={`text-[11px] font-bold ${!payYearly ? 'text-emerald-700' : 'text-neutral-400'}`}>
                    Monthly
                  </span>
                  <button
                    type="button"
                    onClick={() => setPayYearly((y) => !y)}
                    aria-label="Toggle yearly pricing"
                    className={`h-4 w-8 rounded-full p-0.5 shrink-0 ${payYearly ? 'bg-emerald-500' : 'bg-neutral-200'}`}
                  >
                    <div
                      className={`h-3 w-3 rounded-full bg-white transition-transform ${payYearly ? 'translate-x-4' : ''}`}
                    />
                  </button>
                  <span className={`text-[11px] font-bold ${payYearly ? 'text-emerald-700' : 'text-neutral-400'}`}>
                    Yearly
                  </span>
                </div>
                <button
                  onClick={() => setIsCompareDrawerOpen(true)}
                  className="text-xs font-bold border border-neutral-200 rounded-lg px-3 py-2 hover:border-emerald-300 shrink-0"
                >
                  Compare{compareIds.length > 0 && ` (${compareIds.length})`}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border-b border-neutral-100 px-4 sm:px-6 py-2.5 sm:py-3 sticky top-[var(--explorer-header-h,72px)] sm:top-[52px] z-20 shadow-sm">
          <div className="max-w-[960px] mx-auto flex items-center gap-2 overflow-x-auto pb-0.5 scrollbar-thin">
            <span className="text-xs font-bold text-neutral-500 shrink-0">Quick filters</span>
            <label className="flex items-center gap-0.5 rounded-full border border-neutral-200 px-3 py-1.5 shrink-0 bg-white">
              <span className="text-xs font-semibold text-neutral-700">Cover</span>
              <select
                value={filters.cover}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, cover: e.target.value as CoverOption }))
                }
                className="appearance-none bg-transparent outline-none text-xs font-semibold pl-1"
              >
                <option value={CoverOption.RECOMMENDED}>All</option>
                <option value={CoverOption.BELOW_5_LAKH}>Below 5L</option>
                <option value={CoverOption.FIVE_TO_NINE_LAKH}>5L–9L</option>
                <option value={CoverOption.TEN_TO_TWENTY_FOUR_LAKH}>10L–24L</option>
                <option value={CoverOption.TWENTY_FIVE_TO_NINETY_NINE_LAKH}>25L–99L</option>
                <option value={CoverOption.ONE_TO_TWO_CR}>1Cr–2Cr</option>
                <option value={CoverOption.TWO_TO_SIX_CR}>2Cr+</option>
              </select>
              <ChevronDown size={11} className="text-neutral-400" />
            </label>
            <label className="flex items-center gap-0.5 rounded-full border border-neutral-200 px-3 py-1.5 shrink-0 bg-white">
              <span className="text-xs font-semibold text-neutral-700">Sort</span>
              <select
                value={filters.sortBy}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, sortBy: e.target.value as SortByOption }))
                }
                className="appearance-none bg-transparent outline-none text-xs font-semibold pl-1"
              >
                <option value={SortByOption.RELEVANCE}>Relevance</option>
                <option value={SortByOption.PREMIUM_LOW_TO_HIGH}>Price Low–High</option>
                <option value={SortByOption.CASHLESS_HOSPITALS}>Cashless Hospitals</option>
              </select>
              <ChevronDown size={11} className="text-neutral-400" />
            </label>
            <button
              onClick={() => setCashlessOnly((c) => !c)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold shrink-0 ${
                cashlessOnly
                  ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                  : 'border-neutral-200 bg-white'
              }`}
            >
              Cashless Hospitals
            </button>
            {activeFilterCount > 0 && (
              <button
                onClick={() => {
                  setFilters(DEFAULT_FILTERS);
                  setCashlessOnly(false);
                }}
                className="rounded-full border border-red-200 bg-red-50 text-red-600 px-3 py-1.5 text-xs font-semibold shrink-0"
              >
                Clear {activeFilterCount} ×
              </button>
            )}
            <div className="flex-1" />
            <button
              onClick={() => setIsFilterModalOpen(true)}
              className="rounded-full border border-neutral-200 px-4 py-1.5 text-xs font-semibold flex items-center gap-1.5 shrink-0 bg-white"
            >
              <SlidersHorizontal size={12} />
              All filters
            </button>
          </div>
        </div>

        {compareNotice && (
          <div className="fixed top-20 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-sm z-50 mx-auto sm:mx-0 bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold px-4 py-3 rounded-xl shadow-lg">
            {compareNotice}
          </div>
        )}

        <div className="max-w-[960px] w-full mx-auto px-3 sm:px-6 py-4 sm:py-5 pb-32 sm:pb-36 space-y-5">
          <div className="bg-amber-50 border border-amber-100 rounded-xl px-3 sm:px-4 py-2.5 flex items-start sm:items-center gap-2">
            <Sparkles size={13} className="text-amber-600 shrink-0" />
            <p className="text-xs text-amber-800 font-medium">
              {t('explorer.banner', { total: plans.length })}
            </p>
          </div>

          {groupedByInsurer.length === 0 ? (
            <div className="bg-white border border-dashed border-neutral-200 rounded-2xl p-16 text-center">
              <p className="text-sm text-neutral-400">No plans match your filters.</p>
              <button
                onClick={() => {
                  setFilters(DEFAULT_FILTERS);
                  setCashlessOnly(false);
                  setQuery('');
                }}
                className="mt-3 text-xs text-[#0078fd] font-bold hover:underline"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            groupedByInsurer.map(({ insurer, plans: groupPlans }) => (
              <InsurerGroup
                key={insurer}
                insurer={insurer}
                plans={groupPlans}
                compareIds={compareIds}
                payYearly={payYearly}
                onToggleCompare={handleToggleCompare}
                onStressTest={setSelectedPlanForStress}
                onViewHospitals={setHospitalPlan}
                router={router}
              />
            ))
          )}
        </div>
      </main>

      {compareIds.length >= 2 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-neutral-200 px-4 sm:px-6 py-3 lg:left-[240px] z-40 shadow-lg safe-area-pb">
          <div className="max-w-[960px] mx-auto flex flex-col min-[420px]:flex-row justify-between items-stretch min-[420px]:items-center gap-2">
            <span className="text-sm font-black text-neutral-800 text-center min-[420px]:text-left">
              {compareIds.length} plan{compareIds.length !== 1 ? 's' : ''} selected
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setIsCompareDrawerOpen(true)}
                className="flex-1 min-[420px]:flex-none h-10 sm:h-9 px-5 bg-emerald-600 text-white text-xs font-bold rounded-xl"
              >
                Compare now
              </button>
              <button
                onClick={clearCompare}
                className="flex-1 min-[420px]:flex-none h-10 sm:h-9 px-4 border border-neutral-200 text-xs font-bold rounded-xl bg-white"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      <StressTestModal
        plan={selectedPlanForStress}
        isOpen={!!selectedPlanForStress}
        onClose={() => setSelectedPlanForStress(null)}
      />
      <CashlessHospitalsModal
        plan={hospitalPlan}
        defaultCityName={profileCity}
        isOpen={!!hospitalPlan}
        onClose={() => setHospitalPlan(null)}
      />
      <CompareDrawer
        plans={comparedPlansList}
        isOpen={isCompareDrawerOpen}
        onClose={() => setIsCompareDrawerOpen(false)}
        onClear={clearCompare}
        onSelectPlan={(id) => router.push(`/explorer/${id}`)}
      />
      <FilterPlansModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        allPlans={plans as import('../../components/FilterPlansModal').Plan[]}
        activeFilters={filters}
        onChangeFilters={setFilters}
        onClearAll={() => setFilters(DEFAULT_FILTERS)}
      />
    </div>
  );
}

export default function ExplorerPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f4f6f8] flex items-center justify-center">
          <span className="h-8 w-8 border-2 border-emerald-500 border-t-transparent animate-spin rounded-full" />
        </div>
      }
    >
      <ExplorerContent />
    </Suspense>
  );
}
