import os
import joblib
import pandas as pd
import xgboost as xgb
from dotenv import load_dotenv
import jwt
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, ConfigDict, AliasChoices
from typing import List, Optional, Dict, Any

load_dotenv()

# Outsurance FastAPI Server Reload Trigger - OpenAI Production Mode
from .plans_db import INSURANCE_PLANS
from .scorer import rank_plans, score_all_plans
from .llm_service import load_model, generate_text
from .stress_test import simulate
from .agent import run_agent
from .hospital_network import (
    filter_plan_hospitals,
    get_cities,
    get_plan_network,
    get_plan_city_stats,
)

app = FastAPI(title="Outsurance API", version="2.0")

_ALLOWED_ORIGINS = os.getenv(
    "CORS_ORIGINS", "http://localhost:3000"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=_ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── ML Model Paths ───────────────────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ML_DIR   = os.path.join(BASE_DIR, 'ml')

FEATURES = [
    'age', 'bmi', 'hba1c', 'bp_systolic',
    'smoker',
    # has_diabetes and has_hypertension removed — now encoded inside
    # condition_risk_score (weights 0.42 and 0.35). Keeping both would let
    # XGBoost split on the binary flag, collapsing condition_risk_score importance.
    'condition_risk_score',
    'bmi_age_interaction', 'metabolic_risk_score',
]

# Human-readable feature labels for explanation output
FEATURE_LABELS = {
    'age': 'Age',
    'bmi': 'BMI',
    'hba1c': 'HbA1c (%)',
    'bp_systolic': 'Blood Pressure (systolic)',
    'smoker': 'Smoker',
    'condition_risk_score': 'Condition Severity Score',
    'bmi_age_interaction': 'BMI×Age (metabolic load)',
    'metabolic_risk_score': 'Metabolic Risk Score',
}

# ─── Global Model Objects ────────────────────────────────────────────────────
risk_model = None
label_encoder = None
feature_importances = {}  # Global feature importance dict from trained model

def load_models_lazy():
    global risk_model, label_encoder, feature_importances
    if risk_model is not None and label_encoder is not None:
        return

    model_path   = os.path.join(ML_DIR, 'risk_model.json')
    encoder_path = os.path.join(ML_DIR, 'label_encoder.pkl')

    if os.path.exists(model_path) and risk_model is None:
        risk_model = xgb.XGBClassifier()
        risk_model.load_model(model_path)
        # Use gain-based importance so inference matches training metrics
        fi_raw = risk_model.get_booster().get_score(importance_type='gain')
        total = sum(fi_raw.values()) or 1
        feature_importances = {k: round(v / total, 4) for k, v in fi_raw.items()}
        print("XGBoost risk model loaded")

    if os.path.exists(encoder_path) and label_encoder is None:
        label_encoder = joblib.load(encoder_path)
        print("Label encoder loaded")

@app.on_event("startup")
def startup_event():
    load_models_lazy()
    # Load Gemma LLM
    load_model()


# ─── JWT Helper ───────────────────────────────────────────────────────────────
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "")
if not SUPABASE_JWT_SECRET:
    print("[WARN] SUPABASE_JWT_SECRET not set — JWT validation disabled (demo mode)")

def verify_jwt(request: Request) -> Optional[dict]:
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return None
    token = auth.split(" ", 1)[1]
    try:
        return jwt.decode(token, SUPABASE_JWT_SECRET, algorithms=["HS256"],
                          options={"verify_aud": False})
    except jwt.InvalidTokenError as e:
        print(f"JWT soft-fail (demo mode): {e}")
        return None


