'use client';

import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../../components/Sidebar';
import { fetchAllPlans, callAgent } from '../../lib/api';
import { supabase, getLatestRecommendation } from '../../lib/supabase';
import { useCompare } from '../../lib/compare';
import StressTestModal, { Plan } from '../../components/StressTestModal';
import CompareDrawer from '../../components/CompareDrawer';
import { FilterPlansModal, FilterState } from '../../components/FilterPlansModal';
import { Bot, ChevronDown, ChevronUp, Heart, Send, SlidersHorizontal, Sparkles } from 'lucide-react';
import {
  SortByOption, CoverOption, RoomRentOption, PolicyBenefitOption,
  ExistingDiseaseWaitOption, PremiumOption, PortabilityOption,
  MaternityWaitOption, PolicyPeriodOption, MaternityCoverOption,
} from '../../enums/filters.enum';

// ─── Insurer brand colours ───────────────────────────────────────────────────
const INSURER_META: Record<string, { border: string; bg: string; text: string; initials: string }> = {
  'Star Health':   { border: 'border-[#0a4da2]', bg: 'bg-[#0a4da2]', text: 'text-[#0a4da2]', initials: 'SH' },
  'HDFC ERGO':     { border: 'border-[#e21b22]', bg: 'bg-[#e21b22]', text: 'text-[#e21b22]', initials: 'HE' },
  'Niva Bupa':     { border: 'border-[#009b9e]', bg: 'bg-[#009b9e]', text: 'text-[#009b9e]', initials: 'NB' },
  'Care Health':   { border: 'border-[#4ca848]', bg: 'bg-[#4ca848]', text: 'text-[#4ca848]', initials: 'CH' },
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
    border: 'border-emerald-600', bg: 'bg-emerald-600', text: 'text-emerald-600',
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

// ─── Plan Card ───────────────────────────────────────────────────────────────
interface PlanCardProps {
  plan: Plan;
  isCompared: boolean;
  payYearly: boolean;
  onToggleCompare: (id: number) => void;
  onStressTest: (plan: Plan) => void;
  router: ReturnType<typeof useRouter>;
}

export function PlanCard({ plan, isCompared, payYearly, onToggleCompare, onStressTest, router }: PlanCardProps) {
  const [expanded, setExpanded] = useState(false);
  const meta = getInsurerMeta(plan.insurer);
  const features = getPlanFeatures(plan);
  const displayFeatures = expanded ? features : features.slice(0, 3);

  const monthly = Math.round(plan.annual_premium / 12);
  const displayPremium = payYearly
    ? Math.round(plan.annual_premium).toLocaleString('en-IN')
    : monthly.toLocaleString('en-IN');
  const strikePrice = payYearly
    ? Math.round(plan.annual_premium * 1.18).toLocaleString('en-IN')
    : Math.round(monthly * 1.18).toLocaleString('en-IN');

  return (
    <div className="flex items-stretch gap-3 w-full">
      {/* Insurer badge */}
      <div className={`w-[148px] shrink-0 bg-white/80 backdrop-blur-sm border-2 ${meta.border} rounded-2xl p-4 flex flex-col items-center justify-center gap-3 shadow-sm`}>
        <div className={`h-12 w-12 rounded-full ${meta.bg} flex items-center justify-center text-white font-black text-sm select-none`}>
          {meta.initials}
        </div>
        <div className="text-center">
          <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider leading-snug">{plan.insurer}</p>
          <button
            onClick={() => router.push(`/explorer/${plan.id}`)}
            className={`mt-1.5 text-xs font-bold ${meta.text} hover:underline cursor-pointer block`}
          >
            About Insurer &rsaquo;
          </button>
        </div>
      </div>

      {/* Main card */}
      <div className={`flex-1 bg-white/90 backdrop-blur-sm border ${isCompared ? 'border-emerald-400 ring-1 ring-emerald-200' : 'border-neutral-200/80'} rounded-2xl shadow-[0_2px_16px_rgba(0,0,0,0.07)] hover:shadow-[0_6px_28px_rgba(0,0,0,0.11)] transition-shadow flex flex-col overflow-hidden`}>
        <div className="p-5 flex flex-col gap-3.5 flex-1">

          {/* Header */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <h3 className="text-[15px] font-bold text-[#1e293b] leading-tight truncate">{plan.name}</h3>
              <button className="text-neutral-300 hover:text-red-400 transition-colors shrink-0">
                <Heart className="w-4 h-4" strokeWidth={2} />
              </button>
            </div>
            {plan.suitability_score != null && (
              <span className="shrink-0 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                {plan.suitability_score.toFixed(1)} match
              </span>
            )}
          </div>

          {/* Body */}
          <div className="flex flex-col md:flex-row gap-5 justify-between">
            {/* Features */}
            <div className="flex-1 space-y-2">
              {/* Hospital network */}
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24">
                    <path d="M19 10.5V20H5V10.5H19ZM20 9H4C3.4 9 3 9.4 3 10V21C3 21.6 3.4 22 4 22H20C20.6 22 21 21.6 21 21V10C21 9.4 20.6 9 20 9Z" />
                    <path d="M12 2C9.8 2 8 3.8 8 6V8H16V6C16 3.8 14.2 2 12 2ZM14 8H10V6C10 4.9 10.9 4 12 4C13.1 4 14 4.9 14 6V8Z" />
                  </svg>
                </div>
                <p className="text-xs text-neutral-600">
                  <span className="font-bold text-neutral-800">
                    {plan.hospital_network_count?.toLocaleString('en-IN') ?? '300+'} Cashless hospitals.
                  </span>{' '}
                  <span className="text-[#0078fd] font-semibold cursor-default">View list &rsaquo;</span>
                </p>
              </div>

              {/* Checkmark features */}
              <div className="space-y-1.5 pt-0.5">
                {displayFeatures.map((feat, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <svg className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-xs text-neutral-600 leading-snug">{feat}</span>
                  </div>
                ))}
              </div>

              {/* Warning flags (expanded) */}
              {expanded && plan.warning_flags && (plan.warning_flags as string[]).length > 0 && (
                <div className="mt-2 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 space-y-0.5">
                  <p className="text-[10px] font-bold text-amber-800 mb-1">⚠ Important Notes</p>
                  {(plan.warning_flags as string[]).map((flag: string, i: number) => (
                    <p key={i} className="text-[10px] text-amber-700">• {flag}</p>
                  ))}
                </div>
              )}

              {/* AI explanation (expanded) */}
              {expanded && plan.plain_english_explanation && (
                <div className="mt-2 bg-blue-50/60 border border-blue-100 rounded-lg px-3 py-2">
                  <p className="text-[11px] text-[#0d3c94] leading-relaxed">
                    <span className="font-bold">✦ AI: </span>{plan.plain_english_explanation}
                  </p>
                </div>
              )}
            </div>

            {/* Pricing column */}
            <div className="md:w-[230px] shrink-0 flex flex-col gap-3">
              <div className="flex justify-between items-start gap-2">
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
                    <span className="text-xs font-semibold text-neutral-500">/month</span>
                  </div>
                  <span className="text-[10px] text-neutral-400 line-through">₹{strikePrice} Incl. GST</span>
                </div>
              </div>

              <button
                onClick={() => {
                  if (plan.link) window.open(plan.link, '_blank', 'noopener,noreferrer');
                  else router.push(`/buy/${plan.id}`);
                }}
                className="w-full bg-[#ff4f18] hover:bg-[#e03d0d] active:scale-[0.98] text-white text-sm font-bold py-2.5 rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-orange-500/20 transition-all cursor-pointer"
              >
                Customize plan &rsaquo;
              </button>

              <p className="text-[11px] text-emerald-600 text-center font-medium">
                ✓ Inclusive of 5% online discount*
              </p>
            </div>
          </div>
        </div>

        {/* Card footer */}
        <div className="bg-[#f7faf8] border-t border-neutral-100 px-5 py-2.5 flex items-center justify-between rounded-b-2xl">
          <div className="flex items-center gap-3 text-xs">
            <button
              onClick={() => setExpanded(e => !e)}
              className="font-bold text-[#0078fd] hover:underline cursor-pointer flex items-center gap-0.5"
            >
              {expanded ? <>Show less <ChevronUp size={11} /></> : 'View all features ›'}
            </button>
            <span className="text-neutral-200">|</span>
            <button onClick={() => onStressTest(plan)} className="font-semibold text-neutral-500 hover:text-neutral-700 cursor-pointer">
              Stress Test
            </button>
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <div
              onClick={() => onToggleCompare(plan.id)}
              className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all cursor-pointer ${
                isCompared ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-neutral-300 bg-white hover:border-neutral-400'
              }`}
            >
              {isCompared && (
                <svg className="w-3 h-3 stroke-current stroke-[3] fill-none" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <span className="text-[11px] font-bold text-neutral-600">Add to compare</span>
          </label>
        </div>
      </div>
    </div>
  );
}

// ─── Insurer Group ────────────────────────────────────────────────────────────
interface InsurerGroupProps {
  insurer: string;
  plans: Plan[];
  compareIds: number[];
  payYearly: boolean;
  onToggleCompare: (id: number) => void;
  onStressTest: (plan: Plan) => void;
  router: ReturnType<typeof useRouter>;
}

export function InsurerGroup({ insurer, plans, compareIds, payYearly, onToggleCompare, onStressTest, router }: InsurerGroupProps) {
  const [showMore, setShowMore] = useState(false);
  const top = plans[0];
  const rest = plans.slice(1);

  return (
    <div className="space-y-3">
      <PlanCard
        plan={top}
        isCompared={compareIds.includes(top.id)}
        payYearly={payYearly}
        onToggleCompare={onToggleCompare}
        onStressTest={onStressTest}
        router={router}
      />
      {showMore && rest.map(p => (
        <PlanCard
          key={p.id}
          plan={p}
          isCompared={compareIds.includes(p.id)}
          payYearly={payYearly}
          onToggleCompare={onToggleCompare}
          onStressTest={onStressTest}
          router={router}
        />
      ))}
      {rest.length > 0 && (
        <button
          onClick={() => setShowMore(s => !s)}
          className="w-full py-2.5 text-xs text-[#0078fd] font-bold flex items-center justify-center gap-1 cursor-pointer border border-dashed border-[#0078fd]/25 rounded-xl bg-white/50 hover:bg-blue-50/40 transition-colors"
        >
          {showMore ? <>Hide plans from {insurer} <ChevronUp size={12} /></> : <>View {rest.length} more plan{rest.length !== 1 ? 's' : ''} from {insurer} <ChevronDown size={12} /></>}
        </button>
      )}
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
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
  const [payYearly, setPayYearly] = useState(false);
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
    let maxHba1c = 5.4, maxBP = 120, maxBMI = 22;
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
      age: maxAge, bmi: parseFloat(maxBMI.toFixed(1)), smoker: vitals.smoker, hba1c: maxHba1c,
      bp_systolic: maxBP, has_diabetes: conditions.has('Diabetes'),
      has_hypertension: conditions.has('Blood Pressure'),
      chronic_count: Array.from(conditions).filter(c => !['Diabetes', 'Blood Pressure'].includes(c)).length,
      monthly_budget: vitals.monthly_budget, income_lakh: vitals.income_lakh,
    };
  }, [vitals, profileMeta, activeGroupId, groups]);

  const processedPlans = useMemo<Plan[]>(() => {
    const base = allAvailablePlans.length > 0 ? allAvailablePlans : plans;
    return base.map(plan => {
      let boost = 0;
      const activeGroup = groups.find(g => g.id === activeGroupId);
      const isMulti = (activeGroup?.members ?? []).length > 1;
      if (isMulti) boost += plan.type?.toLowerCase().includes('floater') ? 1.5 : -2;
      if (activeGroupVitals.has_diabetes as boolean) boost += plan.diabetes_day1 ? 2 : -(plan.pre_existing_wait_years ?? 4) * 0.6;
      if (activeGroupVitals.has_hypertension as boolean) boost += plan.hypertension_day1 ? 2 : -(plan.pre_existing_wait_years ?? 4) * 0.6;
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

    filters.benefits.forEach((b: string) => {
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
    cashlessOnly,
  ].filter(Boolean).length;

  const gender = (profileMeta?.gender as string) ?? 'Member';
  const age = (activeGroupVitals.age as number) ?? 35;
  const isSmoker = activeGroupVitals.smoker === 1;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f4f6f8] flex items-center justify-center">
        <div className="text-center space-y-3">
          <span className="h-8 w-8 border-2 border-emerald-500 border-t-transparent animate-spin rounded-full inline-block" />
          <p className="text-xs text-neutral-400 uppercase tracking-widest font-medium">Loading your plans...</p>
        </div>
      </div>
    );
  }

  if (!vitals) {
    return (
      <div className="min-h-screen bg-[#f4f6f8] lg:flex">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center p-8">
          <div className="max-w-md w-full bg-white rounded-2xl border border-neutral-200 p-10 space-y-6 shadow-sm text-center">
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-neutral-800">No Health Profile Found</h2>
              <p className="text-sm text-neutral-500 leading-relaxed">
                Complete the clinical assessment to unlock AI-matched health plan recommendations.
              </p>
            </div>
            <button onClick={() => router.push('/assessment')} className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl transition-all cursor-pointer">
              Begin Assessment →
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f6f8] lg:flex relative">
      <Sidebar />
      <main className="flex-1 flex flex-col">

        {/* ── Profile context bar ── */}
        <div className="bg-white border-b border-neutral-100 px-6 py-2.5 sticky top-0 z-30 shadow-sm">
          <div className="max-w-[960px] mx-auto flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] text-neutral-400 font-semibold uppercase tracking-wider">Plans for:</span>
              <span className="font-bold text-neutral-700 bg-neutral-100 px-3 py-1 rounded-full text-xs">
                {name || gender}, {age} yrs{isSmoker ? ' · Smoker' : ''}
              </span>
              <button onClick={() => router.push('/assessment')} className="text-[#0078fd] text-[11px] font-bold hover:underline cursor-pointer">
                Edit profile &rsaquo;
              </button>
            </div>

            <div className="flex items-center gap-3">
              {/* Monthly / Yearly toggle */}
              <div className="flex items-center gap-1.5 bg-neutral-50 border border-neutral-200 rounded-lg px-2.5 py-1 select-none">
                <span className={`text-[11px] font-bold ${!payYearly ? 'text-emerald-700' : 'text-neutral-400'}`}>Monthly</span>
                <button
                  type="button"
                  onClick={() => setPayYearly(y => !y)}
                  className={`h-4 w-8 rounded-full p-0.5 transition-colors relative flex items-center shrink-0 ${payYearly ? 'bg-emerald-500' : 'bg-neutral-200'}`}
                >
                  <div className={`h-3 w-3 rounded-full bg-white transition-transform shadow-sm ${payYearly ? 'translate-x-4' : 'translate-x-0'}`} />
                </button>
                <span className={`text-[11px] font-bold ${payYearly ? 'text-emerald-700' : 'text-neutral-400'}`}>Yearly</span>
              </div>

              <button
                onClick={() => setIsCompareDrawerOpen(true)}
                className="flex items-center gap-1.5 text-xs font-bold text-neutral-600 hover:text-emerald-700 border border-neutral-200 hover:border-emerald-300 rounded-lg px-3 py-1.5 transition-colors bg-white"
              >
                ⚖ Compare{compareIds.length > 0 && ` (${compareIds.length})`}
              </button>
            </div>
          </div>
        </div>

        {/* ── Quick filters bar ── */}
        <div className="bg-white border-b border-neutral-100 px-6 py-3 sticky top-[45px] z-20 shadow-sm">
          <div className="max-w-[960px] mx-auto flex items-center gap-2 overflow-x-auto">
            <span className="text-xs font-bold text-neutral-500 shrink-0 mr-1">Quick filters</span>

            {/* Cover pill */}
            <label className="flex items-center gap-0.5 rounded-full border border-neutral-200 px-3 py-1.5 cursor-pointer hover:border-neutral-300 shrink-0 bg-white transition-colors">
              <span className="text-xs font-semibold text-neutral-700">Cover</span>
              <select
                value={filters.cover}
                onChange={(e) => setFilters(f => ({ ...f, cover: e.target.value as CoverOption }))}
                className="appearance-none bg-transparent outline-none cursor-pointer text-xs font-semibold text-neutral-700 pl-1 max-w-[72px]"
              >
                <option value={CoverOption.RECOMMENDED}>All</option>
                <option value={CoverOption.BELOW_5_LAKH}>Below 5L</option>
                <option value={CoverOption.FIVE_TO_NINE_LAKH}>5L–9L</option>
                <option value={CoverOption.TEN_TO_TWENTY_FOUR_LAKH}>10L–24L</option>
                <option value={CoverOption.TWENTY_FIVE_TO_NINETY_NINE_LAKH}>25L–99L</option>
                <option value={CoverOption.ONE_TO_TWO_CR}>1Cr–2Cr</option>
                <option value={CoverOption.TWO_TO_SIX_CR}>2Cr+</option>
              </select>
              <ChevronDown size={11} className="text-neutral-400 shrink-0" />
            </label>

            {/* Sort by pill */}
            <label className="flex items-center gap-0.5 rounded-full border border-neutral-200 px-3 py-1.5 cursor-pointer hover:border-neutral-300 shrink-0 bg-white transition-colors">
              <span className="text-xs font-semibold text-neutral-700">Sort by</span>
              <select
                value={filters.sortBy}
                onChange={(e) => setFilters(f => ({ ...f, sortBy: e.target.value as SortByOption }))}
                className="appearance-none bg-transparent outline-none cursor-pointer text-xs font-semibold text-neutral-700 pl-1 max-w-[96px]"
              >
                <option value={SortByOption.RELEVANCE}>Relevance</option>
                <option value={SortByOption.PREMIUM_LOW_TO_HIGH}>Price Low–High</option>
                <option value={SortByOption.CASHLESS_HOSPITALS}>Cashless Hospitals</option>
              </select>
              <ChevronDown size={11} className="text-neutral-400 shrink-0" />
            </label>

            {/* Premium pill */}
            <label className="flex items-center gap-0.5 rounded-full border border-neutral-200 px-3 py-1.5 cursor-pointer hover:border-neutral-300 shrink-0 bg-white transition-colors">
              <span className="text-xs font-semibold text-neutral-700">Premium</span>
              <select
                value={filters.premiumPerMonth}
                onChange={(e) => setFilters(f => ({ ...f, premiumPerMonth: e.target.value as PremiumOption }))}
                className="appearance-none bg-transparent outline-none cursor-pointer text-xs font-semibold text-neutral-700 pl-1 max-w-[72px]"
              >
                <option value={PremiumOption.NO_PREFERENCE}>Any</option>
                <option value={PremiumOption.BELOW_1K}>Below 1K</option>
                <option value={PremiumOption.ONE_TO_TWO_K}>1K–2K</option>
                <option value={PremiumOption.TWO_TO_FOUR_K}>2K–4K</option>
                <option value={PremiumOption.ABOVE_FOURK}>Above 4K</option>
              </select>
              <ChevronDown size={11} className="text-neutral-400 shrink-0" />
            </label>

            {/* Cashless toggle */}
            <button
              onClick={() => setCashlessOnly(c => !c)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0 ${
                cashlessOnly ? 'border-emerald-400 bg-emerald-50 text-emerald-700' : 'border-neutral-200 text-neutral-700 hover:border-neutral-300 bg-white'
              }`}
            >
              🏥 Cashless Hospitals
            </button>

            {/* Clear active filters */}
            {activeFilterCount > 0 && (
              <button
                onClick={() => { setFilters(DEFAULT_FILTERS); setCashlessOnly(false); }}
                className="rounded-full border border-red-200 bg-red-50 text-red-600 px-3 py-1.5 text-xs font-semibold shrink-0 hover:bg-red-100 transition-colors"
              >
                Clear {activeFilterCount} ×
              </button>
            )}

            <div className="flex-1 min-w-[8px]" />

            {/* All filters */}
            <button
              onClick={() => setIsFilterModalOpen(true)}
              className="rounded-full border border-neutral-200 hover:border-neutral-400 px-4 py-1.5 text-xs font-semibold flex items-center gap-1.5 text-neutral-700 bg-white transition-colors shrink-0"
            >
              <SlidersHorizontal size={12} />
              All filters
              {activeFilterCount > 0 && (
                <span className="bg-emerald-500 text-white text-[9px] font-bold h-4 w-4 rounded-full flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* ── Plans list ── */}
        <div className="max-w-[960px] w-full mx-auto px-4 sm:px-6 py-5 pb-36 space-y-3">

          {/* AI banner */}
          <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-2.5 flex items-center gap-2">
            <Sparkles size={13} className="text-amber-600 shrink-0" />
            <p className="text-xs text-amber-800 font-medium">
              Outsurance AI · Plans ranked by your health profile · <span className="font-bold">{filteredPlans.length} plans found</span>
            </p>
          </div>

          {groupedByInsurer.length === 0 ? (
            <div className="bg-white border border-dashed border-neutral-200 rounded-2xl p-16 text-center shadow-sm">
              <p className="text-sm text-neutral-400 font-medium">No plans match your current filters.</p>
              <button
                onClick={() => { setFilters(DEFAULT_FILTERS); setCashlessOnly(false); }}
                className="mt-3 text-xs text-[#0078fd] hover:underline font-bold"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              {groupedByInsurer.map(({ insurer, plans: groupPlans }, index) => (
                <React.Fragment key={insurer}>
                  <InsurerGroup
                    insurer={insurer}
                    plans={groupPlans}
                    compareIds={compareIds}
                    payYearly={payYearly}
                    onToggleCompare={toggleCompare}
                    onStressTest={setSelectedPlanForStress}
                    router={router}
                  />
                  {index === 0 && (
                    <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-100 rounded-2xl px-5 py-3.5 flex items-center justify-between gap-4 shadow-sm">
                      <div className="flex items-center gap-3">
                        <Sparkles size={16} className="text-emerald-600 shrink-0" />
                        <div>
                          <p className="text-sm font-bold text-emerald-900">Outsurance Promise · Best Prices Guaranteed</p>
                          <p className="text-xs text-emerald-700 mt-0.5">AI-matched plans tailored to your health profile</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setIsFilterModalOpen(true)}
                        className="bg-white border border-emerald-200 text-emerald-700 font-bold text-xs px-4 py-2 rounded-full hover:bg-emerald-50 transition-colors shrink-0 cursor-pointer"
                      >
                        Refine filters
                      </button>
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* ── Compare bar ── */}
      {compareIds.length >= 2 && (
        <div className="fixed bottom-20 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-neutral-200 px-6 py-3 lg:left-[240px] z-40 shadow-lg">
          <div className="max-w-[960px] mx-auto flex justify-between items-center">
            <span className="text-sm font-black text-neutral-800">{compareIds.length} Plans Selected</span>
            <div className="flex gap-2">
              <button onClick={() => setIsCompareDrawerOpen(true)} className="h-9 px-5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl cursor-pointer transition-colors">Compare</button>
              <button onClick={clearCompare} className="h-9 px-4 border border-neutral-200 text-xs font-bold text-neutral-600 hover:border-neutral-400 rounded-xl bg-white cursor-pointer transition-colors">Clear</button>
            </div>
          </div>
        </div>
      )}

      {/* ── AI Agent chat ── */}
      <div className={`fixed left-1/2 -translate-x-1/2 w-full max-w-[680px] px-4 z-40 transition-all duration-300 ${compareIds.length >= 2 ? 'bottom-32' : 'bottom-4'}`}>
        {agentResponse && (
          <div className="mb-3 bg-white/95 backdrop-blur-sm border border-neutral-200 rounded-2xl shadow-xl p-4 relative">
            <button
              type="button"
              onClick={() => { setAgentResponse(null); setAgentToolUsed(null); }}
              className="absolute right-3 top-3 text-neutral-400 hover:text-neutral-700 text-lg leading-none cursor-pointer"
            >×</button>
            <div className="flex items-start gap-2.5">
              <div className="h-7 w-7 bg-emerald-600 text-white flex items-center justify-center rounded-lg shrink-0">
                <Bot size={14} />
              </div>
              <div className="space-y-1 pr-6">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-emerald-700 uppercase tracking-wider">Outsurance AI</span>
                  {agentToolUsed && <span className="text-[9px] bg-neutral-100 text-neutral-500 px-1.5 py-0.5 rounded border border-neutral-200 font-mono uppercase">{agentToolUsed}</span>}
                </div>
                <p className="text-xs leading-5 text-neutral-700 whitespace-pre-line">{agentResponse}</p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleAgentSubmit} className="relative flex items-center bg-white/95 backdrop-blur-sm shadow-xl border border-neutral-200 hover:border-emerald-300 focus-within:border-emerald-400 transition-all rounded-2xl overflow-hidden">
          {isAgentLoading && (
            <div className="absolute top-0 left-0 right-0 h-[2px] overflow-hidden rounded-t-2xl">
              <div className="h-full bg-emerald-500 w-1/3 animate-pulse" />
            </div>
          )}
          <div className="pl-4 pr-2 shrink-0">
            <Sparkles size={14} className={isAgentLoading ? 'animate-spin text-emerald-500' : 'text-neutral-400'} />
          </div>
          <input
            type="text"
            value={agentInput}
            onChange={e => setAgentInput(e.target.value)}
            disabled={isAgentLoading}
            placeholder="Ask AI: 'best plan for diabetes', 'stress test cardiac surgery'..."
            className="w-full h-12 bg-transparent pr-3 text-xs text-neutral-800 placeholder-neutral-400 outline-none disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isAgentLoading || !agentInput.trim()}
            className="h-12 px-5 bg-emerald-600 hover:bg-emerald-700 text-white transition-colors text-xs font-bold shrink-0 disabled:bg-neutral-200 disabled:text-neutral-400 disabled:cursor-not-allowed flex items-center gap-1.5 border-l border-neutral-200 cursor-pointer"
          >
            {isAgentLoading ? 'Thinking...' : <><Send size={11} /> Send</>}
          </button>
        </form>
      </div>

      {/* ── Modals ── */}
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
      <div className="min-h-screen bg-[#f4f6f8] flex items-center justify-center">
        <span className="h-8 w-8 border-2 border-emerald-500 border-t-transparent animate-spin rounded-full" />
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}
