'use client';

import React, { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../../../components/Sidebar';
import { AnnotationBox, Crosshair } from '../../../components/editorial';
import { fetchAllPlans } from '../../../lib/api';
import { supabase, toggleSavedPlan, getSavedPlanIds, getLatestRecommendation } from '../../../lib/supabase';
import { useCompare } from '../../../lib/compare';
import StressTestModal, { Plan } from '../../../components/StressTestModal';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function PlanDetailPage({ params }: PageProps) {
  const router = useRouter();
  const { id: rawId } = use(params);
  const planId = parseInt(rawId, 10);

  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [isStressOpen, setIsStressOpen] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  const { toggleCompare, isInCompare } = useCompare();
  const isCompared = isInCompare(planId);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        router.push('/login');
        return;
      }

      try {
        const [allPlans, recommendation] = await Promise.all([
          fetchAllPlans(),
          getLatestRecommendation(user.id)
        ]);
        const found = allPlans.find((p: Record<string, any>) => p.id === planId);
        if (found) {
          let mergedPlan = { ...found };
          if (recommendation && recommendation.top_plan_ids) {
            const recPlan = recommendation.top_plan_ids.find((rp: any) => rp.id === planId);
            if (recPlan) {
              mergedPlan = {
                ...mergedPlan,
                suitability_score: recPlan.score,
                cosine_similarity: recPlan.cosine_similarity,
                plain_english_explanation: recPlan.plain_english_explanation,
                warning_flags: recPlan.warning_flags || found.warning_flags || []
              };
            }
          }
          setPlan(mergedPlan as Plan);
        }
        
        const savedIds = await getSavedPlanIds(user.id);
        setIsSaved(savedIds.includes(planId));
      } catch (err) {
        console.error('Failed to load plan details', err);
      } finally {
        setLoading(false);
      }
    });
  }, [planId, router]);

  async function handleToggleSave() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !plan) return;

    const saved = await toggleSavedPlan(user.id, plan.id);
    setIsSaved(saved);
    setNotification(saved ? `Added ${plan.name} to Saved Plans.` : `Removed ${plan.name} from Saved Plans.`);
    setTimeout(() => setNotification(null), 3000);
  }

  function handleToggleCompare() {
    if (!plan) return;
    const success = toggleCompare(plan.id);
    if (!success) {
      setNotification('Comparison limited to 3 plans. Remove a plan first.');
      setTimeout(() => setNotification(null), 3000);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white lg:flex">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center p-8">
          <div className="text-center space-y-4">
            <span className="h-8 w-8 border-2 border-black border-t-transparent animate-spin rounded-full inline-block" />
            <p className="font-mono text-xs text-[var(--ink-soft)] uppercase tracking-widest">Loading plan details...</p>
          </div>
        </main>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="min-h-screen bg-white lg:flex">
        <Sidebar />
        <main className="flex-1 p-8">
          <div className="max-w-[480px] mx-auto pt-16">
            <AnnotationBox title="💡 Oops!">
              We couldn't find this policy. Try returning to the plan finder!
            </AnnotationBox>
            <button onClick={() => router.push('/explorer')} className="mono-btn-primary mt-6">
              Return to Plan Finder
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white lg:flex">
      <Sidebar />
      <main className="flex-1 px-4 py-8 md:px-8">
        <div className="mx-auto max-w-[680px] space-y-8 pb-24">
          
          {/* Top navigation header */}
          <header className="flex justify-between items-center border-b border-neutral-200 pb-4">
            <button
              onClick={() => router.push('/explorer')}
              className="font-mono text-xs uppercase tracking-widest text-[var(--ink-soft)] hover:text-black transition-colors"
            >
              ← Back to Plan Finder
            </button>
            <span className="font-mono text-xs font-bold text-black uppercase tracking-wider">
              {plan.insurer}
            </span>
          </header>

          {notification && (
            <div className="p-4 bg-black text-white font-mono text-xs uppercase tracking-wider" style={{ borderRadius: '12px' }}>
              {notification}
            </div>
          )}

          {/* Heading Row */}
          <div className="flex justify-between items-start gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-[10px] bg-neutral-100 px-2 py-0.5" style={{ borderRadius: '12px' }}>
                  {plan.type} Policy
                </span>
                {plan.cosine_similarity !== undefined && (
                  <span className="font-mono text-[10px] bg-black text-white px-2 py-0.5" style={{ borderRadius: '12px' }}>
                    {Math.round(plan.cosine_similarity * 100)}% Semantic Fit
                  </span>
                )}
              </div>
              <h1 className="font-[var(--font-heading)] text-3xl font-black uppercase tracking-tight text-black leading-tight">
                {plan.name}
              </h1>
              {plan.warning_flags && plan.warning_flags.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1 animate-fadeIn">
                  {plan.warning_flags.map((flag: string) => (
                    <span 
                      key={flag} 
                      className="font-mono text-[9px] uppercase tracking-wide bg-amber-50 text-amber-700 border border-amber-200/60 px-2 py-0.5"
                      style={{ borderRadius: '12px' }}
                    >
                      ⚠️ {flag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Circular Suitability Score Badge */}
            <div 
              className="flex h-16 w-16 flex-col items-center justify-center bg-black text-white font-mono"
              style={{ borderRadius: '50%' }}
            >
              <span className="text-lg font-black leading-none mt-1">
                {(plan.suitability_score ?? 8.4).toFixed(1)}
              </span>
              <span className="text-[7px] uppercase tracking-widest text-[var(--ink-soft)] mt-0.5">
                Match
              </span>
            </div>
          </div>

          {/* Premium & Coverage Sticky-style Pinned Card */}
          <div className="mono-card bg-neutral-50 grid grid-cols-2 divide-x divide-neutral-200 p-6" style={{ borderRadius: '12px' }}>
            <div className="pr-4 space-y-1">
              <span className="font-mono text-[9px] uppercase tracking-wider text-[var(--ink-soft)] block">Yearly Premium</span>
              <span className="font-mono text-2xl font-black text-black">
                ₹{plan.annual_premium.toLocaleString('en-IN')}
              </span>
              <span className="font-mono text-[11px] text-[var(--ink-mid)] block">
                ₹{Math.round(plan.annual_premium / 12).toLocaleString('en-IN')} per month
              </span>
            </div>

            <div className="pl-6 space-y-1">
              <span className="font-mono text-[9px] uppercase tracking-wider text-[var(--ink-soft)] block">Total Coverage</span>
              <span className="font-mono text-2xl font-black text-black">
                ₹{plan.coverage.toLocaleString('en-IN')}
              </span>
              <span className="font-mono text-[11px] text-[var(--ink-mid)] block">
                {plan.is_family_floater ? 'Full Family Coverage' : 'Individual Base Policy'}
              </span>
            </div>
          </div>

          {/* Key Facts Section (2 columns x 2 rows) */}
          <div className="space-y-4">
            <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--ink-soft)] block">Key Features</span>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="border border-neutral-200 p-4 space-y-1 bg-white" style={{ borderRadius: '12px' }}>
                <span className="font-mono text-[9px] uppercase text-[var(--ink-soft)] block">Wait for Health Conditions</span>
                <span className="font-mono text-sm font-bold text-black uppercase">
                  {plan.diabetes_day1 ? 'None (Day 1)' : `${plan.pre_existing_wait_years ?? plan.preexisting_wait_years ?? 4} Years`}
                </span>
              </div>

              <div className="border border-neutral-200 p-4 space-y-1 bg-white" style={{ borderRadius: '12px' }}>
                <span className="font-mono text-[9px] uppercase text-[var(--ink-soft)] block">Diabetes covered from Day 1</span>
                <span className="font-mono text-sm font-bold text-black uppercase">
                  {plan.diabetes_day1 ? 'Yes ✓' : 'No ×'}
                </span>
              </div>

              <div className="border border-neutral-200 p-4 space-y-1 bg-white" style={{ borderRadius: '12px' }}>
                <span className="font-mono text-[9px] uppercase text-[var(--ink-soft)] block">High BP covered from Day 1</span>
                <span className="font-mono text-sm font-bold text-black uppercase">
                  {plan.hypertension_day1 ? 'Yes ✓' : 'No ×'}
                </span>
              </div>

              <div className="border border-neutral-200 p-4 space-y-1 bg-white" style={{ borderRadius: '12px' }}>
                <span className="font-mono text-[9px] uppercase text-[var(--ink-soft)] block">Partner Hospitals</span>
                <span className="font-mono text-sm font-bold text-black">
                  {plan.hospital_network_count ? `${plan.hospital_network_count.toLocaleString('en-IN')}+ Cashless` : 'N/A'}
                </span>
              </div>
            </div>
          </div>

          {/* AI Recommendation Logic */}
          {plan.plain_english_explanation && (
            <div className="border border-neutral-200 p-6 bg-neutral-50 space-y-2 animate-fadeIn" style={{ borderRadius: '12px' }}>
              <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--ink-soft)] block">AI Recommendation Logic</span>
              <p className="font-mono text-xs leading-6 text-neutral-800 italic">
                &ldquo;{plan.plain_english_explanation}&rdquo;
              </p>
            </div>
          )}

          {/* Pros Section */}
          {plan.pros && plan.pros.length > 0 && (
            <div className="space-y-3 pt-2">
              <div>
                <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--ink-soft)] block">What is great about this plan</span>
                <span className="font-mono text-[11px] text-[var(--ink-soft)]">Highlights based on your health numbers</span>
              </div>
              <ul className="space-y-2 font-mono text-xs">
                {plan.pros.map((pro: string, idx: number) => (
                  <li key={idx} className="flex gap-2 items-start text-black">
                    <span className="font-bold">✓</span>
                    <span>{pro}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Cons Section */}
          {plan.cons && plan.cons.length > 0 && (
            <div className="space-y-3 pt-2">
              <div>
                <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--ink-soft)] block">Things to keep in mind</span>
                <span className="font-mono text-[11px] text-[var(--ink-soft)]">Important details to note</span>
              </div>
              <ul className="space-y-2 font-mono text-xs">
                {plan.cons.map((con: string, idx: number) => (
                  <li key={idx} className="flex gap-2 items-start text-black">
                    <span className="font-bold">×</span>
                    <span>{con}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Coverage Highlights */}
          {plan.coverage_highlights && plan.coverage_highlights.length > 0 && (
            <div className="space-y-3 pt-2">
              <div>
                <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--ink-soft)] block">What is covered under this plan</span>
              </div>
              <ul className="space-y-2 font-mono text-xs text-neutral-600 list-disc list-inside">
                {plan.coverage_highlights.map((highlight: string, idx: number) => (
                  <li key={idx}>{highlight}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Exclusions */}
          {plan.exclusions && plan.exclusions.length > 0 && (
            <div className="space-y-3 pt-2">
              <div>
                <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--ink-soft)] block">What is NOT covered</span>
              </div>
              <ul className="space-y-2 font-mono text-xs text-neutral-600 list-disc list-inside">
                {plan.exclusions.map((exclusion: string, idx: number) => (
                  <li key={idx}>{exclusion}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Quick Scenario Stress Test */}
          <div className="border border-black p-6 space-y-4" style={{ borderRadius: '12px' }}>
            <div className="relative">
              <Crosshair className="-left-1.5 -top-1.5 text-black" />
              <Crosshair className="-bottom-1.5 -right-1.5 text-black" />
              <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--ink-soft)] block mb-1">
                Emergency Bill Estimator
              </span>
              <h3 className="font-[var(--font-heading)] text-md font-bold text-black uppercase tracking-tight">
                Emergency Cost Calculator
              </h3>
              <p className="font-mono text-[11px] leading-5 text-[var(--ink-mid)] mt-1">
                See how much this policy pays for major surgeries or emergency hospital stays.
              </p>
              <button 
                onClick={() => setIsStressOpen(true)}
                className="mt-4 px-4 py-2 border border-black font-mono text-[10px] uppercase tracking-wider hover:bg-neutral-50 transition-colors"
                style={{ borderRadius: '12px' }}
              >
                Estimate Emergency Bill
              </button>
            </div>
          </div>

          {/* Sticky action buttons at bottom */}
          <div className="fixed bottom-0 left-0 right-0 border-t border-neutral-200 bg-white p-4 lg:left-[290px] z-50">
            <div className="mx-auto max-w-[680px] flex gap-4">
              <button
                onClick={handleToggleSave}
                className="flex-1 h-11 border border-black font-mono text-xs uppercase tracking-wider text-black hover:bg-neutral-50 transition-colors"
                style={{ borderRadius: '12px' }}
              >
                {isSaved ? '✓ Saved' : 'Save Plan'}
              </button>

              <button
                onClick={handleToggleCompare}
                className="flex-1 h-11 bg-black text-white hover:bg-neutral-900 font-mono text-xs uppercase tracking-wider transition-all"
                style={{ borderRadius: '12px' }}
              >
                {isCompared ? '✓ Selected for Compare' : 'Add to Compare'}
              </button>
            </div>
          </div>

        </div>
      </main>

      <StressTestModal 
        plan={plan}
        isOpen={isStressOpen}
        onClose={() => setIsStressOpen(false)}
      />
    </div>
  );
}
