import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

type ProfileFields = Record<string, string | number | boolean | null | undefined>;
type AssessmentVitals = {
  age: number;
  bmi: number;
  smoker: number;
  hba1c: number;
  bp_systolic: number;
  diabetes: number;
  hypertension: number;
  chronic_count: number;
};
export type FullAssessmentData = AssessmentVitals & {
  fullName?: string;
  full_name?: string;
  mobileNumber?: string;
  mobile_number?: string;
  coveredMembersList?: string[];
  coveredMembers?: string[];
  covered_members?: string[];
  memberAges?: Record<string, number>;
  member_ages?: Record<string, number>;
  medicalHistory?: string[];
  medical_history?: string[];
  height?: number;
  weight?: number;
  language?: string;
  groups?: Array<{ id: string; name: string; members: string[] }>;
  memberMedicalHistory?: Record<string, string[]>;
  memberVitals?: Record<string, Record<string, string>>;
  memberDOBs?: Record<string, string>;
  gender?: string;
  city?: string;
  income_lakh?: number;
  monthly_budget?: number;
};
type RiskResult = {
  risk_tier: string;
  risk_score: number;
  feature_importance_explanation?: Record<string, number>;
};
type RecommendedPlan = {
  id: number;
  suitability_score: number;
  cosine_similarity?: number;
  plain_english_explanation?: string;
  warning_flags?: string[];
};

function encryptData(text: string): string {
  const salt = 'fidsurance-secure-salt-key-2026';
  let result = '';
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i);
    const saltChar = salt.charCodeAt(i % salt.length);
    result += String.fromCharCode(charCode ^ saltChar);
  }
  return typeof window !== 'undefined' ? window.btoa(result) : '';
}

function decryptData(cipherText: string): string {
  if (typeof window === 'undefined' || !cipherText) return '';
  try {
    const rawText = window.atob(cipherText);
    const salt = 'fidsurance-secure-salt-key-2026';
    let result = '';
    for (let i = 0; i < rawText.length; i++) {
      const charCode = rawText.charCodeAt(i);
      const saltChar = salt.charCodeAt(i % salt.length);
      result += String.fromCharCode(charCode ^ saltChar);
    }
    return result;
  } catch {
    return '';
  }
}

export function getCachedUser() {
  if (typeof window === 'undefined') return null;
  const cached = localStorage.getItem('sb-user-cache');
  if (!cached) return null;
  const decrypted = decryptData(cached);
  if (!decrypted) return null;
  try {
    return JSON.parse(decrypted);
  } catch {
    return null;
  }
}

if (typeof window !== 'undefined') {
  supabase.auth.onAuthStateChange((event, session) => {
    if (session) {
      const token = session.access_token;
      const encryptedToken = encryptData(token);
      document.cookie = `sb-access-token=${encodeURIComponent(encryptedToken)}; path=/; max-age=${60 * 60 * 24 * 7}; Secure; SameSite=Strict`;
      const userData = JSON.stringify(session.user);
      const encryptedUser = encryptData(userData);
      localStorage.setItem('sb-user-cache', encryptedUser);
    } else {
      document.cookie = 'sb-access-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; Secure; SameSite=Strict';
      localStorage.removeItem('sb-user-cache');
    }
  });
}

export async function getJWT() {
  if (typeof window !== 'undefined') {
    const cookies = document.cookie.split('; ');
    const cookieToken = cookies.find(row => row.startsWith('sb-access-token='));
    if (cookieToken) {
      const encryptedValue = decodeURIComponent(cookieToken.split('=')[1]);
      const decrypted = decryptData(encryptedValue);
      if (decrypted) return decrypted;
    }
  }
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

export async function getCurrentUser() {
  const cached = getCachedUser();
  if (cached) return cached;
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function upsertProfile(userId: string, fields: ProfileFields) {
  const { error } = await supabase
    .from('profiles')
    .upsert({ id: userId, ...fields }, { onConflict: 'id' });
  if (error) throw error;
}

export async function saveAssessmentResult(
  userId: string,
  vitals: FullAssessmentData,
  riskResult: RiskResult,
  topPlans: RecommendedPlan[]
) {
  const meta = {
    mobile_number: vitals.mobileNumber ?? vitals.mobile_number ?? '',
    covered_members: vitals.coveredMembersList ?? vitals.coveredMembers ?? vitals.covered_members ?? [],
    member_ages: vitals.memberAges ?? vitals.member_ages ?? {},
    medical_history: vitals.medicalHistory ?? vitals.medical_history ?? [],
    height: vitals.height ?? 0,
    weight: vitals.weight ?? 0,
    language: vitals.language ?? 'English',
    groups: vitals.groups ?? [],
    member_medical_history: vitals.memberMedicalHistory ?? {},
    member_vitals: vitals.memberVitals ?? {},
    member_dobs: vitals.memberDOBs ?? {},
  };
  const cleanName = vitals.fullName ?? vitals.full_name ?? 'Anonymous Member';
  const serializedName = `${cleanName} || ${JSON.stringify(meta)}`;

  const profileFields = {
    full_name: serializedName,
    gender: vitals.gender ?? '',
    city: vitals.city ?? '',
    annual_income: vitals.income_lakh ?? 0,
    monthly_budget: vitals.monthly_budget ?? 0,
  };

  try {
    await upsertProfile(userId, profileFields);
  } catch (err) {
    console.error(err);
  }

  const { data: session, error: sessionErr } = await supabase
    .from('assessment_sessions')
    .insert({
      user_id: userId,
      age: vitals.age,
      bmi: vitals.bmi,
      smoker: vitals.smoker === 1,
      hba1c: vitals.hba1c,
      bp_systolic: vitals.bp_systolic,
      has_diabetes: vitals.diabetes === 1,
      has_hypertension: vitals.hypertension === 1,
      chronic_count: vitals.chronic_count,
      risk_tier: riskResult.risk_tier,
      risk_score: riskResult.risk_score,
    })
    .select()
    .single();

  if (sessionErr) throw sessionErr;

  const { error: recErr } = await supabase
    .from('recommendations')
    .insert({
      user_id: userId,
      session_id: session.id,
      risk_tier: riskResult.risk_tier,
      risk_score: riskResult.risk_score,
      top_plan_ids: topPlans.map(p => ({
        id: p.id,
        score: p.suitability_score,
        cosine_similarity: p.cosine_similarity,
        plain_english_explanation: p.plain_english_explanation,
        warning_flags: p.warning_flags || [],
        feature_importance_explanation: riskResult.feature_importance_explanation,
      })),
    });

  if (recErr) throw recErr;

  await supabase
    .from('assessment_sessions')
    .update({ vitals_deleted: true })
    .eq('id', session.id);

  return session.id;
}

export async function toggleSavedPlan(userId: string, planId: number) {
  const { data: existing } = await supabase
    .from('saved_plans')
    .select('id')
    .eq('user_id', userId)
    .eq('plan_id', planId)
    .maybeSingle();

  if (existing) {
    await supabase.from('saved_plans').delete().eq('id', existing.id);
    return false;
  } else {
    await supabase.from('saved_plans').insert({ user_id: userId, plan_id: planId });
    return true;
  }
}

export async function getSavedPlanIds(userId: string) {
  const { data } = await supabase
    .from('saved_plans')
    .select('plan_id')
    .eq('user_id', userId);
  return (data || []).map(row => row.plan_id);
}

export async function getLatestRecommendation(userId: string) {
  const { data } = await supabase
    .from('recommendations')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}
