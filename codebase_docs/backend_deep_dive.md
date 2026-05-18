# Backend & ML Deep Dive

The Outsurance backend is a high-performance **FastAPI** server that integrates Machine Learning models for risk prediction and natural language generation.

## Directory Structure (`backend/`)

### 1. `app/` (The Server)
- **`main.py`**: The entry point. Defines API endpoints, handles CORS, and verifies Supabase JWTs.
- **`plans_db.py`**: A centralized database (currently a Python list) of insurance plans with their attributes (coverage, premium, exclusions, etc.).
- **`scorer.py`**: The ranking engine. It calculates a "suitability score" for each plan based on the user's risk profile and budget.

### 2. `ml/` (The Brain)
- **`xgboost_risk_model.json`**: A serialized XGBoost model trained to predict 4 risk categories: `LOW`, `MODERATE`, `HIGH`, and `CRITICAL`.
- **`label_encoder.joblib`**: Maps the model's numerical outputs back to human-readable strings.
- **`gemma_reasoner.py`**: Integrates **Google Gemma 3 1B**. It uses 4-bit quantization (via `bitsandbytes`) to generate concise, friendly explanations for why a plan fits a user.

## Core Logic

### Risk Assessment (`/api/assess`)
When the backend receives user vitals:
1. It passes the data into the **XGBoost model**.
2. The model returns a **Risk Tier**.
3. A heuristic **Risk Score** (0.0 to 1.0) is also calculated based on age, BMI, and chronic conditions.

### Plan Scoring (`scorer.py`)
The `score_plan` function evaluates each insurance plan:
- **Budget Fit**: Adds points if the premium is within the user's budget.
- **Risk Tier Match**: High-risk users get points for "Comprehensive" plans; low-risk users get points for "Basic" plans.
- **Condition Coverage**: Extra points if the plan covers specific user conditions (e.g., Diabetes) from Day 1.
- **Coverage Adequacy**: Checks if the coverage amount is sufficient compared to the user's income.

### AI Reasoning (Gemma 3)
Instead of showing generic "Why this plan?" text, the backend calls `generate_plan_explanation`. It provides Gemma with the plan details and user vitals, and Gemma returns a personalized 2-sentence summary.

## Security
The backend uses **Supabase JWT Verification**. Every request to protected endpoints must include a `Bearer <token>` in the Authorization header. The backend decodes this token using the `SUPABASE_JWT_SECRET` to identify the user.
