import type { Plan } from '../components/StressTestModal';
import {
  buildComparisonTable,
  formatSimilarityScore,
  getPlanCosineSimilarity,
  rankPlansBySimilarity,
} from './planCompare';

export type ChatAction = { id: string; label: string; prompt?: string };

const QUESTION_RE =
  /\b(why|how|what|explain|meaning|understand|help me understand|tell me why|tell me how)\b/i;
const SCORING_RE =
  /\b(knn|similarity|cosine|match score|suitability|scoring|rank(ing)?|ml pipeline|stage\s*[123]|0\/10|zero)\b/i;
const TABLE_RE = /\b(table|tabular|columns?|side.?by.?side)\b/i;
const PLAN_ACTION_RE = /\b(best|top|show|recommend|compare|which plan|give me|find me|suggest)\b/i;

export function isExplanatoryQuestion(text: string): boolean {
  const t = text.trim();
  if (!QUESTION_RE.test(t) && !SCORING_RE.test(t)) return false;
  if (PLAN_ACTION_RE.test(t) && !QUESTION_RE.test(t)) return false;
  return QUESTION_RE.test(t) || (SCORING_RE.test(t) && QUESTION_RE.test(t)) || /why.*\b(knn|score|similar)/i.test(t);
}

export function isScoringQuestion(text: string): boolean {
  return SCORING_RE.test(text) && (QUESTION_RE.test(text) || /why|how|what/i.test(text));
}

export function isTableRequest(text: string): boolean {
  return TABLE_RE.test(text) && PLAN_ACTION_RE.test(text);
}

/** Insurer shortcut only when user wants plans — not when asking why/how about scores. */
export function detectInsurerPlanRequest(text: string): string | null {
  const lower = text.toLowerCase();
  if (isExplanatoryQuestion(text) || isScoringQuestion(text)) return null;
  if (!PLAN_ACTION_RE.test(lower) && !/^icici\b|^hdfc\b|^star\b/i.test(text.trim())) return null;

  const map: [RegExp, string][] = [
    [/hdfc|ergo/, 'HDFC ERGO'],
    [/star health/, 'Star Health'],
    [/niva|bupa/, 'Niva Bupa'],
    [/care health/, 'Care Health'],
    [/icici/, 'ICICI Lombard'],
    [/bajaj/, 'Bajaj Allianz'],
    [/aditya birla/, 'Aditya Birla'],
    [/max bupa/, 'Max Bupa'],
    [/lic/, 'LIC'],
    [/tata aig/, 'Tata AIG'],
    [/sbi/, 'SBI General'],
  ];
  for (const [re, name] of map) {
    if (re.test(lower)) return name;
  }
  return null;
}

type Breakdown = {
  budget_fit?: number;
  condition_match?: number;
  risk_alignment?: number;
  age_eligibility?: number;
  coverage_adequacy?: number;
  family_fit?: number;
  cosine_similarity?: number;
};

export function buildPlatformContextPayload(
  rankedList: Plan[],
  vitals: Record<string, unknown>,
  risk: { tier: string; score: number }
) {
  const scored = rankedList.filter((p) => getPlanCosineSimilarity(p) > 0);
  const top = rankPlansBySimilarity(rankedList).slice(0, 15);
  return {
    page: 'dashboard',
    catalogue_size: rankedList.length,
    plans_with_ml_scores: scored.length,
    risk_tier: risk.tier,
    risk_score: risk.score,
    profile_summary: {
      age: vitals.age,
      bmi: vitals.bmi,
      hba1c: vitals.hba1c,
      bp_systolic: vitals.bp_systolic,
      monthly_budget: vitals.monthly_budget,
      smoker: vitals.smoker,
    },
    scoring_pipeline:
      'Stage 1: XGBoost risk tier. Stage 2: weighted suitability (budget, conditions, age, coverage, family). Stage 3: cosine similarity between your profile vector and each plan ideal_vector. Combined match = 60% suitability + 40% KNN similarity (0–10).',
    top_plans: top.map((p, i) => {
      const b = (p.suitability_breakdown ?? {}) as Breakdown;
      return {
        rank: i + 1,
        id: p.id,
        name: p.name,
        insurer: p.insurer,
        knn_similarity: getPlanCosineSimilarity(p),
        match_score: p.suitability_score ?? 0,
        breakdown: b,
        has_ml_score: getPlanCosineSimilarity(p) > 0,
      };
    }),
  };
}

function findInsurerMention(text: string): string | null {
  const m = text.match(/icici|hdfc|star health|niva|care health|bajaj|lic|tata|sbi/i);
  return m ? m[0] : null;
}

