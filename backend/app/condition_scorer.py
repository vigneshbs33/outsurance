import os
import json
from typing import List, Dict, Any, Optional, Callable

# Paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE_PATH = os.path.join(BASE_DIR, "ml", "condition_cache.json")

CONDITION_SCORER_SYSTEM_PROMPT = """
You are a medical risk assessor for a health insurance AI system.
Analyze each health event and assign an insurance risk weight between 0.0 and 1.0.

Risk Weight Scale:
  0.00 – 0.10 : Fully resolved / negligible long-term risk
                Examples: appendix surgery (healed), minor fracture, cold, dental work
  0.11 – 0.30 : Low-moderate / well-controlled chronic
                Examples: hypothyroid (on meds), mild controlled asthma, PCOS
  0.31 – 0.55 : Moderate chronic — affects insurance claims
                Examples: Type 2 diabetes, hypertension, kidney stones history
  0.56 – 0.75 : High — serious with complication risk
                Examples: COPD, liver cirrhosis, previous stroke, CKD stage 3
  0.76 – 0.90 : Very High — serious with recurrence risk
                Examples: cancer in remission, previous major heart surgery, CKD 4-5
  0.91 – 1.00 : Critical — active life-threatening
                Examples: recent heart attack (<1yr), active cancer (on chemo), organ failure

Rules:
- RESOLVED events (healed, no complications) → use lower bound of range
- ACTIVE / CHRONIC / ONGOING → use upper bound of range
- NOT a medical condition → assign weight 0.0
- When uncertain about severity, lean toward the LOWER estimate

Return ONLY valid raw JSON. No markdown. No explanation outside the JSON.
{
  "events": [
    {"name": "...", "weight": 0.00, "resolved": true, "justification": "one sentence"}
  ],
  "total_condition_risk_score": 0.00,
  "dominant_condition": "highest weight event name, or null",
  "risk_summary": "one sentence overall risk profile"
}
"""

def load_cache() -> Dict[str, float]:
    if os.path.exists(CACHE_PATH):
        try:
            with open(CACHE_PATH, "r") as f:
                return json.load(f)
        except Exception as e:
            print(f"[WARN] Failed to load condition cache from {CACHE_PATH}: {e}")
    return {}

def save_cache(cache: Dict[str, float]):
    try:
        os.makedirs(os.path.dirname(CACHE_PATH), exist_ok=True)
        with open(CACHE_PATH, "w") as f:
            json.dump(cache, f, indent=2)
    except Exception as e:
        print(f"[WARN] Failed to save condition cache to {CACHE_PATH}: {e}")

def normalize_for_xgboost(raw_sum: float) -> float:
    return round(min(5.0, raw_sum), 4)

def score_conditions(medical_history: List[str], llm_generate: Optional[Callable] = None) -> Dict[str, Any]:
    """
    Evaluates risk weight for each condition in medical_history.
    Uses in-memory cache, queries LLM if not found, and saves newly discovered conditions.
    """
    if not medical_history:
        return {
            "events": [],
            "total_condition_risk_score": 0.0,
            "normalized_for_xgboost": 0.0,
            "dominant_condition": None,
            "risk_summary": "No conditions reported."
        }

    cache = load_cache()
    
    # Check if ALL requested conditions exist in cache
    all_in_cache = True
    cached_events = []
    for cond in medical_history:
        norm_cond = cond.strip().lower()
        if norm_cond in cache:
            weight = cache[norm_cond]
            # Infer resolved state from name and weight
            is_resolved = any(x in norm_cond for x in ["surgery", "appendectomy", "fracture", "tonsillectomy", "healed"]) or weight <= 0.10
            cached_events.append({
                "name": cond,
                "weight": weight,
                "resolved": is_resolved,
                "justification": "Retrieved from medical database."
            })
        else:
            all_in_cache = False

    if all_in_cache:
        total_score = sum(e["weight"] for e in cached_events)
        dominant = max(cached_events, key=lambda e: e["weight"]) if cached_events else None
        dominant_name = dominant["name"] if dominant else None
        
        # Formulate risk summary
        if dominant and dominant["weight"] >= 0.76:
            summary = f"High-risk profile dominated by history of {dominant_name}."
        elif dominant and dominant["weight"] >= 0.31:
            summary = f"Moderate risk profile with chronic {dominant_name}."
        elif dominant:
            summary = f"Low risk profile with mild condition: {dominant_name}."
        else:
            summary = "Negligible medical risk profile."

        return {
            "events": cached_events,
            "total_condition_risk_score": round(total_score, 4),
            "normalized_for_xgboost": normalize_for_xgboost(total_score),
            "dominant_condition": dominant_name,
            "risk_summary": summary
        }

    # Call LLM if we have missing items and llm_generate is available
    if llm_generate:
        user_prompt = f"Analyze the following medical conditions: {', '.join(medical_history)}"
        try:
            # First attempt
            response_str = llm_generate(CONDITION_SCORER_SYSTEM_PROMPT, user_prompt, max_tokens=300)
            result = parse_llm_json(response_str)
            if result:
                update_cache_with_new_events(result, cache)
                result["normalized_for_xgboost"] = normalize_for_xgboost(result.get("total_condition_risk_score", 0.0))
                return result
        except Exception as e:
            print(f"[WARN] First LLM attempt for condition scoring failed: {e}")

        # Retry once with stricter prompt
        try:
            strict_prompt = CONDITION_SCORER_SYSTEM_PROMPT + "\nRemember: Output ONLY valid JSON, do not wrap in markdown ```json."
            response_str = llm_generate(strict_prompt, user_prompt, max_tokens=300)
            result = parse_llm_json(response_str)
            if result:
                update_cache_with_new_events(result, cache)
                result["normalized_for_xgboost"] = normalize_for_xgboost(result.get("total_condition_risk_score", 0.0))
                return result
        except Exception as e:
            print(f"[WARN] Stricter LLM retry for condition scoring failed: {e}")

    # Fallback to local hardcoded rules & default scoring
    return build_fallback_response(medical_history, cache)

