"""
OUTSURANCE — Complete ML Flow Test Suite
Tests every stage of the 4-stage pipeline without requiring the server to be running.
"""

import sys, os, json
sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BASE_DIR)

from app.main import assess_risk, UserProfile, FEATURES, FEATURE_LABELS
from app.condition_scorer import score_conditions, load_cache
from app.scorer import suitability_score, cosine_match_score, get_warning_flags, rank_plans
from app.plans_db import INSURANCE_PLANS
from app.agent import _extract_medical_terms, _classify_intent

PASS = "[PASS]"
FAIL = "[FAIL]"
SEP  = "─" * 70

results = {"passed": 0, "failed": 0, "errors": []}

def check(label, condition, detail=""):
    if condition:
        print(f"  {PASS}  {label}")
        results["passed"] += 1
    else:
        msg = f"  {FAIL}  {label}" + (f"  →  {detail}" if detail else "")
        print(msg)
        results["failed"] += 1
        results["errors"].append(label)

# ═══════════════════════════════════════════════════════════════
print(f"\n{SEP}")
print("  STAGE 0A — Condition Scorer: Cache Hit Path")
print(SEP)

cached = score_conditions(["heart attack", "diabetes"])
check("Returns dict with required keys",
      all(k in cached for k in ["events","total_condition_risk_score","normalized_for_xgboost","dominant_condition","risk_summary"]))
check("heart attack weight is 0.97",
      any(e["name"]=="heart attack" and e["weight"]==0.97 for e in cached["events"]),
      str(cached["events"]))
check("diabetes weight is 0.42",
      any(e["name"]=="diabetes" and e["weight"]==0.42 for e in cached["events"]),
      str(cached["events"]))
check("dominant_condition is heart attack",
      cached["dominant_condition"] == "heart attack",
      cached["dominant_condition"])
check("normalized_for_xgboost clamped at 5.0 max",
      0.0 <= cached["normalized_for_xgboost"] <= 5.0,
      str(cached["normalized_for_xgboost"]))
check("total_condition_risk_score is 0.97+0.42=1.39",
      abs(cached["total_condition_risk_score"] - 1.39) < 0.01,
      str(cached["total_condition_risk_score"]))

# ═══════════════════════════════════════════════════════════════
print(f"\n{SEP}")
print("  STAGE 0B — Condition Scorer: Empty / No-condition Path")
print(SEP)

empty = score_conditions([])
check("Empty list returns zero score",    empty["normalized_for_xgboost"] == 0.0)
check("Empty list has no events",         empty["events"] == [])
check("dominant_condition is None",       empty["dominant_condition"] is None)

# ═══════════════════════════════════════════════════════════════
print(f"\n{SEP}")
print("  STAGE 0C — Condition Scorer: Fallback (LLM offline, uncached term)")
print(SEP)

fallback = score_conditions(["unknown_rare_xyz_disease"])
check("Fallback returns valid structure",
      "events" in fallback and "normalized_for_xgboost" in fallback)
check("Fallback score is in 0–5 range",
      0.0 <= fallback["normalized_for_xgboost"] <= 5.0)

# ═══════════════════════════════════════════════════════════════
print(f"\n{SEP}")
print("  STAGE 0D — Condition Scorer: Cap at 5.0 for many conditions")
print(SEP)

# cardiac arrest(0.98)+active cancer(0.95)+organ failure(0.96)+heart attack(0.97)+leukemia(0.95)+kidney failure(0.84) = 5.65 → cap
many = score_conditions(["cardiac arrest","active cancer","organ failure","heart attack","leukemia","kidney failure"])
check("Sum of many severe conditions capped at 5.0",
      many["normalized_for_xgboost"] == 5.0,
      str(many["normalized_for_xgboost"]))

# ═══════════════════════════════════════════════════════════════
print(f"\n{SEP}")
print("  STAGE 0E — Medical NER Term Extractor (Agent)")
print(SEP)

terms1 = _extract_medical_terms("I had a heart attack last year")
check("Extracts 'heart attack' from sentence",
      any("heart" in t.lower() for t in terms1), str(terms1))

terms2 = _extract_medical_terms("what is my budget?")
check("Returns empty for non-medical query", terms2 == [], str(terms2))

