'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Bot, Send, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { callAgent } from '../lib/api';
import {
  buildComparisonTable,
  enrichPlansForSession,
  formatSimilarityScore,
  isNextThreeRequest,
  rankPlansBySimilarity,
} from '../lib/planCompare';
import {
  actionsForMessage,
  answerScoringQuestion,
  buildPlatformContextPayload,
  defaultActions,
  detectInsurerPlanRequest,
  isExplanatoryQuestion,
  isScoringQuestion,
  isTableRequest,
  type ChatAction,
} from '../lib/agentIntelligence';
import { buildForumUrl, isReviewsNavigationRequest } from '../lib/reviews';
import { loadAgentChatState, saveAgentChatState, type StoredChatMessage } from '../lib/agentChatStorage';
import { supabase } from '../lib/supabase';
import { RiskProfileCard, type ConditionDetail, type FeatureImportance } from './RiskProfileCard';
import { CompareInlineTable } from './CompareInlineTable';
import StressTestModal, { type Plan } from './StressTestModal';

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  toolUsed?: string;
  comparePlans?: Plan[];
  comparisonTable?: Record<string, Record<string, string>>;
  actions?: ChatAction[];
};

export interface DashboardAgentChatProps {
  name: string;
  vitals: Record<string, unknown>;
  profileMeta: Record<string, unknown> | null;
  rankedPlans: Plan[];
  riskTier: string;
  riskScore: number;
  conditionDetail: ConditionDetail | null;
  featureImportance: FeatureImportance | null;
  medicalHistory?: string[];
}

