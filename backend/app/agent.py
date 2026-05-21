"""
Outsurance Master Orchestration Agent
======================================
A tool-use style AI agent that operates the full Outsurance platform
through natural language conversation.

Architecture:
  User message
      │
      ▼
  Intent Classifier  (rule-based regex, deterministic, <1ms)
      │
      ▼
  Tool Dispatcher    (selects & executes one of 6 tools)
      │
      ▼
  Gemma 3 1B         (generates natural language from tool result + session ctx)
      │
      ▼
  { response, tool_used, tool_result, updated_session }

Tools:
  reassess        → Re-run the full 3-stage ML pipeline (with profile updates)
  budget_sim      → Re-rank plans with a new monthly budget
  stress_test     → Emergency out-of-pocket cost simulator
  compare         → Side-by-side plan comparison table
  explain_risk    → Plain-English risk tier explanation
  plan_info       → Detailed plan lookup
"""

import re
from typing import Any, Callable, Dict, List, Optional, Tuple

from .plans_db import INSURANCE_PLANS
from .stress_test import simulate


# ─── Intent Classification ─────────────────────────────────────────────────
#  Each entry: (intent_name, [regex_patterns], priority)
#  Higher priority wins when multiple intents match.

_INTENT_RULES: List[Tuple[str, List[str], int]] = [
    ("reassess", [
        r"re[-\s]?assess", r"re[-\s]?run", r"re[-\s]?calculat",
        r"what if (i also|i had|my|i have|we add)",
        r"add (kidney|cancer|heart|thyroid|lung|asthma|arthritis|liver|copd|diabetes|hypertension)",
        r"include (my|a |the )",
        r"also have", r"new condition", r"update (my )?profile",
        r"change (my )?condition", r"now (i have|i am)",
        r"i (have|had|got|suffer from|was diagnosed with) (a |an )?(heart attack|cardiac|kidney|cancer|thyroid|lung|asthma|arthritis|liver|copd|diabetes|hypertension)",
    ], 10),

    ("budget_sim", [
        r"budget.*(change|increas|decreas|rais|lower|drop|cut|reduc)",
        r"(increas|decreas|change|rais|lower|what if|reduc).*budget",
        r"if (i |my )budget (was|is|becomes|changes? to)",
        r"afford", r"can i pay ₹",
        r"₹\s?\d[\d,]*\s*(per |/\s*)?month",
        r"\d+\s*(k|thousand|lakh)?\s*(per |/\s*)?month",
        r"monthly (budget|premium|payment)",
    ], 9),

    ("stress_test", [
        r"stress.?test",
        r"worst.?case",
        r"out\.?of\.?pocket",
        r"how much.*(cost|pay|cover)",
        r"(hospital|surgery|operation|treatment|emergency).*(cost|bill|price)",
        r"(cost|pay|bill|out.of.pocket).*(cardiac|heart|attack|angioplast|icu|intensive|cancer|chemo|stroke|cerebral|knee|hip|appendix)",
    ], 8),

    ("compare", [
        r"compar(e|ing|ison)",
        r"\bvs\.?\b", r"\bversus\b",
        r"difference between",
        r"which (is |plan )better",
        r"between plan\s?\d",
        r"plan \d+.*(and|or|vs).*plan \d+",
        r"side.?by.?side",
    ], 7),

    ("explain_risk", [
        r"(explain|what (does|is|means?)|why am i).*(my )?risk",
        r"why (high|medium|low|critical) risk",
        r"risk (tier|score|level|rating|band)",
        r"why (do i|am i) (have|at|show)",
        r"hba1c.*affect", r"bmi.*affect", r"blood pressure.*affect",
        r"what (makes|caused|drove) my risk",
        r"understand.*(risk|score|tier)",
    ], 6),

    ("plan_info", [
        r"tell me (more )?(about|on) (plan|this|the )",
        r"(details?|info|information|more) (about|on|for|of) (plan|this)",
        r"what (does|is|are) (plan\s?\d|this plan)",
        r"explain plan\s?\d",
        r"coverage (for|of|in) plan",
        r"what (exclusions?|pros?|cons?) (does|in)",
    ], 5),
]


