"""
OUTSURANCE — 3-Stage Plan Scoring Engine
Stage 1 output (risk_tier) feeds into Stage 2 (weighted suitability scorer)
which feeds into Stage 3 (cosine similarity ranker) for the final combined score.
"""

import math

# ─── Stage 3 helpers ─────────────────────────────────────────────────────────
MAX_VALUES = [100.0, 50.0, 5000000.0, 10000.0, 1.0, 14.0, 220.0, 1.0, 1.0, 5.0]

def normalize_vector(v):
    return [float(v[i]) / MAX_VALUES[i] if MAX_VALUES[i] != 0 else 0.0
            for i in range(len(v))]

def cosine_similarity(v1, v2):
    dot = sum(a * b for a, b in zip(v1, v2))
    mag1 = math.sqrt(sum(a**2 for a in v1))
    mag2 = math.sqrt(sum(b**2 for b in v2))
    if mag1 == 0 or mag2 == 0:
        return 0.0
    return dot / (mag1 * mag2)


# ─── Stage 2: Weighted Multi-Factor Suitability Scorer ────────────────────────
def suitability_score(plan, user):
    """
    Returns a suitability score 0-10 based on 5 weighted factors.
    Returns 0.0 if the user is ineligible (age out of range).
    """
    # Hard gate: age eligibility
    age = user.get('age', 30)
    if age < plan.get('min_age', 0) or age > plan.get('max_age', 100):
        return 0.0, {}

    scores = {}

    # ── BUDGET FIT (25%) ──
    monthly_prem = plan.get('annual_premium', 12000) / 12
    budget = max(1, user.get('monthly_budget', 1000))
    ratio = monthly_prem / budget
    if ratio <= 0.50:   scores['budget_fit'] = 10.0
    elif ratio <= 0.80: scores['budget_fit'] = 7.5
    elif ratio <= 1.00: scores['budget_fit'] = 5.0
    elif ratio <= 1.30: scores['budget_fit'] = 2.5
    else:               scores['budget_fit'] = 0.0

    # ── CONDITION MATCH (35%) ── most impactful
    cond = 5.0
    has_diabetes = user.get('has_diabetes', False) or user.get('diabetes', 0) == 1
    prediabetes   = user.get('prediabetes', False)
    has_hypert    = user.get('has_hypertension', False) or user.get('hypertension', 0) == 1
    hba1c         = float(user.get('hba1c', 5.4))
    smoker        = bool(user.get('smoker', 0))

    if has_diabetes or (hba1c >= 6.5):
        if plan.get('diabetes_day1', False):      cond += 4.5   # best possible match
        elif plan.get('pre_existing_wait_years', 4) <= 1: cond += 1.5
        elif plan.get('pre_existing_wait_years', 4) >= 3: cond -= 3.0
    elif prediabetes or (5.7 <= hba1c < 6.5):
        if plan.get('diabetes_day1', False):      cond += 2.0   # still useful

    if has_hypert:
        if plan.get('hypertension_day1', False):  cond += 2.5
        elif plan.get('pre_existing_wait_years', 4) >= 3: cond -= 1.5

    if smoker and plan.get('type') == 'Basic':
        cond -= 1.0   # basic plans often exclude smokers

    # NEW: Dominant condition awareness
    dominant = user.get("dominant_condition", "")
    if dominant:
        dominant_lower = dominant.lower()
        is_cardiac_cover = plan.get("critical_illness_cover", False) or plan.get("type") == "Critical Illness" or "heart" in plan.get("name", "").lower() or "criticare" in plan.get("name", "").lower()
        is_cancer_cover = plan.get("cancer_cover", False) or plan.get("type") == "Critical Illness" or "criticare" in plan.get("name", "").lower()

        if any(k in dominant_lower for k in ["heart", "cardiac", "myocardial"]):
            if is_cardiac_cover:    cond += 3.0
            elif plan.get("type") == "Basic":          cond -= 3.5

        if any(k in dominant_lower for k in ["cancer", "oncol", "tumor"]):
            if is_cancer_cover:              cond += 3.5
            elif plan.get("type") in ["Basic","Standard"]: cond -= 2.5

        if any(k in dominant_lower for k in ["kidney", "renal", "ckd"]):
            wait = plan.get("pre_existing_wait_years", 4)
            cond += (2.5 if wait <= 1 else (-2.0 if wait >= 3 else 0))

        if any(k in dominant_lower for k in ["liver", "cirrhosis", "hepat"]):
            wait = plan.get("pre_existing_wait_years", 4)
            cond += (2.0 if wait <= 1 else (-1.5 if wait >= 3 else 0))

        if any(k in dominant_lower for k in ["asthma", "copd", "lung"]):
            wait = plan.get("pre_existing_wait_years", 4)
            cond += (1.5 if wait <= 1 else (-1.0 if wait >= 3 else 0))

    scores['condition_match'] = max(0.0, min(10.0, cond))

    # ── RISK TIER ALIGNMENT (20%) ──
    risk_tier = user.get('risk_tier', 'Medium')
    plan_type  = plan.get('type', 'Standard')
    ideal_types = {
        'Critical': ['Comprehensive', 'Senior'],
        'High':     ['Comprehensive', 'Standard'],
        'Medium':   ['Standard', 'Comprehensive', 'Critical Illness'],
        'Low':      ['Basic', 'Standard'],
    }
    if plan_type in ideal_types.get(risk_tier, []):
        scores['risk_alignment'] = 10.0
    elif plan_type == 'Basic' and risk_tier in ['High', 'Critical']:
        scores['risk_alignment'] = 1.5   # very bad fit
    else:
        scores['risk_alignment'] = 5.5   # neutral

    # ── AGE ELIGIBILITY (10%) — user is eligible at this point ──
    scores['age_eligibility'] = 10.0

    # ── COVERAGE ADEQUACY (10%) ──
    income = user.get('income_lakh', 5.0) * 100_000
    coverage = plan.get('coverage', 500_000)
    ratio_cov = coverage / max(1, income)
    if ratio_cov >= 4.0:   scores['coverage_adequacy'] = 10.0
    elif ratio_cov >= 2.5: scores['coverage_adequacy'] = 7.5
    elif ratio_cov >= 1.0: scores['coverage_adequacy'] = 5.0
    else:                  scores['coverage_adequacy'] = 2.5

    # ── FAMILY FIT (15%) ──
    coverage_for = user.get('coverage_for', 'Individual')
    is_plan_floater = plan.get('is_family_floater', False)
    if coverage_for == 'Family':
        if is_plan_floater:
            scores['family_fit'] = 10.0
        else:
            scores['family_fit'] = 0.0
    else:
        # Individual seeking plan
        if not is_plan_floater:
            scores['family_fit'] = 10.0
        else:
            scores['family_fit'] = 3.0 # Can buy family floater but not ideal

    # ── WEIGHTED SUM ──
    weights = {
        'budget_fit': 0.20,
        'condition_match': 0.30,
        'risk_alignment': 0.15,
        'age_eligibility': 0.10,
        'coverage_adequacy': 0.10,
        'family_fit': 0.15,
    }
    final = sum(scores[k] * weights[k] for k in weights)
    return round(min(10.0, max(0.0, final)), 1), scores


