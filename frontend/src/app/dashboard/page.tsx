'use client';

import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../../components/Sidebar';
import { fetchAllPlans, generateOnDeviceReasoning, callAgent } from '../../lib/api';
import { supabase, getLatestRecommendation } from '../../lib/supabase';
import { useCompare } from '../../lib/compare';
import StressTestModal, { Plan } from '../../components/StressTestModal';
import CompareDrawer from '../../components/CompareDrawer';
import { FilterPlansModal, FilterState } from '../../components/FilterPlansModal';
import { Bot, ChevronDown, ChevronUp, Send, SlidersHorizontal, Sparkles } from 'lucide-react';
import {
  SortByOption, CoverOption, RoomRentOption, PolicyBenefitOption,
  ExistingDiseaseWaitOption, PremiumOption, PortabilityOption,
  MaternityWaitOption, PolicyPeriodOption, MaternityCoverOption,
} from '../../enums/filters.enum';

const INSURER_META: Record<string, { bg: string; initials: string }> = {
  'Star Health': { bg: 'bg-orange-600', initials: 'SH' },
  'HDFC ERGO': { bg: 'bg-red-700', initials: 'HE' },
  'Niva Bupa': { bg: 'bg-teal-600', initials: 'NB' },
  'Care Health': { bg: 'bg-green-600', initials: 'CH' },
  'LIC': { bg: 'bg-blue-900', initials: 'LIC' },
  'Bajaj Allianz': { bg: 'bg-blue-600', initials: 'BA' },
  'ICICI Lombard': { bg: 'bg-orange-700', initials: 'IL' },
  'Aditya Birla': { bg: 'bg-purple-600', initials: 'AB' },
  'ManipalCigna': { bg: 'bg-cyan-600', initials: 'MC' },
  'Tata AIG': { bg: 'bg-blue-800', initials: 'TA' },
  'Max Bupa': { bg: 'bg-pink-600', initials: 'MB' },
  'SBI General': { bg: 'bg-indigo-700', initials: 'SBI' },
  'Care Health (Religare)': { bg: 'bg-emerald-700', initials: 'RC' },
};

function getInsurerMeta(ins: string) {
  return INSURER_META[ins] ?? {
    bg: 'bg-neutral-700',
    initials: ins.split(' ').map(w => w[0]).join('').slice(0, 3).toUpperCase(),
  };
}

function formatCoverage(amount: number): string {
  if (amount >= 10000000) {
    const cr = amount / 10000000;
    return `₹${cr % 1 === 0 ? cr.toFixed(0) : cr.toFixed(1)} Crore`;
  }
  const lakh = amount / 100000;
  return `₹${lakh % 1 === 0 ? lakh.toFixed(0) : lakh.toFixed(1)} Lakh`;
}

interface PlanCardProps {
  plan: Plan;
  vitals: Record<string, unknown> | null;
  isCompared: boolean;
  onToggleCompare: (id: number) => void;
  onStressTest: (plan: Plan) => void;
  router: ReturnType<typeof useRouter>;
}