def _classify_intent_regex(message: str) -> Optional[str]:
    """Return the highest-priority intent matching the user message, or None."""
    msg = message.lower()
    best_intent, best_priority = None, -1
    for intent, patterns, priority in _INTENT_RULES:
        for pat in patterns:
            if re.search(pat, msg):
                if priority > best_priority:
                    best_intent, best_priority = intent, priority
                break
    return best_intent


def _classify_intent(message: str, llm_generate: Optional[Callable] = None) -> Optional[str]:
    """Classify user intent using a hybrid LLM + Regex classifier."""
    msg = message.lower()
    
    # 1. Deterministic high-priority regex checks
    if re.search(r"stress.?test|worst.?case|out.?of.?pocket", msg):
        return "stress_test"
    if re.search(r"compar(e|ing|ison)|\bvs\.?\b|\bversus\b|difference between", msg):
        return "compare"
    if re.search(r"budget|premium|payment|afford", msg) and not re.search(r"heart|cardiac|attack|cancer|diabetes|hypertension", msg):
        return "budget_sim"
        
    # 2. LLM classification for intelligent, context-aware intent detection
    if llm_generate:
        sys_prompt = (
            "You are an intent classifier for a health insurance assistant.\n"
            "Classify the user's latest query into exactly one of these categories:\n"
            "'reassess', 'budget_sim', 'stress_test', 'compare', 'explain_risk', 'plan_info', 'general_chat'.\n\n"
            "Examples:\n"
            "Query: I had a heart attack\n"
            "Category: reassess\n\n"
            "Query: what if I have a heart attack?\n"
            "Category: reassess\n\n"
            "Query: diagnosed with cancer\n"
            "Category: reassess\n\n"
            "Query: how much does heart surgery cost?\n"
            "Category: stress_test\n\n"
            "Query: stress test plan 1 for cardiac event\n"
            "Category: stress_test\n\n"
            "Query: change my budget to 2500 per month\n"
            "Category: budget_sim\n\n"
            "Query: compare plan 1 and plan 3\n"
            "Category: compare\n\n"
            "Query: explain my risk score\n"
            "Category: explain_risk\n\n"
            "Query: tell me about Maxima Health plan\n"
            "Category: plan_info\n\n"
            "Query: hello there!\n"
            "Category: general_chat\n\n"
            "Respond with ONLY the category name in lowercase (no extra words, no explanation, no punctuation, no markdown)."
        )
        try:
            response = llm_generate(sys_prompt, f"Query: {message}\nCategory:", max_tokens=10).strip().lower()
            response = response.replace("`", "").replace("'", "").replace('"', "").replace(".", "").strip()
            valid = {'reassess', 'budget_sim', 'stress_test', 'compare', 'explain_risk', 'plan_info', 'general_chat'}
            if response in valid:
                return response
        except Exception as e:
            print(f"[WARN] LLM intent classification failed: {e}")

    # 3. Fallback to full regex matching
    return _classify_intent_regex(message)


# ─── Entity Extraction ──────────────────────────────────────────────────────

def _extract_budget(message: str) -> Optional[float]:
    """Extract a rupee amount from text like '₹2000/month' or '1500 per month'."""
    m = re.search(
        r'(?:₹\s?)?(\d[\d,]*)(?:\s*(?:k|thousand|lakh|l))?'
        r'(?:\s*(?:per|/)\s*(?:month|mo|m))',
        message.lower()
    )
    if m:
        num_str = m.group(0)
        digits = re.search(r'(\d[\d,]*)', num_str)
        if not digits:
            return None
        num = float(digits.group(1).replace(',', ''))
        if re.search(r'(k|thousand)', num_str):
            num *= 1000
        elif re.search(r'(lakh|l)', num_str):
            num *= 100000
        return num

    # Fallback: plain ₹N pattern
    m2 = re.search(r'₹\s?(\d[\d,]+)', message)
    if m2:
        return float(m2.group(1).replace(',', ''))
    return None


def _extract_plan_ids(message: str, current_plans: List[Dict]) -> List[int]:
    """Find plan IDs mentioned in the message — by number or by name."""
    found = []
    for m in re.finditer(r'plan\s?#?(\d+)', message.lower()):
        pid = int(m.group(1))
        if pid not in found:
            found.append(pid)
    for plan in (current_plans or []):
        plan_name = plan.get('name', '').lower()
        if plan_name and plan_name in message.lower():
            if plan['id'] not in found:
                found.append(plan['id'])
    return found


