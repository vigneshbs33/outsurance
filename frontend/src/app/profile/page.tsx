'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../../components/Sidebar';
import { SectionEyebrow } from '../../components/editorial';
import { supabase, getLatestRecommendation } from '../../lib/supabase';

function getLeftPct(score: number): string {
  const pct = Math.min(100, Math.max(0, score));
  const steps = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100];
  const closest = steps.reduce((p, c) => Math.abs(c - pct) < Math.abs(p - pct) ? c : p);
  const map: Record<number, string> = { 0:'left-0',5:'left-[5%]',10:'left-[10%]',15:'left-[15%]',20:'left-[20%]',25:'left-[25%]',30:'left-[30%]',35:'left-[35%]',40:'left-[40%]',45:'left-[45%]',50:'left-[50%]',55:'left-[55%]',60:'left-[60%]',65:'left-[65%]',70:'left-[70%]',75:'left-[75%]',80:'left-[80%]',85:'left-[85%]',90:'left-[90%]',95:'left-[95%]',100:'left-[100%]' };
  return map[closest] ?? 'left-[50%]';
}

function getWidthPct(weight: number): string {
  const pct = Math.round(Math.min(1, weight) * 100);
  const steps = [0,5,10,15,20,25,30,35,40,45,50,55,60,65,70,75,80,85,90,95,100];
  const closest = steps.reduce((p, c) => Math.abs(c - pct) < Math.abs(p - pct) ? c : p);
  const map: Record<number,string> = {0:'w-0',5:'w-[5%]',10:'w-[10%]',15:'w-[15%]',20:'w-[20%]',25:'w-[25%]',30:'w-[30%]',35:'w-[35%]',40:'w-[40%]',45:'w-[45%]',50:'w-[50%]',55:'w-[55%]',60:'w-[60%]',65:'w-[65%]',70:'w-[70%]',75:'w-[75%]',80:'w-[80%]',85:'w-[85%]',90:'w-[90%]',95:'w-[95%]',100:'w-full'};
  return map[closest] ?? 'w-[50%]';
}

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<Record<string, unknown> | null>(null);
  const [cleanName, setCleanName] = useState('');
  const [riskScore, setRiskScore] = useState(0);
  const [riskTier, setRiskTier] = useState('');
  const [featureImportances, setFeatureImportances] = useState<Record<string, number> | null>(null);
  const [vitals, setVitals] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push('/login'); return; }
      setUser(user as unknown as Record<string, unknown>);

      const [profileRes, assessmentRes, recommendation] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
        supabase.from('assessment_sessions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
        getLatestRecommendation(user.id),
      ]);

      if (profileRes.data?.full_name) {
        const raw = profileRes.data.full_name as string;
        setCleanName(raw.includes(' || ') ? raw.split(' || ')[0].trim() : raw.trim());
      }

      if (assessmentRes.data) {
        setVitals({
          age: assessmentRes.data.age,
          bmi: assessmentRes.data.bmi,
          hba1c: assessmentRes.data.hba1c,
          bp_systolic: assessmentRes.data.bp_systolic,
          has_diabetes: assessmentRes.data.has_diabetes,
          has_hypertension: assessmentRes.data.has_hypertension,
          smoker: assessmentRes.data.smoker,
          chronic_count: assessmentRes.data.chronic_count,
          monthly_budget: assessmentRes.data.monthly_budget,
        });
      }

      if (recommendation) {
        setRiskScore(Math.round((recommendation.risk_score ?? 0) * 100));
        setRiskTier(recommendation.risk_tier ?? '');
        const fi = recommendation.top_plan_ids?.[0]?.feature_importance_explanation;
        if (fi) setFeatureImportances(fi);
      }
    });
  }, [router]);

  const friendlyTier = useMemo(() => {
    if (!riskTier) return '';
    const t = riskTier.toUpperCase();
    if (t === 'LOW') return 'Low Risk';
    if (t === 'MEDIUM') return 'Moderate Risk';
    if (t === 'HIGH') return 'High Risk';
    if (t === 'CRITICAL') return 'Critical Risk';
    return riskTier;
  }, [riskTier]);

  const tierColor = useMemo(() => {
    const t = riskTier.toUpperCase();
    if (t === 'LOW') return 'text-emerald-400';
    if (t === 'MEDIUM') return 'text-amber-400';
    if (t === 'HIGH') return 'text-orange-400';
    if (t === 'CRITICAL') return 'text-red-400';
    return 'text-neutral-300';
  }, [riskTier]);

  return (
    <div className="min-h-screen bg-white lg:flex">
      <Sidebar />
      <main className="flex-1 px-4 sm:px-8 py-8 lg:px-12 pb-24">
        <div className="mx-auto max-w-[1100px]">
          <header className="mb-10 border-b border-neutral-200 pb-8">
            <SectionEyebrow>Profile &amp; Account</SectionEyebrow>
            <h1 className="mt-2 font-[var(--font-heading)] text-3xl font-black uppercase tracking-tight text-black md:text-4xl leading-none">
              {cleanName ? `${cleanName}'s Profile.` : 'My Profile.'}
            </h1>
          </header>

          <section className="grid gap-10 lg:grid-cols-[1.5fr_1fr]">
            <div className="space-y-8">
              <div>
                <span className="font-mono text-[10px] uppercase tracking-widest text-neutral-400 block mb-4">My Details</span>
                <div className="border border-neutral-200 p-6 bg-white rounded-xl space-y-4">
                  <div className="flex flex-col md:flex-row md:justify-between border-b border-neutral-100 pb-3 gap-2">
                    <span className="font-mono text-xs text-neutral-400 uppercase tracking-wider">Full Name</span>
                    <span className="font-mono text-xs font-bold text-black uppercase">{cleanName || '—'}</span>
                  </div>
                  <div className="flex flex-col md:flex-row md:justify-between border-b border-neutral-100 pb-3 gap-2">
                    <span className="font-mono text-xs text-neutral-400 uppercase tracking-wider">Email Address</span>
                    <span className="font-mono text-xs font-bold text-black">{String(user?.email ?? '—')}</span>
                  </div>
                  <div className="flex flex-col md:flex-row md:justify-between gap-2">
                    <span className="font-mono text-xs text-neutral-400 uppercase tracking-wider">Account ID</span>
                    <span className="font-mono text-[10px] font-bold text-neutral-500 break-all">{String(user?.id ?? '—')}</span>
                  </div>
                </div>
              </div>

              {vitals && (
                <div>
                  <span className="font-mono text-[10px] uppercase tracking-widest text-neutral-400 block mb-4">Latest Health Vitals</span>
                  <div className="border border-neutral-200 p-6 bg-neutral-50 rounded-xl">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 font-mono text-xs">
                      {[
                        { label: 'Age', val: vitals.age ? `${vitals.age} yr` : '—' },
                        { label: 'BMI', val: vitals.bmi ? `${(vitals.bmi as number).toFixed(1)} kg/m²` : '—' },
                        { label: 'HbA1c', val: vitals.hba1c ? `${vitals.hba1c}%` : '—' },
                        { label: 'BP Systolic', val: vitals.bp_systolic ? `${vitals.bp_systolic} mmHg` : '—' },
                        { label: 'Diabetes', val: vitals.has_diabetes ? 'Yes ⚠' : 'No ✓' },
                        { label: 'Hypertension', val: vitals.has_hypertension ? 'Yes ⚠' : 'No ✓' },
                        { label: 'Smoker', val: vitals.smoker ? 'Yes ⚠' : 'No ✓' },
                        { label: 'Other Conditions', val: vitals.chronic_count != null ? `${vitals.chronic_count}` : '—' },
                        { label: 'Monthly Budget', val: vitals.monthly_budget ? `₹${Number(vitals.monthly_budget).toLocaleString('en-IN')}` : '—' },
                      ].map(({ label, val }) => (
                        <div key={label} className="border border-neutral-200 bg-white p-3 rounded-lg space-y-1">
                          <span className="text-[9px] uppercase tracking-widest text-neutral-400 block">{label}</span>
                          <span className="text-sm font-bold text-black">{String(val)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div>
                <span className="font-mono text-[10px] uppercase tracking-widest text-neutral-400 block mb-4">Session Security</span>
                <div className="border border-neutral-200 p-6 bg-neutral-50 rounded-xl space-y-4">
                  <p className="font-mono text-[11px] leading-5 text-neutral-500">
                    Your session is kept secure. All tokens are encrypted in your browser. Click below to clear all session data.
                  </p>
                  <button
                    onClick={async () => { await supabase.auth.signOut(); router.push('/'); }}
                    className="w-full h-11 border border-black font-mono text-xs uppercase tracking-wider text-black hover:bg-neutral-50 transition-colors rounded-xl"
                  >
                    Log Out Safely
                  </button>
                </div>
              </div>
            </div>

            <aside className="space-y-6">
              {riskTier ? (
                <div className="bg-black text-white p-6 space-y-6 rounded-xl sticky top-8">
                  <div className="space-y-1">
                    <span className="font-mono text-[9px] uppercase tracking-widest text-neutral-400 block">Metabolic Risk Profile</span>
                    <h2 className={`font-[var(--font-heading)] text-2xl font-black uppercase tracking-tight leading-none ${tierColor}`}>
                      {friendlyTier}
                    </h2>
                    <p className="font-mono text-[10px] text-neutral-400">Composite Score: {(riskScore / 100).toFixed(3)} / 1.0</p>
                  </div>

                  <div className="space-y-2">
                    <div className="relative h-4 bg-neutral-800 flex rounded-xl overflow-hidden">
                      <div className="h-full bg-emerald-900 w-1/4" />
                      <div className="h-full bg-amber-900 w-1/4" />
                      <div className="h-full bg-orange-900 w-1/4" />
                      <div className="h-full bg-red-900 w-1/4" />
                      <div className={`absolute top-0 bottom-0 w-[3px] bg-white transition-all duration-700 ease-out ${getLeftPct(riskScore)}`} />
                    </div>
                    <div className="flex justify-between font-mono text-[8px] uppercase text-neutral-500">
                      <span>Low</span><span>Moderate</span><span>High</span><span>Critical</span>
                    </div>
                  </div>

                  {featureImportances && Object.keys(featureImportances).length > 0 && (
                    <div className="border-t border-neutral-800 pt-4 space-y-3">
                      <span className="font-mono text-[9px] uppercase tracking-widest text-neutral-400 block">XGBoost Feature Attribution</span>
                      <div className="space-y-3">
                        {Object.entries(featureImportances).map(([feat, w]) => (
                          <div key={feat} className="space-y-1 font-mono text-[9px]">
                            <div className="flex justify-between text-neutral-300">
                              <span className="uppercase tracking-tight">{feat}</span>
                              <span>{Math.round(w * 100)}%</span>
                            </div>
                            <div className="h-1 bg-neutral-800 w-full rounded-md">
                              <div className={`h-full bg-white rounded-md transition-all duration-500 ${getWidthPct(w)}`} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => router.push('/assessment')}
                    className="w-full h-11 bg-white text-black hover:bg-neutral-100 font-mono text-xs uppercase tracking-widest font-bold rounded-xl transition-all"
                  >
                    Update Health Profile
                  </button>
                </div>
              ) : (
                <div className="border border-neutral-200 p-6 bg-neutral-50 rounded-xl space-y-4">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-neutral-400 block">Health Risk Profile</span>
                  <p className="font-mono text-xs text-neutral-500 leading-relaxed">
                    No risk assessment found. Complete the clinical onboarding to unlock your metabolic risk tier and plan matching.
                  </p>
                  <button
                    onClick={() => router.push('/assessment')}
                    className="w-full h-11 bg-black text-white hover:bg-neutral-900 font-mono text-xs uppercase tracking-widest font-bold rounded-xl transition-all"
                  >
                    Begin Assessment
                  </button>
                </div>
              )}
            </aside>
          </section>
        </div>
      </main>
    </div>
  );
}
