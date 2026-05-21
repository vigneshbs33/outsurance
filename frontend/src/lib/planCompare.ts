import type { Plan } from '../components/StressTestModal';

type Breakdown = { cosine_similarity?: number };

/** Backend Stage-3 KNN score is 0–10 (stored in suitability_breakdown or top-level). */
export function getPlanCosineSimilarity(plan: Plan): number {
  const raw =
    plan.cosine_similarity ??
    (plan.suitability_breakdown as Breakdown | undefined)?.cosine_similarity;
  if (raw == null || Number.isNaN(Number(raw))) return 0;
  const n = Number(raw);
  return n <= 1 ? n * 10 : n;
}

export function formatSimilarityScore(plan: Plan): string {
  return `${getPlanCosineSimilarity(plan).toFixed(1)}/10`;
}

function applyScoreFields(plan: Plan, scored: Record<string, unknown>): Plan {
  const breakdown =
    (scored.suitability_breakdown as Plan['suitability_breakdown']) ?? plan.suitability_breakdown;
  const cosineFromScored =
    (scored.cosine_similarity as number | undefined) ??
    (breakdown as Breakdown | undefined)?.cosine_similarity;
  return {
    ...plan,
    suitability_score: (scored.suitability_score as number) ?? (scored.score as number) ?? plan.suitability_score,
    cosine_similarity: cosineFromScored ?? plan.cosine_similarity,
    plain_english_explanation:
      (scored.plain_english_explanation as string) ?? plan.plain_english_explanation,
    warning_flags: (scored.warning_flags as string[]) ?? plan.warning_flags,
    suitability_breakdown: breakdown,
  };
}

/** Merge ML scores from full rank API or top-N recommendation payload. */
export function mergeScoredPlans(allPlans: Plan[], scoredPlans: Plan[]): Plan[] {
  if (!scoredPlans.length) return allPlans;
  const byId = new Map(scoredPlans.map((p) => [p.id, p]));
  return allPlans.map((plan) => {
    const scored = byId.get(plan.id);
    return scored ? applyScoreFields(plan, scored as unknown as Record<string, unknown>) : plan;
  });
}

export function mergeRecommendationScores(
  allPlans: Plan[],
  recommendation?: { top_plan_ids?: Array<Record<string, unknown>> } | null
): Plan[] {
  if (!recommendation?.top_plan_ids?.length) return allPlans;
  const scored = recommendation.top_plan_ids.map((rp) => ({
    ...rp,
    id: rp.id as number,
    suitability_score: rp.score as number,
  })) as Plan[];
  return mergeScoredPlans(allPlans, scored);
}

export function rankPlansBySimilarity(plans: Plan[]): Plan[] {
  return [...plans].sort((a, b) => {
    const simA = getPlanCosineSimilarity(a);
    const simB = getPlanCosineSimilarity(b);
    if (simB !== simA) return simB - simA;
    return (b.suitability_score ?? 0) - (a.suitability_score ?? 0);
  });
}

export function buildComparisonTable(plans: Plan[]): Record<string, Record<string, string>> {
  const FIELDS: Array<[string, (p: Plan) => string]> = [
    ['Annual Premium', (p) => `₹${(p.annual_premium ?? 0).toLocaleString('en-IN')}`],
    ['Coverage', (p) => `₹${Math.round((p.coverage ?? 0) / 100000)}L`],
    ['Plan Type', (p) => p.type ?? '-'],
    ['KNN Similarity', (p) => formatSimilarityScore(p)],
    ['Match Score', (p) => `${(p.suitability_score ?? 0).toFixed(1)}/10`],
    ['Pre-existing Wait', (p) => `${p.pre_existing_wait_years ?? p.preexisting_wait_years ?? 4} yr`],
    ['Diabetes Day 1', (p) => (p.diabetes_day1 ? 'Yes' : 'No')],
    ['Hypertension Day 1', (p) => (p.hypertension_day1 ? 'Yes' : 'No')],
    ['Hospital Network', (p) => `${(p.hospital_network_count ?? 0).toLocaleString('en-IN')}+`],
    ['Claim Settlement', (p) => `${p.claim_settlement_ratio ?? '-'}%`],
  ];
  const table: Record<string, Record<string, string>> = {};
  for (const [label, fn] of FIELDS) {
    table[label] = {};
    for (const p of plans) {
      table[label][p.name] = fn(p);
    }
  }
  return table;
}

export function buildTopThreeExplanation(plans: Plan[]): string {
  return plans
    .map((p, i) => {
      const sim = formatSimilarityScore(p);
      const score = (p.suitability_score ?? 0).toFixed(1);
      const why = p.plain_english_explanation
        ? ` ${p.plain_english_explanation}`
        : ` Strong KNN similarity (${sim}) and suitability (${score}/10) for your profile.`;
      return `${i + 1}. **${p.name}** (${p.insurer}) — similarity ${sim}, match ${score}/10.${why}`;
    })
    .join('\n\n');
}

/** @deprecated Use detectInsurerPlanRequest from agentIntelligence for chat. */
export function detectInsurerFilter(text: string): string | null {
  const lower = text.toLowerCase();
  if (/\b(why|how|what|explain)\b/.test(lower) && /\b(knn|score|similarity)\b/.test(lower)) return null;
  if (!/\b(best|top|show|recommend|compare|which|find|give)\b/.test(lower)) return null;
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

export function isNextThreeRequest(text: string): boolean {
  return /next\s*(3|three)|another\s*(3|three)|show\s*next|different\s*3/i.test(text);
}

/** Normalize plans before sending to agent API so session carries ML scores. */
export function enrichPlansForSession(plans: Plan[]): Plan[] {
  return plans.map((p) => ({
    ...p,
    cosine_similarity: getPlanCosineSimilarity(p),
    suitability_score: p.suitability_score ?? 0,
  }));
}
