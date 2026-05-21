'use client';

import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../../components/Sidebar';
import { DashboardAgentChat } from '../../components/DashboardAgentChat';
import type { ConditionDetail, FeatureImportance } from '../../components/RiskProfileCard';
import type { Plan } from '../../components/StressTestModal';
import { assessHealthProfile, fetchAllPlans, rankAllPlans } from '../../lib/api';
import {
  getPlanCosineSimilarity,
  mergeRecommendationScores,
  mergeScoredPlans,
  rankPlansBySimilarity,
} from '../../lib/planCompare';
import { supabase, getLatestRecommendation } from '../../lib/supabase';

function collectMedicalHistory(meta: Record<string, unknown> | null): string[] {
  if (!meta) return [];
  const memberMH = (meta.member_medical_history ?? {}) as Record<string, string[]>;
  const terms = new Set<string>();
  Object.values(memberMH).forEach((arr) =>
    (arr ?? []).forEach((c) => {
      if (c && c !== 'None of these') terms.add(c);
    })
  );
  return Array.from(terms);
}

function DashboardContent() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [profileMeta, setProfileMeta] = useState<Record<string, unknown> | null>(null);
  const [vitals, setVitals] = useState<Record<string, unknown> | null>(null);
  const [riskTier, setRiskTier] = useState('');
  const [riskScore, setRiskScore] = useState(0);
  const [conditionDetail, setConditionDetail] = useState<ConditionDetail | null>(null);
  const [featureImportance, setFeatureImportance] = useState<FeatureImportance | null>(null);
  const [rankedPlans, setRankedPlans] = useState<Plan[]>([]);

  useEffect(() => {
    async function load(user: { id: string }) {
      try {
        const [profileRes, assessmentRes, allPlans, rec] = await Promise.all([
          supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
          supabase
            .from('assessment_sessions')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
          fetchAllPlans(),
          getLatestRecommendation(user.id),
        ]);

        let meta: Record<string, unknown> | null = null;
        if (profileRes.data) {
          const raw = (profileRes.data.full_name ?? '') as string;
          let cleanName = raw;
          if (raw.includes(' || ')) {
            const parts = raw.split(' || ');
            cleanName = parts[0];
            try {
              meta = JSON.parse(parts[1]);
            } catch {
              meta = null;
            }
          }
          setName(cleanName.split(' ')[0] ?? '');
          if (meta) setProfileMeta(meta);
        }

        if (assessmentRes.data?.age && assessmentRes.data?.bmi && assessmentRes.data?.hba1c) {
          const d = assessmentRes.data;
          setVitals({
            age: d.age,
            bmi: d.bmi,
            smoker: d.smoker ?? 0,
            hba1c: d.hba1c,
            bp_systolic: d.bp_systolic ?? 120,
            has_diabetes: d.has_diabetes,
            has_hypertension: d.has_hypertension,
            chronic_count: d.chronic_count ?? 0,
            monthly_budget: d.monthly_budget ?? 3000,
            income_lakh: d.income_lakh ?? 8.0,
          });
        }

        if (rec) {
          setRiskTier((rec.risk_tier as string) ?? '');
          setRiskScore((rec.risk_score as number) ?? 0);
          const firstPlan = rec.top_plan_ids?.[0] as Record<string, unknown> | undefined;
          if (firstPlan?.condition_detail) {
            setConditionDetail(firstPlan.condition_detail as ConditionDetail);
          }
          if (firstPlan?.feature_importance_explanation) {
            setFeatureImportance(firstPlan.feature_importance_explanation as FeatureImportance);
          }
        }

        let merged = mergeRecommendationScores(allPlans as Plan[], rec);
        const topHasScores = merged.filter((p) => getPlanCosineSimilarity(p) > 0).length >= 10;
        const vitalsForAssess = assessmentRes.data;
        const profilePayload = vitalsForAssess?.age && vitalsForAssess?.bmi && vitalsForAssess?.hba1c
          ? {
              age: vitalsForAssess.age,
              bmi: vitalsForAssess.bmi,
              smoker: vitalsForAssess.smoker ? 1 : 0,
              hba1c: vitalsForAssess.hba1c,
              bp_systolic: vitalsForAssess.bp_systolic ?? 120,
              diabetes: vitalsForAssess.has_diabetes ? 1 : 0,
              hypertension: vitalsForAssess.has_hypertension ? 1 : 0,
              chronic_count: vitalsForAssess.chronic_count ?? 0,
              monthly_budget: vitalsForAssess.monthly_budget ?? 3000,
              income_lakh: vitalsForAssess.income_lakh ?? 8,
              medical_history: collectMedicalHistory(meta),
            }
          : null;

        if (!topHasScores && profilePayload) {
          try {
            const ranked = await rankAllPlans(profilePayload);
            if (ranked.scored_plans?.length) {
              merged = mergeScoredPlans(allPlans as Plan[], ranked.scored_plans as Plan[]);
              if (ranked.risk_assessment) {
                setRiskTier(ranked.risk_assessment.risk_tier ?? '');
                setRiskScore(ranked.risk_assessment.risk_score ?? 0);
                if (ranked.risk_assessment.condition_detail) {
                  setConditionDetail(ranked.risk_assessment.condition_detail as ConditionDetail);
                }
              }
            }
          } catch {
            try {
              const fresh = await assessHealthProfile(profilePayload);
              if (fresh.recommended_plans?.length) {
                const recShape = {
                  top_plan_ids: (fresh.recommended_plans as Plan[]).map((p) => ({
                    id: p.id,
                    score: p.suitability_score,
                    cosine_similarity:
                      p.cosine_similarity ??
                      (p.suitability_breakdown as { cosine_similarity?: number })?.cosine_similarity,
                    plain_english_explanation: p.plain_english_explanation,
                    warning_flags: p.warning_flags,
                    suitability_breakdown: p.suitability_breakdown,
                  })),
                };
                merged = mergeRecommendationScores(allPlans as Plan[], recShape);
                if (fresh.risk_assessment) {
                  setRiskTier(fresh.risk_assessment.risk_tier ?? '');
                  setRiskScore(fresh.risk_assessment.risk_score ?? 0);
                  if (fresh.risk_assessment.condition_detail) {
                    setConditionDetail(fresh.risk_assessment.condition_detail as ConditionDetail);
                  }
                  if (fresh.risk_assessment.feature_importance_explanation) {
                    setFeatureImportance(
                      fresh.risk_assessment.feature_importance_explanation as FeatureImportance
                    );
                  }
                }
              }
            } catch {
              /* keep merged from Supabase */
            }
          }
        }
        setRankedPlans(rankPlansBySimilarity(merged));
      } catch {
        setVitals(null);
        setRankedPlans([]);
      } finally {
        setLoading(false);
      }
    }

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push('/login');
        return;
      }
      load(user as unknown as { id: string });
    });
  }, [router]);

  const activeVitals = useMemo(() => {
    if (!vitals) return null;
    if (!profileMeta) return vitals;
    const memberMH = (profileMeta.member_medical_history ?? {}) as Record<string, string[]>;
    const conditions = new Set<string>();
    Object.values(memberMH).forEach((arr) =>
      (arr ?? []).forEach((c) => {
        if (c !== 'None of these') conditions.add(c);
      })
    );
    const memberV = (profileMeta.member_vitals ?? {}) as Record<string, Record<string, string>>;
    let maxHba1c = 5.4;
    let maxBP = 120;
    let maxBMI = 22;
    Object.values(memberV).forEach((v) => {
      const hba1c = parseFloat(v.hba1c ?? '5.4');
      if (!isNaN(hba1c)) maxHba1c = Math.max(maxHba1c, hba1c);
      const bp = parseInt(v.bp ?? '120', 10);
      if (!isNaN(bp)) maxBP = Math.max(maxBP, bp);
      const h = parseFloat(v.height ?? '170');
      const w = parseFloat(v.weight ?? '70');
      if (h > 0 && w > 0) maxBMI = Math.max(maxBMI, w / (h / 100) ** 2);
    });
    return {
      ...vitals,
      bmi: parseFloat(maxBMI.toFixed(1)),
      hba1c: maxHba1c,
      bp_systolic: maxBP,
      has_diabetes: conditions.has('Diabetes'),
      has_hypertension: conditions.has('Blood Pressure'),
      chronic_count: Array.from(conditions).filter(
        (c) => !['Diabetes', 'Blood Pressure'].includes(c)
      ).length,
    };
  }, [vitals, profileMeta]);

  const medicalHistory = useMemo(() => collectMedicalHistory(profileMeta), [profileMeta]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f4f6f8] flex items-center justify-center">
        <div className="text-center space-y-3">
          <span className="h-8 w-8 border-2 border-emerald-500 border-t-transparent animate-spin rounded-full inline-block" />
          <p className="text-xs text-neutral-400 uppercase tracking-widest font-medium">
            Loading your advisor…
          </p>
        </div>
      </div>
    );
  }

  if (!activeVitals) {
    return (
      <div className="min-h-screen bg-[#f4f6f8] lg:flex">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center p-8">
          <div className="max-w-md w-full bg-white rounded-2xl border border-neutral-200 p-10 space-y-6 shadow-sm text-center">
            <h2 className="text-xl font-bold text-neutral-800">No Health Profile Found</h2>
            <p className="text-sm text-neutral-500 leading-relaxed">
              Complete the clinical assessment to unlock your AI plan advisor.
            </p>
            <button
              onClick={() => router.push('/assessment')}
              className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl cursor-pointer"
            >
              Begin Assessment →
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f6f8] lg:flex">
      <Sidebar />
      <main className="flex-1 flex flex-col min-h-screen lg:min-h-0 lg:h-screen overflow-hidden">
        <DashboardAgentChat
          name={name}
          vitals={activeVitals}
          profileMeta={profileMeta}
          rankedPlans={rankedPlans}
          riskTier={riskTier}
          riskScore={riskScore}
          conditionDetail={conditionDetail}
          featureImportance={featureImportance}
          medicalHistory={medicalHistory}
        />
      </main>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f4f6f8] flex items-center justify-center">
          <span className="h-8 w-8 border-2 border-emerald-500 border-t-transparent animate-spin rounded-full" />
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
