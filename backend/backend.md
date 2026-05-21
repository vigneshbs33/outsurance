# Outsurance — Backend Reference

> Complete developer reference for the backend: architecture, all endpoints, ML pipeline, running locally, and testing.

---

## Stack

| Layer | Technology |
|---|---|
| Web framework | FastAPI (Python) |
| ML model | XGBoost 3.x (8-feature multiclass classifier) |
| LLM | Gemma 3 1B via Ollama (local) |
| Auth | Supabase JWT (HS256), soft-fail demo mode |
| Insurance data | 15 plans in `app/plans_db.py` |
| Serialisation | Pydantic v2 |

---

## Directory Layout

```
backend/
├── app/
│   ├── main.py              # FastAPI app — all endpoints, assess_risk()
│   ├── agent.py             # Master orchestration agent (6 tools, intent classifier)
│   ├── condition_scorer.py  # Stage 0: LLM condition risk scorer + cache
│   ├── scorer.py            # Stage 2 suitability + Stage 3 cosine KNN + warnings
│   ├── plans_db.py          # Insurance plan catalogue (15 plans, 10D ideal vectors)
│   ├── llm_service.py       # Gemma text generator wrapper
│   ├── hospital_network.py  # Hospital network data helper
│   └── stress_test.py       # Out-of-pocket cost simulator
├── ml/
│   ├── generate_dataset.py  # Synthetic 100k-row dataset generator
│   ├── train_model.py       # XGBoost training + RandomizedSearchCV + CV
│   ├── risk_model.json      # Trained XGBoost weights (~17 MB)
│   ├── label_encoder.pkl    # LabelEncoder: Low/Medium/High/Critical
│   ├── model_metrics.json   # Accuracy, F1, CV scores from last run
│   ├── condition_cache.json # Pre-seeded cache: 50 common conditions + weights
│   └── training_data.csv    # 100,000-row training dataset
├── test_ml_flow.py          # Full ML pipeline test suite (70 tests, no server needed)
├── verify_pipeline.py       # End-to-end pipeline trace with real output
├── ML_Details.md            # Complete ML system reference (single source of truth)
└── backend.md               # This file
```

---

## Running the Backend

```bash
# 1. Install dependencies
cd backend
pip install -r requirements.txt   # or: pip install fastapi uvicorn xgboost scikit-learn shap pandas joblib pyjwt

# 2. Start Ollama + Gemma (for LLM features)
ollama run gemma3:1b

# 3. Start the API server
uvicorn app.main:app --reload --port 8000

# 4. Health check
curl http://localhost:8000/api/health
```

### Retrain the ML model (only needed after data changes)

```bash
cd backend
python -m ml.generate_dataset   # regenerate 100k rows
python -m ml.train_model         # 250 CV fits + final training (~20-30 min)
```

---

## Environment Variables

| Variable | Default | Purpose |
|---|---|---|
| `SUPABASE_JWT_SECRET` | `""` | JWT validation key. If unset, auth is skipped (demo mode) |

Set in `.env` at the backend root. FastAPI reads it via `os.getenv`.

---

## API Endpoints

### `GET /api/health`

Health check. Confirms model load status, LLM, and plan count.

```json
{
  "status": "ok",
  "ml_model": "XGBoost",
  "llm": "Gemma 3 1B",
  "agent": "enabled",
  "plans": 15
}
```

---

### `GET /api/plans`

Returns the full insurance plan catalogue.

```json
{ "plans": [ { "id": 1, "name": "...", ... } ] }
```

---

### `POST /api/assess`

**Main endpoint.** Runs the full 4-stage ML pipeline and returns top 5 plan recommendations.

**Request body** (`UserProfile`):

| Field | Type | Required | Notes |
|---|---|---|---|
| `age` | int | Yes | 18–85 |
| `bmi` | float | Yes | 16–48 |
| `smoker` | int | Yes | 0 or 1 |
| `hba1c` | float | Yes | 4.0–14.0 |
| `bp_systolic` | int | Yes | 90–220 |
| `diabetes` | int | Yes | 0 or 1 |
| `hypertension` | int | Yes | 0 or 1 |
| `chronic_count` | int | Yes | Legacy fallback field |
| `monthly_budget` | float | Yes | INR |
| `income_lakh` | float | Yes | Annual income in lakhs |
| `has_diabetes` | bool | No | Preferred over `diabetes` if provided |
| `has_hypertension` | bool | No | Preferred over `hypertension` if provided |
| `medical_history` | List[str] | No | Free-text conditions, e.g. `["heart attack", "thyroid"]` |
| `coverage_for` | str | No | `"Individual"` or `"Family"` (default: Individual) |
| `family_members` | int | No | Number of family members |

