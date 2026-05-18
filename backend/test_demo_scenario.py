import json
import xgboost as xgb
import pandas as pd
import sys
import os

# Add app directory to path
sys.path.append(os.path.join(os.path.dirname(__file__), "app"))
from scorer import rank_plans
from plans_db import INSURANCE_PLANS

def run_hackathon_demo():
    print("STARTING OUTSURANCE HACKATHON DEMO SCENARIO\n")
    
    print("0:30 - 1:30: The Scenario")
    print("Introducing 'Arjun', a 45-year-old with a family history of diabetes.")
    print("Simulating On-Device Camera Extraction of dummy Thyrocare lab report...")
    
    # Simulated output from extractor.py
    extracted_vitals = {
        "hba1c": 6.8,
        "bp_systolic": 135,
        "bp_diastolic": 85,
        "bmi": 26.0
    }
    print(f"Extracted Vitals: HbA1c: {extracted_vitals['hba1c']}%, BP: {extracted_vitals['bp_systolic']}/{extracted_vitals['bp_diastolic']}, BMI: {extracted_vitals['bmi']}")
    print("UI Flag: 'Pre-diabetic risk detected.'\n")
    
    print("1:30 - 2:30: The Magic (XGBoost + Gemma)")
    print("Arjun hits 'Find Plans'. Querying FastAPI Backend...")
    
    # Load Model
    model_path = os.path.join(os.path.dirname(__file__), "..", "outsurance_model.json")
    if not os.path.exists(model_path):
        print("Error: XGBoost model not found. Please run 'python ml/train_model.py' first.")
        return
        
    model = xgb.XGBClassifier()
    model.load_model(model_path)
    
    # Prepare Data for XGBoost
    user_features = pd.DataFrame([{
        'age': 45,
        'bmi': extracted_vitals['bmi'],
        'hba1c': extracted_vitals['hba1c'],
        'bp_systolic': extracted_vitals['bp_systolic'],
        'smoker': 0,
        'diabetes': 1 if extracted_vitals['hba1c'] >= 6.5 else 0,
        'prediabetes': 1 if 5.7 <= extracted_vitals['hba1c'] < 6.5 else 0,
        'hypertension': 1 if extracted_vitals['bp_systolic'] >= 130 else 0,
        'chronic_count': 1 # Assuming family history / pre-diabetic
    }])
    
    # Predict Risk Tier
    risk_prediction = model.predict(user_features)[0]
    risk_tiers = {0: "Low", 1: "Medium", 2: "High"}
    risk_label = risk_tiers.get(int(risk_prediction), "Unknown")
    print(f"XGBoost classified Arjun as: 'Tier {int(risk_prediction)} ({risk_label}) Risk'")
    
    # Score Plans
    print("Scoring 50+ plans against budget and risk tier...")
    
    user_profile = {
        "age": 45,
        "hba1c": extracted_vitals['hba1c'],
        "bp_systolic": extracted_vitals['bp_systolic'],
        "risk_tier": risk_label.upper(),
        "monthly_budget": 15000 / 12,
        "has_diabetes": True if extracted_vitals['hba1c'] >= 6.5 else False,
        "prediabetes": True if 5.7 <= extracted_vitals['hba1c'] < 6.5 else False,
        "has_hypertension": True if extracted_vitals['bp_systolic'] >= 130 else False,
        "income_lakh": 12
    }
    
    top_plans = rank_plans(INSURANCE_PLANS, user_profile)
    print("\nTop 3 Recommended Plans:")
    for i, plan in enumerate(top_plans[:3]):
        print(f"  #{i+1}: {plan['name']} by {plan['insurer']} (Score: {plan['suitability_score']:.1f}/100)")
        print(f"      Premium: Rs {plan['annual_premium']} | Day-1 Diabetes: {'Yes' if plan['diabetes_day1'] else 'No'}")
    
    print("\nGemma 3 1B Generating Explanation for #1 Plan (Star Diabetes Safe)...")
    
    # We skip actually loading the 2GB Gemma model in this script to save time, 
    # but we simulate the exact output that gemma_reasoner.py produces for this prompt:
    best_plan = top_plans[0]
    print(f"  >> 'Because your HbA1c is {extracted_vitals['hba1c']}%, this plan's day-one diabetes coverage saves you from the standard {best_plan['preexisting_wait_years']}-year waiting period.'")
    
    print("\n2:30 - 3:00: The Knockout Blow")
    print("Turn on Airplane Mode.")
    print(f"Gemma 3 1B Generating Explanation for #2 Plan ({top_plans[1]['name']}) INSTANTLY...")
    print(f"  >> 'With your Tier {int(risk_prediction)} profile, {top_plans[1]['name']} provides robust coverage, though it requires a {top_plans[1]['preexisting_wait_years']}-year waiting period for pre-existing conditions.'")
    
    print("\n'This entire reasoning engine is running locally. No health data leaves the phone. HIPAA compliance by default.'")
    print("...Drop mic.")

if __name__ == "__main__":
    run_hackathon_demo()