export function answerScoringQuestion(
  text: string,
  rankedList: Plan[],
  vitals: Record<string, unknown>
): { content: string; tablePlans?: Plan[]; comparisonTable?: Record<string, Record<string, string>>; actions: ChatAction[] } {
  const insurerHint = findInsurerMention(text);
  const needle = insurerHint?.toLowerCase() ?? '';
  const insurerPlans = needle
    ? rankedList.filter((p) => p.insurer?.toLowerCase().includes(needle.includes('icici') ? 'icici' : needle))
    : [];
  const scoredCount = rankedList.filter((p) => getPlanCosineSimilarity(p) > 0).length;
  const zeroCount = rankedList.filter((p) => getPlanCosineSimilarity(p) === 0).length;

  let content = `**How KNN scoring works on Outsurance**\n\n`;
  content += `Your profile (age, BMI, HbA1c, BP, budget, conditions) is compared to each plan's **ideal customer vector** using cosine similarity. That becomes **KNN similarity (0–10)**. We blend it with a **suitability score** (budget fit, condition match, age, coverage) as **60% suitability + 40% KNN** for the final **match score**.\n\n`;
  content += `**Your catalogue right now:** ${rankedList.length} plans loaded, **${scoredCount}** have ML scores attached, **${zeroCount}** still show **0/10** until the rank-plans API runs (usually right after assessment).\n\n`;

  if (insurerPlans.length > 0) {
    const ranked = rankPlansBySimilarity(insurerPlans);
    const withZero = ranked.filter((p) => getPlanCosineSimilarity(p) === 0);
    const withScore = ranked.filter((p) => getPlanCosineSimilarity(p) > 0);

    if (/why.*\b(0|zero)\b/i.test(text) || withZero.length > 0 && withScore.length === 0) {
      content += `**About ${ranked[0]?.insurer ?? insurerHint} showing KNN 0:**\n`;
      if (withScore.length === 0) {
        content += `- None of the ${ranked.length} ${ranked[0]?.insurer ?? 'insurer'} plans in your session currently have a stored cosine score (likely only the top 5 from an old recommendation were scored).\n`;
        content += `- **Fix:** refresh the dashboard or re-run assessment — we call \`/api/rank-plans\` to score all ~154 plans.\n`;
        content += `- This is **not** that ICICI plans are a bad match — the score was simply **missing**, not computed as zero.\n`;
      } else {
        content += `- Some plans had missing scores; scored plans are listed below.\n`;
      }
    }

    if (withScore.length > 0) {
      content += `\n**${ranked[0].insurer} plans with real scores:**\n`;
      withScore.slice(0, 5).forEach((p, i) => {
        const b = (p.suitability_breakdown ?? {}) as Breakdown;
        content += `${i + 1}. **${p.name}** — KNN **${formatSimilarityScore(p)}**, match **${(p.suitability_score ?? 0).toFixed(1)}/10**`;
        if (b.budget_fit != null) {
          content += ` (budget ${b.budget_fit}/10, conditions ${b.condition_match ?? '—'}/10, KNN ${(b.cosine_similarity ?? getPlanCosineSimilarity(p)).toFixed(1)}/10)`;
        }
        content += '\n';
      });
    }

    const tablePlans = ranked.slice(0, Math.min(3, ranked.length));
    if (tablePlans.length >= 2) {
      return {
        content,
        tablePlans,
        comparisonTable: buildComparisonTable(tablePlans),
        actions: defaultActions(),
      };
    }
  }

  const top3 = rankPlansBySimilarity(rankedList).slice(0, 3);
  content += `\n**Your current top 3 by KNN:** ${top3.map((p) => `**${p.name}** (${formatSimilarityScore(p)})`).join(', ') || '— complete assessment first'}.`;

  return { content, actions: defaultActions() };
}

export function defaultActions(): ChatAction[] {
  return [
    { id: 'table-top3', label: 'Show top 3 table', prompt: 'Show me a comparison table of my top 3 plans' },
    { id: 'knn', label: 'Explain KNN scoring', prompt: 'How does KNN similarity scoring work?' },
    { id: 'risk', label: 'Explain my risk tier', prompt: 'Why is my risk tier what it is?' },
    { id: 'explorer', label: 'Open Plan Explorer', prompt: '' },
    { id: 'next3', label: 'Next 3 plans', prompt: 'next 3 best plans' },
  ];
}

export function actionsForMessage(
  toolUsed?: string,
  hasTable?: boolean
): ChatAction[] {
  const base = defaultActions();
  if (toolUsed === 'compare' || hasTable) {
    return base.filter((a) => a.id !== 'table-top3');
  }
  return base;
}
