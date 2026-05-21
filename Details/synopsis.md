# Outsurance — Project Synopsis
### Fidelity Hackathon 2026 | Team Codekrafters

> **Demo Walkthrough:** https://www.youtube.com/watch?v=S26bUqYPQX4  
> **Problem Statement:** Smart Insurance Recommendation Platform (PS-4)  
> **Submission Date:** 18/05/2026

---

## Team

| # | Name | Role & Ownership |
|---|------|-----------------|
| 1 | **Vignesh B S** | Full-Stack Backend Engineer — FastAPI backend, system architecture, all ML pipeline code (XGBoost training, suitability scorer, cosine similarity ranker), dataset curation, Supabase DB schema & RLS, AI agent orchestration |
| 2 | **Srujan N Hiremath** | Hardware & Edge Engineer — Raspberry Pi edge deployment, `.exe` packaging for local hardware, baked/offline ML model serving on edge devices, hardware integration & testing |
| 3 | **Ishaan Gupta** | Frontend Engineer — Next.js (App Router), TypeScript, Tailwind CSS v4, responsive UI across mobile/tablet/desktop |
| 4 | **Keshav Kumar Agrawal** | AI / SLM Integration — Local Gemma model integration, on-device document extraction, SLM-generated plain-English explanations, fallback AI pipeline |

---

## 1. Problem Understanding

### 1.1 Core Problem

Millions of Indians remain uninsured or locked into plans that don't suit their actual health profile. Buying insurance today requires visiting multiple insurer portals and filling repetitive forms with no personalised guidance.

The gap is not a lack of products — it's an **intelligent matching layer**: a system that ingests a person's real health data, processes it through trained ML models, and returns a ranked shortlist with clear reasoning.

> *Example:* "This plan is recommended because your HbA1c of 6.8% indicates pre-diabetic risk and it provides Day 1 diabetes cover without a waiting period."

Users also need transparency on **why** a plan was suggested, and protection from plans that appear affordable but carry hidden exclusions or waiting periods that render coverage useless for their specific condition.

### 1.2 Target Users

| User Segment | Description | Key Need |
|---|---|---|
| Middle-income First-time Buyer | Age 25–40, salaried, no prior insurance, confused by options | Simple guided intake; plain-English explanation of best plan |
| Chronic Condition Patient | Diabetic or hypertensive adult needing immediate cover | Accurate condition-matching; clear waiting period disclosure |
| Family Decision-maker | Age 30–50, seeking floater policy for spouse and children | Family floater vs individual comparison; cost-benefit per member |
| Senior Citizen | Age 56+, limited digital literacy, needs high coverage | Simplified UI; famous insurer preference; easy to understand |
| Privacy-conscious Professional | Reluctant to upload medical data to unknown services | JWT-protected endpoints; Supabase RLS; data minimisation |

---

## 2. Proposed Solution

### 2.1 Solution Summary

**Outsurance** is a privacy-first, AI-powered insurance recommendation platform for the Indian market.

**User flow:**
1. Complete a guided multi-step intake form (demographics, health conditions, financial constraints)
2. Optionally upload a clinical lab report (PDF or photo)
3. Local AI extracts HbA1c, blood pressure, and BMI — **raw document never leaves the device**
4. Only 10 numeric values are transmitted to the FastAPI backend
5. A 3-stage ML pipeline runs and returns a ranked list of matched plans
6. Each recommendation card shows a plain-English explanation, warning flags, and a direct Buy link

**Edge capability:** The platform can run on a Raspberry Pi, making it accessible to patients in remote areas or hospital waiting rooms without internet.

### 2.2 Key Features