**Response shape:**

```json
{
  "risk_assessment": {
    "risk_tier": "High",
    "risk_score": 0.627,
    "confidence_pct": 63,
    "feature_importance_explanation": {
      "Condition Severity Score": 0.2438,
      "HbA1c (%)": 0.2105,
      "Smoker": 0.1388,
      "Blood Pressure (systolic)": 0.1206,
      "Age": 0.1121,
      "Metabolic Risk Score": 0.0930
    },
    "condition_detail": {
      "events": [
        { "name": "heart attack", "weight": 0.97, "resolved": false, "justification": "..." }
      ],
      "total_condition_risk_score": 0.97,
      "normalized_for_xgboost": 0.97,
      "dominant_condition": "heart attack",
      "risk_summary": "High-risk profile dominated by history of heart attack."
    }
  },
  "recommended_plans": [
    {
      "id": 3,
      "name": "Star Health Diabetes Safe",
      "insurer": "Star Health",
      "type": "Comprehensive",
      "annual_premium": 14000,
      "suitability_score": 8.7,
      "suitability_breakdown": {
        "budget_fit": 10.0,
        "condition_match": 9.5,
        "risk_alignment": 10.0,
        "age_eligibility": 10.0,
        "coverage_adequacy": 5.0,
        "family_fit": 10.0,
        "cosine_similarity": 8.2
      },
      "warning_flags": ["No cardiac critical illness cover"],
      "plain_english_explanation": "Given your heart attack history..."
    }
  ]
}
```

**Auth:** Bearer JWT in `Authorization` header. If missing or invalid, soft-fails to demo mode.

---

### `POST /api/agent`

Conversational agent endpoint. Processes a user chat message and executes the appropriate tool.

**Request:**

```json
{
  "messages": [{ "role": "user", "content": "what if my budget was 800 per month?" }],
  "user_vitals": { "age": 45, "bmi": 27, ... }
}
```

**Response:**

```json
{
  "response": "With a budget of ₹800/month, your top plan changes to...",
  "tool_used": "budget_sim",
  "tool_result": { ... }
}
```

**Available agent tools:**

| Tool | Trigger example | What it does |
|---|---|---|
| `reassess` | "what if I also have kidney disease?" | Re-runs full ML pipeline with new condition |
| `budget_sim` | "what if my budget was ₹800/month?" | Re-ranks plans only (skips XGBoost) |
| `stress_test` | "worst case cardiac surgery cost?" | Out-of-pocket cost simulation |
| `compare` | "compare plan 1 vs plan 2" | Side-by-side plan comparison table |
| `explain_risk` | "why am I high risk?" | Plain-English risk tier explanation |
| `plan_info` | "tell me more about plan 3" | Full plan detail lookup |

---

### `POST /api/extract`

Extracts health values from a clinical document (lab report, prescription PDF) using LLM.

**Request:** `{ "raw_text": "...", "image_base64": "..." }`

**Response:** Extracted health indicators (HbA1c, BP, glucose, etc.)

---

## The 4-Stage ML Pipeline

```
User message / form data
        │
        ▼
[STAGE 0] LLM Medical NER + Condition Scorer   (condition_scorer.py + agent.py)
          Free text → ["heart attack", "diabetes"] → {weight: 0.97, weight: 0.42}
          → condition_risk_score = 1.39 (float, 0–5)
        │
        ▼
[STAGE 1] XGBoost Health Risk Classifier        (ml/risk_model.json)
          8 features → risk_tier (Low/Medium/High/Critical) + risk_score (0–1)
          + feature_importance_explanation (top 6)
        │
        ▼
[STAGE 2] Weighted Plan Suitability Scorer      (scorer.py)
          6 factors: budget(20%), condition(30%), risk alignment(15%),
          age(10%), coverage(10%), family(15%)
          → suitability_score 0–10 per plan
        │
        ▼
[STAGE 3] Cosine KNN Similarity Ranker          (scorer.py)
          10D user vector vs plan ideal_vector → cosine similarity
          Final: 60% × suitability + 40% × cosine → top 5 plans
        │
        ▼
[STAGE 4] Gemma LLM Explanation Generator       (llm_service.py)
          Condition events + plan → plain_english_explanation per plan
```

---

## XGBoost Model — Key Facts

| Property | Value |
|---|---|
| Features | 8 (see below) |
| Target | Low / Medium / High / Critical |
| Training rows | 100,000 (synthetic + real datasets) |
| Hyperparameter search | RandomizedSearchCV, 50 iterations, 5-fold CV = 250 fits |
| Test accuracy | **85.0%** |
| Weighted F1 | **85.0%** |
| CV mean F1 | **85.4%** (Std: 0.0018) |
| Critical class F1 | 82.0% |
| Low class F1 | 90.2% |