function PlanCard({ plan, vitals, isCompared, onToggleCompare, onStressTest, router }: PlanCardProps) {
  const [expanded, setExpanded] = useState(false);
  const meta = getInsurerMeta(plan.insurer);
  const reasoning = plan.plain_english_explanation ?? (vitals ? generateOnDeviceReasoning(plan as Record<string, unknown>, vitals) : null);
  const pros = plan.pros ?? [];
  const cons = plan.cons ?? [];
  const highlights = plan.coverage_highlights ?? [];

  const features = useMemo(() => {
    const items: { kind: 'good' | 'bad' | 'info'; text: string }[] = [];
    (expanded ? pros : pros.slice(0, 3)).forEach(t => items.push({ kind: 'good', text: t }));
    (expanded ? cons : cons.slice(0, 1)).forEach(t => items.push({ kind: 'bad', text: t }));
    if (expanded) highlights.forEach(t => items.push({ kind: 'info', text: t }));
    return items;
  }, [expanded, pros, cons, highlights]);

  return (
    <div className={`bg-white rounded-2xl border transition-all duration-200 overflow-hidden ${isCompared ? 'border-blue-400 shadow-lg shadow-blue-50' : 'border-neutral-200 hover:border-neutral-300 hover:shadow-md'}`}>
      <div className="flex flex-col md:flex-row">

        <div className="flex flex-row md:flex-col items-center md:justify-center gap-3 md:gap-2.5 p-4 md:p-5 md:w-[130px] border-b md:border-b-0 md:border-r border-neutral-100 shrink-0">
          <div className={`h-14 w-14 rounded-xl flex items-center justify-center text-white font-mono font-black text-sm select-none shrink-0 ${meta.bg}`}>
            {meta.initials}
          </div>
          <div className="md:text-center space-y-0.5">
            <p className="font-mono text-[9px] text-neutral-500 uppercase tracking-wide leading-snug">{plan.insurer}</p>
            <p className="font-mono text-[9px] text-blue-500 hover:underline cursor-default">About Insurer ›</p>
          </div>
        </div>

        <div className="flex-1 p-4 md:p-5 space-y-3 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-[var(--font-heading)] text-[15px] font-bold text-black leading-tight">{plan.name}</h3>
                {plan.diabetes_day1 && (
                  <span className="bg-emerald-100 text-emerald-700 font-mono text-[8px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold shrink-0">
                    Day 1 Diabetic
                  </span>
                )}
                {plan.is_family_floater && (
                  <span className="bg-blue-100 text-blue-700 font-mono text-[8px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold shrink-0">
                    Family Floater
                  </span>
                )}
              </div>
              {plan.warning_flags && plan.warning_flags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {plan.warning_flags.slice(0, 2).map((f: string) => (
                    <span key={f} className="font-mono text-[9px] bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded-full">
                      ⚠ {f}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {plan.hospital_network_count ? (
            <div className="flex items-center gap-1.5">
              <span className="text-sm">🏥</span>
              <span className="font-mono text-[11px] text-neutral-600 font-semibold">
                {plan.hospital_network_count.toLocaleString('en-IN')} Cashless hospitals
              </span>
            </div>
          ) : null}

          <div className="space-y-1.5">
            {features.map((f, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className={`shrink-0 font-bold text-sm leading-5 ${f.kind === 'good' ? 'text-emerald-600' : f.kind === 'bad' ? 'text-amber-500' : 'text-blue-400'}`}>
                  {f.kind === 'good' ? '✓' : f.kind === 'bad' ? '⚠' : '→'}
                </span>
                <span className={`font-mono text-[11px] leading-5 ${f.kind === 'bad' ? 'text-amber-800' : 'text-neutral-700'}`}>{f.text}</span>
              </div>
            ))}
          </div>

          {reasoning && (
            <div className="bg-violet-50 border border-violet-100 rounded-xl p-2.5">
              <p className="font-mono text-[10px] text-violet-700 leading-4">
                <span className="font-bold">✦ AI Match: </span>{reasoning}
              </p>
            </div>
          )}

          <div className="flex items-center gap-3 pt-0.5">
            <button
              onClick={() => setExpanded(e => !e)}
              className="flex items-center gap-1 font-mono text-[11px] text-emerald-600 hover:text-emerald-800 transition-colors"
            >
              {expanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
              {expanded ? 'Show less' : 'View all features ›'}
            </button>
            <span className="text-neutral-200 select-none">|</span>
            <button
              onClick={() => onStressTest(plan)}
              className="font-mono text-[11px] text-neutral-500 hover:text-black transition-colors"
            >
              Stress Test ›
            </button>
          </div>
        </div>

        <div className="flex-shrink-0 md:w-[210px] border-t md:border-t-0 md:border-l border-neutral-100 p-4 md:p-5 flex flex-col gap-4 justify-between">
          <div className="space-y-3">
            <div>
              <p className="font-mono text-[9px] uppercase tracking-widest text-neutral-400 mb-0.5">Cover amount</p>
              <p className="font-[var(--font-heading)] text-xl font-black text-black leading-tight">
                {formatCoverage(plan.coverage)}
              </p>
            </div>
            <div>
              <p className="font-mono text-[9px] uppercase tracking-widest text-neutral-400 mb-0.5">Premium (1 year)</p>
              <p className="font-[var(--font-heading)] text-xl font-black text-black leading-tight">
                ₹{Math.round(plan.annual_premium / 12).toLocaleString('en-IN')}/month
              </p>
              <p className="font-mono text-[10px] text-neutral-400">
                ₹{plan.annual_premium.toLocaleString('en-IN')} Incl. GST
              </p>
            </div>
          </div>

          <div className="space-y-2.5">
            <button
              onClick={() => router.push(`/explorer/${plan.id}`)}
              className="w-full h-11 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-mono text-xs font-bold rounded-xl transition-all shadow-sm"
            >
              View Plan ›
            </button>
            <div className="flex items-center justify-between gap-1">
              <span className="font-mono text-[9px] text-neutral-400">
                {plan.suitability_score ? `Score: ${plan.suitability_score.toFixed(1)}/10` : ''}
              </span>
              <button
                onClick={() => onToggleCompare(plan.id)}
                className={`flex items-center gap-1.5 font-mono text-[9px] px-2 py-1 rounded-full border transition-all shrink-0 ${
                  isCompared ? 'border-blue-500 bg-blue-50 text-blue-700 font-bold' : 'border-neutral-300 text-neutral-500 hover:border-neutral-500'
                }`}
              >
                <div className={`h-3 w-3 rounded-full border-2 flex items-center justify-center transition-all ${isCompared ? 'border-blue-500 bg-blue-500' : 'border-neutral-400 bg-white'}`} />
                {isCompared ? 'Added' : 'Compare'}
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
  vitals: Record<string, unknown> | null;
  compareIds: number[];
  onToggleCompare: (id: number) => void;
  onStressTest: (plan: Plan) => void;
  router: ReturnType<typeof useRouter>;
}

function InsurerGroup({ insurer, plans, vitals, compareIds, onToggleCompare, onStressTest, router }: InsurerGroupProps) {
  const [showMore, setShowMore] = useState(false);
  const top = plans[0];
  const rest = plans.slice(1);
  return (
    <div className="space-y-3">
      <PlanCard
        plan={top}
        vitals={vitals}
        isCompared={compareIds.includes(top.id)}
        onToggleCompare={onToggleCompare}
        onStressTest={onStressTest}
        router={router}
      />
      {showMore && rest.map(p => (
        <PlanCard
          key={p.id}
          plan={p}
          vitals={vitals}
          isCompared={compareIds.includes(p.id)}
          onToggleCompare={onToggleCompare}
          onStressTest={onStressTest}
          router={router}
        />
      ))}
      {rest.length > 0 && (
        <button
          onClick={() => setShowMore(s => !s)}
          className="w-full py-2.5 font-mono text-[11px] text-neutral-500 hover:text-neutral-800 flex items-center justify-center gap-1.5 transition-colors border-b border-dashed border-neutral-200"
        >
          {showMore ? (
            <><ChevronUp size={12} />Hide plans from {insurer}</>
          ) : (
            <><ChevronDown size={12} />View {rest.length} more plan{rest.length !== 1 ? 's' : ''} from {insurer}</>
          )}
        </button>
      )}
    </div>
  );
}

type PillKey = 'cover' | 'sort' | 'features' | 'cashless';

function DashboardContent() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [plans, setPlans] = useState<Plan[]>([]);
  const [allAvailablePlans, setAllAvailablePlans] = useState<Plan[]>([]);
  const [profileMeta, setProfileMeta] = useState<Record<string, unknown> | null>(null);
  const [groups, setGroups] = useState<Array<{ id: string; name: string; members: string[] }>>([
    { id: 'group_1', name: 'Group 1', members: ['Self'] },
  ]);
  const [activeGroupId, setActiveGroupId] = useState('group_1');
  const [vitals, setVitals] = useState<Record<string, unknown> | null>(null);
  const [selectedPlanForStress, setSelectedPlanForStress] = useState<Plan | null>(null);
  const [stressTestInitialScenario, setStressTestInitialScenario] = useState<{ id: string; name?: string; cost?: number; days?: number; isChronic?: boolean } | undefined>();
  const [isCompareDrawerOpen, setIsCompareDrawerOpen] = useState(false);
  const { compareIds, toggleCompare, clearCompare, isInCompare } = useCompare();
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [openPill, setOpenPill] = useState<PillKey | null>(null);
  const [filters, setFilters] = useState<FilterState>({
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
  });
  const [cashlessOnly, setCashlessOnly] = useState(false);
  const [agentInput, setAgentInput] = useState('');
  const [agentResponse, setAgentResponse] = useState<string | null>(null);
  const [agentToolUsed, setAgentToolUsed] = useState<string | null>(null);
  const [agentChatHistory, setAgentChatHistory] = useState<{ role: string; content: string }[]>([]);
  const [isAgentLoading, setIsAgentLoading] = useState(false);

  useEffect(() => {
    async function load(user: { id: string }) {
      try {
        const [profileRes, assessmentRes, allPlans, recommendation] = await Promise.all([
          supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
          supabase.from('assessment_sessions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
          fetchAllPlans(),
          getLatestRecommendation(user.id),
        ]);

        if (profileRes.data) {
          const raw = (profileRes.data.full_name ?? '') as string;
          let cleanName = raw;
          let meta: Record<string, unknown> | null = null;
          if (raw.includes(' || ')) {
            const parts = raw.split(' || ');
            cleanName = parts[0];
            try { meta = JSON.parse(parts[1]); } catch { meta = null; }
          }
          setName(cleanName.split(' ')[0] ?? '');
          if (meta) {
            setProfileMeta(meta);
            const metaGroups = meta.groups as Array<{ id: string; name: string; members: string[] }> | undefined;
            if (metaGroups && metaGroups.length > 0) {
              setGroups(metaGroups);
              setActiveGroupId(metaGroups[0].id);
            } else {
              const coveredMembers = (meta.covered_members as string[] | undefined) ?? ['Self'];
              setGroups([{ id: 'group_1', name: 'Group 1', members: coveredMembers }]);
            }
          }
        }

        if (assessmentRes.data) {
          const d = assessmentRes.data;
          if (d.age && d.bmi && d.hba1c) {
            setVitals({
              age: d.age, bmi: d.bmi, smoker: d.smoker ?? 0, hba1c: d.hba1c,
              bp_systolic: d.bp_systolic ?? 120, has_diabetes: d.has_diabetes,
              has_hypertension: d.has_hypertension, chronic_count: d.chronic_count ?? 0,
              monthly_budget: d.monthly_budget ?? 3000, income_lakh: d.income_lakh ?? 8.0,
            });
          }
        }

        setAllAvailablePlans(allPlans as Plan[]);

        if (recommendation?.top_plan_ids?.length > 0) {
          const recommended = recommendation.top_plan_ids.map((rp: Record<string, unknown>) => {
            const matched = (allPlans as Plan[]).find(p => p.id === rp.id);
            if (!matched) return null;
            return {
              ...matched,
              suitability_score: rp.score,
              cosine_similarity: rp.cosine_similarity,
              plain_english_explanation: rp.plain_english_explanation,
              warning_flags: (rp.warning_flags as string[]) ?? matched.warning_flags ?? [],
            };
          }).filter(Boolean) as Plan[];
          setPlans(recommended);
        } else {
          setPlans([]);
        }
      } catch {
        setVitals(null);
        setPlans([]);
      } finally {
        setLoading(false);
      }
    }

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return; }
      load(user as unknown as { id: string });
    });
  }, [router]);

  const activeGroupVitals = useMemo<Record<string, unknown>>(() => {
    if (!vitals) return { age: 35, bmi: 22, smoker: 0, hba1c: 5.4, bp_systolic: 120, has_diabetes: false, has_hypertension: false, chronic_count: 0, monthly_budget: 3000, income_lakh: 8 };
    if (!profileMeta) return vitals;
    const currentGroup = groups.find(g => g.id === activeGroupId);
    if (!currentGroup) return vitals;
    const members = currentGroup.members;
    if (!members.length) return vitals;

    const memberAgesMeta = (profileMeta.member_ages ?? {}) as Record<string, string>;
    let maxAge = 18;
    members.forEach(m => { const a = parseInt(memberAgesMeta[m] ?? '24', 10); if (!isNaN(a) && a > maxAge) maxAge = a; });

    const memberMH = (profileMeta.member_medical_history ?? {}) as Record<string, string[]>;
    const conditions = new Set<string>();
    members.forEach(m => (memberMH[m] ?? []).forEach(c => { if (c !== 'None of these') conditions.add(c); }));

    const memberV = (profileMeta.member_vitals ?? {}) as Record<string, Record<string, string>>;
    let maxHba1c = 5.4;
    let maxBP = 120;
    let maxBMI = 22;
    members.forEach(m => {
      const v = memberV[m] ?? {};
      const hba1c = parseFloat(v.hba1c ?? '5.4');
      if (!isNaN(hba1c)) maxHba1c = Math.max(maxHba1c, hba1c);
      const bp = parseInt(v.bp ?? '120', 10);
      if (!isNaN(bp)) maxBP = Math.max(maxBP, bp);
      const h = parseFloat(v.height ?? '170');
      const w = parseFloat(v.weight ?? '70');
      if (h > 0 && w > 0) maxBMI = Math.max(maxBMI, w / ((h / 100) ** 2));
    });

    return {
      age: maxAge,
      bmi: parseFloat(maxBMI.toFixed(1)),
      smoker: vitals.smoker,
      hba1c: maxHba1c,
      bp_systolic: maxBP,
      has_diabetes: conditions.has('Diabetes'),
      has_hypertension: conditions.has('Blood Pressure'),
      chronic_count: Array.from(conditions).filter(c => !['Diabetes', 'Blood Pressure'].includes(c)).length,
      monthly_budget: vitals.monthly_budget,
      income_lakh: vitals.income_lakh,
    };
  }, [vitals, profileMeta, activeGroupId, groups]);

  const processedPlans = useMemo<Plan[]>(() => {
    const base = allAvailablePlans.length > 0 ? allAvailablePlans : plans;
    return base.map(plan => {
      let boost = 0;
      const activeGroup = groups.find(g => g.id === activeGroupId);
      const isMulti = (activeGroup?.members ?? []).length > 1;
      if (isMulti) boost += plan.type?.toLowerCase().includes('floater') ? 1.5 : -2;
      if ((activeGroupVitals.has_diabetes as boolean)) boost += plan.diabetes_day1 ? 2 : -(plan.pre_existing_wait_years ?? 4) * 0.6;
      if ((activeGroupVitals.has_hypertension as boolean)) boost += plan.hypertension_day1 ? 2 : -(plan.pre_existing_wait_years ?? 4) * 0.6;
      const annualBudget = (activeGroupVitals.monthly_budget as number) * 12;
      if (plan.annual_premium > annualBudget) boost -= Math.min(2.5, ((plan.annual_premium - annualBudget) / annualBudget) * 1.5);
      else boost += 0.8;
      return { ...plan, suitability_score: Math.max(1, Math.min(10, (plan.suitability_score ?? 7.5) + boost)) };
    }).sort((a, b) => b.suitability_score - a.suitability_score);
  }, [plans, allAvailablePlans, activeGroupVitals, activeGroupId, groups]);

  const filteredPlans = useMemo<Plan[]>(() => {
    let list = [...processedPlans];

    if (cashlessOnly) list = list.filter(p => (p.hospital_network_count ?? 0) >= 10000);

    if (filters.cover !== CoverOption.RECOMMENDED) {
      if (filters.cover === CoverOption.BELOW_5_LAKH) list = list.filter(p => p.coverage < 500000);
      else if (filters.cover === CoverOption.FIVE_TO_NINE_LAKH) list = list.filter(p => p.coverage >= 500000 && p.coverage <= 900000);
      else if (filters.cover === CoverOption.TEN_TO_TWENTY_FOUR_LAKH) list = list.filter(p => p.coverage >= 1000000 && p.coverage <= 2400000);
      else if (filters.cover === CoverOption.TWENTY_FIVE_TO_NINETY_NINE_LAKH) list = list.filter(p => p.coverage >= 2500000 && p.coverage <= 9900000);
      else if (filters.cover === CoverOption.ONE_TO_TWO_CR) list = list.filter(p => p.coverage >= 10000000 && p.coverage <= 20000000);
      else if (filters.cover === CoverOption.TWO_TO_SIX_CR) list = list.filter(p => p.coverage >= 20000000);
    }

    filters.benefits.forEach(b => {
      if (b === PolicyBenefitOption.DIABETES_COVERED) list = list.filter(p => p.diabetes_day1);
      else if (b === PolicyBenefitOption.NO_CLAIM_BONUS) list = list.filter(p => (p.no_claim_bonus_pct ?? 0) > 0);
      else if (b === PolicyBenefitOption.RESTORATION_BENEFITS) list = list.filter(p => p.restoration_benefit);
      else if (b === PolicyBenefitOption.FREE_HEALTH_CHECKUP) list = list.filter(p => p.coverage_highlights?.some((h: string) => h.toLowerCase().includes('check')));
      else if (b === PolicyBenefitOption.DOCTOR_CONSULTATION_PHARMACY) list = list.filter(p => p.pros?.some((h: string) => h.toLowerCase().includes('opd')));
      else if (b === PolicyBenefitOption.DAY_CARE_TREATMENTS) list = list.filter(p => p.coverage_highlights?.some((h: string) => h.toLowerCase().includes('day care')));
    });

    if (filters.premiumPerMonth !== PremiumOption.NO_PREFERENCE) {
      if (filters.premiumPerMonth === PremiumOption.BELOW_1K) list = list.filter(p => p.annual_premium / 12 < 1000);
      else if (filters.premiumPerMonth === PremiumOption.ONE_TO_TWO_K) list = list.filter(p => p.annual_premium / 12 >= 1000 && p.annual_premium / 12 <= 2000);
      else if (filters.premiumPerMonth === PremiumOption.TWO_TO_FOUR_K) list = list.filter(p => p.annual_premium / 12 >= 2000 && p.annual_premium / 12 <= 4000);
      else if (filters.premiumPerMonth === PremiumOption.ABOVE_FOURK) list = list.filter(p => p.annual_premium / 12 > 4000);
    }

    if (filters.existingDiseaseWait !== ExistingDiseaseWaitOption.NO_PREFERENCE) {
      const maxWait = filters.existingDiseaseWait === ExistingDiseaseWaitOption.NO_WAITING_PERIOD ? 0
        : filters.existingDiseaseWait === ExistingDiseaseWaitOption.ONE_YEAR ? 1
        : filters.existingDiseaseWait === ExistingDiseaseWaitOption.TWO_YEARS ? 2 : 3;
      list = list.filter(p => (p.pre_existing_wait_years ?? p.preexisting_wait_years ?? 4) <= maxWait);
    }

    if (filters.selectedInsurers.length > 0) {
      list = list.filter(p => filters.selectedInsurers.some((ins: string) => ins.toLowerCase() === p.insurer?.toLowerCase()));
    }

    if (filters.sortBy === SortByOption.PREMIUM_LOW_TO_HIGH) list.sort((a, b) => a.annual_premium - b.annual_premium);
    else if (filters.sortBy === SortByOption.CASHLESS_HOSPITALS) list.sort((a, b) => (b.hospital_network_count ?? 0) - (a.hospital_network_count ?? 0));
    else list.sort((a, b) => (b.suitability_score ?? 0) - (a.suitability_score ?? 0));

    return list;
  }, [processedPlans, filters, cashlessOnly]);

  const groupedByInsurer = useMemo(() => {
    const map = new Map<string, Plan[]>();
    filteredPlans.forEach(p => {
      const existing = map.get(p.insurer) ?? [];
      map.set(p.insurer, [...existing, p]);
    });
    return Array.from(map.entries()).map(([insurer, plans]) => ({ insurer, plans }));
  }, [filteredPlans]);

  const comparedPlansList = useMemo(() => plans.filter(p => compareIds.includes(p.id)), [plans, compareIds]);

  async function handleAgentSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!agentInput.trim() || isAgentLoading) return;
    const input = agentInput;
    setAgentInput('');
    setIsAgentLoading(true);
    setAgentResponse(null);
    const history = [...agentChatHistory, { role: 'user', content: input }];
    setAgentChatHistory(history);
    try {
      const res = await callAgent(history, {
        profile: {
          age: activeGroupVitals.age, bmi: activeGroupVitals.bmi, smoker: activeGroupVitals.smoker,
          hba1c: activeGroupVitals.hba1c, bp_systolic: activeGroupVitals.bp_systolic,
          diabetes: (activeGroupVitals.has_diabetes as boolean) ? 1 : 0,
          hypertension: (activeGroupVitals.has_hypertension as boolean) ? 1 : 0,
          chronic_count: activeGroupVitals.chronic_count,
          monthly_budget: activeGroupVitals.monthly_budget, income_lakh: activeGroupVitals.income_lakh,
        },
        current_plans: plans.slice(0, 5).map(p => ({
          id: p.id, name: p.name, insurer: p.insurer, annual_premium: p.annual_premium,
          coverage: p.coverage, suitability_score: p.suitability_score,
        })),
      });
      setAgentChatHistory([...history, { role: 'assistant', content: res.response }]);
      setAgentResponse(res.response);
      setAgentToolUsed(res.tool_used);
      if (res.tool_used === 'stress_test' && res.tool_result) {
        const matched = plans.find(p => p.id === res.tool_result.plan_id);
        if (matched) {
          if (res.tool_result.custom_details) setStressTestInitialScenario({ id: 'custom', name: res.tool_result.scenario_name, cost: res.tool_result.custom_details.cost, days: res.tool_result.custom_details.days, isChronic: res.tool_result.custom_details.isChronic });
          setSelectedPlanForStress(matched);
        }
      }
      if (res.tool_used === 'compare' && res.tool_result?.plans) {
        res.tool_result.plans.map((p: { id: number }) => p.id).forEach((id: number) => { if (!compareIds.includes(id)) toggleCompare(id); });
        setIsCompareDrawerOpen(true);
      }
    } catch {
      setAgentResponse('AI Advisor is unavailable. Please check the backend connection.');
    } finally {
      setIsAgentLoading(false);
    }
  }

  const togglePill = (key: PillKey) => setOpenPill(p => p === key ? null : key);

  const DEFAULT_FILTERS: FilterState = {
    sortBy: SortByOption.RELEVANCE, cover: CoverOption.RECOMMENDED, roomRent: RoomRentOption.NO_PREFERENCE,
    benefits: [], existingDiseaseWait: ExistingDiseaseWaitOption.NO_PREFERENCE, premiumPerMonth: PremiumOption.NO_PREFERENCE,
    portability: PortabilityOption.NO_PREFERENCE, maternityWait: MaternityWaitOption.NO_PREFERENCE,
    policyPeriod: PolicyPeriodOption.ONE_YEAR, selectedInsurers: [], maternityCover: MaternityCoverOption.NO_PREFERENCE,
  };

  const activeFilterCount = [
    filters.cover !== CoverOption.RECOMMENDED,
    filters.sortBy !== SortByOption.RELEVANCE,
    filters.benefits.length > 0,
    filters.premiumPerMonth !== PremiumOption.NO_PREFERENCE,
    filters.existingDiseaseWait !== ExistingDiseaseWaitOption.NO_PREFERENCE,
    filters.selectedInsurers.length > 0,
    filters.roomRent !== RoomRentOption.NO_PREFERENCE,
    cashlessOnly,
  ].filter(Boolean).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <span className="h-8 w-8 border-2 border-black border-t-transparent animate-spin rounded-full inline-block" />
          <p className="font-mono text-xs text-neutral-400 uppercase tracking-widest">Loading your plans...</p>
        </div>
      </div>
    );
  }

  if (!vitals) {
    return (
      <div className="min-h-screen bg-neutral-50 lg:flex">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center p-8">
          <div className="max-w-md w-full bg-white rounded-2xl border border-neutral-200 p-10 space-y-6 shadow-sm">
            <div className="space-y-2">
              <span className="font-mono text-[9px] uppercase tracking-widest text-neutral-400">Assessment Required</span>
              <h2 className="font-[var(--font-heading)] text-2xl font-black uppercase tracking-tight text-black">No Health Profile Found</h2>
              <p className="font-mono text-xs text-neutral-500 leading-relaxed">
                Complete the clinical assessment to unlock AI-powered plan recommendations matched to your health profile.
              </p>
            </div>
            <button onClick={() => router.push('/assessment')} className="w-full h-12 bg-black text-white hover:bg-neutral-800 font-mono text-xs uppercase tracking-widest font-bold rounded-xl transition-all">
              Begin Assessment ›
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 lg:flex relative">
      <Sidebar />
      <main className="flex-1 pb-40">

        <div className="sticky top-0 z-30 bg-white border-b border-neutral-200 shadow-sm">
          <div className="mx-auto max-w-[900px] px-4 sm:px-6 py-3">

            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="font-mono text-[9px] uppercase tracking-widest text-neutral-400">Account Overview</p>
                <h1 className="font-[var(--font-heading)] text-lg font-black uppercase tracking-tight text-black leading-tight">
                  {name ? `Hello, ${name}.` : 'Dashboard'}
                </h1>
              </div>
              <button onClick={() => router.push('/assessment')} className="h-9 px-4 border border-black bg-white text-black hover:bg-black hover:text-white font-mono text-[10px] uppercase tracking-wider font-bold rounded-xl transition-all shrink-0">
                Update Profile
              </button>
            </div>

            {groups.length > 1 && (
              <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
                {groups.map(g => (
                  <button
                    key={g.id}
                    onClick={() => setActiveGroupId(g.id)}
                    className={`px-4 py-1.5 font-mono text-[10px] uppercase tracking-wider rounded-full border shrink-0 transition-all ${activeGroupId === g.id ? 'bg-black text-white border-black font-bold' : 'bg-white text-neutral-500 border-neutral-200 hover:border-neutral-400'}`}
                  >
                    {g.name}
                  </button>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <span className="font-mono text-[10px] text-neutral-500 shrink-0">Quick filters</span>

              <div className="relative">
                <button
                  onClick={() => togglePill('cover')}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full border font-mono text-[11px] font-medium transition-all shrink-0 ${filters.cover !== CoverOption.RECOMMENDED ? 'border-blue-500 bg-blue-50 text-blue-700 font-bold' : openPill === 'cover' ? 'border-neutral-800 bg-neutral-50' : 'border-neutral-300 bg-white text-neutral-700 hover:border-neutral-500'}`}
                >
                  Cover <ChevronDown size={11} className={openPill === 'cover' ? 'rotate-180 transition-transform' : 'transition-transform'} />
                </button>
                {openPill === 'cover' && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setOpenPill(null)} />
                    <div className="absolute top-full mt-1 left-0 z-50 bg-white border border-neutral-200 rounded-xl shadow-xl p-2 min-w-[180px]">
                      {[
                        { label: 'All Covers', val: CoverOption.RECOMMENDED },
                        { label: 'Below 5 Lakh', val: CoverOption.BELOW_5_LAKH },
                        { label: '5L – 9L', val: CoverOption.FIVE_TO_NINE_LAKH },
                        { label: '10L – 24L', val: CoverOption.TEN_TO_TWENTY_FOUR_LAKH },
                        { label: '25L – 99L', val: CoverOption.TWENTY_FIVE_TO_NINETY_NINE_LAKH },
                        { label: '1 Crore – 2 Crore', val: CoverOption.ONE_TO_TWO_CR },
                        { label: '2 Crore+', val: CoverOption.TWO_TO_SIX_CR },
                      ].map(({ label, val }) => (
                        <button key={val} onClick={() => { setFilters(f => ({ ...f, cover: val })); setOpenPill(null); }} className={`w-full text-left px-3 py-2 font-mono text-[11px] rounded-lg hover:bg-neutral-50 transition-colors ${filters.cover === val ? 'font-bold text-black bg-neutral-100' : 'text-neutral-600'}`}>
                          {label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <div className="relative">
                <button
                  onClick={() => togglePill('sort')}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full border font-mono text-[11px] font-medium transition-all shrink-0 ${filters.sortBy !== SortByOption.RELEVANCE ? 'border-blue-500 bg-blue-50 text-blue-700 font-bold' : openPill === 'sort' ? 'border-neutral-800 bg-neutral-50' : 'border-neutral-300 bg-white text-neutral-700 hover:border-neutral-500'}`}
                >
                  Sort by <ChevronDown size={11} className={openPill === 'sort' ? 'rotate-180 transition-transform' : 'transition-transform'} />
                </button>
                {openPill === 'sort' && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setOpenPill(null)} />
                    <div className="absolute top-full mt-1 left-0 z-50 bg-white border border-neutral-200 rounded-xl shadow-xl p-2 min-w-[200px]">
                      {[
                        { label: 'Relevance (AI Match)', val: SortByOption.RELEVANCE },
                        { label: 'Premium: Low to High', val: SortByOption.PREMIUM_LOW_TO_HIGH },
                        { label: 'Cashless Hospitals', val: SortByOption.CASHLESS_HOSPITALS },
                      ].map(({ label, val }) => (
                        <button key={val} onClick={() => { setFilters(f => ({ ...f, sortBy: val })); setOpenPill(null); }} className={`w-full text-left px-3 py-2 font-mono text-[11px] rounded-lg hover:bg-neutral-50 transition-colors ${filters.sortBy === val ? 'font-bold text-black bg-neutral-100' : 'text-neutral-600'}`}>
                          {label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <div className="relative">
                <button
                  onClick={() => togglePill('features')}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full border font-mono text-[11px] font-medium transition-all shrink-0 ${filters.benefits.length > 0 ? 'border-blue-500 bg-blue-50 text-blue-700 font-bold' : openPill === 'features' ? 'border-neutral-800 bg-neutral-50' : 'border-neutral-300 bg-white text-neutral-700 hover:border-neutral-500'}`}
                >
                  Important Features <ChevronDown size={11} className={openPill === 'features' ? 'rotate-180 transition-transform' : 'transition-transform'} />
                </button>
                {openPill === 'features' && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setOpenPill(null)} />
                    <div className="absolute top-full mt-1 left-0 z-50 bg-white border border-neutral-200 rounded-xl shadow-xl p-3 min-w-[220px] space-y-1">
                      {[
                        { label: 'Diabetes Covered (Day 1)', val: PolicyBenefitOption.DIABETES_COVERED },
                        { label: 'No Claim Bonus', val: PolicyBenefitOption.NO_CLAIM_BONUS },
                        { label: 'Restoration Benefit', val: PolicyBenefitOption.RESTORATION_BENEFITS },
                        { label: 'Free Health Checkup', val: PolicyBenefitOption.FREE_HEALTH_CHECKUP },
                        { label: 'Day Care Treatments', val: PolicyBenefitOption.DAY_CARE_TREATMENTS },
                        { label: 'OPD / Consultation', val: PolicyBenefitOption.DOCTOR_CONSULTATION_PHARMACY },
                      ].map(({ label, val }) => {
                        const checked = filters.benefits.includes(val);
                        return (
                          <label key={val} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-neutral-50 cursor-pointer">
                            <input type="checkbox" checked={checked} onChange={() => setFilters(f => ({ ...f, benefits: checked ? f.benefits.filter(b => b !== val) : [...f.benefits, val] }))} className="h-3.5 w-3.5 accent-black rounded" />
                            <span className="font-mono text-[11px] text-neutral-700">{label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>

              <button
                onClick={() => { setCashlessOnly(c => !c); setOpenPill(null); }}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full border font-mono text-[11px] font-medium transition-all shrink-0 ${cashlessOnly ? 'border-blue-500 bg-blue-50 text-blue-700 font-bold' : 'border-neutral-300 bg-white text-neutral-700 hover:border-neutral-500'}`}
              >
                🏥 Cashless Hospitals
              </button>

              <button
                onClick={() => setIsFilterModalOpen(true)}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full border font-mono text-[11px] font-medium transition-all shrink-0 ml-auto ${activeFilterCount > 0 ? 'border-black bg-black text-white' : 'border-neutral-300 bg-white text-neutral-700 hover:border-neutral-500'}`}
              >
                <SlidersHorizontal size={11} />
                More Filters
                {activeFilterCount > 0 && <span className="bg-white text-black text-[9px] font-black rounded-full h-4 w-4 flex items-center justify-center">{activeFilterCount}</span>}
              </button>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-[900px] px-4 sm:px-6 py-6 space-y-6">

          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-2">
            <span className="text-base shrink-0">🏆</span>
            <p className="font-mono text-[11px] text-amber-800 font-semibold">
              Outsurance AI · Plans ranked by metabolic risk profile match ›
            </p>
          </div>

          <div className="flex items-center justify-between">
            <p className="font-mono text-[11px] text-neutral-500 uppercase tracking-wider">
              {groupedByInsurer.length > 0
                ? `${filteredPlans.length} plans from ${groupedByInsurer.length} insurer${groupedByInsurer.length !== 1 ? 's' : ''}`
                : 'No plans match current filters'}
            </p>
            {activeFilterCount > 0 && (
              <button onClick={() => { setFilters(DEFAULT_FILTERS); setCashlessOnly(false); }} className="font-mono text-[10px] text-neutral-400 hover:text-black underline transition-colors">
                Clear all filters
              </button>
            )}
          </div>

          {groupedByInsurer.length === 0 ? (
            <div className="bg-white border border-dashed border-neutral-300 rounded-2xl p-16 text-center">
              <p className="font-mono text-xs uppercase text-neutral-400">No plans match the selected filters.</p>
              <button onClick={() => { setFilters(DEFAULT_FILTERS); setCashlessOnly(false); }} className="mt-4 font-mono text-xs text-blue-500 hover:underline">Clear all filters</button>
            </div>
          ) : (
            <div className="space-y-8">
              {groupedByInsurer.map(({ insurer, plans: groupPlans }) => (
                <InsurerGroup
                  key={insurer}
                  insurer={insurer}
                  plans={groupPlans}
                  vitals={activeGroupVitals}
                  compareIds={compareIds}
                  onToggleCompare={toggleCompare}
                  onStressTest={setSelectedPlanForStress}
                  router={router}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {compareIds.length >= 2 && (
        <div className="fixed bottom-20 left-0 right-0 border-t border-neutral-200 bg-white/95 backdrop-blur-sm px-4 py-3 lg:left-[290px] z-40 shadow-lg">
          <div className="mx-auto max-w-[900px] flex justify-between items-center">
            <span className="font-mono text-xs uppercase tracking-widest text-black font-bold">{compareIds.length} Plans Selected</span>
            <div className="flex gap-2">
              <button onClick={() => setIsCompareDrawerOpen(true)} className="h-10 px-5 bg-black text-white font-mono text-xs uppercase tracking-wider rounded-xl hover:bg-neutral-900">Compare Plans</button>
              <button onClick={clearCompare} className="h-10 px-4 border border-neutral-200 font-mono text-xs uppercase tracking-wider text-black hover:border-black rounded-xl">Clear</button>
            </div>
          </div>
        </div>
      )}

      <div className={`fixed left-1/2 -translate-x-1/2 w-full max-w-[680px] px-4 z-40 transition-all duration-300 ${compareIds.length >= 2 ? 'bottom-36' : 'bottom-4'}`}>
        {agentResponse && (
          <div className="mb-3 bg-white border-t-2 border-black rounded-xl shadow-xl p-4 relative">
            <button type="button" onClick={() => { setAgentResponse(null); setAgentToolUsed(null); }} className="absolute right-3 top-3 font-mono text-[8px] uppercase text-neutral-400 hover:text-black border border-neutral-200 px-1.5 py-0.5 rounded hover:border-black cursor-pointer">
              [ Close ]
            </button>
            <div className="flex items-start gap-2.5">
              <div className="h-6 w-6 bg-black text-white flex items-center justify-center rounded shrink-0">
                <Bot size={13} className="animate-pulse" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[9px] uppercase font-bold text-black tracking-wider">Outsurance Advisor</span>
                  {agentToolUsed && <span className="font-mono text-[8px] uppercase bg-neutral-100 text-neutral-600 px-1.5 py-0.5 rounded border border-neutral-200">Action: {agentToolUsed}</span>}
                </div>
                <p className="font-mono text-[11px] leading-5 text-black whitespace-pre-line pr-10">{agentResponse}</p>
              </div>
            </div>
          </div>
        )}
        <form onSubmit={handleAgentSubmit} className="relative flex items-center bg-white shadow-lg overflow-hidden border border-neutral-200 hover:border-neutral-400 transition-all rounded-xl">
          {isAgentLoading && (
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-neutral-100 overflow-hidden">
              <div className="h-full bg-black w-1/3 animate-pulse" />
            </div>
          )}
          <div className="pl-4 pr-2 text-neutral-400 shrink-0">
            <Sparkles size={14} className={isAgentLoading ? 'animate-spin text-black' : 'text-neutral-400'} />
          </div>
          <input
            type="text"
            value={agentInput}
            onChange={e => setAgentInput(e.target.value)}
            disabled={isAgentLoading}
            placeholder="Ask AI: 'reassess as smoker', 'compare plan 1 vs 3', 'stress test for cardiac'..."
            className="w-full h-12 bg-white pr-4 py-3 font-mono text-[11px] text-black placeholder-neutral-400 outline-none disabled:opacity-50"
          />
          <button type="submit" disabled={isAgentLoading || !agentInput.trim()} className="h-12 px-5 bg-black text-white hover:bg-neutral-900 transition-colors uppercase font-mono text-[10px] tracking-widest font-bold shrink-0 disabled:bg-neutral-200 disabled:text-neutral-400 disabled:cursor-not-allowed flex items-center gap-1.5 border-l border-neutral-200">
            {isAgentLoading ? <span>[ Thinking... ]</span> : <><span>Send</span><Send size={10} /></>}
          </button>
        </form>
      </div>

      <StressTestModal
        plan={selectedPlanForStress}
        isOpen={!!selectedPlanForStress}
        onClose={() => { setSelectedPlanForStress(null); setStressTestInitialScenario(undefined); }}
        initialScenario={stressTestInitialScenario}
      />
      <CompareDrawer
        plans={comparedPlansList}
        isOpen={isCompareDrawerOpen}
        onClose={() => setIsCompareDrawerOpen(false)}
        onClear={clearCompare}
        onSelectPlan={id => router.push(`/explorer/${id}`)}
      />
      <FilterPlansModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        allPlans={processedPlans as unknown as import('../../components/FilterPlansModal').Plan[]}
        activeFilters={filters}
        onChangeFilters={setFilters}
        onClearAll={() => setFilters(DEFAULT_FILTERS)}
      />
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <span className="h-8 w-8 border-2 border-black border-t-transparent animate-spin rounded-full" />
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}