def _extract_scenario(message: str) -> Optional[str]:
    """Map free-text to a SCENARIOS id."""
    msg = message.lower()
    mapping = [
        (['cardiac', 'heart attack', 'angioplast', 'stent'],           'cardiac_event'),
        (['icu', '5 day', 'five day', 'intensive care', 'icu stay'],   'icu_5_days'),
        (['knee', 'hip', 'joint replace'],                              'knee_replacement'),
        (['appendix', 'appendicit'],                                    'appendix_surgery'),
        (['diabetic', 'dka', 'hypoglycem', 'ketoacid'],                'diabetic_emergency'),
        (['cancer', 'chemo', 'oncolog', 'tumor'],                      'cancer_treatment'),
        (['stroke', 'cerebral', 'neurolog', 'brain attack'],           'stroke_rehab'),
    ]
    for keywords, scenario_id in mapping:
        if any(k in msg for k in keywords):
            return scenario_id
    return None


def _extract_condition_updates_regex(message: str, current_profile: Dict) -> Dict:
    """
    Parse new conditions / flags from the message and return a dict of
    profile field updates to merge.
    """
    updates: Dict[str, Any] = {}
    msg = message.lower()

    condition_rules = [
        (r'kidney|renal|nephro',                   {'chronic_count_delta': 1}),
        (r'chronic heart|coronary|heart disease|heart attack|cardiac',  {'chronic_count_delta': 1}),
        (r'thyroid|hypothyroid|hyperthyroid',       {'chronic_count_delta': 1}),
        (r'arthritis|joint disease',                {'chronic_count_delta': 1}),
        (r'liver|hepat|cirrhosis',                  {'chronic_count_delta': 1}),
        (r'lung|copd|asthma|pulmonary',             {'chronic_count_delta': 1}),
        (r'cancer|oncolog|tumour|tumor',            {'chronic_count_delta': 2}),
        (r'diabetes|diabetic|type 2|type 1',        {'has_diabetes': True, 'diabetes': 1}),
        (r'hypertension|high blood pressure|bp',    {'has_hypertension': True, 'hypertension': 1}),
        (r'smok|cigarette',                         {'smoker': 1}),
        (r'family (cover|plan|floater)',            {'coverage_for': 'Family'}),
    ]

    for pattern, field_updates in condition_rules:
        if re.search(pattern, msg):
            for k, v in field_updates.items():
                if k == 'chronic_count_delta':
                    current_count = current_profile.get('chronic_count', 0)
                    updates['chronic_count'] = current_count + v
                else:
                    updates[k] = v

    return updates


def _extract_condition_updates(message: str, current_profile: Dict, llm_generate: Optional[Callable] = None) -> Dict:
    """Extract profile updates using the LLM with a fallback to regex."""
    if not llm_generate:
        return _extract_condition_updates_regex(message, current_profile)

    sys_prompt = (
        "You are a medical entity extraction agent for health insurance. "
        "Analyze the user's message and output a JSON object containing profile updates. "
        "Only output fields that are explicitly changed or added in the message. Do not include unchanged fields.\n\n"
        "Schema rules:\n"
        "- 'chronic_count_delta': (int) Number of new chronic conditions mentioned (e.g. heart attack, cancer, thyroid, kidney/renal, lung/asthma/COPD, liver/cirrhosis, arthritis, stroke). Each unique chronic condition counts as +1 (or +2 for cancer).\n"
        "- 'diabetes': (int, 0 or 1) Set to 1 if user indicates they have diabetes.\n"
        "- 'hypertension': (int, 0 or 1) Set to 1 if user indicates they have hypertension or high blood pressure.\n"
        "- 'smoker': (int, 0 or 1) Set to 1 if user mentions smoking or tobacco.\n"
        "- 'monthly_budget': (float) Set if user specifies a monthly premium budget (e.g. 2000).\n"
        "- 'age': (int) Set if user specifies a new age.\n"
        "- 'hba1c': (float) Set if user specifies a new HbA1c.\n"
        "- 'bp_systolic': (int) Set if user specifies a new blood pressure.\n"
        "- 'bmi': (float) Set if user specifies a new BMI.\n\n"
        "Return ONLY a raw JSON block. No markdown, no explanation."
    )
    try:
        resp = llm_generate(sys_prompt, f"User message: {message}", max_tokens=150)
        cleaned = resp.replace("```json", "").replace("```", "").strip()
        import json
        updates = json.loads(cleaned)
        
        profile_updates = {}
        if "chronic_count_delta" in updates:
            delta = int(updates["chronic_count_delta"])
            profile_updates["chronic_count"] = current_profile.get("chronic_count", 0) + delta
            
        for key in ["diabetes", "hypertension", "smoker", "monthly_budget", "age", "hba1c", "bp_systolic", "bmi"]:
            if key in updates:
                if key == "diabetes":
                    profile_updates["has_diabetes"] = bool(updates[key])
                if key == "hypertension":
                    profile_updates["has_hypertension"] = bool(updates[key])
                profile_updates[key] = updates[key]
                
        return profile_updates
    except Exception as e:
        print(f"[WARN] LLM profile extraction failed: {e}")
        
    return _extract_condition_updates_regex(message, current_profile)