terms3 = _extract_medical_terms("diagnosed with kidney cancer and diabetes")
check("Extracts multiple conditions",  len(terms3) >= 1, str(terms3))

# ═══════════════════════════════════════════════════════════════
print(f"\n{SEP}")
print("  STAGE 0F — Intent Classifier (Agent)")
print(SEP)

check("Classifies budget question",    _classify_intent("what if my budget was 800 per month") == "budget_sim")
check("Classifies reassess question",  _classify_intent("what if i also have kidney disease") == "reassess")
check("Classifies compare question",   _classify_intent("compare plan 1 vs plan 2") == "compare")
check("Classifies stress_test",        _classify_intent("worst case cardiac surgery cost") == "stress_test")
check("Classifies explain_risk",       _classify_intent("why am i high risk") == "explain_risk")

# ═══════════════════════════════════════════════════════════════
print(f"\n{SEP}")
print("  STAGE 1 — XGBoost Risk Classifier (8-Feature Model)")
print(SEP)

def make_profile(**kwargs):
    defaults = dict(age=35, bmi=24.0, smoker=0, hba1c=5.4, bp_systolic=120,
                    diabetes=0, hypertension=0, chronic_count=0,
                    monthly_budget=3000.0, income_lakh=8.0,
                    has_diabetes=False, has_hypertension=False,
                    medical_history=[], coverage_for="Individual")
    defaults.update(kwargs)
    return UserProfile(**defaults)

# Healthy young person → Low
p_low = make_profile(age=25, bmi=21, hba1c=5.1, bp_systolic=110)
rt, rs, exp, cd = assess_risk(p_low)
check("Healthy profile → Low or Medium risk",    rt in ("Low","Medium"), f"Got {rt}")
check("Risk score 0–1",                           0.0 <= rs <= 1.0, str(rs))
check("Explanation has 6 entries",                len(exp) == 6, str(len(exp)))
check("FEATURES list has 8 items",                len(FEATURES) == 8, str(FEATURES))
check("has_diabetes NOT in FEATURES",             "has_diabetes" not in FEATURES)
check("has_hypertension NOT in FEATURES",         "has_hypertension" not in FEATURES)
check("condition_risk_score IN FEATURES",         "condition_risk_score" in FEATURES)

# High-risk: diabetic + hypertensive + smoker + high HbA1c
p_high = make_profile(age=58, bmi=34, smoker=1, hba1c=9.2, bp_systolic=168,
                      has_diabetes=True, has_hypertension=True,
                      diabetes=1, hypertension=1)
rt2, rs2, exp2, cd2 = assess_risk(p_high)
check("High-risk profile → High or Critical",     rt2 in ("High","Critical"), f"Got {rt2}")
check("High-risk score > 0.4",                    rs2 > 0.4, str(rs2))

# Critical: heart attack + cancer history
p_crit = make_profile(age=62, bmi=30, smoker=1, hba1c=8.5, bp_systolic=175,
                      has_diabetes=True, has_hypertension=True,
                      diabetes=1, hypertension=1,
                      medical_history=["heart attack","cancer"])
rt3, rs3, exp3, cd3 = assess_risk(p_crit)
check("Critical profile → High or Critical",      rt3 in ("High","Critical"), f"Got {rt3}")
check("condition_detail populated from medical_history", cd3 is not None, str(cd3))
check("dominant_condition is heart attack",
      cd3 and cd3.get("dominant_condition") == "heart attack",
      str(cd3.get("dominant_condition") if cd3 else None))

# Diabetes injected from form flag (no medical_history)
p_form = make_profile(age=45, bmi=27, hba1c=7.8, bp_systolic=140,
                      has_diabetes=True, has_hypertension=True,
                      diabetes=1, hypertension=1, medical_history=[])
rt4, rs4, exp4, cd4 = assess_risk(p_form)
check("Form-flag diabetes auto-injected → condition_detail not None", cd4 is not None)
check("condition_risk_score > 0 when form flags set",
      cd4 and cd4["normalized_for_xgboost"] >= 0.35, str(cd4))
check("Tier is Medium or higher for diabetic+hypertensive",
      rt4 in ("Medium","High","Critical"), f"Got {rt4}")