def parse_llm_json(response_str: str) -> Optional[Dict[str, Any]]:
    if not response_str:
        return None
    # Strip markdown code blocks if present
    cleaned = response_str.strip()
    if cleaned.startswith("```"):
        lines = cleaned.splitlines()
        if len(lines) > 2:
            cleaned = "\n".join(lines[1:-1]) if "json" in lines[0] else "\n".join(lines[1:])
    cleaned = cleaned.strip("` \n\r\t")
    
    try:
        data = json.loads(cleaned)
        # Verify keys
        if "events" in data and "total_condition_risk_score" in data:
            return data
    except Exception as e:
        print(f"[WARN] JSON parsing failed for text: '{response_str}' - Error: {e}")
    return None

def update_cache_with_new_events(result: Dict[str, Any], cache: Dict[str, float]):
    updated = False
    for event in result.get("events", []):
        name = event.get("name")
        weight = event.get("weight")
        if name and isinstance(weight, (int, float)):
            norm_name = name.strip().lower()
            if norm_name not in cache:
                cache[norm_name] = float(weight)
                updated = True
    if updated:
        save_cache(cache)

def build_fallback_response(medical_history: List[str], cache: Dict[str, float]) -> Dict[str, Any]:
    events = []
    total_score = 0.0
    
    for cond in medical_history:
        norm_cond = cond.strip().lower()
        if norm_cond in cache:
            weight = cache[norm_cond]
            justification = "Retrieved from medical database."
        else:
            # Standard fallbacks for common un-cached words
            if any(x in norm_cond for x in ["heart", "cardiac", "bypass"]):
                weight = 0.95
                justification = "Cardiovascular disease history (fallback estimation)."
            elif any(x in norm_cond for x in ["cancer", "tumor"]):
                weight = 0.85
                justification = "Neoplasm history (fallback estimation)."
            elif any(x in norm_cond for x in ["kidney", "renal"]):
                weight = 0.70
                justification = "Kidney disorder history (fallback estimation)."
            elif any(x in norm_cond for x in ["diabetes", "sugar"]):
                weight = 0.42
                justification = "Endocrine chronic disease (fallback estimation)."
            elif any(x in norm_cond for x in ["surgery", "removal", "healed", "fracture"]):
                weight = 0.08
                justification = "Resolved history / low risk event (fallback estimation)."
            else:
                weight = 0.35  # Count condition * 0.35 fallback
                justification = "Uncategorized condition (default fallback score)."
        
        is_resolved = any(x in norm_cond for x in ["surgery", "appendectomy", "fracture", "tonsillectomy", "healed"]) or weight <= 0.10
        events.append({
            "name": cond,
            "weight": weight,
            "resolved": is_resolved,
            "justification": justification
        })
        total_score += weight

    dominant = max(events, key=lambda e: e["weight"]) if events else None
    dominant_name = dominant["name"] if dominant else None

    # Risk summary
    if dominant and dominant["weight"] >= 0.76:
        summary = f"Fallback high-risk profile dominated by history of {dominant_name}."
    elif dominant and dominant["weight"] >= 0.31:
        summary = f"Fallback moderate risk profile with chronic {dominant_name}."
    elif dominant:
        summary = f"Fallback low risk profile with mild condition: {dominant_name}."
    else:
        summary = "Fallback negligible medical risk profile."

    return {
        "events": events,
        "total_condition_risk_score": round(total_score, 4),
        "normalized_for_xgboost": normalize_for_xgboost(total_score),
        "dominant_condition": dominant_name,
        "risk_summary": summary
    }