export function DashboardAgentChat({
  name,
  vitals,
  profileMeta,
  rankedPlans,
  riskTier,
  riskScore,
  conditionDetail,
  featureImportance,
  medicalHistory = [],
}: DashboardAgentChatProps) {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const welcomeSentRef = useRef(false);
  const chatHydratedRef = useRef(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [rankedList, setRankedList] = useState<Plan[]>(rankedPlans);
  const [compareOffset, setCompareOffset] = useState(0);
  const [riskState, setRiskState] = useState({ tier: riskTier, score: riskScore, conditionDetail, featureImportance });
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [stressPlan, setStressPlan] = useState<Plan | null>(null);

  const top3Plans = rankedList.slice(0, 3);

  const chatSuggestions = [
    {
      id: 'reviews',
      label: 'See reviews for my top 3 plans',
      action: () =>
        router.push(
          buildForumUrl({
            planIds: top3Plans.map((p) => p.id),
            highlight: 'recommended',
          })
        ),
    },
    {
      id: 'next3',
      label: 'Next 3 best plans',
      action: () => {
        setInput('next 3 best plans');
      },
    },
    {
      id: 'hdfc',
      label: 'Best HDFC plan for me',
      action: () => setInput('What is the best HDFC plan for my profile?'),
    },
    {
      id: 'stress',
      label: 'Stress test top plan',
      action: () => {
        if (top3Plans[0]) setStressPlan(top3Plans[0]);
      },
    },
  ] as const;

  function navigateToTopPlanReviews() {
    if (top3Plans.length === 0) return;
    router.push(
      buildForumUrl({
        planIds: top3Plans.map((p) => p.id),
        highlight: 'recommended',
      })
    );
  }

  const gender = (profileMeta?.gender as string) ?? 'Member';
  const age = (vitals.age as number) ?? 35;
  const isSmoker = vitals.smoker === 1;

  const buildSession = useCallback(
    (plans: Plan[]) => ({
      profile: {
        age: vitals.age,
        bmi: vitals.bmi,
        smoker: vitals.smoker,
        hba1c: vitals.hba1c,
        bp_systolic: vitals.bp_systolic,
        chronic_count: vitals.chronic_count,
        monthly_budget: vitals.monthly_budget,
        income_lakh: vitals.income_lakh,
        medical_history: medicalHistory,
        diabetes: vitals.has_diabetes ? 1 : 0,
        hypertension: vitals.has_hypertension ? 1 : 0,
      },
      risk_data: {
        risk_tier: riskState.tier,
        risk_score: riskState.score,
        confidence_pct: Math.round(riskState.score * 100),
        feature_importance_explanation: riskState.featureImportance,
        condition_detail: riskState.conditionDetail,
      },
      platform_context: buildPlatformContextPayload(plans, vitals, {
        tier: riskState.tier,
        score: riskState.score,
      }),
      current_plans: enrichPlansForSession(plans.slice(0, 50)),
    }),
    [vitals, medicalHistory, riskState]
  );

  const pushAssistantMessage = useCallback(
    (msg: Omit<ChatMessage, 'id' | 'role'> & { id?: string }) => {
      setMessages((prev) => [
        ...prev,
        {
          id: msg.id ?? `a-${Date.now()}`,
          role: 'assistant',
          ...msg,
          actions: msg.actions ?? actionsForMessage(msg.toolUsed, !!msg.comparePlans),
        },
      ]);
    },
    []
  );

  const pushCompareMessage = useCallback(
    (slice: Plan[], intro: string, messageId?: string) => {
      if (slice.length < 2) return;
      const table = buildComparisonTable(slice);
      setMessages((prev) => {
        if (messageId && prev.some((m) => m.id === messageId)) return prev;
        return [
          ...prev,
          {
            id: messageId ?? `cmp-${Date.now()}`,
            role: 'assistant',
            content: intro.trim(),
            toolUsed: 'compare',
            comparePlans: slice,
            comparisonTable: table,
            actions: actionsForMessage('compare', true),
          },
        ];
      });
    },
    []
  );

  const runAction = useCallback(
    (action: ChatAction) => {
      if (action.id === 'explorer') {
        router.push('/explorer');
        return;
      }
      if (action.prompt) setInput(action.prompt);
    },
    [router]
  );

  useEffect(() => {
    setRankedList(rankedPlans);
  }, [rankedPlans]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        chatHydratedRef.current = true;
        return;
      }
      setUserId(user.id);
      const stored = loadAgentChatState(user.id);
      if (stored && stored.messages.length > 0) {
        setMessages(stored.messages as ChatMessage[]);
        setCompareOffset(stored.compareOffset ?? 0);
        welcomeSentRef.current = true;
      }
      chatHydratedRef.current = true;
    });
  }, []);

  useEffect(() => {
    if (!userId || !chatHydratedRef.current) return;
    saveAgentChatState(userId, messages as StoredChatMessage[], compareOffset);
  }, [userId, messages, compareOffset]);

  useEffect(() => {
    if (welcomeSentRef.current || rankedList.length < 2) return;
    if (messages.length > 0) {
      welcomeSentRef.current = true;
      return;
    }
    welcomeSentRef.current = true;
    const top3 = rankedList.slice(0, 3);
    if (top3.length < 2) return;
    pushCompareMessage(
      top3,
      `Welcome${name ? `, ${name}` : ''}. I analyzed your health profile and picked the **top ${top3.length} plans by KNN similarity**. Compare them below — each card includes a plain-English summary.`,
      'welcome-compare'
    );
  }, [rankedList, name, pushCompareMessage, messages.length]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      if (isReviewsNavigationRequest(text)) {
        navigateToTopPlanReviews();
        pushAssistantMessage({
          content:
            top3Plans.length >= 1
              ? `Opening the **Review Forum** with customer reviews for your top ${top3Plans.length} recommended plan${top3Plans.length > 1 ? 's' : ''}: **${top3Plans.map((p) => p.name).join('**, **')}**.`
              : 'Complete an assessment first so I can show reviews for your recommended plans.',
        });
        setLoading(false);
        return;
      }

      if (isScoringQuestion(text) || (isExplanatoryQuestion(text) && !isTableRequest(text))) {
        const answered = answerScoringQuestion(text, rankedList, vitals);
        pushAssistantMessage({
          content: answered.content,
          toolUsed: 'explain_scoring',
          comparePlans: answered.tablePlans,
          comparisonTable: answered.comparisonTable,
          actions: answered.actions,
        });
        setLoading(false);
        return;
      }

      if (isTableRequest(text)) {
        const slice = rankPlansBySimilarity(rankedList).slice(0, 3);
        if (slice.length >= 2) {
          pushCompareMessage(slice, 'Here is a **comparison table** from your scored plan data (not generated text):');
        } else {
          pushAssistantMessage({
            content: 'I need at least two scored plans. Complete assessment or refresh the dashboard to load full catalogue scores.',
            actions: defaultActions(),
          });
        }
        setLoading(false);
        return;
      }

      if (isNextThreeRequest(text)) {
        const nextOffset = compareOffset + 3;
        const slice = rankedList.slice(nextOffset, nextOffset + 3);
        if (slice.length < 2) {
          pushAssistantMessage({
            content:
              'No more distinct plan groups to compare. Try adjusting your budget or adding a health condition for a fresh ML run.',
          });
        } else {
          setCompareOffset(nextOffset);
          pushCompareMessage(slice, 'Here are the **next 3 plans** by similarity score:');
        }
        setLoading(false);
        return;
      }

      const insurer = detectInsurerPlanRequest(text);
      if (insurer) {
        const needle = insurer.toLowerCase();
        const filtered = rankPlansBySimilarity(
          rankedList.filter(
            (p) =>
              p.insurer?.toLowerCase() === needle ||
              p.insurer?.toLowerCase().startsWith(needle.split(' ')[0])
          )
        );
        const slice = filtered.slice(0, 3);
        if (slice.length < 1) {
          pushAssistantMessage({
            content: `I could not find plans from ${insurer} in your ranked list.`,
          });
        } else if (slice.length === 1) {
          pushAssistantMessage({
            content: `Best match from **${insurer}**: **${slice[0].name}** (similarity ${formatSimilarityScore(slice[0])}, match ${(slice[0].suitability_score ?? 0).toFixed(1)}/10). ${slice[0].plain_english_explanation ?? ''}`,
            actions: [
              { id: 'why-knn', label: `Why this KNN score?`, prompt: `Why is KNN ${formatSimilarityScore(slice[0])} for ${slice[0].name}?` },
              ...defaultActions().filter((a) => a.id !== 'table-top3'),
            ],
          });
        } else {
          pushCompareMessage(slice, `Top plans from **${insurer}** for your profile:`);
        }
        setLoading(false);
        return;
      }

      const history = [...messages, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await callAgent(history, buildSession(rankedList));

      if (res.tool_used === 'reassess' && res.updated_session) {
        const newPlans = (res.updated_session.current_plans as Plan[]) ?? rankedList;
        const merged = rankPlansBySimilarity(
          rankedList.map((p) => {
            const u = newPlans.find((x) => x.id === p.id);
            return u ? { ...p, ...u, suitability_score: u.suitability_score ?? p.suitability_score } : p;
          })
        );
        setRankedList(merged);
        setCompareOffset(0);
        const ra = res.updated_session.risk_data as Record<string, unknown> | undefined;
        if (ra) {
          setRiskState({
            tier: (ra.risk_tier as string) ?? riskState.tier,
            score: (ra.risk_score as number) ?? riskState.score,
            conditionDetail: (ra.condition_detail as ConditionDetail) ?? riskState.conditionDetail,
            featureImportance:
              (ra.feature_importance_explanation as FeatureImportance) ?? riskState.featureImportance,
          });
        }
        const top3 = merged.slice(0, 3);
        const intro =
          (res.response?.trim() || 'I re-ran the ML pipeline with your update.') +
          ' Here are your updated top plans:';
        pushCompareMessage(top3, intro);
      } else if (res.tool_used === 'compare' && res.tool_result?.plans) {
        const ids = (res.tool_result.plans as { id: number }[]).map((p) => p.id);
        const slice = rankedList.filter((p) => ids.includes(p.id));
        const plans = slice.length >= 2 ? slice : rankedList.slice(0, 3);
        pushCompareMessage(plans, res.response?.trim() || 'Here is your plan comparison:');
      } else if (res.tool_used === 'budget_sim' && res.updated_session?.current_plans) {
        const updated = rankPlansBySimilarity(res.updated_session.current_plans as Plan[]);
        setRankedList(updated);
        setCompareOffset(0);
        pushCompareMessage(
          updated.slice(0, 3),
          res.response?.trim() || 'Updated plans for your new budget:'
        );
      } else if (res.tool_used === 'stress_test' && res.tool_result) {
        const pid = res.tool_result.plan_id as number;
        const plan = rankedList.find((p) => p.id === pid);
        if (plan) setStressPlan(plan);
        pushAssistantMessage({ content: res.response, toolUsed: 'stress_test' });
      } else if (res.tool_used === 'explain_scoring') {
        const answered = answerScoringQuestion(text, rankedList, vitals);
        const llmBit = res.response?.trim();
        const content = llmBit && !llmBit.toLowerCase().includes('plan 1')
          ? `${llmBit}\n\n---\n\n${answered.content}`
          : answered.content;
        pushAssistantMessage({
          content,
          toolUsed: 'explain_scoring',
          comparePlans: answered.tablePlans,
          comparisonTable: answered.comparisonTable,
          actions: answered.actions,
        });
      } else if (res.tool_used === 'explain_risk') {
        pushAssistantMessage({
          content: res.response || res.tool_error || 'Could not explain risk.',
          toolUsed: 'explain_risk',
          actions: [
            { id: 'knn', label: 'Explain KNN scoring', prompt: 'How does KNN similarity work?' },
            ...defaultActions().slice(0, 3),
          ],
        });
      } else if (isExplanatoryQuestion(text)) {
        pushAssistantMessage({
          content: res.response || res.tool_error || 'I could not answer that.',
          toolUsed: res.tool_used,
          actions: defaultActions(),
        });
      } else {
        let content = res.response || res.tool_error || 'I could not process that request.';
        if (/\|.+\|/.test(content) && content.split('\n').filter((l: string) => l.includes('|')).length > 2) {
          content =
            content.split('\n').filter((l: string) => !l.trim().startsWith('|')).join('\n').trim() +
            '\n\n_Use **Show top 3 table** below for a real data table from your plan store._';
        }
        pushAssistantMessage({
          content,
          toolUsed: res.tool_used,
          actions: defaultActions(),
        });
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: 'Advisor is offline. Check that the backend is running on port 8000.',
        },
      ]);
    }
    setLoading(false);
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <RiskProfileCard
        riskTier={riskState.tier}
        riskScore={riskState.score}
        conditionDetail={riskState.conditionDetail}
        featureImportance={riskState.featureImportance}
        userLabel={`${name || gender}, ${age} yrs${isSmoker ? ' · Smoker' : ''}`}
        onEditProfile={() => router.push('/assessment')}
        compact
      />

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 space-y-4 max-w-[960px] w-full mx-auto"
      >
        <div className="flex items-center gap-2 text-emerald-700">
          <Sparkles size={14} />
          <span className="text-xs font-bold uppercase tracking-wider">Outsurance AI Advisor</span>
        </div>

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[min(92%,100%)] sm:max-w-[92%] rounded-2xl border px-3 sm:px-4 py-3 ${
                msg.role === 'user'
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-white border-neutral-200 text-neutral-800 shadow-sm'
              }`}
            >
              {msg.role === 'assistant' && (
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-6 w-6 bg-emerald-600 rounded-lg flex items-center justify-center text-white">
                    <Bot size={12} />
                  </div>
                  {msg.toolUsed && (
                    <span className="text-[9px] font-mono uppercase bg-neutral-100 px-1.5 py-0.5 rounded border">
                      {msg.toolUsed}
                    </span>
                  )}
                </div>
              )}
              {msg.role === 'assistant' ? (
                <div className="text-sm leading-relaxed prose prose-sm prose-neutral max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-headings:my-2 prose-strong:text-neutral-900">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                </div>
              ) : (
                <p className="text-sm leading-relaxed whitespace-pre-line">{msg.content}</p>
              )}
              {msg.comparePlans && msg.comparePlans.length >= 2 && (
                <div className="mt-4">
                  <CompareInlineTable plans={msg.comparePlans} comparisonTable={msg.comparisonTable} />
                </div>
              )}
              {msg.role === 'assistant' && msg.actions && msg.actions.length > 0 && (
                <div className="mt-3 pt-3 border-t border-neutral-100 flex flex-wrap gap-1.5">
                  {msg.actions.map((action) => (
                    <button
                      key={`${msg.id}-${action.id}`}
                      type="button"
                      disabled={loading}
                      onClick={() => runAction(action)}
                      className="text-[10px] font-semibold px-2.5 py-1 rounded-full border border-emerald-200 bg-emerald-50/80 text-emerald-800 hover:bg-emerald-100 transition-colors"
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-neutral-400 text-xs">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-bounce" />
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-bounce [animation-delay:0.15s]" />
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-bounce [animation-delay:0.3s]" />
            <span className="ml-1 uppercase tracking-wider font-bold">Gemma analyzing…</span>
          </div>
        )}

        <div className="max-w-[960px] mx-auto pt-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-2">Suggested questions</p>
          <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
            {chatSuggestions.map((s) => (
              <button
                key={s.id}
                type="button"
                disabled={loading || (s.id === 'reviews' && top3Plans.length === 0)}
                onClick={() => {
                  if (s.id === 'reviews') {
                    navigateToTopPlanReviews();
                    setMessages((prev) => [
                      ...prev,
                      {
                        id: `u-rev-${Date.now()}`,
                        role: 'user',
                        content: 'See reviews for my top 3 plans',
                      },
                      {
                        id: `a-rev-${Date.now()}`,
                        role: 'assistant',
                        content: `Taking you to reviews for **${top3Plans.map((p) => p.name).join('**, **')}**.`,
                      },
                    ]);
                    return;
                  }
                  s.action();
                }}
                className="text-[11px] font-semibold px-3 py-1.5 rounded-full border border-neutral-200 bg-white text-neutral-700 hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-800 disabled:opacity-40 transition-colors"
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="sticky bottom-0 border-t border-neutral-200 bg-white/95 backdrop-blur px-4 sm:px-6 py-3"
      >
        <div className="max-w-[960px] mx-auto flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            placeholder="Ask why a KNN score is 0, compare plans, stress test, budget…"
            className="flex-1 h-11 px-4 border border-neutral-200 rounded-xl text-sm outline-none focus:border-emerald-400 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="h-11 px-5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-neutral-200 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
          >
            <Send size={14} />
            Send
          </button>
        </div>
      </form>

      <StressTestModal plan={stressPlan} isOpen={!!stressPlan} onClose={() => setStressPlan(null)} />
    </div>
  );
}