| # | Feature | Priority | Description |
|---|---------|----------|-------------|
| 1 | Secure JWT Authentication | M | Supabase Auth with JWT tokens. Email login/register. Session persists across restarts. |
| 2 | Multi-Step Guided Intake Form | M | Collects demographics, health conditions (diabetes, hypertension, smoker), financials, and family size with a progress bar. |
| 3 | AI Document Extraction | M | User uploads PDF or photo of a lab report. AI extracts HbA1c, BP, and BMI. Raw document is **never stored on server**. |
| 4 | Privacy Verification Screen | M | All 10 extracted values shown as editable fields with confidence indicators before any data is transmitted. |
| 5 | ML Pipeline: XGBoost Classifier | M | Trained on 100,000 synthetic + real health records. Outputs risk tier and score. **87.1% accuracy.** |
| 6 | ML Pipeline: Suitability Scorer | M | 6-factor scoring: Budget Fit (20%), Condition Match (30%), Risk Alignment (15%), Age Gate (10%), Coverage (10%), Family Fit (15%). |
| 7 | ML Pipeline: Cosine Similarity Ranker | M | KNN cosine similarity between 10D user vector and plan `ideal_vector`. Final score = **60% suitability + 40% similarity**. |
| 8 | Explainable Risk Card | M | Bar chart of XGBoost feature importances shows which health factors drove the risk tier with percentage contributions. |
| 9 | Top Plan Recommendations (154 plans) | M | Each card shows insurer, match score, premium, coverage, Day 1 badges, warning flags, and an SLM-personalised explanation. |
| 10 | Plan Explorer with Filters | M | Full catalogue filterable by price range, coverage type, and insurer. |
| 11 | Side-by-Side Plan Comparison | M | Up to 3 plans compared across payment, room rent, waiting period, Day 1 covers, claim settlement ratio, and reviews. |
| 12 | Buy Insurance Option | M | Prominent CTA on every plan card redirecting user to the insurer's official portal in a new tab. |
| 13 | Privacy Controls | M | JWT-protected routes. Supabase RLS at DB layer. Only 10 numeric values cross the network per assessment. |
| 14 | Responsive Web UI | M | Next.js + TypeScript + Tailwind CSS v4. Fully responsive across mobile, tablet, and desktop. |
| 15 | Stress Test Emergency Simulator | G | 7 preset emergency scenarios. Calculates cost, room-rent penalty, time for claim, and claim amount. |
| 16 | AI Agent | G | Omnipresent chatbot. Runs ML pipeline, generates custom stress tests, compares KNN cosine similarity between user vector and plan vector via natural language. |
| 17 | Plan Warning Flags | G | Up to 3 warning badges per card (e.g., 4-yr wait for diabetes cover, 20% co-payment) auto-generated by the scoring engine. |

### 2.3 What Makes This Novel

1. **Privacy-First Edge AI (Local Gemma):** All medical report extraction and AI reasoning happens directly on the user's device — sensitive lab documents never leave their network.
2. **3-Stage ML Recommendation Pipeline:** XGBoost classifier → expert suitability scorer → cosine similarity ranker, stacked for safe and accurate matching.
3. **Interactive Stress Test Simulator:** Users can run mock medical emergencies (e.g., a 5-day ICU stay) against recommended plans to see exact out-of-pocket costs before buying.
4. **Secure Edge Implementation:** A Raspberry Pi deployment designed for hospital waiting rooms — scan reports, get instant recommendations, no internet required.
5. **Granular Side-by-Side Comparison:** Exposes hidden conditions like co-payments, room-rent caps, and day-one exclusions, going well beyond basic premium-vs-coverage comparisons.

---

## 3. Architecture

### 3.1 Technology Stack

| Layer | Technology | Reason |
|---|---|---|
| Frontend | Next.js (App Router) + TypeScript | File-based routing, server components, zero-config TypeScript. Single codebase for web and mobile browser. |
| Styling | Tailwind CSS v4 | Utility-first; CSS-native variables allow rapid design iteration. |
| Backend | FastAPI + Uvicorn (Python) | Async, auto-generates docs, ideal for ML-heavy Python stack with sub-10ms serialisation. |
| AI / ML | XGBoost + Cosine Similarity + Local SLM (Gemma, open source) | Full 3-stage pipeline; SLM for text generation. |
| Database | Supabase (PostgreSQL) | Managed Postgres with Row-Level Security, built-in Auth and JS SDK — zero infrastructure overhead. |
| Authentication | Supabase Auth + JWT (HS256) | Industry-standard JWT with automatic refresh; verified on every sensitive backend route. |
| Hosting / Deployment | Application (`.exe`) runs on user's hardware — Edge Deployment | Runs on anything from Raspberry Pi to servers. |

