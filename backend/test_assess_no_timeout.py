import requests
import json

url = "http://localhost:8000/api/assess"
payload = {
    "age": 32,
    "bmi": 26.5,
    "smoker": 0,
    "hba1c": 6.2,
    "bp_systolic": 128,
    "diabetes": 1,
    "hypertension": 1,
    "chronic_count": 0,
    "monthly_budget": 4000.0,
    "income_lakh": 8.0,
    "has_diabetes": True,
    "has_hypertension": True,
    "coverage_for": "Individual",
    "family_members": 1
}

print("Submitting health profile to FastAPI ML matching pipeline (with extended timeout)...")
try:
    response = requests.post(url, json=payload, timeout=120)
    if response.status_code == 200:
        data = response.json()
        print("\n=== LIVE RISK ASSESSMENT RESULTS ===")
        print(f"Risk Tier: {data['risk_assessment']['risk_tier']}")
        print(f"Risk Score: {data['risk_assessment']['risk_score']}")
        
        print("\n=== TOP DYNAMIC INSURANCE MATCHES ===")
        for i, plan in enumerate(data['recommended_plans'][:3]):
            print(f"\nMatch #{i+1}: {plan['name']} ({plan['insurer']})")
            print(f"  - Premium: ₹{plan['annual_premium']}/year")
            print(f"  - Suitability Match Score: {plan.get('suitability_score')}/10")
            print(f"  - Cosine Similarity (Semantic Fit): {round(plan.get('cosine_similarity', 0) * 100, 2)}%")
            print(f"  - Local Gemma 3 Explanation: \"{plan.get('plain_english_explanation')}\"")
    else:
        print(f"Failed with status code: {response.status_code}")
        print(response.text)
except Exception as e:
    print(f"Error connecting to backend: {e}")