# ─── Tools ─────────────────────────────────────────────────────────────────

def _tool_reassess(
    profile: Dict,
    risk_assessee: Callable,
    plan_ranker: Callable,
    llm_generate: Callable,
) -> Dict:
    """Re-run the 3-stage ML pipeline and regenerate Gemma explanations."""
    risk_tier, risk_score, feat_importance = risk_assessee(profile)

    updated_profile = dict(profile)
    updated_profile['risk_tier'] = risk_tier
    updated_profile['risk_score'] = risk_score

    top_plans = plan_ranker(INSURANCE_PLANS, updated_profile)

    has_diabetes = bool(updated_profile.get('has_diabetes') or updated_profile.get('diabetes', 0))
    has_hypert   = bool(updated_profile.get('has_hypertension') or updated_profile.get('hypertension', 0))
    cond_str = ", ".join(filter(None, [
        "diabetes" if has_diabetes else "",
        "hypertension" if has_hypert else "",
    ])) or "no major pre-existing conditions"

    from concurrent.futures import ThreadPoolExecutor

    def generate_single_explanation(plan):
        sys_p = (
            "You are Outsurance's AI health advisor. "
            "Write a warm, specific 2-sentence explanation of why this insurance plan "
            "fits this user's health and financial profile."
        )
        user_p = (
            f"User: age={updated_profile.get('age')}, HbA1c={updated_profile.get('hba1c')}%, "
            f"BP={updated_profile.get('bp_systolic')}, BMI={updated_profile.get('bmi')}, "
            f"conditions: {cond_str}, budget=₹{updated_profile.get('monthly_budget')}/mo. "
            f"Plan: {plan['name']} ({plan['type']}) — ₹{plan['annual_premium']}/yr, "
            f"match score {plan['suitability_score']}/10. Why does this plan fit?"
        )
        try:
            plan['plain_english_explanation'] = llm_generate(sys_p, user_p, max_tokens=80)
        except Exception as e:
            print(f"[WARN] agent reassess LLM failed for plan {plan.get('id')}: {e}")
            plan['plain_english_explanation'] = (
                f"This {plan['type']} plan scored {plan['suitability_score']}/10 for your profile."
            )

    with ThreadPoolExecutor(max_workers=len(top_plans)) as executor:
        list(executor.map(generate_single_explanation, top_plans))

    return {
        "risk_assessment": {
            "risk_tier": risk_tier,
            "risk_score": risk_score,
            "confidence_pct": round(risk_score * 100),
            "feature_importance_explanation": feat_importance,
        },
        "recommended_plans": top_plans,
        "updated_profile": updated_profile,
    }


def _tool_budget_sim(
    profile: Dict,
    new_budget: float,
    plan_ranker: Callable,
) -> Dict:
    """Re-rank plans with a new monthly budget without re-running XGBoost."""
    updated = dict(profile)
    old_budget = updated.get('monthly_budget', 1000)
    updated['monthly_budget'] = new_budget
    new_plans = plan_ranker(INSURANCE_PLANS, updated)
    return {
        "old_budget": old_budget,
        "new_budget": new_budget,
        "recommended_plans": new_plans,
        "updated_profile": updated,
    }


