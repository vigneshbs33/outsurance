import { getJWT } from './supabase';
import plansFallback from './plans.json';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000/api';

export async function assessHealthProfile(profileData: Record<string, unknown>) {
  const token = await getJWT();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(`${BACKEND_URL}/assess`, {
    method: 'POST',
    headers,
    body: JSON.stringify(profileData),
  });
  if (!response.ok) throw new Error(`Backend error ${response.status}`);
  return await response.json();
}

export async function fetchAllPlans() {
  try {
    const response = await fetch(`${BACKEND_URL}/plans`);
    if (!response.ok) throw new Error('Failed to fetch plans');
    const data = await response.json();
    return data.plans || plansFallback;
  } catch (error) {
    return plansFallback;
  }
}

export async function checkBackendHealth() {
  try {
    const response = await fetch(`${BACKEND_URL}/health`);
    return response.ok;
  } catch {
    return false;
  }
}

export async function runStressTest(planId: number, scenarioId: string) {
  const response = await fetch(`${BACKEND_URL}/stress-test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ plan_id: planId, scenario_id: scenarioId }),
  });
  if (!response.ok) throw new Error('Stress test failed');
  return await response.json();
}

export async function predictScenarioDetails(scenarioName: string) {
  const response = await fetch(`${BACKEND_URL}/predict-scenario`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scenario_name: scenarioName }),
  });
  if (!response.ok) throw new Error('Prediction failed');
  return await response.json();
}

export async function callAgent(
  messages: { role: string; content: string }[],
  session: Record<string, unknown>
) {
  const token = await getJWT();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(`${BACKEND_URL}/agent`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ messages, session }),
  });
  if (!response.ok) throw new Error(`Agent error ${response.status}`);
  return await response.json();
}

export async function extractHealthMetrics(rawText: string) {
  const response = await fetch(`${BACKEND_URL}/extract`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ raw_text: rawText }),
  });
  if (!response.ok) throw new Error('Extraction failed');
  return await response.json();
}

export async function chatWithAdvisor(
  messages: { role: string; content: string }[],
  userVitals: Record<string, unknown>
) {
  const response = await fetch(`${BACKEND_URL}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, user_vitals: userVitals }),
  });
  if (!response.ok) throw new Error('Chat failed');
  return await response.json();
}

/** Stage 0: score medical terms via condition_scorer (cache + Gemma). */
export async function scoreConditions(medicalHistory: string[]) {
  const response = await fetch(`${BACKEND_URL}/score-conditions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ medical_history: medicalHistory }),
  });
  if (!response.ok) throw new Error('Condition scoring failed');
  return await response.json();
}

/** NER extract → Stage 0 score (ML_Details pipeline). */
export async function parseConditionsFromText(text: string) {
  const response = await fetch(`${BACKEND_URL}/parse-conditions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (!response.ok) throw new Error('Condition parsing failed');
  return await response.json();
}

export async function processLabReport(rawText: string) {
  const result = await extractHealthMetrics(rawText);
  const extracted = result.extracted_result;
  if (typeof extracted === 'object' && extracted.hba1c) {
    return extracted;
  }
  throw new Error('Failed to extract health metrics from report');
}

export function generateOnDeviceReasoning(plan: Record<string, unknown>, userProfile: Record<string, unknown>) {
  const hba1c = userProfile.hba1c as number;
  if (hba1c > 6.0 && plan.diabetes_day1) {
    return `Given your HbA1c of ${hba1c}%, this plan provides Day 1 diabetes coverage—no waiting period. Your health is protected from moment one.`;
  }
  const waitYears = (plan.preexisting_wait_years ?? plan.pre_existing_wait_years) as number;
  return `With a suitability score of ${plan.suitability_score}/10, this plan offers optimal coverage balance. The ${waitYears}-year waiting period is competitive for your health profile.`;
}