### 3.2 High-Level Architecture Summary

```
Browser (Next.js)
  └── 5-Step Assessment Flow
        └── POST /assess ──────────────────────────────────────────────────────┐
                                                                               ▼
                                                              FastAPI + Uvicorn Backend
                                                                │
                                                    ┌───────────┴────────────┐
                                                    ▼                        ▼
                                          Supabase JWT Verifier      3-Stage ML Pipeline
                                                                        │
                                                               Stage 1: XGBoost
                                                               (risk tier + score)
                                                                        │
                                                               Stage 2: Suitability Scorer
                                                               (6-factor weighted score)
                                                                        │
                                                               Stage 3: Cosine Similarity
                                                               (KNN ranker, plans_db.py)
                                                                        │
                                                              Post-score Warning Flags
                                                                        │
                                                              ◄─ Ranked plan list ──────
                                                                       
              ┌──────────────────────────────────────────────┐
              ▼                                              ▼
     AI on Edge (Local Gemma)                     Supabase (PostgreSQL)
     • PDF/image extraction                       • profiles
     • On-device reasoning                        • assessment_sessions
     • SLM explanation generation                 • recommendations
     • Fallback: Gemma 3                          • chat_messages
                                                  • plan_bookmarks
                                                  • stress_test_results
                                                  (RLS enforced at DB level)
```

---

## 4. User Flow (Plain-English Walkthrough)

1. **Login / Register** — Email + password. Supabase Auth issues a JWT stored in the browser session.
2. **Personal Details** — Name, age, city, gender, annual income, monthly budget, coverage type.
3. **Health Conditions** — Toggle switches: diabetes, hypertension, smoking status, chronic condition count.
4. **Document / Manual Entry** — Upload a lab report PDF or photo, or type values manually. Local AI extracts HbA1c, BP, BMI.
5. **Privacy Screen** — 10 labelled, editable fields with confidence indicators (green = clean extraction, amber = inferred, red = defaulted). User confirms before anything is transmitted.
6. **Dashboard** — Risk Card (colour-coded tier + score). Below it: plan cards with match score, premium, coverage, Day 1 badges, warning flags, SLM explanation, and 4 action buttons per plan.
7. **AI Agent Chatbot** — Persistent bar pinned to screen bottom. Natural language queries trigger live ML re-assessments, pre-filled stress test modals, or plan comparisons.
8. **Stress Test** — Select or describe an emergency scenario to see projected out-of-pocket costs.
9. **Comparison** — Add up to 3 plans to a side-by-side comparison table.

---

## 5. Database Design

### 5.1 Key Tables

| Table | Key Fields | Purpose |
|---|---|---|
| `profiles` | id, full_name, city, created_at | User profile metadata. RLS enforced at DB layer. |
| `assessment_sessions` | id, user_id, age, bmi, hba1c, bp_systolic, risk_tier, risk_score, monthly_budget, income_lakh, created_at | Stores each completed health intake. Only 10 numeric vitals; raw documents never persisted. |
| `recommendations` | id, assessment_id, top_plan_ids (JSONB), match_score, plain_english_explanation, created_at | Full ML pipeline output. JSONB stores ranked plan list with per-factor breakdowns. |
| `plan_bookmarks` | id, user_id, plan_id, bookmarked_at | User-saved plans. Plan catalogue lives in `plans_db.py` (154 plans) for sub-millisecond in-memory lookup. |
| `chat_messages` | id, assessment_id, user_id, role, content, tool_used, created_at | Full agent conversation history. Scoped per assessment. |
| `stress_test_results` | id, user_id, plan_id, scenario_name, total_cost, out_of_pocket, verdict, created_at | Persisted simulation results. |

