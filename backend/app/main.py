import os
import joblib
import pandas as pd
import xgboost as xgb
from dotenv import load_dotenv
import jwt
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any

load_dotenv()

# Outsurance FastAPI Server Reload Trigger - OpenAI Production Mode
from .plans_db import INSURANCE_PLANS
from .scorer import rank_plans
from .llm_service import load_model, generate_text
from .stress_test import simulate
from .agent import run_agent

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
    'smoker', 'has_diabetes', 'has_hypertension',
    'chronic_count', 'bmi_age_interaction', 'metabolic_risk_score',
]

# Human-readable feature labels for explanation output
FEATURE_LABELS = {
    'age': 'Age',
    'bmi': 'BMI',
    'hba1c': 'HbA1c (%)',
    'bp_systolic': 'Blood Pressure (systolic)',
    'smoker': 'Smoker',
    'has_diabetes': 'Diabetes',
    'has_hypertension': 'Hypertension',
    'chronic_count': 'Chronic Conditions',
    'bmi_age_interaction': 'BMI×Age (metabolic load)',
    'metabolic_risk_score': 'Metabolic Risk Score',
}

# ─── Global Model Objects ────────────────────────────────────────────────────
risk_model = None
label_encoder = None
feature_importances = {}  # Global feature importance dict from trained model

@app.on_event("startup")
def startup_event():
    global risk_model, label_encoder, feature_importances

    # Load XGBoost risk model
    model_path   = os.path.join(ML_DIR, 'risk_model.json')
    encoder_path = os.path.join(ML_DIR, 'label_encoder.pkl')
    shap_path    = os.path.join(ML_DIR, 'shap_explainer.pkl')

    if os.path.exists(model_path):
        risk_model = xgb.XGBClassifier()
        risk_model.load_model(model_path)
        # Extract feature importances for explanation
        fi = risk_model.get_booster().get_fscore()
        total = sum(fi.values()) or 1
        feature_importances = {k: round(v / total, 4) for k, v in fi.items()}
        print("XGBoost risk model loaded")
    else:
        print("XGBoost model not found — run: python -m ml.train_model")

    if os.path.exists(encoder_path):
        label_encoder = joblib.load(encoder_path)
        print("Label encoder loaded")

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
def assess_risk(profile: UserProfile):
    """Run XGBoost and return risk_tier, risk_score, explanation."""
    has_diabetes     = profile.has_diabetes if profile.has_diabetes is not None else bool(profile.diabetes)
    has_hypertension = profile.has_hypertension if profile.has_hypertension is not None else bool(profile.hypertension)

    bmi_age_interaction  = round(profile.bmi * profile.age / 100, 2)
    metabolic_risk_score = round((profile.hba1c - 5.0) * profile.bmi / 10, 2)

    row = {
        'age': profile.age,
        'bmi': profile.bmi,
        'hba1c': profile.hba1c,
        'bp_systolic': profile.bp_systolic,
        'smoker': profile.smoker,
        'has_diabetes': int(has_diabetes),
        'has_hypertension': int(has_hypertension),
        'chronic_count': profile.chronic_count,
        'bmi_age_interaction': bmi_age_interaction,
        'metabolic_risk_score': metabolic_risk_score,
    }

    X = pd.DataFrame([row])[FEATURES]

    if risk_model and label_encoder:
        pred_idx  = risk_model.predict(X)[0]
        risk_tier = label_encoder.inverse_transform([pred_idx])[0]
        proba     = risk_model.predict_proba(X)[0]
        risk_score = float(max(proba))

        # Feature-importance-weighted explanation
        explanation = {}
        for feat in FEATURES:
            imp = feature_importances.get(feat, feature_importances.get(f'f{FEATURES.index(feat)}', 0.0))
            label = FEATURE_LABELS.get(feat, feat)
            explanation[label] = round(imp, 4)
        # Sort by importance and return top 6
        explanation = dict(sorted(explanation.items(), key=lambda x: x[1], reverse=True)[:6])
    else:
        # Fallback heuristic
        score = 0.0
        if profile.age > 50: score += 0.15
        if profile.bmi > 30: score += 0.12
        if profile.hba1c >= 6.5: score += 0.28
        elif profile.hba1c >= 5.7: score += 0.10
        if profile.bp_systolic >= 140: score += 0.15
        if profile.smoker: score += 0.12
        if profile.diabetes: score += 0.18
        if profile.hypertension: score += 0.10
        rs = min(1.0, score)
        if rs >= 0.70:   risk_tier = "Critical"
        elif rs >= 0.45: risk_tier = "High"
        elif rs >= 0.22: risk_tier = "Medium"
        else:            risk_tier = "Low"
        risk_score = rs
        explanation = {}

    return risk_tier, round(risk_score, 3), explanation


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
    risk_tier, risk_score, shap_explanation = assess_risk(profile)
    print(f"  -> risk_tier={risk_tier}  risk_score={risk_score:.3f}")

    # Build user dict for scorer
    user_dict = profile.dict()
    user_dict['risk_tier']       = risk_tier
    user_dict['risk_score']      = risk_score
    user_dict['has_diabetes']    = int(bool(profile.diabetes or profile.has_diabetes))
    user_dict['has_hypertension']= int(bool(profile.hypertension or profile.has_hypertension))

    # Stages 2 + 3: Rank plans
    top_plans = rank_plans(INSURANCE_PLANS, user_dict)

    # Gemma: plain-English explanation per plan
    for plan in top_plans:
        cond_str = ""
        if user_dict['has_diabetes']:   cond_str += "diabetes, "
        if user_dict['has_hypertension']: cond_str += "hypertension, "
        cond_str = cond_str.rstrip(", ") or "no major pre-existing conditions"

        sys_prompt = (
            "You are Outsurance's AI health advisor. Write a warm, clear 2-sentence explanation "
            "of why this insurance plan is a good match for this user. Be specific about their health data."
        )
        user_prompt = (
            f"User: age={profile.age}, HbA1c={profile.hba1c}%, BP={profile.bp_systolic}, "
            f"BMI={profile.bmi}, conditions: {cond_str}, budget=₹{profile.monthly_budget}/mo. "
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

    return {
        "risk_assessment": {
            "risk_tier": risk_tier,
            "risk_score": risk_score,
            "confidence_pct": round(risk_score * 100),
            "feature_importance_explanation": shap_explanation,
        },
        "recommended_plans": top_plans,
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
    Continuous agent chat. Knows the user's vitals and chat history.
    """
    sys_prompt = (
        "You are Outsurance's AI health advisor. You help users understand their insurance "
        "recommendations, answer questions about their health risk, and explain plan features. "
        "Be brief (2-3 sentences), warm, and jargon-free. "
        "If the user describes a new condition, acknowledge it and suggest they re-run the assessment."
    )
    history = "\n".join(
        f"{m.role.capitalize()}: {m.content}" for m in req.messages[:-1]
    )
    latest = req.messages[-1].content
    user_prompt = (
        f"User vitals: {req.user_vitals}\n"
        f"Chat history:\n{history}\n"
        f"User: {latest}\nAdvisor:"
    )
    result = generate_text(sys_prompt, user_prompt, max_tokens=150)
    return {"response": result}
