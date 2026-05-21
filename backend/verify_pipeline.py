import sys
import os
import json
import pandas as pd

# Add backend and app to paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.append(BASE_DIR)
sys.path.append(os.path.join(BASE_DIR, "app"))

from app.main import assess_risk, UserProfile
from app.scorer import rank_plans
from app.plans_db import INSURANCE_PLANS
from app.agent import _extract_medical_terms

def test_full_pipeline():
    print("======================================================================")
    print("          OUTSURANCE 4-STAGE MEDICAL ML PIPELINE VALIDATION           ")
    print("======================================================================\n")

    # Raw User Query that includes both cardiovascular and other minor conditions
    user_query = "I survived a heart attack last year and had appendix surgery in 2019."
    print(f"User Query: \"{user_query}\"\n")

    # Step 1: Stage 0 Medical NER Term Extractor
    print("[STAGE 0] Extracting decisive medical events...")
    extracted_conditions = _extract_medical_terms(user_query)
    print(f"  -> Extracted: {extracted_conditions}\n")

    # Step 2: Health Profile Setup
    profile = UserProfile(
        age=45,
        bmi=27.2,
        smoker=0,
        hba1c=5.8,
        bp_systolic=135,
        diabetes=0,
        hypertension=1,
        chronic_count=0,
        monthly_budget=3500.0,
        income_lakh=12.0,
        has_diabetes=False,
        has_hypertension=True,
        medical_history=extracted_conditions
    )

    # Step 3: Run Stage 1 XGBoost Risk Classification + SHAP Explanation
    print("[STAGE 1] Running XGBoost Risk Classifier...")
    risk_tier, risk_score, shap_explanation, condition_detail = assess_risk(profile)
    
    print(f"  -> Assigned Risk Tier: {risk_tier}")
    print(f"  -> XGBoost Risk Score: {risk_score:.3f}")
    print(f"  -> SHAP Importance Explanation: {json.dumps(shap_explanation, indent=2)}")
    print(f"  -> Stage 0 Details:")
    print(f"     - Total Raw Sum: {condition_detail['total_condition_risk_score']:.2f}")
    print(f"     - Normalized XGBoost: {condition_detail['normalized_for_xgboost']:.2f}")
    print(f"     - Dominant Condition: {condition_detail['dominant_condition']}")
    print(f"     - Risk Summary: \"{condition_detail['risk_summary']}\"\n")

    # Step 4: Run Stage 2 & 3 Combined Ranking Engine
    print("[STAGE 2 & 3] Scoring and Ranking Plans (Weighted Suitability + Cosine KNN Blending)...")
    
    user_dict = profile.model_dump()
    user_dict['risk_tier'] = risk_tier
    user_dict['risk_score'] = risk_score
    user_dict['has_diabetes'] = int(profile.has_diabetes or profile.diabetes)
    user_dict['has_hypertension'] = int(profile.has_hypertension or profile.hypertension)
    
    if condition_detail:
        user_dict['condition_risk_score'] = condition_detail['normalized_for_xgboost']
        user_dict['dominant_condition']   = condition_detail['dominant_condition']
        user_dict['condition_detail']     = condition_detail
    else:
        user_dict['condition_risk_score'] = 0.0
        user_dict['dominant_condition']   = ""
        user_dict['condition_detail']     = None

    scored_plans = rank_plans(INSURANCE_PLANS, user_dict)
    
    print("\n======================= RANKED PLAN RECOMMENDATIONS =======================")
    for idx, plan in enumerate(scored_plans[:3]):
        print(f"\nRANK #{idx+1}: {plan['name']} ({plan['insurer']})")
        print(f"  - Plan Type: {plan['type']}")
        print(f"  - Premium: Rs {plan['annual_premium']}/year (Budget Fit Score: {plan['suitability_breakdown']['budget_fit']:.1f}/10)")
        print(f"  - Condition Match Score: {plan['suitability_breakdown']['condition_match']:.1f}/10")
        print(f"  - Cosine KNN Similarity (Stage 3): {plan['suitability_breakdown']['cosine_similarity'] * 10:.1f}%")
        print(f"  - Overall Suitability Match: {plan['suitability_score']:.1f}/10")
        
        warnings = plan.get('warning_flags', [])
        if warnings:
            # Clean rupee symbols in warnings if any
            clean_warnings = [w.replace("₹", "Rs. ") for w in warnings]
            print(f"  - Warnings: {', '.join(clean_warnings)}")
            
    print("\n======================================================================\n")

if __name__ == "__main__":
    test_full_pipeline()