# ─── Stage 3: Cosine Similarity Ranker ───────────────────────────────────────
def cosine_match_score(plan, user):
    """
    Computes how similar the user's profile is to the plan's ideal user vector.
    Returns a 0-10 similarity score.
    """
    user_vector = [
        float(user.get('age', 30)),
        float(user.get('bmi', 22.0)),
        float(user.get('income_lakh', 5.0)) * 100_000,
        float(user.get('monthly_budget', 1000.0)),
        1.0 if user.get('smoker', 0) else 0.0,
        float(user.get('hba1c', 5.4)),
        float(user.get('bp_systolic', 120)),
        1.0 if (user.get('has_diabetes') or user.get('diabetes', 0) == 1) else 0.0,
        1.0 if (user.get('has_hypertension') or user.get('hypertension', 0) == 1) else 0.0,
        float(user.get('condition_risk_score', 0.0)),
    ]
    ideal = plan.get('ideal_vector', [30, 22.0, 500000, 1000, 0, 5.5, 120, 0, 0, 0])

    norm_user = normalize_vector(user_vector)
    norm_ideal = normalize_vector(ideal)
    sim = cosine_similarity(norm_user, norm_ideal)
    return round(sim * 10, 1)


# ─── Warning Flags ────────────────────────────────────────────────────────────
def get_warning_flags(plan: dict, user: dict) -> list:
    """
    Return up to 3 human-readable amber warning strings for a plan given a
    user profile. Surfaced as badge-style alerts on plan cards.
    """
    warnings = []
    has_diabetes = user.get('has_diabetes') or user.get('diabetes', 0) == 1
    has_hypert   = user.get('has_hypertension') or user.get('hypertension', 0) == 1
    wait         = plan.get('pre_existing_wait_years', 4)

    # NEW: Condition warning flags
    dominant = user.get("dominant_condition", "")
    if dominant:
        dominant_lower = dominant.lower()
        is_cardiac_cover = plan.get("critical_illness_cover", False) or plan.get("type") == "Critical Illness" or "heart" in plan.get("name", "").lower() or "criticare" in plan.get("name", "").lower()
        is_cancer_cover = plan.get("cancer_cover", False) or plan.get("type") == "Critical Illness" or "criticare" in plan.get("name", "").lower()

        if "heart" in dominant_lower and not is_cardiac_cover:
            warnings.append("No cardiac critical illness cover")
        if "cancer" in dominant_lower and not is_cancer_cover:
            warnings.append("Cancer treatment may not be covered")
        if "kidney" in dominant_lower and plan.get("pre_existing_wait_years", 4) >= 3:
            warnings.append(f"{plan.get('pre_existing_wait_years')}yr wait for kidney coverage")

    if has_diabetes and not plan.get('diabetes_day1') and wait >= 3:
        warnings.append(f"{wait}-yr wait for diabetes cover")

    if has_hypert and not plan.get('hypertension_day1') and wait >= 3:
        warnings.append(f"{wait}-yr wait for hypertension cover")

    copay = plan.get('copayment_pct', 0)
    if copay >= 20:
        warnings.append(f"{copay}% co-payment on all claims")
    elif copay > 0 and user.get('risk_tier') in ('High', 'Critical'):
        warnings.append(f"{copay}% co-payment — costly at high risk")

    income = user.get('income_lakh', 5) * 100_000
    if plan.get('coverage', 0) < income:
        warnings.append("Coverage below 1x annual income")

    if plan.get('hospital_network_count', 9999) < 6000:
        warnings.append("Smaller hospital network")

    csr = plan.get('claim_settlement_ratio', 100)
    if csr < 90:
        warnings.append(f"Claim settlement ratio only {csr}%")

    if user.get('smoker') and plan.get('type') == 'Basic':
        warnings.append("Smoking loading likely applies")

    return warnings[:3]


# ─── Combined 3-Stage Ranker ──────────────────────────────────────────────────
def rank_plans(plans: list, user: dict) -> list:
    """
    Main entry point.
    Returns top 5 plans sorted by combined_score (60% suitability + 40% similarity).
    Each plan dict includes suitability_score, suitability_breakdown, and warning_flags.
    """
    results = []
    for plan in plans:
        suit, breakdown = suitability_score(plan, user)
        if suit == 0.0:
            continue   # age-ineligible — skip

        sim      = cosine_match_score(plan, user)
        combined = round(0.60 * suit + 0.40 * sim, 1)

        enriched = dict(plan)
        enriched['suitability_score'] = combined
        enriched['suitability_breakdown'] = {
            **{k: round(v, 1) for k, v in breakdown.items()},
            'cosine_similarity': sim,
        }
        enriched['warning_flags'] = get_warning_flags(plan, user)
        results.append(enriched)

    results.sort(key=lambda p: p['suitability_score'], reverse=True)
    return results[:5]
