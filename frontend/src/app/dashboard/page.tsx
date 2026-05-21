'use client';

import React, { Suspense, useEffect, useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Sidebar from '../../components/Sidebar';
import { AnnotationBox, SectionEyebrow } from '../../components/editorial';
import { fetchAllPlans, generateOnDeviceReasoning, callAgent } from '../../lib/api';
import { supabase, getLatestRecommendation } from '../../lib/supabase';
import { useCompare } from '../../lib/compare';
import StressTestModal, { Plan } from '../../components/StressTestModal';
import CompareDrawer from '../../components/CompareDrawer';
import { Sparkles, Send, Bot } from 'lucide-react';

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [name, setName] = useState('Member');
  const [plans, setPlans] = useState<Plan[]>([]);
  
  // Profile meta
  const [profileMeta, setProfileMeta] = useState<any>(null);
  const [groups, setGroups] = useState<Array<{ id: string, name: string, members: string[] }>>([
    { id: 'group_1', name: 'Group 1', members: ['Self'] }
  ]);
  const [activeGroupId, setActiveGroupId] = useState('group_1');

  // Base vitals (fallback)
  const [vitals, setVitals] = useState<Record<string, any>>({
    age: 35,
    bmi: 26.5,
    smoker: 0,
    hba1c: 6.2,
    bp_systolic: 120,
    has_diabetes: false,
    has_hypertension: false,
    chronic_count: 0,
    monthly_budget: 3000,
    income_lakh: 8.0,
  });
  const [score, setScore] = useState(parseInt(searchParams.get('score') || '63', 10));
  const [tier, setTier] = useState(searchParams.get('tier') || 'MEDIUM');
  const [featureImportances, setFeatureImportances] = useState<Record<string, number> | null>(null);

  const [selectedPlanForStress, setSelectedPlanForStress] = useState<Plan | null>(null);
  const [stressTestInitialScenario, setStressTestInitialScenario] = useState<{ id: string; name?: string; cost?: number; days?: number; isChronic?: boolean; } | undefined>();
  const [isCompareDrawerOpen, setIsCompareDrawerOpen] = useState(false);

  const { compareIds, toggleCompare, clearCompare, isInCompare } = useCompare();

  // Filters
  const [filterCover, setFilterCover] = useState('All');
  const [filterSort, setFilterSort] = useState('Suitability');
  const [filterCashless, setFilterCashless] = useState('All');
  const [filterRoomRent, setFilterRoomRent] = useState('All');

  // AI Agent Bar States
  const [agentInput, setAgentInput] = useState('');
  const [agentResponse, setAgentResponse] = useState<string | null>(null);
  const [agentToolUsed, setAgentToolUsed] = useState<string | null>(null);
  const [agentChatHistory, setAgentChatHistory] = useState<{ role: string; content: string }[]>([]);
  const [isAgentLoading, setIsAgentLoading] = useState(false);

  useEffect(() => {
    function loadUserData(user: any) {
      supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (!data) return;
          const rawName = data.full_name || '';
          let cleanName = rawName;
          let meta: any = null;
          if (rawName.includes(' || ')) {
            const parts = rawName.split(' || ');
            cleanName = parts[0];
            try {
              meta = JSON.parse(parts[1]);
            } catch (e) {
              console.error(e);
            }
          }
          setName(cleanName.split(' ')[0] || 'Member');
          if (meta) {
            setProfileMeta(meta);
            if (meta.groups && meta.groups.length > 0) {
              setGroups(meta.groups);
              setActiveGroupId(meta.groups[0].id);
            } else {
              const defaultGroups = [{ id: 'group_1', name: 'Group 1', members: meta.covered_members || ['Self'] }];
              setGroups(defaultGroups);
              setActiveGroupId('group_1');
            }
          }
        });

      supabase
        .from('assessment_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
        .then(({ data }) => {
          if (data) {
            setVitals({
              age: data.age || 35,
              bmi: data.bmi || 26.5,
              smoker: data.smoker || 0,
              hba1c: data.hba1c || 6.2,
              bp_systolic: data.bp_systolic || 120,
              has_diabetes: data.has_diabetes,
              has_hypertension: data.has_hypertension,
              chronic_count: data.chronic_count || 0,
              monthly_budget: data.monthly_budget || 3000,
              income_lakh: data.income_lakh || 8.0,
            });
          }
        });

      Promise.all([
        fetchAllPlans(),
        getLatestRecommendation(user.id)
      ])
        .then(([allPlans, recommendation]) => {
          if (recommendation && recommendation.top_plan_ids && recommendation.top_plan_ids.length > 0) {
            setScore(Math.round(recommendation.risk_score * 100));
            setTier(recommendation.risk_tier);

            if (recommendation.top_plan_ids[0]?.feature_importance_explanation) {
              setFeatureImportances(recommendation.top_plan_ids[0].feature_importance_explanation);
            }

            const recommended = recommendation.top_plan_ids.map((recPlan: any) => {
              const matchedPlan = allPlans.find((p: any) => p.id === recPlan.id);
              if (matchedPlan) {
                return {
                  ...matchedPlan,
                  suitability_score: recPlan.score,
                  cosine_similarity: recPlan.cosine_similarity,
                  plain_english_explanation: recPlan.plain_english_explanation,
                  warning_flags: recPlan.warning_flags || matchedPlan.warning_flags || []
                };
              }
              return null;
            }).filter(Boolean) as Plan[];

            setPlans(recommended);
          } else {
            setPlans(allPlans.slice(0, 3));
          }
        })
        .catch(() => {});
    }

    if (typeof window !== 'undefined' && window.location.hash.includes('access_token')) {
      const timer = setTimeout(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
          if (!user) {
            router.push('/login');
          } else {
            loadUserData(user);
          }
        });
      }, 1200);
      return () => clearTimeout(timer);
    }

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push('/login');
        return;
      }
      loadUserData(user);
    });
  }, [router]);

  const comparedPlansList = useMemo(() => {
    return plans.filter((p) => compareIds.includes(p.id));
  }, [plans, compareIds]);

  const friendlyTierName = useMemo(() => {
    const t = (tier || 'MEDIUM').toUpperCase();
    if (t === 'LOW') return 'Low Risk';
    if (t === 'MEDIUM') return 'Moderate Risk';
    if (t === 'HIGH') return 'High Risk';
    if (t === 'CRITICAL') return 'Critical Risk';
    return tier;
  }, [tier]);

  // Active Group Vitals Recalculator
  const activeGroupVitals = useMemo(() => {
    if (!profileMeta || !activeGroupId || !groups) {
      return vitals;
    }
    const currentGroup = groups.find(g => g.id === activeGroupId);
    if (!currentGroup) return vitals;

    const members = currentGroup.members || [];
    if (members.length === 0) return vitals;

    let maxAge = 18;
    const memberAgesMeta = profileMeta.member_ages || {};
    members.forEach(m => {
      const ageStr = memberAgesMeta[m] || '24 yr';
      const ageNum = parseInt(ageStr, 10);
      if (!isNaN(ageNum) && ageNum > maxAge) {
        maxAge = ageNum;
      }
    });

    const conditions = new Set<string>();
    const memberMH = profileMeta.member_medical_history || {};
    members.forEach(m => {
      const list = memberMH[m] || [];
      list.forEach((cond: string) => {
        if (cond !== 'None of these') {
          conditions.add(cond);
        }
      });
    });

    let totalHbA1c = 0;
    let validHbA1cCount = 0;
    const memberV = profileMeta.member_vitals || {};
    members.forEach(m => {
      const v = memberV[m] || { hba1c: '5.4' };
      const val = parseFloat(v.hba1c);
      if (!isNaN(val)) {
        totalHbA1c = Math.max(totalHbA1c, val);
        validHbA1cCount++;
      }
    });
    const finalHbA1c = validHbA1cCount > 0 ? totalHbA1c : 5.4;

    let maxBP = 120;
    members.forEach(m => {
      const v = memberV[m] || { bp: '120' };
      const val = parseInt(v.bp, 10);
      if (!isNaN(val)) {
        maxBP = Math.max(maxBP, val);
      }
    });

    let maxBMI = 23.0;
    members.forEach(m => {
      const v = memberV[m] || { height: '170', weight: '70' };
      const h = parseFloat(v.height);
      const w = parseFloat(v.weight);
      if (h > 0 && w > 0) {
        const bmi = w / ((h / 100) * (h / 100));
        maxBMI = Math.max(maxBMI, bmi);
      }
    });

    return {
      age: maxAge,
      bmi: parseFloat(maxBMI.toFixed(1)),
      smoker: vitals.smoker,
      hba1c: finalHbA1c,
      bp_systolic: maxBP,
      has_diabetes: conditions.has('Diabetes'),
      has_hypertension: conditions.has('Blood Pressure'),
      chronic_count: Array.from(conditions).filter(c => !['Diabetes', 'Blood Pressure'].includes(c)).length,
      monthly_budget: vitals.monthly_budget,
      income_lakh: vitals.income_lakh,
    };
  }, [profileMeta, activeGroupId, groups, vitals]);

  // Recalculate suitability matches on the client-side based on active group parameters
  const processedPlans: Plan[] = useMemo(() => {
    return plans.map(plan => {
      let scoreBoost = 0;
      
      const activeGroupObj = groups.find(g => g.id === activeGroupId);
      const isMultiMember = (activeGroupObj?.members || []).length > 1;
      
      if (isMultiMember) {
        if (plan.type?.toLowerCase().includes('floater')) {
          scoreBoost += 1.5;
        } else {
          scoreBoost -= 2.0;
        }
      }

      if (activeGroupVitals.has_diabetes) {
        if (plan.diabetes_day1) {
          scoreBoost += 2.0;
        } else {
          scoreBoost -= (plan.pre_existing_wait_years || 4) * 0.6;
        }
      }
      if (activeGroupVitals.has_hypertension) {
        if (plan.hypertension_day1) {
          scoreBoost += 2.0;
        } else {
          scoreBoost -= (plan.pre_existing_wait_years || 4) * 0.6;
        }
      }

      const annualBudget = activeGroupVitals.monthly_budget * 12;
      if (plan.annual_premium > annualBudget) {
        const excessRatio = (plan.annual_premium - annualBudget) / annualBudget;
        scoreBoost -= Math.min(2.5, excessRatio * 1.5);
      } else {
        scoreBoost += 0.8;
      }

      const rawBase = plan.suitability_score || 7.5;
      const finalSuitability = Math.max(1.0, Math.min(10.0, rawBase + scoreBoost));

      return {
        ...plan,
        suitability_score: finalSuitability
      };
    }).sort((a, b) => b.suitability_score - a.suitability_score);
  }, [plans, activeGroupVitals, activeGroupId, groups]);

  // Filter and sort matching plans
  const filteredAndSortedPlans: Plan[] = useMemo(() => {
    let list = [...processedPlans];

    if (filterCover !== 'All') {
      if (filterCover === '5L') {
        list = list.filter(p => p.coverage <= 500000);
      } else if (filterCover === '10L') {
        list = list.filter(p => p.coverage > 500000 && p.coverage <= 1000000);
      } else if (filterCover === '20L') {
        list = list.filter(p => p.coverage > 1000000);
      }
    }

    if (filterCashless === 'Cashless') {
      list = list.filter(p => (p.cashless_hospitals_count || 0) > 0 || (p.cashless_hospitals || []).length > 0);
    }

    if (filterRoomRent === 'NoLimit') {
      list = list.filter(p => !p.room_rent_limit || p.room_rent_limit.toLowerCase().includes('no limit'));
    }

    if (filterSort === 'PremiumLowHigh') {
      list.sort((a, b) => a.annual_premium - b.annual_premium);
    } else if (filterSort === 'PremiumHighLow') {
      list.sort((a, b) => b.annual_premium - a.annual_premium);
    } else {
      list.sort((a, b) => b.suitability_score - a.suitability_score);
    }

    return list;
  }, [processedPlans, filterCover, filterCashless, filterRoomRent, filterSort]);

  const computedFeatureImportances = useMemo(() => {
    if (featureImportances) return featureImportances;
    
    const importances: Record<string, number> = {};
    let total = 0;
    
    if (activeGroupVitals.hba1c) {
      const weight = activeGroupVitals.hba1c >= 6.5 ? 0.35 : activeGroupVitals.hba1c >= 5.7 ? 0.20 : 0.05;
      importances["HbA1c (Sugar)"] = weight;
      total += weight;
    }
    if (activeGroupVitals.bmi) {
      const weight = activeGroupVitals.bmi >= 30 ? 0.25 : activeGroupVitals.bmi >= 25 ? 0.15 : 0.05;
      importances["Body Mass Index"] = weight;
      total += weight;
    }
    if (activeGroupVitals.has_diabetes) {
      const weight = 0.20;
      importances["Diabetes Diagnosis"] = weight;
      total += weight;
    }
    if (activeGroupVitals.has_hypertension) {
      const weight = 0.15;
      importances["Hypertension"] = weight;
      total += weight;
    }
    
    const ageWeight = 0.15;
    importances["Age Group"] = ageWeight;
    total += ageWeight;
    
    const normalized: Record<string, number> = {};
    for (const [key, val] of Object.entries(importances)) {
      normalized[key] = val / total;
    }
    return normalized;
  }, [featureImportances, activeGroupVitals]);

  const dynamicDescription = useMemo(() => {
    const t = (tier || 'MEDIUM').toUpperCase();
    const conditionParts = [];
    if (activeGroupVitals.has_diabetes || (activeGroupVitals.hba1c && activeGroupVitals.hba1c >= 6.5)) conditionParts.push("elevated HbA1c/diabetes indicator");
    if (activeGroupVitals.has_hypertension) conditionParts.push("hypertension risk factors");
    if (activeGroupVitals.bmi && activeGroupVitals.bmi >= 25) conditionParts.push("elevated BMI readings");

    const conditionText = conditionParts.length > 0 
      ? ` driven by your ${conditionParts.join(" and ")}`
      : "";

    if (t === 'LOW') {
      return `Your health profile indicates a low metabolic risk tier${conditionText}. Your recommended policies prioritize highly cost-effective, basic/standard plans with comprehensive wellness incentives and low premiums.`;
    }
    if (t === 'MEDIUM') {
      return `Your health profile indicates a moderate metabolic risk tier${conditionText}. Your top recommended plans focus on immediate or shorter wait periods for chronic conditions with highly competitive room rent limits.`;
    }
    if (t === 'HIGH') {
      return `Your health profile indicates a high metabolic risk tier${conditionText}. We recommend comprehensive coverage with Day 1 chronic condition protection and zero co-payments to avoid high out-of-pocket costs.`;
    }
    if (t === 'CRITICAL') {
      return `Your health profile indicates a critical metabolic risk tier${conditionText}. We strongly recommend specialist plans that guarantee Day 1 covers for pre-existing diabetic/hypertension complications, and higher hospital network counts.`;
    }
    return `Your details indicate moderate metabolic readings. Your top recommended plans focus on immediate pre-existing coverage with little to no waiting period.`;
  }, [tier, activeGroupVitals]);

  async function handleAgentSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!agentInput.trim() || isAgentLoading) return;

    const currentInput = agentInput;
    setAgentInput('');
    setIsAgentLoading(true);
    setAgentResponse(null);

    const updatedHistory = [...agentChatHistory, { role: 'user', content: currentInput }];
    setAgentChatHistory(updatedHistory);

    try {
      const sessionPayload = {
        profile: {
          age: activeGroupVitals.age || 35,
          bmi: activeGroupVitals.bmi || 26.5,
          smoker: activeGroupVitals.smoker || 0,
          hba1c: activeGroupVitals.hba1c || 6.2,
          bp_systolic: activeGroupVitals.bp_systolic || 120,
          diabetes: activeGroupVitals.has_diabetes ? 1 : 0,
          hypertension: activeGroupVitals.has_hypertension ? 1 : 0,
          chronic_count: activeGroupVitals.chronic_count || 0,
          monthly_budget: activeGroupVitals.monthly_budget || 3000,
          income_lakh: activeGroupVitals.income_lakh || 8.0,
        },
        risk_data: {
          risk_tier: tier,
          risk_score: score / 100,
          confidence_pct: score,
          feature_importance_explanation: featureImportances,
        },
        current_plans: plans.map((p) => ({
          id: p.id,
          name: p.name,
          insurer: p.insurer,
          annual_premium: p.annual_premium,
          coverage: p.coverage,
          type: p.type,
          pre_existing_wait_years: p.pre_existing_wait_years,
          diabetes_day1: p.diabetes_day1,
          hypertension_day1: p.hypertension_day1,
          copayment_pct: p.copayment_pct,
          room_rent_limit: p.room_rent_limit,
          suitability_score: p.suitability_score,
          warning_flags: p.warning_flags,
        })),
      };

      const res = await callAgent(updatedHistory, sessionPayload);
      
      setAgentChatHistory([...updatedHistory, { role: 'assistant', content: res.response }]);
      setAgentResponse(res.response);
      setAgentToolUsed(res.tool_used);

      if (res.updated_session) {
        const { profile, risk_data, current_plans } = res.updated_session;
        
        if (profile) {
          setVitals({
            age: profile.age,
            bmi: profile.bmi,
            smoker: profile.smoker,
            hba1c: profile.hba1c,
            bp_systolic: profile.bp_systolic,
            has_diabetes: !!(profile.diabetes || profile.has_diabetes),
            has_hypertension: !!(profile.hypertension || profile.has_hypertension),
            chronic_count: profile.chronic_count,
            monthly_budget: profile.monthly_budget,
            income_lakh: profile.income_lakh,
          });
        }
        
        if (risk_data) {
          setScore(risk_data.confidence_pct || Math.round(risk_data.risk_score * 100));
          setTier(risk_data.risk_tier);
          if (risk_data.feature_importance_explanation) {
            setFeatureImportances(risk_data.feature_importance_explanation);
          }
        }
        
        if (current_plans && current_plans.length > 0) {
          setPlans(current_plans);
        }
      }

      if (res.tool_used === 'stress_test' && res.tool_result) {
        const planId = res.tool_result.plan_id;
        const matchedPlan = plans.find(p => p.id === planId) || res.updated_session?.current_plans?.find((p: any) => p.id === planId);
        if (matchedPlan) {
          if (res.tool_result.custom_details) {
            setStressTestInitialScenario({
              id: 'custom',
              name: res.tool_result.scenario_name,
              cost: res.tool_result.custom_details.cost,
              days: res.tool_result.custom_details.days,
              isChronic: res.tool_result.custom_details.isChronic
            });
          }
          setSelectedPlanForStress(matchedPlan);
        }
      }

      if (res.tool_used === 'compare' && res.tool_result?.plans) {
        const planIds = res.tool_result.plans.map((p: any) => p.id);
        planIds.forEach((id: number) => {
          if (!compareIds.includes(id)) {
            toggleCompare(id);
          }
        });
        setIsCompareDrawerOpen(true);
      }

    } catch (err) {
      console.error(err);
      setAgentResponse("I encountered an issue connecting to my local Gemma backend. Please ensure Uvicorn is active on port 8000 and try again.");
    } finally {
      setIsAgentLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-white lg:flex relative">
      <Sidebar />
      <main className="flex-1 px-4 sm:px-8 py-8 lg:px-12 pb-24">
        <div className="mx-auto max-w-[1100px]">
          <header className="mb-8 flex flex-col gap-6 border-b border-neutral-200 pb-6 md:flex-row md:items-end md:justify-between">
            <div>
              <SectionEyebrow>Account Overview</SectionEyebrow>
              <h1 className="mt-2 font-[var(--font-heading)] text-3xl font-black uppercase tracking-tight text-black md:text-4xl">
                Hello, {name}.
              </h1>
            </div>
            <div className="w-full md:max-w-[200px]">
              <button 
                onClick={() => router.push('/assessment')} 
                className="mono-btn-primary"
              >
                Update Health Profile
              </button>
            </div>
          </header>

          {searchParams.get('mode') === 'simulated' && (
            <div className="mb-8 border border-amber-200 bg-amber-50/45 p-4 flex items-start gap-3 animate-fadeIn" style={{ borderRadius: '12px' }}>
              <span className="font-mono text-lg leading-none">⚠️</span>
              <div className="space-y-1">
                <span className="font-mono text-[10px] uppercase font-bold text-amber-800 tracking-wider block">
                  FastAPI connection fallback active
                </span>
                <p className="font-mono text-[11px] text-amber-700 leading-4">
                  The local XGBoost risk assessment and Gemma backend was unreachable. 
                  We loaded simulated suitability matches and metabolic risk projections.
                </p>
              </div>
            </div>
          )}

          <section className="grid gap-12 lg:grid-cols-[1.5fr_1fr]">
            <div className="space-y-6">
              
              {/* Group Tabs Bar */}
              {groups.length > 1 && (
                <div className="space-y-2">
                  <span className="font-mono text-[9px] uppercase tracking-widest text-neutral-400 block font-bold">Policy Groups</span>
                  <div className="flex flex-wrap gap-2 border-b border-neutral-200 pb-3">
                    {groups.map((g) => (
                      <button
                        key={g.id}
                        onClick={() => setActiveGroupId(g.id)}
                        className={`px-4 py-2 font-mono text-xs uppercase tracking-wider transition-all border ${
                          activeGroupId === g.id
                            ? 'bg-black text-white border-black font-bold shadow-sm'
                            : 'bg-neutral-50 text-neutral-400 border-neutral-200 hover:border-black hover:text-black'
                        }`}
                        style={{ borderRadius: '12px' }}
                      >
                        {g.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* PolicyBazaar styled filter headers */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-neutral-50 p-4 border border-neutral-200 font-mono text-[10px] uppercase items-center">
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] text-neutral-400 font-bold">Sort By</span>
                  <select
                    className="bg-white border border-neutral-300 p-1.5 outline-none rounded text-black cursor-pointer"
                    value={filterSort}
                    onChange={(e) => setFilterSort(e.target.value)}
                  >
                    <option value="Suitability">Match Suitability</option>
                    <option value="PremiumLowHigh">Premium: Low to High</option>
                    <option value="PremiumHighLow">Premium: High to Low</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-[9px] text-neutral-400 font-bold">Sum Insured</span>
                  <select
                    className="bg-white border border-neutral-300 p-1.5 outline-none rounded text-black cursor-pointer"
                    value={filterCover}
                    onChange={(e) => setFilterCover(e.target.value)}
                  >
                    <option value="All">All Covers</option>
                    <option value="5L">Up to ₹5 Lakh</option>
                    <option value="10L">₹5 Lakh - ₹10 Lakh</option>
                    <option value="20L">More than ₹10 Lakh</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-[9px] text-neutral-400 font-bold">Cashless Networks</span>
                  <select
                    className="bg-white border border-neutral-300 p-1.5 outline-none rounded text-black cursor-pointer"
                    value={filterCashless}
                    onChange={(e) => setFilterCashless(e.target.value)}
                  >
                    <option value="All">All Networks</option>
                    <option value="Cashless">Only Cashless</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-[9px] text-neutral-400 font-bold">Room Rent Limit</span>
                  <select
                    className="bg-white border border-neutral-300 p-1.5 outline-none rounded text-black cursor-pointer"
                    value={filterRoomRent}
                    onChange={(e) => setFilterRoomRent(e.target.value)}
                  >
                    <option value="All">All Limits</option>
                    <option value="NoLimit">No Limit</option>
                  </select>
                </div>
              </div>

              <div>
                <span className="font-mono text-[10px] uppercase tracking-widest text-neutral-400 block mb-4">Recommended Policy Matches</span>
                
                <div className="space-y-4">
                  {filteredAndSortedPlans.length === 0 ? (
                    <div className="border border-dashed border-neutral-300 p-10 text-center font-mono text-xs uppercase text-neutral-400">
                      No plans match the selected filters.
                    </div>
                  ) : (
                    filteredAndSortedPlans.map((plan, index) => {
                      const selected = isInCompare(plan.id);
                      const reasoning = plan.plain_english_explanation || generateOnDeviceReasoning(plan, activeGroupVitals);
                      
                      return (
                        <div 
                          key={String(plan.id)} 
                          className={`border cursor-pointer p-6 bg-white hover:border-black transition-all flex flex-col gap-4 ${
                            selected ? 'border-black bg-neutral-50/70 border-[3px]' : 'border-neutral-200'
                          }`}
                          style={{ borderRadius: '12px' }}
                        >
                          {/* Top row */}
                          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                            <div className="space-y-1">
                              <div className="flex items-center gap-3">
                                <span className="font-mono text-[9px] bg-neutral-100 px-2 py-0.5" style={{ borderRadius: '12px' }}>
                                  Match 0{index + 1}
                                </span>
                                <span className="font-mono text-[9px] uppercase tracking-wider text-neutral-400 font-bold">
                                  {plan.insurer}
                                </span>
                                {selected && (
                                  <span className="font-mono text-[9px] uppercase font-bold text-white bg-black px-1.5 py-0.5" style={{ borderRadius: '12px' }}>
                                    ✓ Compare Selected
                                  </span>
                                )}
                              </div>
                              <h3 className="font-[var(--font-heading)] text-lg font-bold text-black uppercase tracking-tight">
                                {plan.name}
                              </h3>
                              {plan.warning_flags && plan.warning_flags.length > 0 && (
                                <div className="flex flex-wrap gap-2 pt-1">
                                  {plan.warning_flags.map((flag: string) => (
                                    <span 
                                      key={flag} 
                                      className="font-mono text-[9px] uppercase tracking-wide bg-amber-50 text-amber-700 border border-amber-200/60 px-2 py-0.5 flex items-center gap-1 font-bold"
                                      style={{ borderRadius: '12px' }}
                                    >
                                      ⚠️ {flag}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-6 justify-between md:justify-end">
                              {plan.cosine_similarity !== undefined && (
                                <div className="text-right border-r border-neutral-200 pr-6">
                                  <span className="font-mono text-2xl font-black block text-black">
                                    {Math.round(plan.cosine_similarity * 100)}%
                                  </span>
                                  <span className="font-mono text-[9px] uppercase tracking-wider text-neutral-400 block">
                                    Semantic Fit
                                  </span>
                                </div>
                              )}
                              <div className="text-right">
                                <span className="font-mono text-2xl font-black block text-black">
                                  {(plan.suitability_score || 8.4).toFixed(1)}
                                </span>
                                <span className="font-mono text-[9px] uppercase tracking-wider text-neutral-400 block">
                                  Match Score
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Key Facts block */}
                          <div className="grid grid-cols-3 border-t border-b border-neutral-100 py-3 font-mono text-[11px] text-neutral-500">
                            <div>
                              <span className="text-[9px] text-neutral-400 uppercase block">Monthly Premium</span>
                              <span className="text-black font-semibold">₹{Math.round(plan.annual_premium / 12).toLocaleString('en-IN')}/mo <span className="text-[8px] text-neutral-400 font-normal">+GST</span></span>
                            </div>
                            <div>
                              <span className="text-[9px] text-neutral-400 uppercase block">Sum Insured</span>
                              <span className="text-black font-semibold">₹{plan.coverage.toLocaleString('en-IN')}</span>
                            </div>
                            <div>
                              <span className="text-[9px] text-neutral-400 uppercase block">Waiting Period</span>
                              <span className="text-black font-semibold uppercase">
                                {plan.diabetes_day1 ? 'None (Day 1)' : `${plan.pre_existing_wait_years ?? plan.preexisting_wait_years ?? 4} Years`}
                              </span>
                            </div>
                          </div>

                          {/* AI Reasoning Block */}
                          <div className="font-mono text-[11px] leading-5 text-neutral-600 bg-neutral-50 p-3 border-l-2 border-black" style={{ borderRadius: '12px' }}>
                            <span className="font-bold text-black uppercase text-[9px] tracking-wider block mb-1">AI Recommendation Insight:</span>
                            <p>{reasoning}</p>
                          </div>

                          {/* Card actions */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/explorer/${plan.id}`);
                              }}
                              className="h-9 border border-neutral-200 hover:border-black text-black font-mono text-[10px] uppercase tracking-wider transition-colors bg-white cursor-pointer"
                              style={{ borderRadius: '12px' }}
                            >
                              Details
                            </button>
                            
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleCompare(plan.id);
                              }}
                              className={`h-9 font-mono text-[10px] uppercase tracking-wider transition-all border cursor-pointer ${
                                selected 
                                  ? 'bg-black text-white border-black' 
                                  : 'border-neutral-200 hover:border-black text-black bg-white'
                              }`}
                              style={{ borderRadius: '12px' }}
                            >
                              {selected ? '✓ Added' : 'Compare'}
                            </button>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedPlanForStress(plan);
                              }}
                              className="h-9 border border-neutral-200 hover:border-black text-black font-mono text-[10px] uppercase tracking-wider transition-colors bg-white cursor-pointer"
                              style={{ borderRadius: '12px' }}
                            >
                              Stress Test
                            </button>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open('https://www.hdfcergo.com/health-insurance', '_blank');
                              }}
                              className="h-9 border border-black bg-black text-white hover:bg-neutral-800 font-mono text-[10px] uppercase tracking-wider transition-colors cursor-pointer"
                              style={{ borderRadius: '12px' }}
                            >
                              Buy Plan
                            </button>
                          </div>

                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Right Sidebar containing Advanced ML metrics & Feature Importance charts */}
            <aside className="space-y-8">
              
              {/* Risk Profile Card */}
              <div className="bg-black text-white p-5 sm:p-6 space-y-6 rounded" style={{ borderRadius: '12px' }}>
                <div className="space-y-2">
                  <span className="font-mono text-[9px] uppercase tracking-widest text-neutral-400 block">Metabolic Risk Profiling</span>
                  <h2 className="font-[var(--font-heading)] text-2xl font-black uppercase tracking-tight text-white leading-none">
                    {friendlyTierName}
                  </h2>
                  <p className="font-mono text-[10px] text-neutral-300">Composite Score: {score / 100} / 1.0</p>
                </div>

                {/* 4-zone Divided Bar */}
                <div className="space-y-2">
                  <div className="relative h-4 bg-neutral-800 flex" style={{ borderRadius: '12px' }}>
                    <div className="h-full bg-neutral-700 w-1/4" title="Low Risk" />
                    <div className="h-full bg-neutral-600 w-1/4" title="Moderate Risk" />
                    <div className="h-full bg-neutral-500 w-1/4" title="High Risk" />
                    <div className="h-full bg-neutral-400 w-1/4" title="Critical" />
                    <div 
                      className="absolute top-0 bottom-0 w-[3px] bg-white transition-all duration-700 ease-out"
                      style={{ left: `calc(${score}% - 1.5px)` }}
                    />
                  </div>
                  <div className="flex justify-between font-mono text-[8px] uppercase text-neutral-400">
                    <span>Low</span>
                    <span>Moderate</span>
                    <span>High</span>
                    <span>Critical</span>
                  </div>
                </div>

                <p className="font-mono text-[10px] leading-5 text-neutral-400 border-t border-neutral-800 pt-4 uppercase">
                  {dynamicDescription}
                </p>

                {/* XGBoost Feature attribution */}
                {computedFeatureImportances && Object.keys(computedFeatureImportances).length > 0 && (
                  <div className="border-t border-neutral-800 pt-4 space-y-3">
                    <span className="font-mono text-[9px] uppercase tracking-widest text-neutral-400 block">
                      XGBoost ML Feature Attribution (SHAP)
                    </span>
                    <div className="space-y-3 animate-fadeIn">
                      {Object.entries(computedFeatureImportances).map(([feature, weight]) => {
                        const pct = Math.round(weight * 100);
                        return (
                          <div key={feature} className="space-y-1 font-mono text-[9px]">
                            <div className="flex justify-between text-neutral-300">
                              <span className="uppercase tracking-tight">{feature}</span>
                              <span>{pct}%</span>
                            </div>
                            <div className="h-1 bg-neutral-800 w-full" style={{ borderRadius: '6px' }}>
                              <div 
                                className="h-full bg-white transition-all duration-500 ease-out" 
                                style={{ width: `${pct}%`, borderRadius: '6px' }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Group vitals preview card */}
              <div className="border border-neutral-200 p-6 bg-neutral-50 rounded" style={{ borderRadius: '12px' }}>
                <span className="font-mono text-[9px] uppercase tracking-widest text-neutral-400 block mb-4">Active Group Vitals</span>
                <div className="space-y-3 font-mono text-xs uppercase">
                  <div className="flex justify-between border-b border-neutral-200 pb-2">
                    <span className="text-neutral-400">HbA1c (Group Max)</span>
                    <span className="font-bold text-black">{activeGroupVitals.hba1c}%</span>
                  </div>
                  <div className="flex justify-between border-b border-neutral-200 pb-2">
                    <span className="text-neutral-400">BMI (Group Max)</span>
                    <span className="font-bold text-black">{activeGroupVitals.bmi} kg/m²</span>
                  </div>
                  <div className="flex justify-between border-b border-neutral-200 pb-2">
                    <span className="text-neutral-400">Diabetes Cover</span>
                    <span className="font-bold text-[#00a278]">{activeGroupVitals.has_diabetes ? 'Required' : 'No History'}</span>
                  </div>
                  <div className="flex justify-between pb-2">
                    <span className="text-neutral-400">Hypertension Cover</span>
                    <span className="font-bold text-[#00a278]">{activeGroupVitals.has_hypertension ? 'Required' : 'No History'}</span>
                  </div>
                </div>
              </div>

              <AnnotationBox title="How suitability is matches">
                Our matching engine ranks policies based on Day 1 coverage for pre-existing metabolic conditions, waiting periods, room-rent capping, and pricing thresholds.
              </AnnotationBox>
            </aside>
          </section>
        </div>
      </main>

      {/* Sticky Bottom Comparison Trigger */}
      {compareIds.length >= 2 && (
        <div className="fixed bottom-0 left-0 right-0 border-t border-neutral-200 bg-white p-4 lg:left-[290px] z-50 animate-slideUp">
          <div className="mx-auto max-w-[1100px] flex justify-between items-center">
            <span className="font-mono text-xs uppercase tracking-widest text-black font-bold">
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

      {/* Modal and Drawer mounts */}
      <StressTestModal 
        plan={selectedPlanForStress}
        isOpen={!!selectedPlanForStress}
        onClose={() => {
          setSelectedPlanForStress(null);
          setStressTestInitialScenario(undefined);
        }}
        initialScenario={stressTestInitialScenario}
      />

      <CompareDrawer 
        plans={comparedPlansList}
        isOpen={isCompareDrawerOpen}
        onClose={() => setIsCompareDrawerOpen(false)}
        onClear={clearCompare}
        onSelectPlan={(id) => router.push(`/explorer/${id}`)}
      />

      {/* Floating Omnipresent AI Agent Bar */}
      <div 
        className={`fixed left-1/2 -translate-x-1/2 w-full max-w-[680px] px-4 sm:px-0 z-40 transition-all duration-300 ${
          compareIds.length >= 2 ? 'bottom-24' : 'bottom-6'
        }`}
      >
        {/* Agent Speech bubble */}
        {agentResponse && (
          <div className="mb-3 border-t-2 border-black bg-white shadow-xl p-4 relative animate-slideUp border border-neutral-200" style={{ borderRadius: '12px' }}>
            <button
              type="button"
              onClick={() => {
                setAgentResponse(null);
                setAgentToolUsed(null);
              }}
              className="absolute right-3 top-3 font-mono text-[8px] uppercase tracking-widest text-neutral-400 hover:text-black transition-colors border border-neutral-200 px-1.5 py-0.5 rounded hover:border-black cursor-pointer bg-white"
            >
              [ Clear ]
            </button>
            <div className="flex items-start gap-2.5">
              <div className="h-6 w-6 bg-black text-white flex items-center justify-center rounded shrink-0">
                <Bot size={13} className="animate-pulse" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[9px] uppercase font-bold text-black tracking-wider">Outsurance Advisor</span>
                  {agentToolUsed && (
                    <span className="font-mono text-[8px] uppercase bg-neutral-100 text-neutral-600 px-1.5 py-0.5 rounded border border-neutral-200">
                      Action: {agentToolUsed}
                    </span>
                  )}
                </div>
                <p className="font-mono text-[11px] leading-5 text-black whitespace-pre-line pr-10">
                  {agentResponse}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Input Bar */}
        <form 
          onSubmit={handleAgentSubmit}
          className="relative flex items-center bg-white shadow-lg overflow-hidden border border-neutral-200 hover:border-black transition-all"
          style={{ borderRadius: '12px' }}
        >
          {isAgentLoading && (
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-neutral-100 overflow-hidden">
              <div className="h-full bg-black w-1/3 animate-pulse" />
            </div>
          )}
          <div className="pl-4 pr-2 text-neutral-400 shrink-0">
            <Sparkles size={14} className={isAgentLoading ? "animate-spin text-black" : "text-neutral-400"} />
          </div>
          <input
            type="text"
            value={agentInput}
            onChange={(e) => setAgentInput(e.target.value)}
            disabled={isAgentLoading}
            placeholder="Ask AI Agent: 'reassess as smoker', 'stress test Plan 3 for cardiac', 'compare 1 vs 3'..."
            className="w-full h-12 bg-white pr-4 py-3 font-mono text-[11px] sm:text-xs text-black placeholder-neutral-400 outline-none disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isAgentLoading || !agentInput.trim()}
            className="h-12 px-5 bg-black text-white hover:bg-neutral-900 transition-colors uppercase font-mono text-[10px] tracking-widest font-bold shrink-0 disabled:bg-neutral-200 disabled:text-neutral-400 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer border-l border-neutral-200"
          >
            {isAgentLoading ? (
              <span>[ Thinking... ]</span>
            ) : (
              <>
                <span>Send</span>
                <Send size={10} />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <span className="h-8 w-8 border-2 border-black border-t-transparent animate-spin rounded-full" />
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}
