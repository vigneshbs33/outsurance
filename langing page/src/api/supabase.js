import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns the current JWT access token (for sending to FastAPI) */
export async function getJWT() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

/** Returns the current signed-in user, or null */
export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

/** Upsert user profile row after sign-up / update */
export async function upsertProfile(userId, fields) {
  const { error } = await supabase
    .from('profiles')
    .upsert({ id: userId, ...fields }, { onConflict: 'id' });
  if (error) throw error;
}

/** Save a completed assessment session + recommendation */
export async function saveAssessmentResult(userId, vitals, _ignored, topPlans) {
  // 1. Insert assessment session (ephemeral vitals)
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
    })
    .select()
    .single();

  if (sessionErr) throw sessionErr;

  // 2. Insert recommendation (permanent - only scores)
  const { error: recErr } = await supabase
    .from('recommendations')
    .insert({
      user_id: userId,
      session_id: session.id,
      top_plan_ids: topPlans.map(p => ({ id: p.id, score: p.suitability_score })),
    });

  if (recErr) throw recErr;

  // 3. Delete raw vitals from the session (ephemeral data - privacy guarantee)
  await supabase
    .from('assessment_sessions')
    .update({ vitals_deleted: true })
    .eq('id', session.id);

  return session.id;
}

/** Toggle save/unsave a plan */
export async function toggleSavedPlan(userId, planId) {
  const { data: existing } = await supabase
    .from('saved_plans')
    .select('id')
    .eq('user_id', userId)
    .eq('plan_id', planId)
    .single();

  if (existing) {
    await supabase.from('saved_plans').delete().eq('id', existing.id);
    return false; // now unsaved
  } else {
    await supabase.from('saved_plans').insert({ user_id: userId, plan_id: planId });
    return true; // now saved
  }
}

/** Get all saved plan IDs for a user */
export async function getSavedPlanIds(userId) {
  const { data } = await supabase
    .from('saved_plans')
    .select('plan_id')
    .eq('user_id', userId);
  return (data || []).map(row => row.plan_id);
}

/** Get the user's latest recommendation */
export async function getLatestRecommendation(userId) {
  const { data } = await supabase
    .from('recommendations')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  return data;
}