# ─── Pydantic Models ──────────────────────────────────────────────────────────
class UserProfile(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    age: int
    bmi: float
    smoker: int
    hba1c: float
    bp_systolic: int
    diabetes: int
    hypertension: int
    chronic_count: int
    monthly_budget: float
    income_lakh: float
    has_diabetes: Optional[bool] = None
    prediabetes: Optional[bool] = False
    has_hypertension: Optional[bool] = None
    coverage_for: Optional[str] = 'Individual'
    family_members: Optional[int] = 1
    medical_history: Optional[List[str]] = Field(
        default=[],
        validation_alias=AliasChoices('medical_history', 'medicalHistory'),
    )

class ScoreConditionsRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    medical_history: List[str] = Field(
        default=[],
        validation_alias=AliasChoices('medical_history', 'medicalHistory'),
    )

class ParseConditionsRequest(BaseModel):
    text: str

class ExtractionRequest(BaseModel):
    raw_text: Optional[str] = None
    image_base64: Optional[str] = None

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    user_vitals: Dict[str, Any]


# ─── Risk Assessment Helper ──────────────────────────────────────────────────
def assess_risk(profile: UserProfile, llm_generate=None):
    """Run XGBoost and return risk_tier, risk_score, explanation, condition_detail."""
    load_models_lazy()
    if llm_generate is None:
        llm_generate = generate_text

    has_diabetes     = profile.has_diabetes if profile.has_diabetes is not None else bool(profile.diabetes)
    has_hypertension = profile.has_hypertension if profile.has_hypertension is not None else bool(profile.hypertension)

    bmi_age_interaction  = round(profile.bmi * profile.age / 100, 2)
    metabolic_risk_score = round((profile.hba1c - 5.0) * profile.bmi / 10, 2)

    # STAGE 0: Dynamic condition scoring
    # Build a complete medical term list — form flags + free-text history.
    # This ensures condition_risk_score captures diabetes/hypertension even
    # when the user ticked the form checkbox but didn't type it in free text.
    medical_terms = list(profile.medical_history or [])
    history_lower = " ".join(medical_terms).lower()
    if has_diabetes and "diabet" not in history_lower:
        medical_terms.append("diabetes")
    if has_hypertension and "hypert" not in history_lower and "blood pressure" not in history_lower:
        medical_terms.append("hypertension")

    condition_detail = None
    if medical_terms:
        from .condition_scorer import score_conditions
        condition_detail = score_conditions(medical_terms, llm_generate)
        condition_risk_score = condition_detail["normalized_for_xgboost"]
    else:
        # Fallback: map chronic_count (legacy) to float range
        condition_risk_score = round(min(5.0, profile.chronic_count * 0.60), 4)

    row = {
        'age': profile.age,
        'bmi': profile.bmi,
        'hba1c': profile.hba1c,
        'bp_systolic': profile.bp_systolic,
        'smoker': profile.smoker,
        'condition_risk_score': condition_risk_score,
        'bmi_age_interaction': bmi_age_interaction,
        'metabolic_risk_score': metabolic_risk_score,
    }

    X = pd.DataFrame([row])[FEATURES]

    if risk_model and label_encoder:
        pred_idx  = risk_model.predict(X)[0]
        risk_tier = label_encoder.inverse_transform([pred_idx])[0]
        proba     = risk_model.predict_proba(X)[0]
        
        class_to_idx = {cls: idx for idx, cls in enumerate(label_encoder.classes_)}
        idx_critical = class_to_idx.get("Critical", 0)
        idx_high     = class_to_idx.get("High", 1)
        idx_low      = class_to_idx.get("Low", 2)
        idx_medium   = class_to_idx.get("Medium", 3)
        
        prob_critical = float(proba[idx_critical])
        prob_high     = float(proba[idx_high])
        prob_low      = float(proba[idx_low])
        prob_medium   = float(proba[idx_medium])
        
        risk_score = (prob_low * 0.12) + (prob_medium * 0.33) + (prob_high * 0.58) + (prob_critical * 0.85)

        explanation = {}
        for feat in FEATURES:
            imp = feature_importances.get(feat, feature_importances.get(f'f{FEATURES.index(feat)}', 0.0))
            label = FEATURE_LABELS.get(feat, feat)
            explanation[label] = round(imp, 4)
        explanation = dict(sorted(explanation.items(), key=lambda x: x[1], reverse=True)[:6])
    else:
        score = 0.0
        if profile.age > 50: score += 0.15
        if profile.bmi > 30: score += 0.12
        if profile.hba1c >= 6.5: score += 0.28
        elif profile.hba1c >= 5.7: score += 0.10
        if profile.bp_systolic >= 140: score += 0.15
        if profile.smoker: score += 0.12
        if profile.diabetes: score += 0.18
        if profile.hypertension: score += 0.10
        score += condition_risk_score * 0.12
        
        rs = min(1.0, score)
        if rs >= 0.70:   risk_tier = "Critical"
        elif rs >= 0.45: risk_tier = "High"
        elif rs >= 0.22: risk_tier = "Medium"
        else:            risk_tier = "Low"
        risk_score = rs
        explanation = {}

    return risk_tier, round(risk_score, 3), explanation, condition_detail


# ─── API Routes ───────────────────────────────────────────────────────────────
@app.get("/api/health")
def health_check():
    return {
        "status": "ok",
        "ml_model": "XGBoost" if risk_model else "heuristic-fallback",
        "llm": "Gemma 3 1B",
        "agent": "enabled",
        "plans": len(INSURANCE_PLANS),
    }


@app.get("/api/plans")
def get_all_plans():
    return {"plans": INSURANCE_PLANS}


@app.get("/api/hospital-network/cities")
def hospital_network_cities():
    return {"cities": get_cities()}


@app.get("/api/hospital-network/plans/{plan_id}")
def hospital_network_plan_summary(plan_id: int):
    entry = get_plan_network(plan_id)
    if not entry:
        raise HTTPException(status_code=404, detail="Plan network not found")
    benefits = entry.get("benefits", {})
    return {
        "plan_id": plan_id,
        "plan_name": entry.get("plan_name"),
        "insurer": entry.get("insurer"),
        "network_summary": entry.get("network_summary"),
        "national_network_count": benefits.get("network_hospital_count"),
        "cities": get_plan_city_stats(plan_id),
    }


@app.get("/api/hospital-network/plans/{plan_id}/hospitals")
def hospital_network_plan_hospitals(
    plan_id: int,
    city_id: int,
    q: str = "",
    settlement: str = "all",
    offset: int = 0,
    limit: int = 80,
):
    if not get_plan_network(plan_id):
        raise HTTPException(status_code=404, detail="Plan network not found")
    return filter_plan_hospitals(
        plan_id,
        city_id,
        query=q,
        settlement=settlement,
        offset=max(0, offset),
        limit=min(max(1, limit), 200),
    )


@app.post("/api/assess")
def assess_user(profile: UserProfile, request: Request):
    """
    3-Stage ML Pipeline:
      Stage 1: XGBoost → risk_tier + risk_score + SHAP explanation
      Stage 2: Weighted suitability scorer (5 factors)
      Stage 3: Cosine similarity blending (40%)
    Returns: top 5 plans with breakdown + Gemma plain-English explanation
    """
    user_payload = verify_jwt(request)
    user_id = user_payload.get("sub") if user_payload else "demo-user"
    print(f"[assess] user={user_id} age={profile.age} hba1c={profile.hba1c}")

    # Stage 1: XGBoost Risk Classification
    risk_tier, risk_score, shap_explanation, condition_detail = assess_risk(profile)
    print(f"  -> risk_tier={risk_tier}  risk_score={risk_score:.3f}")

    # Build user dict for scorer
    user_dict = profile.dict()
    user_dict['risk_tier']       = risk_tier
    user_dict['risk_score']      = risk_score
    user_dict['has_diabetes']    = int(bool(profile.diabetes or profile.has_diabetes))
    user_dict['has_hypertension']= int(bool(profile.hypertension or profile.has_hypertension))
    
    if condition_detail:
        user_dict['condition_risk_score'] = condition_detail['normalized_for_xgboost']
        user_dict['dominant_condition']   = condition_detail['dominant_condition']
        user_dict['condition_detail']     = condition_detail
        user_dict['condition_events']     = condition_detail.get('events') or []
    else:
        user_dict['condition_risk_score'] = round(min(5.0, profile.chronic_count * 0.60), 4)
        user_dict['dominant_condition']   = ""
        user_dict['condition_detail']     = None

    # Stages 2 + 3: Rank plans
    top_plans = rank_plans(INSURANCE_PLANS, user_dict)

    # Gemma: plain-English explanation per plan in parallel
    from concurrent.futures import ThreadPoolExecutor

    def generate_single_explanation(plan):
        if condition_detail and condition_detail.get("events"):
            cond_str = ", ".join(
                f"{e['name']} (severity: {e['weight']:.2f})"
                for e in sorted(condition_detail["events"], key=lambda x: -x["weight"])
            )
            risk_ctx = f"Risk summary: {condition_detail.get('risk_summary', '')}. "
        else:
            cond_str = ""
            if user_dict['has_diabetes']:   cond_str += "diabetes, "
            if user_dict['has_hypertension']: cond_str += "hypertension, "
            cond_str = cond_str.rstrip(", ") or "no major pre-existing conditions"
            risk_ctx = ""

        sys_prompt = (
            "You are Outsurance's AI health advisor. Write a warm, clear 2-sentence explanation "
            "of why this insurance plan is a good match for this user. Be specific about their health data."
        )
        user_prompt = (
            f"User: age={profile.age}, HbA1c={profile.hba1c}%, BP={profile.bp_systolic}, "
            f"BMI={profile.bmi}, conditions: {cond_str}. {risk_ctx}"
            f"budget=₹{profile.monthly_budget}/mo. "
            f"Plan: {plan['name']} ({plan['type']}) — ₹{plan['annual_premium']}/yr. "
            f"Match score: {plan['suitability_score']}/10. Why does this plan fit?"
        )
        try:
            explanation = generate_text(sys_prompt, user_prompt, max_tokens=80)
            plan['plain_english_explanation'] = explanation
        except Exception as e:
            print(f"[WARN] Gemma explanation failed for plan {plan.get('id')}: {e}")
            plan['plain_english_explanation'] = (
                f"This {plan['type']} plan scored {plan['suitability_score']}/10 for your profile, "
                f"offering good coverage for your age and health conditions."
            )

    with ThreadPoolExecutor(max_workers=len(top_plans)) as executor:
        list(executor.map(generate_single_explanation, top_plans))

    return {
        "risk_assessment": {
            "risk_tier": risk_tier,
            "risk_score": risk_score,
            "confidence_pct": round(risk_score * 100),
            "feature_importance_explanation": shap_explanation,
            "condition_detail": condition_detail,
        },
        "recommended_plans": top_plans,
    }


def _build_user_dict_for_scoring(profile: "UserProfile", risk_tier: str, risk_score: float, condition_detail):
    user_dict = profile.dict()
    user_dict['risk_tier'] = risk_tier
    user_dict['risk_score'] = risk_score
    user_dict['has_diabetes'] = int(bool(profile.diabetes or profile.has_diabetes))
    user_dict['has_hypertension'] = int(bool(profile.hypertension or profile.has_hypertension))
    if condition_detail:
        user_dict['condition_risk_score'] = condition_detail['normalized_for_xgboost']
        user_dict['dominant_condition'] = condition_detail['dominant_condition']
        user_dict['condition_detail'] = condition_detail
        user_dict['condition_events'] = condition_detail.get('events') or []
    else:
        user_dict['condition_risk_score'] = round(min(5.0, profile.chronic_count * 0.60), 4)
        user_dict['dominant_condition'] = ''
        user_dict['condition_detail'] = None
    return user_dict


@app.post("/api/rank-plans")
def rank_all_plans_endpoint(profile: UserProfile, request: Request):
    """
    Score the full in-memory catalogue (Stages 2+3) without Gemma explanations.
    Returns all eligible plans with suitability_score and cosine_similarity.
    """
    verify_jwt(request)
    risk_tier, risk_score, _, condition_detail = assess_risk(profile)
    user_dict = _build_user_dict_for_scoring(profile, risk_tier, risk_score, condition_detail)
    scored = score_all_plans(INSURANCE_PLANS, user_dict)
    return {
        "risk_assessment": {
            "risk_tier": risk_tier,
            "risk_score": risk_score,
            "condition_detail": condition_detail,
        },
        "scored_plans": scored,
        "total": len(scored),
    }


class AgentRequest(BaseModel):
    messages: List[ChatMessage]
    session: Dict[str, Any]  # {profile, risk_data, current_plans}

class StressTestRequest(BaseModel):
    plan_id: int
    scenario_id: str

def _assess_risk_dict(profile_dict: dict):
    """Dict-compatible wrapper around assess_risk for the agent layer."""
    allowed = set(UserProfile.__fields__.keys())
    cleaned = {k: v for k, v in profile_dict.items() if k in allowed}
    return assess_risk(UserProfile(**cleaned))


@app.post("/api/agent")
def master_agent_endpoint(req: AgentRequest, request: Request):
    """
    Master Orchestration Agent — handles all post-assessment operations
    through natural language.

    Tools available:
      reassess     — re-run 3-stage ML pipeline (with updated conditions/budget)
      budget_sim   — re-rank plans for a new monthly budget
      stress_test  — emergency out-of-pocket cost simulation
      compare      — side-by-side plan comparison table
      explain_risk — plain-English risk tier explanation
      plan_info    — detailed plan lookup

    Request body:
      messages: [{role: "user"|"assistant", content: "..."}]
      session:  {profile: {...}, risk_data: {...}, current_plans: [...]}

    Returns:
      response, tool_used, tool_result, updated_session
    """
    verify_jwt(request)  # soft-fail in demo mode

    messages = [{"role": m.role, "content": m.content} for m in req.messages]

    result = run_agent(
        messages=messages,
        session=req.session,
        risk_assessee=_assess_risk_dict,
        plan_ranker=rank_plans,
        llm_generate=generate_text,
    )
    return result


@app.post("/api/stress-test")
def run_stress_test(req: StressTestRequest):
    plan = next((p for p in INSURANCE_PLANS if p["id"] == req.plan_id), None)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    result = simulate(plan, req.scenario_id)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


class PredictScenarioRequest(BaseModel):
    scenario_name: str

@app.post("/api/predict-scenario")
def predict_scenario_details(req: PredictScenarioRequest):
    sys_prompt = (
        "You are a medical pricing estimator. Given a medical scenario name, "
        "estimate: 1. the typical total hospital cost in INR (rupees), "
        "2. the typical length of stay in days, and "
        "3. whether it is a pre-existing chronic condition (true/false). "
        "Return ONLY a clean JSON object, no explanation, no markdown backticks, like: "
        "{\"cost\": 350000, \"days\": 4, \"isChronic\": false}"
    )
    user_prompt = f"Estimate medical details for: {req.scenario_name}"
    try:
        response_text = generate_text(sys_prompt, user_prompt, max_tokens=100)
        cleaned = response_text.replace("```json", "").replace("```", "").strip()
        import json
        data = json.loads(cleaned)
        return {
            "cost": int(data.get("cost", 300000)),
            "days": int(data.get("days", 3)),
            "isChronic": bool(data.get("isChronic", False))
        }
    except Exception as e:
        print(f"Error predicting scenario: {e}")
        name = req.scenario_name.lower()
        cost = 300000
        days = 3
        is_chronic = False
        if "cancer" in name or "chemo" in name:
            cost = 600000
            days = 5
            is_chronic = True
        elif "heart" in name or "cardiac" in name or "stroke" in name:
            cost = 500000
            days = 4
            is_chronic = True
        elif "bone" in name or "fracture" in name or "knee" in name:
            cost = 250000
            days = 3
        return {"cost": cost, "days": days, "isChronic": is_chronic}


@app.post("/api/score-conditions")
def score_conditions_endpoint(req: ScoreConditionsRequest):
    """
    Stage 0 only: score a list of medical terms via condition_scorer (cache + Gemma).
    Used by the assessment UI for previews before full /api/assess.
    """
    from .condition_scorer import score_conditions

    terms = [t.strip() for t in (req.medical_history or []) if t and t.strip()]
    if not terms:
        return {
            "condition_detail": {
                "events": [],
                "total_condition_risk_score": 0.0,
                "normalized_for_xgboost": 0.0,
                "dominant_condition": None,
                "risk_summary": "No conditions reported.",
            }
        }
    detail = score_conditions(terms, generate_text)
    return {"condition_detail": detail, "medical_history": terms}


@app.post("/api/parse-conditions")
def parse_conditions_endpoint(req: ParseConditionsRequest):
    """
    ML flow: NER extract (agent.py) → Stage 0 score (condition_scorer.py).
    """
    from .agent import _extract_medical_terms
    from .condition_scorer import score_conditions

    text = (req.text or "").strip()
    if not text:
        return {"extracted_terms": [], "condition_detail": None}

    terms = _extract_medical_terms(text, generate_text)
    if not terms:
        return {"extracted_terms": [], "condition_detail": None}

    detail = score_conditions(terms, generate_text)
    return {"extracted_terms": terms, "condition_detail": detail}


@app.post("/api/extract")
def extract_health_metrics(req: ExtractionRequest):
    """
    Gemma extracts health values from PDF text or image.
    Returns JSON if values found, conversational string if values missing.
    """
    sys_prompt = (
        "You are a medical data extraction AI. Extract 'hba1c' (HbA1c %), "
        "'bp_systolic' (systolic blood pressure mmHg), and 'bmi' (BMI) from the text. "
        "If all found, return ONLY valid raw JSON like: {\"hba1c\": 6.2, \"bp_systolic\": 128, \"bmi\": 26.5}. "
        "If any are missing, return a friendly message asking the user to provide them. "
        "Do NOT use markdown code blocks."
    )
    if req.raw_text:
        content = req.raw_text
    elif req.image_base64:
        content = f"[Base64 image data provided — length: {len(req.image_base64)} chars. Extract health values from this medical image.]"
    else:
        content = "[No content provided]"
    user_prompt = f"Extract from this lab report:\n{content}"
    result = generate_text(sys_prompt, user_prompt, max_tokens=120)
    return {"extracted_result": result}


@app.post("/api/chat")
def chat_agent(req: ChatRequest):
    """
    Health advisor chat. Parses new conditions (NER → Stage 0) when present.
    """
    from .agent import _extract_medical_terms
    from .condition_scorer import score_conditions

    latest = req.messages[-1].content if req.messages else ""
    existing_history = list(req.user_vitals.get("medical_history") or [])

    extracted_terms: List[str] = []
    condition_detail = None
    if latest.strip():
        extracted_terms = _extract_medical_terms(latest, generate_text)
        if extracted_terms:
            merged = list(dict.fromkeys(existing_history + extracted_terms))
            condition_detail = score_conditions(merged, generate_text)

    sys_prompt = (
        "You are Outsurance's AI health advisor. You help users understand their insurance "
        "recommendations, answer questions about their health risk, and explain plan features. "
        "Be brief (2-3 sentences), warm, and jargon-free. "
        "If the user describes a new condition, acknowledge it and explain how it may affect premiums."
    )
    history = "\n".join(
        f"{m.role.capitalize()}: {m.content}" for m in req.messages[:-1]
    )
    cond_ctx = ""
    if condition_detail and condition_detail.get("events"):
        ev = condition_detail["events"]
        cond_ctx = (
            f"\nParsed conditions (Stage 0): {', '.join(e['name'] for e in ev)}. "
            f"Risk summary: {condition_detail.get('risk_summary', '')}. "
            f"Severity score: {condition_detail.get('normalized_for_xgboost', 0):.2f}/5.0."
        )
    user_prompt = (
        f"User vitals: {req.user_vitals}\n"
        f"{cond_ctx}\n"
        f"Chat history:\n{history}\n"
        f"User: {latest}\nAdvisor:"
    )
    result = generate_text(sys_prompt, user_prompt, max_tokens=150)
    return {
        "response": result,
        "extracted_terms": extracted_terms,
        "condition_detail": condition_detail,
    }