def _tool_stress_test(plan_id: int, user_query: str, current_plans: List[Dict], llm_generate: Callable) -> Dict:
    """Simulate emergency out-of-pocket for a plan dynamically via LLM."""
    plan = next((p for p in (current_plans or []) if p.get('id') == plan_id), None)
    if not plan:
        plan = next((p for p in INSURANCE_PLANS if p['id'] == plan_id), None)
    if not plan:
        return {"error": f"Plan ID {plan_id} not found"}

    sys_prompt = (
        "Extract the medical scenario from the user query and output a clean JSON object: "
        "{\"name\": \"Scenario Name\", \"cost\": 350000, \"days\": 4, \"isChronic\": false}. "
        "Cost should be a typical hospital bill in INR."
    )
    user_prompt = f"Query: {user_query}"
    
    try:
        resp = llm_generate(sys_prompt, user_prompt, max_tokens=100)
        cleaned = resp.replace("```json", "").replace("```", "").strip()
        import json
        data = json.loads(cleaned)
        scenario_name = data.get("name", "Medical Emergency")
        total_cost = int(data.get("cost", 300000))
        days = int(data.get("days", 3))
        is_chronic = bool(data.get("isChronic", False))
    except Exception as e:
        print(f"Error extracting scenario for stress test: {e}")
        scenario_name = "Emergency Hospitalisation"
        total_cost = 400000
        days = 3
        is_chronic = False

    coverage   = plan.get("coverage", 500000)
    copay_pct  = plan.get("copayment_pct", 0) / 100.0
    room_limit = plan.get("room_rent_limit", "No Limit")

    room_rent_penalty = 0
    if room_limit not in {"No Limit", "Any Room", "N/A"}:
        room_rent_penalty = int(total_cost * 0.20)

    claimable = total_cost - room_rent_penalty
    covered_before_copay = min(claimable, coverage)
    copay_amount = round(covered_before_copay * copay_pct)
    plan_covers  = covered_before_copay - copay_amount
    out_of_pocket    = total_cost - plan_covers

    if out_of_pocket == 0: verdict = "Fully covered"
    elif out_of_pocket <= 50_000: verdict = "Minimal out-of-pocket"
    elif out_of_pocket <= 150_000: verdict = "Manageable gap"
    elif out_of_pocket <= 350_000: verdict = "Significant gap"
    else: verdict = "High financial risk"

    return {
        "plan_id": plan_id,
        "plan_name": plan.get('name', f'Plan {plan_id}'),
        "insurer": plan.get('insurer', ''),
        "scenario_name": scenario_name,
        "scenario_id": "custom",
        "custom_details": {"cost": total_cost, "days": days, "isChronic": is_chronic},
        "total_cost": total_cost,
        "plan_covers": plan_covers,
        "out_of_pocket": out_of_pocket,
        "verdict": verdict
    }


def _tool_compare(plan_ids: List[int], current_plans: List[Dict]) -> Dict:
    """Build side-by-side comparison data for up to 3 plans."""
    plans_out = []
    for pid in plan_ids[:3]:
        p = next((x for x in (current_plans or []) if x.get('id') == pid), None)
        if not p:
            p = next((x for x in INSURANCE_PLANS if x['id'] == pid), None)
        if p:
            plans_out.append(p)

    if len(plans_out) < 2:
        return {"error": "Need at least 2 valid plan IDs to compare"}

    FIELDS = [
        ("Annual Premium",      lambda p: f"₹{p.get('annual_premium', 0):,}"),
        ("Coverage",            lambda p: f"₹{p.get('coverage', 0) // 100000}L"),
        ("Plan Type",           lambda p: p.get('type', '-')),
        ("Pre-existing Wait",   lambda p: f"{p.get('pre_existing_wait_years', 4)} yr"),
        ("Diabetes Day 1",      lambda p: "Yes ✓" if p.get('diabetes_day1') else "No"),
        ("Hypertension Day 1",  lambda p: "Yes ✓" if p.get('hypertension_day1') else "No"),
        ("Co-payment",          lambda p: f"{p.get('copayment_pct', 0)}%"),
        ("Room Rent Limit",     lambda p: p.get('room_rent_limit', '-')),
        ("No-claim Bonus",      lambda p: f"{p.get('no_claim_bonus_pct', 0)}%"),
        ("Claim Settlement",    lambda p: f"{p.get('claim_settlement_ratio', '-')}%"),
        ("Hospital Network",    lambda p: f"{p.get('hospital_network_count', 0):,}"),
        ("Restoration Benefit", lambda p: "Yes" if p.get('restoration_benefit') else "No"),
        ("Family Floater",      lambda p: "Yes" if p.get('is_family_floater') else "No"),
        ("Match Score",         lambda p: f"{p.get('suitability_score', 'N/A')}/10"),
    ]

    table = {label: {p['name']: fn(p) for p in plans_out} for label, fn in FIELDS}

    return {
        "plans": [{"id": p['id'], "name": p['name'], "insurer": p.get('insurer', '')} for p in plans_out],
        "comparison_table": table,
    }


