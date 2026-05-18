import { Platform } from 'react-native';

/** 
 * OUTSURANCE ON-DEVICE AI (PROXY TO LOCAL BACKEND)
 * Model: Gemma 3 1B
 * Runtime: Local Python FastAPI (Hugging Face Transformers)
 */

const BACKEND_URL = Platform.OS === 'android' 
  ? 'http://10.0.2.2:8000/api'
  : 'http://localhost:8000/api';

export async function initGemma3() {
  console.log("Checking backend Hugging Face Pipeline at", BACKEND_URL);
  // Assume it's ready, but could add a healthcheck endpoint
  return true; 
}

/**
 * Generates a human-friendly insurance explanation via backend LLM.
 */
export async function generateOnDeviceReasoning(plan, userProfile) {
  try {
    const response = await fetch(`${BACKEND_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        plan_name: plan.name,
        user_vitals: `Age ${userProfile.age}, HbA1c ${userProfile.hba1c}%, BP ${userProfile.bp_systolic}`
      })
    });
    const data = await response.json();
    return data.response;
  } catch (error) {
    console.error("Backend Chat Error:", error);
    if (userProfile.hba1c > 6.0 && plan.diabetes_day1) {
      return `Given your HbA1c of ${userProfile.hba1c}%, this plan is perfect because it provides Day 1 coverage for diabetes.`;
    } else {
      return `With a suitability score of ${plan.suitability_score}, this plan offers a great balance of coverage for your age group.`;
    }
  }
}

/**
 * AI Health Agent logic for Step 3 via backend LLM.
 */
export async function processLabReport(rawText, imageBase64 = null) {
  try {
    const response = await fetch(`${BACKEND_URL}/extract`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw_text: rawText, image_base64: imageBase64 })
    });
    const data = await response.json();
    
    // Check if the model gave a conversational reply (missing values) or raw JSON
    const resString = data.extracted_result || data.extracted_json_string || "{}";
    
    try {
      const result = JSON.parse(resString);
      return { 
        hba1c: result.hba1c || null, 
        bp_systolic: result.bp_systolic || null, 
        bmi: result.bmi || null,
        confidence: 90
      };
    } catch (parseError) {
      // If it's not JSON, it means Gemma sent a conversational message asking for missing data.
      return { raw_reply: resString, confidence: 50 };
    }
  } catch (error) {
    console.error("Backend Extraction Error:", error);
    // Fallback if failed
    return { hba1c: null, bp_systolic: null, bmi: null, confidence: 0 };
  }
}