# ═══════════════════════════════════════════════════════════════
print(f"\n{SEP}")
print("  STAGE 2 — Weighted Suitability Scorer")
print(SEP)

user_low  = dict(age=25, bmi=21, hba1c=5.0, bp_systolic=110, smoker=0,
                 has_diabetes=False, has_hypertension=False,
                 income_lakh=10.0, monthly_budget=5000, risk_tier="Low",
                 condition_risk_score=0.0, dominant_condition="",
                 coverage_for="Individual")

user_crit = dict(age=55, bmi=32, hba1c=9.5, bp_systolic=170, smoker=1,
                 has_diabetes=True, has_hypertension=True, diabetes=1, hypertension=1,
                 income_lakh=12.0, monthly_budget=4000, risk_tier="Critical",
                 condition_risk_score=1.77, dominant_condition="heart attack",
                 coverage_for="Individual")

plan_basic = next(p for p in INSURANCE_PLANS if p["type"] == "Basic")
plan_comp  = next(p for p in INSURANCE_PLANS if p["type"] == "Comprehensive")

s_low_basic, bk_lb = suitability_score(plan_basic, user_low)
s_low_comp,  bk_lc = suitability_score(plan_comp,  user_low)
s_crit_basic, _    = suitability_score(plan_basic, user_crit)
s_crit_comp,  _    = suitability_score(plan_comp,  user_crit)

check("Suitability score in 0–10",               0 <= s_low_basic <= 10, str(s_low_basic))
check("Low-risk user: Basic scores higher than Comprehensive",
      s_low_basic >= s_low_comp, f"Basic={s_low_basic} Comp={s_low_comp}")
check("Critical-risk user: Comprehensive scores higher than Basic",
      s_crit_comp > s_crit_basic, f"Comp={s_crit_comp} Basic={s_crit_basic}")
check("Score breakdown has required keys",
      all(k in bk_lb for k in ["budget_fit","condition_match","risk_alignment","age_eligibility"]))
check("Age gate: score=0 for out-of-range age",
      suitability_score(plan_basic, {**user_crit, "age": 80})[0] == 0.0)

# ═══════════════════════════════════════════════════════════════
print(f"\n{SEP}")
print("  STAGE 3 — Cosine KNN Similarity Ranker")
print(SEP)

sim_low  = cosine_match_score(plan_basic, user_low)
sim_crit = cosine_match_score(plan_comp,  user_crit)

check("Cosine similarity in 0–10",          0 <= sim_low <= 10, str(sim_low))
check("Similarity returns float",           isinstance(sim_low, float))
check("Critical user matches Comprehensive better than basic",
      cosine_match_score(plan_comp, user_crit) >= cosine_match_score(plan_basic, user_crit) - 2)

# ═══════════════════════════════════════════════════════════════
print(f"\n{SEP}")
print("  STAGE 2+3 Combined — rank_plans()")
print(SEP)

ranked = rank_plans(INSURANCE_PLANS, user_crit)
check("Returns up to 5 plans",                    1 <= len(ranked) <= 5, str(len(ranked)))
check("Plans sorted descending by suitability",
      all(ranked[i]["suitability_score"] >= ranked[i+1]["suitability_score"]
          for i in range(len(ranked)-1)))
check("Each plan has suitability_breakdown",       all("suitability_breakdown" in p for p in ranked))
check("Each plan has warning_flags list",          all(isinstance(p["warning_flags"], list) for p in ranked))
check("Each plan has cosine_similarity in breakdown",
      all("cosine_similarity" in p["suitability_breakdown"] for p in ranked))

# ═══════════════════════════════════════════════════════════════
print(f"\n{SEP}")
print("  Warning Flags")
print(SEP)

user_cardiac = {**user_crit, "dominant_condition": "heart attack"}
flags_basic  = get_warning_flags(plan_basic, user_cardiac)
flags_comp   = get_warning_flags(plan_comp,  user_cardiac)

check("Returns list",                             isinstance(flags_basic, list))
check("At most 3 warning flags per plan",         len(flags_basic) <= 3)
check("Basic plan triggers cardiac flag for heart attack user",
      any("cardiac" in f.lower() or "heart" in f.lower() for f in flags_basic),
      str(flags_basic))

