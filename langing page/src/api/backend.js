import { supabase, getJWT } from './supabase';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://10.0.2.2:8000/api';

/**
 * Call the FastAPI risk assessment endpoint.
 * Automatically attaches the Supabase JWT in the Authorization header.
 */
export async function assessHealthProfile(profileData) {
  const token = await getJWT();

  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${BACKEND_URL}/assess`, {
      method: 'POST',
      headers,
      body: JSON.stringify(profileData),
    });

    if (!response.ok) {
      throw new Error(`Backend error ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

/**
 * Fetch all insurance plans from the backend.
 * No auth required (plans are public).
 */
export async function fetchAllPlans() {
  try {
    const response = await fetch(`${BACKEND_URL}/plans`);
    if (!response.ok) throw new Error('Failed to fetch plans');
    const data = await response.json();
    return data.plans || [];
  } catch (error) {
    console.error('Plans fetch error:', error);
    throw error;
  }
}

/** Health check for the FastAPI backend */
export async function checkBackendHealth() {
  try {
    const response = await fetch(`${BACKEND_URL}/health`);
    return response.ok;
  } catch {
    return false;
  }
}

export async function runStressTest(planId, scenarioId) {
  try {
    const response = await fetch(`${BACKEND_URL}/stress-test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan_id: planId, scenario_id: scenarioId })
    });
    if (!response.ok) throw new Error('Stress test failed');
    return await response.json();
  } catch (error) {
    console.error('Stress test error:', error);
    throw error;
  }
}

/**
 * Call the Master Orchestration Agent.
 *
 * The agent handles all post-assessment operations through natural language:
 *   - "What if I also have kidney disease?"  → re-runs 3-stage ML pipeline
 *   - "What if my budget was ₹2000/month?"   → re-ranks plans for new budget
 *   - "What if I had a cardiac event?"        → stress test simulation
 *   - "Compare plan 3 and plan 9"             → side-by-side comparison table
 *   - "Why am I High risk?"                   → feature-importance explanation
 *   - "Tell me more about plan 2"             → full plan detail lookup
 *
 * @param {Array}  messages  Full chat history [{role, content}, ...]
 * @param {Object} session   { profile, risk_data, current_plans }
 * @returns {Object} { response, tool_used, tool_result, updated_session }
 */
export async function callAgent(messages, session) {
  const token = await getJWT();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  try {
    const response = await fetch(`${BACKEND_URL}/agent`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ messages, session }),
    });
    if (!response.ok) throw new Error(`Agent error ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('Agent error:', error);
    throw error;
  }
}