def _tool_explain_risk(risk_data: Dict) -> Dict:
    """Return structured plain-English risk explanation."""
    tier = risk_data.get('risk_tier', 'Unknown')
    score = risk_data.get('risk_score', 0.5)
    importance = risk_data.get('feature_importance_explanation', {})

    descriptions = {
        'Low':      ('Your health indicators are within normal ranges. '
                     'You are at low risk of requiring major medical care in the near term. '
                     'A basic or standard plan is appropriate.'),
        'Medium':   ('One or two elevated health markers are present. '
                     'You should consider a standard or comprehensive plan that covers your '
                     'specific conditions with a reasonable waiting period.'),
        'High':     ('Multiple risk factors are active. You have a significantly higher chance '
                     'of requiring medical care. A comprehensive plan — ideally with Day 1 '
                     'cover for pre-existing conditions — is strongly recommended.'),
        'Critical': ('Your profile shows multiple serious risk factors. '
                     'Immediate comprehensive coverage is essential. '
                     'Look for plans with Day 1 condition cover and no or short waiting periods.'),
    }

    top_drivers = sorted(importance.items(), key=lambda x: x[1], reverse=True)[:4]
    driver_text = "; ".join([f"{k} ({v*100:.0f}% contribution)" for k, v in top_drivers])

    return {
        "tier": tier,
        "score": score,
        "description": descriptions.get(tier, ""),
        "top_drivers": top_drivers,
        "driver_summary": driver_text,
        "full_advice": (
            f"Your risk tier is {tier}. "
            f"The main factors driving this are: {driver_text}. "
            f"{descriptions.get(tier, '')}"
        ),
    }


def _tool_plan_info(plan_id: int, current_plans: List[Dict]) -> Dict:
    """Return complete plan details."""
    plan = next((p for p in (current_plans or []) if p.get('id') == plan_id), None)
    if not plan:
        plan = next((p for p in INSURANCE_PLANS if p['id'] == plan_id), None)
    if not plan:
        return {"error": f"Plan {plan_id} not found"}
    return {"plan": plan}


# ─── Context Builders ───────────────────────────────────────────────────────

def _build_session_context(profile: Dict, risk_data: Dict, current_plans: List[Dict]) -> str:
    parts = []
    if profile:
        parts.append(
            f"Profile: age={profile.get('age')}, BMI={profile.get('bmi')}, "
            f"HbA1c={profile.get('hba1c')}%, BP={profile.get('bp_systolic')}, "
            f"diabetes={'yes' if (profile.get('has_diabetes') or profile.get('diabetes')) else 'no'}, "
            f"budget=₹{profile.get('monthly_budget')}/mo"
        )
    if risk_data:
        parts.append(f"Risk tier: {risk_data.get('risk_tier', 'Unknown')} "
                     f"({risk_data.get('confidence_pct', 0)}% confidence)")
    if current_plans:
        plan_names = [p['name'] for p in current_plans[:3]]
        parts.append(f"Top plans: {', '.join(plan_names)}")
    return ". ".join(parts) + "." if parts else ""