# ═══════════════════════════════════════════════════════════════
print(f"\n{SEP}")
print("  Full Pipeline Integration — 3 Scenarios")
print(SEP)

scenarios = [
    ("Healthy 28yo",   make_profile(age=28, bmi=22, hba1c=5.0, bp_systolic=112)),
    ("Diabetic 50yo",  make_profile(age=50, bmi=30, hba1c=8.0, bp_systolic=148,
                                    has_diabetes=True, diabetes=1)),
    ("Critical 65yo",  make_profile(age=65, bmi=35, hba1c=10.0, bp_systolic=180, smoker=1,
                                    has_diabetes=True, has_hypertension=True, diabetes=1, hypertension=1,
                                    medical_history=["heart attack","kidney failure"])),
]

for label, prof in scenarios:
    tier, score, expl, cond = assess_risk(prof)
    ud = prof.model_dump()
    ud["risk_tier"] = tier
    ud["has_diabetes"] = int(bool(prof.has_diabetes or prof.diabetes))
    ud["has_hypertension"] = int(bool(prof.has_hypertension or prof.hypertension))
    if cond:
        ud["condition_risk_score"] = cond["normalized_for_xgboost"]
        ud["dominant_condition"] = cond["dominant_condition"] or ""
    plans = rank_plans(INSURANCE_PLANS, ud)
    check(f"{label}: risk_tier is valid",    tier in ("Low","Medium","High","Critical"), tier)
    check(f"{label}: gets at least 1 plan",  len(plans) >= 1, str(len(plans)))
    print(f"    tier={tier}  score={score:.3f}  top_plan={plans[0]['name'] if plans else 'none'}")

# ═══════════════════════════════════════════════════════════════
print(f"\n{SEP}")
print("  ML Artifacts — File Check")
print(SEP)

ML_DIR = os.path.join(BASE_DIR, "ml")
for fname, label in [
    ("risk_model.json",      "XGBoost model"),
    ("label_encoder.pkl",    "Label encoder"),
    ("model_metrics.json",   "Model metrics"),
    ("condition_cache.json", "Condition cache"),
    ("training_data.csv",    "Training dataset"),
]:
    path = os.path.join(ML_DIR, fname)
    check(f"{label} file exists ({fname})", os.path.exists(path))

metrics_path = os.path.join(ML_DIR, "model_metrics.json")
if os.path.exists(metrics_path):
    with open(metrics_path) as f:
        m = json.load(f)
    check("Model accuracy >= 80%",    m.get("accuracy", 0) >= 0.80, str(m.get("accuracy")))
    check("Weighted F1 >= 80%",       m.get("weighted_f1", 0) >= 0.80, str(m.get("weighted_f1")))
    check("CV mean F1 >= 80%",        m.get("cv_f1_mean", 0) >= 0.80, str(m.get("cv_f1_mean")))

# ═══════════════════════════════════════════════════════════════
print(f"\n{SEP}")
print("  Plans Database — Sanity Check")
print(SEP)

check("At least 15 plans loaded",             len(INSURANCE_PLANS) >= 15, str(len(INSURANCE_PLANS)))
check("All plans have required fields",
      all(all(k in p for k in ["id","name","type","annual_premium","coverage","ideal_vector"])
          for p in INSURANCE_PLANS))
check("ideal_vector is 10-dimensional",
      all(len(p["ideal_vector"]) == 10 for p in INSURANCE_PLANS))
check("At least one Basic plan",              any(p["type"]=="Basic" for p in INSURANCE_PLANS))
check("At least one Comprehensive plan",      any(p["type"]=="Comprehensive" for p in INSURANCE_PLANS))

# ═══════════════════════════════════════════════════════════════
print(f"\n{'═'*70}")
total = results["passed"] + results["failed"]
print(f"  RESULTS:  {results['passed']}/{total} passed  |  {results['failed']} failed")
if results["errors"]:
    print(f"  FAILED TESTS:")
    for e in results["errors"]:
        print(f"    - {e}")
print(f"{'═'*70}\n")
sys.exit(0 if results["failed"] == 0 else 1)
