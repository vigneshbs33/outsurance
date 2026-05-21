'use client';

import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Sidebar from '../../components/Sidebar';
import { AnnotationBox, FormField, SectionEyebrow } from '../../components/editorial';
import { fetchAllPlans } from '../../lib/api';
import { supabase, getLatestRecommendation } from '../../lib/supabase';
import { useCompare } from '../../lib/compare';
import StressTestModal, { Plan } from '../../components/StressTestModal';
import CompareDrawer from '../../components/CompareDrawer';

const INSURERS = [
  'Star Health',
  'HDFC ERGO',
  'Niva Bupa',
  'Care Health',
  'LIC',
  'Bajaj Allianz',
  'ICICI Lombard',
  'Aditya Birla',
  'ManipalCigna',
  'Tata AIG',
  'Max Bupa',
  'SBI General'
];

const PLAN_TYPES = [
  'Basic',
  'Comprehensive',
  'Standard',
  'Senior',
  'Critical Illness',
  'Term Life'
];

function ExplorerContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [query, setQuery] = useState(searchParams.get('search') || '');
  const [activeId, setActiveId] = useState<number | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  // Filters State
  const [showFilters, setShowFilters] = useState(false);
  const [premiumLimit, setPremiumLimit] = useState<number>(25000);
  const [coverageMin, setCoverageMin] = useState<number>(500000);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedInsurers, setSelectedInsurers] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<string>('score');

  // Pagination State
  const [visibleCount, setVisibleCount] = useState(10);

  // Reset pagination when search query or refine search parameters change
  useEffect(() => {
    setVisibleCount(10);
  }, [query, premiumLimit, coverageMin, selectedTypes, selectedInsurers, sortBy]);

  // Modals & Comparison State
  const [selectedPlanForStress, setSelectedPlanForStress] = useState<Plan | null>(null);
  const [isCompareDrawerOpen, setIsCompareDrawerOpen] = useState(false);

  const { compareIds, toggleCompare, clearCompare, isInCompare } = useCompare();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push('/login');
        return;
      }
      Promise.all([
        fetchAllPlans(),
        getLatestRecommendation(user.id)
      ]).then(([allPlans, recommendation]) => {
        if (recommendation && recommendation.top_plan_ids && recommendation.top_plan_ids.length > 0) {
          const mergedPlans = allPlans.map((plan: any) => {
            const recPlan = recommendation.top_plan_ids.find((rp: any) => rp.id === plan.id);
            if (recPlan) {
              return {
                ...plan,
                suitability_score: recPlan.score,
                cosine_similarity: recPlan.cosine_similarity,
                plain_english_explanation: recPlan.plain_english_explanation,
                warning_flags: recPlan.warning_flags || plan.warning_flags || []
              };
            }
            return plan;
          });
          setPlans(mergedPlans as Plan[]);
          setActiveId((mergedPlans[0]?.id as number | null) ?? null);
        } else {
          setPlans(allPlans as Plan[]);
          setActiveId((allPlans[0]?.id as number | null) ?? null);
        }
      });
    });
  }, [router]);

  // Handle toggling of array filters
  const toggleType = (type: string) => {
    setSelectedTypes(prev => 
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const toggleInsurer = (insurer: string) => {
    setSelectedInsurers(prev => 
      prev.includes(insurer) ? prev.filter(i => i !== insurer) : [...prev, insurer]
    );
  };

  const resetFilters = () => {
    setPremiumLimit(25000);
    setCoverageMin(500000);
    setSelectedTypes([]);
    setSelectedInsurers([]);
    setQuery('');
  };

  // Filter & Sort Logic
  const filteredAndSorted = useMemo(() => {
    let result = plans.filter((plan) => {
      // Query filter
      const lower = query.toLowerCase();
      const matchesQuery = !lower || 
        plan.name.toLowerCase().includes(lower) || 
        plan.insurer.toLowerCase().includes(lower);

      // Premium slider filter
      const matchesPremium = plan.annual_premium <= premiumLimit;

      // Coverage filter
      const matchesCoverage = plan.coverage >= coverageMin;

      // Plan types filter
      const matchesType = selectedTypes.length === 0 || selectedTypes.includes(plan.type);

      // Insurers filter
      const matchesInsurer = selectedInsurers.length === 0 || selectedInsurers.includes(plan.insurer);

      return matchesQuery && matchesPremium && matchesCoverage && matchesType && matchesInsurer;
    });

    // Sort result
    return result.sort((a, b) => {
      if (sortBy === 'score') {
        return (b.suitability_score || 8.4) - (a.suitability_score || 8.4);
      }
      if (sortBy === 'premium_asc') {
        return a.annual_premium - b.annual_premium;
      }
      if (sortBy === 'premium_desc') {
        return b.annual_premium - a.annual_premium;
      }
      if (sortBy === 'coverage_desc') {
        return b.coverage - a.coverage;
      }
      return 0;
    });
  }, [plans, query, premiumLimit, coverageMin, selectedTypes, selectedInsurers, sortBy]);

  const activePlan = filteredAndSorted.find((plan) => plan.id === activeId) || filteredAndSorted[0];

  const comparedPlansList = useMemo(() => {
    return plans.filter((p) => compareIds.includes(p.id));
  }, [plans, compareIds]);

  return (
    <div className="min-h-screen bg-white lg:flex relative">
      <Sidebar />
      <main className="flex-1 px-4 sm:px-8 py-8 lg:px-12 pb-24">
        <div className="mx-auto max-w-[1100px]">
          
          <header className="mb-10 border-b border-neutral-200 pb-8">
            <SectionEyebrow>Find & Filter Policies</SectionEyebrow>
            <div className="mt-4 grid gap-6 md:grid-cols-[1.5fr_1fr] md:items-end">
              <h1 className="font-[var(--font-heading)] text-3xl font-black uppercase tracking-tight text-black md:text-4xl leading-none">
                Explore Available Policies.
              </h1>
              
              <div className="flex flex-col gap-3">
                <FormField label="Search insurer or keyword">
                  <div className="relative flex items-center">
                    <input 
                      className="field-input font-mono text-xs w-full pr-12 focus:border-b-2 focus:border-black transition-all" 
                      placeholder="e.g. HDFC, Star, Care..."
                      value={query} 
                      onChange={(e) => setQuery(e.target.value)} 
                    />
                    {query && (
                      <button 
                        onClick={() => setQuery('')}
                        className="absolute right-2 font-mono text-[9px] uppercase tracking-widest text-[var(--ink-soft)] hover:text-black transition-colors"
                      >
                        [ Clear ]
                      </button>
                    )}
                  </div>
                </FormField>
              </div>
            </div>

            {/* Filter pills and triggers bar */}
            <div className="mt-6 flex flex-wrap gap-2.5 items-center">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`px-3 py-1.5 border font-mono text-[10px] uppercase tracking-wider transition-all ${
                  showFilters || selectedTypes.length > 0 || selectedInsurers.length > 0 || premiumLimit < 25000 || coverageMin > 500000
                    ? 'border-black bg-neutral-50 font-bold'
                    : 'border-neutral-200 hover:border-black'
                }`}
                style={{ borderRadius: '12px' }}
              >
                {showFilters ? '[ Hide Filters ]' : '⚙ Refine Search Filters'}
              </button>

              {/* Sorting option trigger */}
              <div className="flex items-center gap-1.5 border border-neutral-200 px-3 py-1.5" style={{ borderRadius: '12px' }}>
                <span className="font-mono text-[9px] uppercase text-[var(--ink-soft)]">Sort By:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="font-mono text-[10px] uppercase tracking-wider bg-transparent outline-none cursor-pointer text-black"
                >
                  <option value="score">Match Score</option>
                  <option value="premium_asc">Price Low to High</option>
                  <option value="premium_desc">Price High to Low</option>
                  <option value="coverage_desc">Coverage Sum</option>
                </select>
              </div>

              {/* Active Filter Indicators */}
              {premiumLimit < 25000 && (
                <span className="bg-neutral-100 font-mono text-[9px] uppercase px-2 py-1" style={{ borderRadius: '12px' }}>
                  Premium under ₹{premiumLimit.toLocaleString('en-IN')}
                </span>
              )}
              {coverageMin > 500000 && (
                <span className="bg-neutral-100 font-mono text-[9px] uppercase px-2 py-1" style={{ borderRadius: '12px' }}>
                  Coverage over ₹{(coverageMin / 100000).toFixed(0)}L
                </span>
              )}
              {(selectedTypes.length > 0 || selectedInsurers.length > 0 || premiumLimit < 25000 || coverageMin > 500000 || query) && (
                <button
                  onClick={resetFilters}
                  className="font-mono text-[10px] uppercase text-[var(--ink-soft)] hover:text-black underline tracking-wider"
                >
                  Clear All
                </button>
              )}
            </div>

            {/* Expandable Calibrate filters panel */}
            {showFilters && (
              <div className="mt-6 border border-neutral-200 p-6 bg-neutral-50 grid gap-6 md:grid-cols-2 lg:grid-cols-4 animate-slideDown" style={{ borderRadius: '12px' }}>
                {/* Premium limit slider */}
                <div className="space-y-2">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--ink-soft)] block">Maximum Yearly Premium</span>
                  <div className="flex justify-between font-mono text-xs font-bold">
                    <span>₹3,600</span>
                    <span className="text-black bg-neutral-200 px-1.5 py-0.5 rounded">₹{premiumLimit.toLocaleString('en-IN')}</span>
                  </div>
                  <input
                    type="range"
                    min="3600"
                    max="25000"
                    step="500"
                    value={premiumLimit}
                    onChange={(e) => setPremiumLimit(parseInt(e.target.value))}
                    className="w-full h-1 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-black"
                  />
                </div>

                {/* Coverage threshold */}
                <div className="space-y-2">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--ink-soft)] block">Minimum Coverage Sum</span>
                  <div className="flex justify-between font-mono text-xs font-bold">
                    <span>₹5L</span>
                    <span className="text-black bg-neutral-200 px-1.5 py-0.5 rounded">₹{(coverageMin / 100000).toFixed(0)}L</span>
                  </div>
                  <input
                    type="range"
                    min="500000"
                    max="5000000"
                    step="500000"
                    value={coverageMin}
                    onChange={(e) => setCoverageMin(parseInt(e.target.value))}
                    className="w-full h-1 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-black"
                  />
                </div>

                {/* Plan types list */}
                <div className="space-y-2">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--ink-soft)] block">Plan Types</span>
                  <div className="max-h-[100px] overflow-y-auto space-y-1 pr-2">
                    {PLAN_TYPES.map((type) => {
                      const checked = selectedTypes.includes(type);
                      return (
                        <label key={type} className="flex items-center gap-2 cursor-pointer font-mono text-[11px] text-neutral-600 hover:text-black">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleType(type)}
                            className="h-3 w-3 accent-black"
                          />
                          <span>{type}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Insurers list */}
                <div className="space-y-2">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--ink-soft)] block">Providers</span>
                  <div className="max-h-[100px] overflow-y-auto space-y-1 pr-2">
                    {INSURERS.map((insurer) => {
                      const checked = selectedInsurers.includes(insurer);
                      return (
                        <label key={insurer} className="flex items-center gap-2 cursor-pointer font-mono text-[11px] text-neutral-600 hover:text-black">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleInsurer(insurer)}
                            className="h-3 w-3 accent-black"
                          />
                          <span>{insurer}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </header>

          {notification && (
            <div className="mb-6 p-4 bg-black text-white font-mono text-xs uppercase tracking-wider" style={{ borderRadius: '12px' }}>
              {notification}
            </div>
          )}

          <section className="grid gap-12 lg:grid-cols-[1.5fr_1fr]">
            <div>
              <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--ink-soft)] block mb-6">
                Recommended Policies ({filteredAndSorted.length})
              </span>
              
              <div className="space-y-4">
                <div className="overflow-x-auto border border-neutral-200" style={{ borderRadius: '12px' }}>
                  <table className="w-full border-collapse font-mono text-[11px] text-left text-neutral-600">
                    <thead>
                      <tr className="border-b border-neutral-200 bg-neutral-50 text-[9px] uppercase tracking-widest text-[var(--ink-soft)]">
                        <th className="py-3 px-4 font-bold">Plan / Provider</th>
                        <th className="py-3 px-4 font-bold hidden sm:table-cell">Type</th>
                        <th className="py-3 px-4 font-bold">Premium</th>
                        <th className="py-3 px-4 font-bold hidden md:table-cell">Coverage</th>
                        <th className="py-3 px-4 font-bold hidden lg:table-cell">Wait Period</th>
                        <th className="py-3 px-4 font-bold text-right">Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAndSorted.slice(0, visibleCount).map((plan) => {
                        const compared = isInCompare(plan.id);
                        const isActive = activeId === plan.id;
                        
                        return (
                          <tr
                            key={String(plan.id)}
                            onClick={() => setActiveId(plan.id as number)}
                            className={`border-b border-neutral-100 last:border-b-0 cursor-pointer transition-colors hover:bg-neutral-50/50 ${
                              isActive ? 'bg-neutral-50/90 font-bold text-black border-l-[3px] border-l-black' : 'bg-white'
                            }`}
                          >
                            <td className="py-4 px-4">
                              <div className="flex flex-col gap-0.5">
                                <span className="text-black uppercase font-bold text-[12px]">{plan.name}</span>
                                <span className="text-[9px] text-[var(--ink-soft)] uppercase">{plan.insurer}</span>
                                {compared && (
                                  <span className="mt-1 self-start font-mono text-[8px] uppercase bg-neutral-200 text-black px-1 font-bold" style={{ borderRadius: '12px' }}>
                                    ✓ Compare
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-4 px-4 uppercase hidden sm:table-cell">{plan.type}</td>
                            <td className="py-4 px-4 text-black font-semibold">
                              ₹{plan.annual_premium.toLocaleString('en-IN')}/yr
                            </td>
                            <td className="py-4 px-4 text-[var(--ink-mid)] hidden md:table-cell">
                              ₹{plan.coverage.toLocaleString('en-IN')}
                            </td>
                            <td className="py-4 px-4 uppercase hidden lg:table-cell text-[var(--ink-mid)]">
                              {plan.diabetes_day1 ? 'Day-1 Cover' : `${plan.pre_existing_wait_years ?? plan.preexisting_wait_years ?? 4} yrs`}
                            </td>
                            <td className="py-4 px-4 text-right">
                              <span className="text-[14px] font-black text-black">
                                {(plan.suitability_score || 8.4).toFixed(1)}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {filteredAndSorted.length === 0 && (
                  <div className="border border-neutral-200 border-dashed p-12 text-center font-mono text-xs text-[var(--ink-soft)]" style={{ borderRadius: '12px' }}>
                    No plans match your criteria. Try adjusting the yearly premium or the minimum coverage sum to see more options!
                  </div>
                )}

                {filteredAndSorted.length > visibleCount && (
                  <div className="flex justify-center mt-6">
                    <button
                      onClick={() => setVisibleCount((prev) => prev + 10)}
                      className="w-full h-10 border border-neutral-200 hover:border-black text-black font-mono text-[10px] uppercase tracking-wider transition-colors bg-white cursor-pointer"
                      style={{ borderRadius: '12px' }}
                    >
                      View More (+10 Policies)
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar Specifications block */}
            <aside className="space-y-8">
              {activePlan ? (
                <>
                  <AnnotationBox title="Active Selection">{String(activePlan.name)}</AnnotationBox>
                  
                  <div className="border border-neutral-200 p-6 bg-neutral-50" style={{ borderRadius: '12px' }}>
                    <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--ink-soft)] block mb-4">Policy Coverage Sheet</span>
                    <div className="space-y-3 font-mono text-xs">
                      
                      <div className="flex justify-between border-b border-neutral-200 pb-2">
                        <span className="text-[var(--ink-soft)]">Insurer</span>
                        <span className="font-bold text-black uppercase">{activePlan.insurer}</span>
                      </div>

                      <div className="flex justify-between border-b border-neutral-200 pb-2">
                        <span className="text-[var(--ink-soft)]">Plan Type</span>
                        <span className="font-bold text-black uppercase">{activePlan.type}</span>
                      </div>

                      <div className="flex justify-between border-b border-neutral-200 pb-2">
                        <span className="text-[var(--ink-soft)]">Monthly Premium</span>
                        <span className="font-bold text-black">₹{Math.round(activePlan.annual_premium / 12).toLocaleString('en-IN')}/mo</span>
                      </div>

                      <div className="flex justify-between border-b border-neutral-200 pb-2">
                        <span className="text-[var(--ink-soft)]">Coverage Sum</span>
                        <span className="font-bold text-black">₹{activePlan.coverage.toLocaleString('en-IN')}</span>
                      </div>

                      <div className="flex justify-between border-b border-neutral-200 pb-2">
                        <span className="text-[var(--ink-soft)]">Wait for Health Conditions</span>
                        <span className="font-bold text-black uppercase">
                          {activePlan.diabetes_day1 ? 'None (Day-1)' : `${activePlan.pre_existing_wait_years ?? activePlan.preexisting_wait_years ?? 4} Years`}
                        </span>
                      </div>

                      <div className="flex justify-between border-b border-neutral-200 pb-2">
                        <span className="text-[var(--ink-soft)]">Claims Settled Successfully</span>
                        <span className="font-bold text-black">{activePlan.claim_settlement_ratio ? `${activePlan.claim_settlement_ratio}%` : 'N/A'}</span>
                      </div>

                      <div className="flex justify-between border-b border-neutral-200 pb-2">
                        <span className="text-[var(--ink-soft)]">Hospital Networks</span>
                        <span className="font-bold text-black">{activePlan.hospital_network_count ? `${activePlan.hospital_network_count.toLocaleString('en-IN')}+` : 'N/A'}</span>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-[var(--ink-soft)]">Unlimited Refills</span>
                        <span className="font-bold text-black uppercase">{activePlan.restoration_benefit ? 'Yes' : 'No'}</span>
                      </div>

                    </div>
                  </div>

                  {activePlan.plain_english_explanation && (
                    <div className="border border-neutral-200 p-4 bg-white mt-4 space-y-1.5" style={{ borderRadius: '12px' }}>
                      <span className="font-mono text-[9px] uppercase tracking-wider text-[var(--ink-soft)] block">AI Recommendation Logic</span>
                      <p className="font-mono text-xs leading-5 text-neutral-700 italic">
                        &ldquo;{activePlan.plain_english_explanation}&rdquo;
                      </p>
                    </div>
                  )}

                  {activePlan.warning_flags && activePlan.warning_flags.length > 0 && (
                    <div className="border border-amber-200 bg-amber-50/40 p-4 mt-4 space-y-2 animate-fadeIn" style={{ borderRadius: '12px' }}>
                      <span className="font-mono text-[9px] uppercase tracking-wider text-amber-800 font-bold block">⚠️ Policy Warning Flags</span>
                      <div className="flex flex-col gap-1.5">
                        {activePlan.warning_flags.map((flag: string) => (
                          <div key={flag} className="font-mono text-[10px] text-amber-900 flex items-start gap-1">
                            <span>•</span>
                            <span>{flag}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-4">
                    {/* View comprehensive details page link */}
                    <button 
                      onClick={() => router.push(`/explorer/${activePlan.id}`)}
                      className="mono-btn-primary bg-black text-white hover:bg-neutral-900 transition-colors cursor-pointer w-full"
                    >
                      Open Policy Breakdown
                    </button>

                    <div className="flex flex-col sm:flex-row gap-2">
                      <button 
                        onClick={() => toggleCompare(activePlan.id)} 
                        className={`w-full sm:flex-1 h-10 font-mono text-[10px] uppercase tracking-wider transition-all border cursor-pointer ${
                          isInCompare(activePlan.id) 
                            ? 'bg-black text-white border-black' 
                            : 'border-neutral-200 hover:border-black text-black bg-white'
                        }`}
                        style={{ borderRadius: '12px' }}
                      >
                        {isInCompare(activePlan.id) ? '✓ Added' : 'Add to Compare'}
                      </button>

                      <button 
                        onClick={() => setSelectedPlanForStress(activePlan)} 
                        className="w-full sm:flex-1 h-10 border border-neutral-200 hover:border-black text-black font-mono text-[10px] uppercase tracking-wider transition-colors bg-white cursor-pointer"
                        style={{ borderRadius: '12px' }}
                      >
                        Stress Test
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <AnnotationBox title="System State">Select a plan card to load comprehensive parameters.</AnnotationBox>
              )}
            </aside>
          </section>
        </div>
      </main>

      {/* Sticky Bottom Comparison Trigger */}
      {compareIds.length >= 2 && (
        <div className="fixed bottom-0 left-0 right-0 border-t border-neutral-200 bg-white p-4 lg:left-[290px] z-50 animate-slideUp">
          <div className="mx-auto max-w-[1100px] flex justify-between items-center">
            <span className="font-mono text-xs uppercase tracking-widest font-bold text-[var(--ink)]">
              {compareIds.length} Plans Selected
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setIsCompareDrawerOpen(true)}
                className="h-10 px-5 bg-black text-white hover:bg-neutral-900 font-mono text-xs uppercase tracking-wider"
                style={{ borderRadius: '12px' }}
              >
                Compare Plans
              </button>
              <button
                onClick={clearCompare}
                className="h-10 px-4 border border-neutral-200 font-mono text-xs uppercase tracking-wider text-black hover:border-black"
                style={{ borderRadius: '12px' }}
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals and drawer overlay mounts */}
      <StressTestModal 
        plan={selectedPlanForStress}
        isOpen={!!selectedPlanForStress}
        onClose={() => setSelectedPlanForStress(null)}
      />

      <CompareDrawer 
        plans={comparedPlansList}
        isOpen={isCompareDrawerOpen}
        onClose={() => setIsCompareDrawerOpen(false)}
        onClear={clearCompare}
        onSelectPlan={(id) => router.push(`/explorer/${id}`)}
      />
    </div>
  );
}

export default function ExplorerPage() {
  return (
    <Suspense fallback={<div className="page-shell min-h-screen" />}>
      <ExplorerContent />
    </Suspense>
  );
}
