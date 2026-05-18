'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../../components/Sidebar';
import { AnnotationBox, SectionEyebrow } from '../../components/editorial';
import { fetchAllPlans } from '../../lib/api';
import { getSavedPlanIds, supabase, toggleSavedPlan } from '../../lib/supabase';

function SavedContent() {
  const router = useRouter();
  const [savedPlans, setSavedPlans] = useState<Record<string, any>[]>([]);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        router.push('/login');
        return;
      }
      const ids = await getSavedPlanIds(user.id);
      const allPlans = await fetchAllPlans();
      setSavedPlans(allPlans.filter((plan: Record<string, any>) => ids.includes(plan.id as number)));
    });
  }, [router]);

  async function removePlan(planId: number) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await toggleSavedPlan(user.id, planId);
    setSavedPlans((current) => current.filter((plan) => plan.id !== planId));
  }

  return (
    <div className="min-h-screen bg-white lg:flex">
      <Sidebar />
      <main className="flex-1 px-4 sm:px-8 py-8 lg:px-12">
        <div className="mx-auto max-w-[1100px]">
          <header className="mb-10 border-b border-neutral-200 pb-8">
            <SectionEyebrow>Saved Plans</SectionEyebrow>
            <h1 className="mt-2 font-[var(--font-heading)] text-3xl font-black uppercase tracking-tight text-black md:text-4xl leading-none">
              Your Bookmarked Plans.
            </h1>
          </header>

          {savedPlans.length === 0 ? (
            <div className="max-w-[480px] space-y-6">
              <AnnotationBox title="💡 Quick tip">
                You haven't bookmarked any policies yet! Use our plan explorer to find plans matching your health numbers, then save them here for quick access.
              </AnnotationBox>
              <div className="max-w-[200px]">
                <button 
                  onClick={() => router.push('/explorer')} 
                  className="mono-btn-primary"
                >
                  Find Policies
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <span className="font-mono text-[10px] uppercase tracking-widest text-neutral-400 block mb-6">My Shortlisted Plans</span>
              <div className="grid gap-6 md:grid-cols-2">
                {savedPlans.map((plan, index) => (
                  <div 
                    key={String(plan.id)} 
                    className="border border-neutral-200 p-6 bg-white hover:border-black transition-all flex flex-col justify-between"
                    style={{ borderRadius: '2px' }}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[9px] bg-neutral-100 px-2 py-0.5" style={{ borderRadius: '2px' }}>0{index + 1}</span>
                        <span className="font-mono text-[9px] uppercase tracking-wider text-neutral-400">
                          {String(plan.insurer || plan.provider || 'Star Health')}
                        </span>
                      </div>
                      <h3 className="font-[var(--font-heading)] text-lg font-bold text-black uppercase tracking-tight">
                        {String(plan.name)}
                      </h3>
                      <div className="space-y-2 border-t border-neutral-100 pt-3">
                        <div className="flex justify-between font-mono text-[11px] text-neutral-500">
                          <span>Premium:</span>
                          <span className="text-black font-semibold">₹{Number(plan.annual_premium || 0).toLocaleString('en-IN')}/yr</span>
                        </div>
                        <div className="flex justify-between font-mono text-[11px] text-neutral-500">
                          <span>Coverage:</span>
                          <span className="text-black font-semibold">₹{Number(plan.coverage || 0).toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex justify-between font-mono text-[11px] text-neutral-500">
                          <span>Wait for Health Conditions:</span>
                          <span className="text-black font-semibold uppercase">
                            {plan.diabetes_day1 ? 'None (Day-1)' : `${plan.pre_existing_wait_years || plan.preexisting_wait_years || 0} Years`}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-6 pt-4 border-t border-neutral-100 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 bg-black rounded-full" />
                        <span className="font-mono text-[10px] text-black font-semibold">Match Score: {Number(plan.suitability_score || 8.4).toFixed(1)}</span>
                      </div>
                      <button 
                        onClick={() => removePlan(plan.id as number)} 
                        className="font-mono text-[10px] uppercase text-neutral-400 hover:text-black transition-colors underline"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function SavedPage() {
  return (
    <Suspense fallback={<div className="page-shell min-h-screen" />}>
      <SavedContent />
    </Suspense>
  );
}