def _build_tool_context(tool_used: Optional[str], tool_result: Optional[Dict]) -> str:
    if not tool_result or "error" in tool_result:
        return ""

    if tool_used == "reassess":
        ra = tool_result.get('risk_assessment', {})
        top5 = tool_result.get('recommended_plans', [])
        plan_summary = "; ".join(
            f"{p['name']} ({p['suitability_score']}/10)" for p in top5[:3]
        )
        return (f"Re-assessment complete. New risk tier: {ra.get('risk_tier')} "
                f"({ra.get('confidence_pct')}% confidence). Top plans: {plan_summary}.")

    if tool_used == "budget_sim":
        top5 = tool_result.get('recommended_plans', [])
        plan_summary = "; ".join(
            f"{p['name']} ₹{p.get('annual_premium', 0):,}/yr" for p in top5[:3]
        )
        return (f"Budget changed ₹{tool_result.get('old_budget', '?')} → "
                f"₹{tool_result.get('new_budget', '?')}/month. "
                f"Updated top plans: {plan_summary}.")

    if tool_used == "stress_test":
        return (f"Stress test — {tool_result.get('scenario_name')} on "
                f"{tool_result.get('plan_name')}: "
                f"Total cost ₹{tool_result.get('total_cost', 0):,}, "
                f"plan covers ₹{tool_result.get('plan_covers', 0):,}, "
                f"out-of-pocket ₹{tool_result.get('out_of_pocket', 0):,}. "
                f"Verdict: {tool_result.get('verdict', '')}.")

    if tool_used == "compare":
        names = " vs ".join(p['name'] for p in tool_result.get('plans', []))
        return f"Comparison table ready for: {names}."

    if tool_used == "explain_risk":
        return f"Risk explanation: {tool_result.get('full_advice', '')}."

    if tool_used == "plan_info":
        p = tool_result.get('plan', {})
        return (f"Plan: {p.get('name')} by {p.get('insurer')}, "
                f"₹{p.get('annual_premium', 0):,}/yr, "
                f"₹{p.get('coverage', 0) // 100000}L coverage, "
                f"type: {p.get('type')}.")

    return ""


# ─── Master Entry Point ─────────────────────────────────────────────────────

