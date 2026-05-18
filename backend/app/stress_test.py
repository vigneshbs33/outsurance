# Outsurance — Stress Test Simulator
# Calculates out-of-pocket cost for a given emergency scenario on a plan.
# Used by /api/stress-test and the agent's stress_test tool.

SCENARIOS = [
    {
        "id": "icu_5_days",
        "name": "5-Day ICU Stay",
        "description": "ICU charges, nursing, medicines, and diagnostics",
        "icon": "🏥",
        "cost": 300000,
        "type": "medical",
        "room_rent_sensitive": True,
    },
    {
        "id": "cardiac_event",
        "name": "Cardiac Event (Angioplasty)",
        "description": "PTCA + stenting, 3-4 day hospitalisation, follow-up",
        "icon": "🫀",
        "cost": 500000,
        "type": "critical",
        "room_rent_sensitive": True,
    },
    {
        "id": "knee_replacement",
        "name": "Knee Replacement",
        "description": "Bilateral knee replacement including implant, 5-day stay, physio",
        "icon": "🦵",
        "cost": 250000,
        "type": "surgical",
        "room_rent_sensitive": True,
    },
    {
        "id": "appendix_surgery",
        "name": "Appendix Surgery (Emergency)",
        "description": "Laparoscopic appendectomy, 2-day stay, anaesthesia, OT charges",
        "icon": "🩻",
        "cost": 120000,
        "type": "surgical",
        "room_rent_sensitive": False,
    },
    {
        "id": "diabetic_emergency",
        "name": "Diabetic Emergency (DKA)",
        "description": "Diabetic ketoacidosis, ICU 3 days, insulin drip, monitoring",
        "icon": "🩸",
        "cost": 180000,
        "type": "medical",
        "room_rent_sensitive": True,
    },
    {
        "id": "cancer_treatment",
        "name": "Cancer (Chemotherapy Cycle)",
        "description": "6-cycle chemotherapy for Stage 2 cancer, medicines, oncology consults",
        "icon": "🎗️",
        "cost": 800000,
        "type": "critical",
        "room_rent_sensitive": False,
    },
    {
        "id": "stroke_rehab",
        "name": "Stroke + Rehabilitation",
        "description": "Ischaemic stroke, 10-day neuro ICU, 30-day physiotherapy rehab",
        "icon": "🧠",
        "cost": 600000,
        "type": "critical",
        "room_rent_sensitive": True,
    },
]

# Room-rent penalty: plans with a room-rent cap force a proportional reduction
# in all associated charges. Approximately 20% of a hospitalisation bill becomes
# non-claimable when there is a room-rent sub-limit and the patient upgrades.
_ROOM_RENT_PENALTY_RATIO = 0.20
_ROOM_RENT_NO_LIMIT_VALUES = {"No Limit", "Any Room", "N/A"}


def simulate(plan: dict, scenario_id: str) -> dict:
    scenario = next((s for s in SCENARIOS if s["id"] == scenario_id), None)
    if not scenario:
        return {"error": f"Unknown scenario '{scenario_id}'"}

    total_cost = scenario["cost"]
    coverage   = plan.get("coverage", 500000)
    copay_pct  = plan.get("copayment_pct", 0) / 100.0
    room_limit = plan.get("room_rent_limit", "No Limit")

    # 1. Room-rent sub-limit penalty
    room_rent_penalty = 0
    if scenario.get("room_rent_sensitive") and room_limit not in _ROOM_RENT_NO_LIMIT_VALUES:
        room_rent_penalty = int(total_cost * _ROOM_RENT_PENALTY_RATIO)

    # 2. Claimable amount after room-rent exclusion
    claimable = total_cost - room_rent_penalty

    # 3. Coverage cap
    covered_before_copay = min(claimable, coverage)

    # 4. Co-payment deduction
    copay_amount = round(covered_before_copay * copay_pct)
    plan_covers  = covered_before_copay - copay_amount

    # 5. Out-of-pocket
    out_of_pocket    = total_cost - plan_covers
    protection_pct   = round((plan_covers / total_cost) * 100)

    # 6. Verdict
    if out_of_pocket == 0:
        color   = "green"
        verdict = "Fully covered"
    elif out_of_pocket <= 50_000:
        color   = "green"
        verdict = "Minimal out-of-pocket"
    elif out_of_pocket <= 150_000:
        color   = "orange"
        verdict = "Manageable gap"
    elif out_of_pocket <= 350_000:
        color   = "orange"
        verdict = "Significant gap"
    else:
        color   = "red"
        verdict = "High financial risk"

    return {
        "scenario_name":        scenario["name"],
        "scenario_description": scenario["description"],
        "icon":                 scenario["icon"],
        "total_cost":           total_cost,
        "room_rent_penalty":    room_rent_penalty,
        "copay_amount":         copay_amount,
        "plan_covers":          plan_covers,
        "out_of_pocket":        out_of_pocket,
        "protection_pct":       protection_pct,
        "color":                color,
        "verdict":              verdict,
    }
