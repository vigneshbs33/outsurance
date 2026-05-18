# Data Flow: User Request to Recommendation

This document tracks how data flows through Outsurance during a typical insurance assessment.

## 1. Data Collection (Frontend)
- User enters age, budget, and income.
- User uploads a medical PDF.
- **Action**: `PDF.js` extracts vitals (HbA1c, BP, BMI) on-device.
- **Output**: A JSON object containing all user health parameters.

## 2. API Request
- Frontend sends a `POST` request to `https://backend/api/assess`.
- **Payload**:
  ```json
  {
    "age": 45,
    "bmi": 28.5,
    "hba1c": 6.8,
    "bp_systolic": 145,
    "smoker": 0,
    "diabetes": 1,
    "chronic_count": 1,
    "monthly_budget": 2000,
    "income_lakh": 12
  }
  ```
- **Auth**: Supabase JWT included in headers.

## 3. Risk Assessment (Backend ML)
- Backend loads the `XGBoost` model.
- Data is converted into a Pandas DataFrame.
- **Action**: `model.predict(input_data)` -> `HIGH_RISK`.
- **Action**: Heuristic score calculation -> `0.75`.

## 4. Plan Ranking (Backend Logic)
- `plans_db.py` provides 20+ insurance plans.
- `scorer.py` loops through each plan.
- **Action**: Scores plans based on `HIGH_RISK` tier and user's `diabetes` status.
- **Output**: Top 5 plans sorted by suitability score.

## 5. Reasoning Generation (AI Layer)
- For the top recommended plan, the backend calls `Gemma 3`.
- **Prompt**: "Explain why Plan X fits a user with HbA1c 6.8% and BP 145."
- **Response**: "This plan offers immediate coverage for diabetes-related complications which suits your HbA1c levels. The high coverage limit provides financial security given your elevated blood pressure."

## 6. Final Response & Display
- Backend returns the combined results to the Frontend.
- **Final JSON**:
  ```json
  {
    "risk_assessment": { "risk_score": 0.75, "risk_tier": "HIGH" },
    "recommended_plans": [
       { "name": "Star Diabetes Safe", "suitability_score": 9.5, "ai_reason": "..." },
       ...
    ]
  }
  ```
- Frontend renders the Results Screen with charts and plan cards.