def run_agent(
    messages: List[Dict],
    session: Dict,
    risk_assessee: Callable,
    plan_ranker: Callable,
    llm_generate: Callable,
) -> Dict:
    """
    Master orchestration agent.

    Parameters
    ----------
    messages      Full conversation history [{role, content}, ...]
    session       Current session state:
                    { profile: dict, risk_data: dict, current_plans: list }
    risk_assessee Callable(profile_dict) → (risk_tier, risk_score, explanation)
    plan_ranker   Callable(plans, user_dict) → sorted plan list
    llm_generate  Callable(sys_prompt, user_prompt, max_tokens) → str

    Returns
    -------
    {
      response:         str   — natural language reply
      tool_used:        str   — which tool fired (or None)
      tool_result:      dict  — structured tool output (or None)
      updated_session:  dict  — session with any in-place updates
    }
    """
    latest = (messages[-1].get('content') or "").strip() if messages else ""
    profile = dict(session.get('profile') or {})
    risk_data = dict(session.get('risk_data') or {})
    current_plans: List[Dict] = list(session.get('current_plans') or [])
    updated_session = dict(session)

    intent = _classify_intent(latest, llm_generate)
    tool_used: Optional[str] = None
    tool_result: Optional[Dict] = None

    # ── TOOL DISPATCH ───────────────────────────────────────────────────────

    if intent == "reassess" and profile:
        condition_updates = _extract_condition_updates(latest, profile, llm_generate)
        if condition_updates:
            profile.update(condition_updates)

        budget_update = _extract_budget(latest)
        if budget_update:
            profile['monthly_budget'] = budget_update

        tool_result = _tool_reassess(profile, risk_assessee, plan_ranker, llm_generate)
        tool_used = "reassess"
        updated_session['profile']       = tool_result.get('updated_profile', profile)
        updated_session['risk_data']     = tool_result.get('risk_assessment', {})
        updated_session['current_plans'] = tool_result.get('recommended_plans', [])

    elif intent == "budget_sim" and profile:
        new_budget = _extract_budget(latest)
        if new_budget:
            tool_result = _tool_budget_sim(profile, new_budget, plan_ranker)
            tool_used = "budget_sim"
            updated_session['profile']       = tool_result.get('updated_profile', profile)
            updated_session['current_plans'] = tool_result.get('recommended_plans', [])

    elif intent == "stress_test":
        plan_ids = _extract_plan_ids(latest, current_plans)
        plan_id = plan_ids[0] if plan_ids else (current_plans[0]['id'] if current_plans else 1)
        tool_result = _tool_stress_test(plan_id, latest, current_plans, llm_generate)
        tool_used = "stress_test"

    elif intent == "compare":
        plan_ids = _extract_plan_ids(latest, current_plans)
        if len(plan_ids) < 2 and len(current_plans) >= 2:
            plan_ids = [p['id'] for p in current_plans[:2]]
        if len(plan_ids) >= 2:
            tool_result = _tool_compare(plan_ids[:3], current_plans)
            tool_used = "compare"

    elif intent == "explain_risk" and risk_data:
        tool_result = _tool_explain_risk(risk_data)
        tool_used = "explain_risk"

    elif intent == "plan_info":
        plan_ids = _extract_plan_ids(latest, current_plans)
        plan_id = plan_ids[0] if plan_ids else (current_plans[0]['id'] if current_plans else None)
        if plan_id:
            tool_result = _tool_plan_info(plan_id, current_plans)
            tool_used = "plan_info"

    # ── RESPONSE GENERATION via Gemma ───────────────────────────────────────

    session_ctx  = _build_session_context(profile, risk_data, current_plans)
    tool_ctx     = _build_tool_context(tool_used, tool_result)

    # Build a short conversation history for context (last 4 turns)
    history_lines = []
    for msg in messages[-5:-1]:  # exclude the current message
        role = "User" if msg.get('role') == 'user' else "Advisor"
        history_lines.append(f"{role}: {msg.get('content', '')}")
    history = "\n".join(history_lines)

    stage = session.get('stage')

    if stage == 'onboarding':
        sys_prompt = (
            "You are Outsurance's onboarding intake assistant. Your ONLY job is to collect and refine the user's health profile details "
            "(such as members, ages, city, medical conditions, budget, smoker status, hba1c, bp, height, weight). "
            "Do NOT recommend specific plans. If the user asks for plan recommendations or comparison, tell them: "
            "'I cannot recommend plans yet. Please click \"End Chat & View Plans\" below to run the comparison engine.' "
            "If the user asks random/unrelated questions (e.g. math, coding, general knowledge), say: "
            "'I am only here to help you get your details set up smoothly. Please use another assistant for general questions.' "
            "If the user is having difficulty expressing themselves, help them by asking helpful, clarifying questions "
            "about their health, lifestyle, or coverage budget. Be brief (2-3 sentences max) and conversational."
        )
    else:
        sys_prompt = (
            "You are Outsurance's AI insurance advisor. You have access to the user's health profile, "
            "risk assessment, and recommended insurance plans. "
            "Respond in 2-3 sentences. Be warm, specific, and jargon-free. "
            "When a tool result is available, summarise it clearly for the user. "
            "Never make up plan details — only reference what is in the context."
        )

    user_prompt = (
        f"{session_ctx}\n"
        f"{'Tool executed — ' + tool_ctx if tool_ctx else ''}\n"
        f"Conversation so far:\n{history}\n"
        f"User: {latest}\nAdvisor:"
    )

    try:
        response = llm_generate(sys_prompt, user_prompt, max_tokens=150)
    except Exception as e:
        print(f"[WARN] agent LLM generation failed: {e}")
        # Graceful fallback: use tool context if available
        if tool_ctx:
            response = tool_ctx
        else:
            response = (
                "I'm your Outsurance advisor. You can ask me to re-assess your profile with "
                "a new condition, simulate a different budget, run a stress test, or compare plans."
            )

    return {
        "response": response,
        "tool_used": tool_used,
        "tool_result": tool_result if (tool_result and "error" not in tool_result) else None,
        "tool_error": tool_result.get("error") if (tool_result and "error" in tool_result) else None,
        "updated_session": updated_session,
    }