**Feature set (8 features):**

| Feature | Type | Notes |
|---|---|---|
| `age` | int | 18–85 |
| `bmi` | float | 16–48 |
| `hba1c` | float | 4.0–14.0 |
| `bp_systolic` | int | 90–220 |
| `smoker` | binary | 0/1 |
| `condition_risk_score` | float | **0.0–5.0. #1 most important at 24.38%.** Encodes ALL conditions including diabetes (0.42) and hypertension (0.35). |
| `bmi_age_interaction` | float | bmi × age / 100 |
| `metabolic_risk_score` | float | (hba1c − 5.0) × bmi / 10 |

> `has_diabetes` and `has_hypertension` are **NOT** XGBoost features — they are encoded inside `condition_risk_score`. They are still used in Stage 2 (suitability scorer) and Stage 3 (KNN vector).

**Feature importances (production model):**

```
condition_risk_score   24.38%  ← #1
hba1c                  21.05%
smoker                 13.88%
bp_systolic            12.06%
age                    11.21%
metabolic_risk_score    9.30%
bmi_age_interaction     5.82%
bmi                     2.30%
```

---

## Condition Scorer — Cache Reference

The condition scorer uses a pre-seeded JSON cache (`ml/condition_cache.json`) for instant lookups. LLM is called only for unknown conditions.

| Condition | Risk Weight |
|---|---|
| cardiac arrest | 0.98 |
| heart attack / myocardial infarction | 0.97 |
| active cancer | 0.95 |
| organ failure | 0.96 |
| cancer in remission | 0.82 |
| kidney failure | 0.84 |
| stroke | 0.72 |
| COPD | 0.65 |
| type 1 diabetes | 0.50 |
| diabetes / type 2 diabetes | 0.42 |
| hypertension | 0.35 |
| asthma | 0.22 |
| thyroid / hypothyroid | 0.10 |
| appendix surgery (resolved) | 0.08 |

**Fallback chain** (when LLM is offline):
1. In-memory cache hit → return immediately
2. LLM call (Ollama/Gemma, temp=0.0)
3. LLM retry with stricter prompt
4. Regex keyword fallback → hardcoded weights
5. Unknown → default 0.35 per condition, capped at 5.0

---

## Test Suite

```bash
cd backend
python test_ml_flow.py
```

**70 tests, 0 dependencies on a running server.** Covers:

| Section | Tests |
|---|---|
| Stage 0A: Condition scorer cache hit | 6 |
| Stage 0B: Empty condition list | 3 |
| Stage 0C: Fallback (offline LLM) | 2 |
| Stage 0D: Cap at 5.0 | 1 |
| Stage 0E: Medical NER extractor | 3 |
| Stage 0F: Intent classifier | 5 |
| Stage 1: XGBoost (healthy / high-risk / critical / form-flag injection) | 15 |
| Stage 2: Weighted suitability scorer | 5 |
| Stage 3: Cosine KNN ranker | 3 |
| Stage 2+3 combined rank_plans() | 5 |
| Warning flags | 3 |
| Full pipeline integration (3 scenarios) | 6 |
| ML artifact file checks | 8 |
| Plans database sanity | 5 |
| **Total** | **70** |

**Last run result: 70/70 PASS**

---

## Key Design Decisions

**Why `condition_risk_score` encodes diabetes/hypertension instead of keeping binary flags in XGBoost:**
When `has_diabetes` and `has_hypertension` were separate XGBoost features, the model split on the binary flag and assigned `condition_risk_score` only 1.33% importance — making the dynamic LLM scorer irrelevant. Removing the redundant binary features forces XGBoost to use `condition_risk_score` (now 24.38% importance, #1 feature).

**Why 60/40 blend in Stage 3:**
Rules-based suitability (Stage 2) catches hard constraints (age gates, pre-existing wait periods, condition-specific boosts). Cosine KNN (Stage 3) catches subtle profile similarity patterns. The blend outperforms either alone.

**Why XGBoost over Random Forest / SVM:**
Built-in feature importance, handles mixed feature types (binary + float + int), class-imbalance support via `compute_sample_weight`, and <1ms inference latency per request.

**Why synthetic data (100k rows) over purely real datasets:**
Public healthcare datasets (Pima, UCI Heart) are small (300–800 rows) and Western-biased. The synthetic generator uses Indian epidemiology (IDF 2021, Lancet India 2023, WHO 2022) and injects Gaussian noise to target ~85% accuracy — avoiding overfitting.
