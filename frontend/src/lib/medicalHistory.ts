import { HealthCondition } from '../enums/assessment.enum';

/** Maps checklist labels to Stage 0 / condition_cache terms (ML_Details.md). */
export const CONDITION_TO_TERM: Partial<Record<HealthCondition, string>> = {
  [HealthCondition.DIABETES]: 'diabetes',
  [HealthCondition.BLOOD_PRESSURE]: 'hypertension',
  [HealthCondition.HEART_DISEASE]: 'heart disease',
  [HealthCondition.ANY_SURGERY]: 'previous surgery',
  [HealthCondition.THYROID]: 'thyroid disorder',
  [HealthCondition.ASTHMA]: 'asthma',
};

export interface ConditionEvent {
  name: string;
  weight: number;
  resolved: boolean;
  justification?: string;
}

export interface ConditionDetail {
  events: ConditionEvent[];
  total_condition_risk_score: number;
  normalized_for_xgboost: number;
  dominant_condition: string | null;
  risk_summary: string;
}

export function buildMemberConditionTerms(
  history: Record<HealthCondition, boolean> | undefined,
  otherConditions: string[] = []
): string[] {
  if (!history) return [...otherConditions];
  const terms: string[] = [];
  if (history[HealthCondition.NONE]) return [];

  (Object.keys(CONDITION_TO_TERM) as HealthCondition[]).forEach((cond) => {
    if (history[cond]) {
      const term = CONDITION_TO_TERM[cond];
      if (term) terms.push(term);
    }
  });

  if (history[HealthCondition.OTHER_DISEASE]) {
    otherConditions.forEach((c) => {
      const t = c.trim();
      if (t) terms.push(t);
    });
  }

  return terms;
}

export function buildUnionMedicalHistory(
  members: string[],
  memberMedicalHistory: Record<string, Record<HealthCondition, boolean>>,
  memberOtherConditions: Record<string, string[]>,
  extraTerms: string[] = []
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  const add = (t: string) => {
    const key = t.trim().toLowerCase();
    if (!key || seen.has(key)) return;
    seen.add(key);
    out.push(t.trim());
  };

  members.forEach((m) => {
    buildMemberConditionTerms(memberMedicalHistory[m], memberOtherConditions[m] ?? []).forEach(add);
  });
  extraTerms.forEach(add);
  return out;
}

export function conditionSeverityClass(weight: number): string {
  if (weight >= 0.76) return 'bg-red-100 text-red-800 border-red-200';
  if (weight >= 0.31) return 'bg-orange-100 text-orange-800 border-orange-200';
  return 'bg-emerald-100 text-emerald-800 border-emerald-200';
}