### 5.2 Why Supabase / PostgreSQL

- **Relational + document hybrid** — strict FK constraints for core tables; JSONB for flexible plan data.
- **Row-Level Security** — enforced at the PostgreSQL engine level; users can only read their own rows. Stronger than application-only guards — essential for health and financial data.
- **Zero infrastructure overhead** — hosted Postgres, REST API, JS SDK, and admin console; no setup during the build sprint.

---

## 6. ML Pipeline Detail

### Stage 1 — XGBoost Risk Classifier
- Trained on **100,000 synthetic + real health records**
- Input: 10 numeric vitals (age, BMI, HbA1c, BP systolic, smoker flag, diabetes flag, hypertension flag, chronic count, income, monthly budget)
- Output: risk tier (Low / Medium / High / Critical) + confidence score
- Accuracy: **87.1%**

### Stage 2 — Weighted 6-Factor Suitability Scorer
Scores each of **154 real Indian insurance plans**:

| Factor | Weight |
|---|---|
| Condition Match | 30% |
| Budget Fit | 20% |
| Family Fit | 15% |
| Risk Alignment | 15% |
| Coverage | 10% |
| Age Gate | 10% |

### Stage 3 — Cosine Similarity KNN Ranker
- Builds a 10-dimensional user vector from vitals
- Computes cosine similarity against each plan's `ideal_vector`
- **Final score = 60% suitability + 40% similarity**

---

## 7. Privacy & Security

| Control | Implementation |
|---|---|
| On-device AI processing | Local Gemma runs in the browser / on Raspberry Pi; raw medical documents never transmitted |
| Minimal data transmission | Only 10 numeric values cross the network per assessment |
| JWT authentication | HS256 JWT issued by Supabase Auth; verified on every sensitive backend route |
| Row-Level Security | Supabase RLS at PostgreSQL level; enforces per-user data isolation |
| Privacy Verification Screen | User reviews and can edit all extracted values before submission |
| No document storage | Raw PDF/images are processed in-memory and discarded immediately |

---

## 8. Repo / Codebase Structure (Reference)

```
outsurance/
├── frontend/                  # Ishaan — Next.js + TypeScript + Tailwind
│   ├── app/                   # App Router pages
│   ├── components/            # UI components (plan cards, risk card, comparison, chatbot)
│   └── lib/                   # Supabase client, auth helpers
│
├── backend/                   # Vignesh — FastAPI + ML pipeline
│   ├── main.py                # FastAPI app entry point
│   ├── routers/               # /assess, /plans, /agent, /stress-test, /admin
│   ├── ml/
│   │   ├── xgboost_model.py   # Stage 1: risk classifier (Vignesh)
│   │   ├── suitability.py     # Stage 2: 6-factor scorer (Vignesh)
│   │   ├── ranker.py          # Stage 3: cosine similarity KNN (Vignesh)
│   │   └── plans_db.py        # 154 insurance plans in-memory store
│   ├── agent/                 # Gemma agent orchestration (Keshav)
│   └── schemas/               # Pydantic models
│
├── edge/                      # Srujan — Raspberry Pi + offline deployment
│   ├── installer/             # .exe / packaged app builder
│   ├── model_bake/            # Baked/quantised offline ML models
│   └── hardware/              # Pi setup scripts, offline inference server
│
├── ai_slm/                    # Keshav — Local Gemma integration
│   ├── extractor.py           # PDF/image → 10 vitals extraction
│   ├── explainer.py           # SLM plan explanation generator
│   └── fallback.py            # Gemma 3 fallback pipeline
│
└── supabase/
    └── migrations/            # DB schema, RLS policies
```

---

## 9. Demo

- **YouTube walkthrough:** https://www.youtube.com/watch?v=S26bUqYPQX4
- The video covers the full user journey: login → intake form → lab report upload → privacy screen → dashboard → AI agent → stress test → comparison table.