# Fidelity Hackathon 2026 — Synopsis Submission

---

## Team Information

| Field | Your Answer |
|---|---|
| **Team Name** | Fidsurance |
| **Problem Statement Chosen** | Smart Insurance Recommendation Platform |
| **Submission Date** | May 2026 |

| # | Full Name | Role / Responsibility |
|---|---|---|
| 1 | Vignesh B S | Full-Stack Lead — FastAPI backend, ML pipeline, system architecture |
| 2 | _(fill in)_ | ML Engineer — XGBoost training, dataset curation |
| 3 | Ishaan | Frontend Engineer — Next.js, TypeScript, Tailwind CSS v4 |
| 4 | _(fill in)_ | AI / LLM Integration — OpenAI GPT-4o, Gemini fallback, agent orchestration |

---

## Section 1 — Problem Understanding

### 1.1 What did you understand from the problem statement?

Millions of Indians remain uninsured or locked into plans that do not suit their actual health profile. Buying insurance today means visiting multiple insurer portals, filling repetitive forms, and decoding jargon like "pre-existing disease waiting period" or "room rent sub-limit" — with no personalised guidance whatsoever. The core gap is not a lack of products; India has 15+ major health insurers with hundreds of plan variants. The real gap is the intelligent matching layer that does not exist: a system that takes a person's real health data, processes it through trained ML models, and returns a ranked shortlist with clear, plain-English reasoning — "This plan is recommended because your HbA1c of 6.8% indicates pre-diabetic risk and it provides Day 1 diabetes cover without a waiting period." Beyond recommendations, users need to understand why a plan was suggested and be protected from plans that seem affordable but carry hidden exclusions or waiting periods that render the coverage useless for their specific condition. We must build that matching layer as a full-stack, AI-assisted platform.

### 1.2 Who are the primary target users?

| User Segment | Description | Key Need |
|---|---|---|
| **Middle-income first-time buyer** | Age 25–40, salaried, no prior insurance, confused by jargon | Simple guided intake; plain-English explanation of why a plan fits |
| **Chronic condition patient** | Diabetic or hypertensive adult needing Day 1 condition cover | Accurate condition-matching; clear waiting period and exclusion disclosure |
| **Family decision-maker** | Age 30–50, seeking a floater policy for spouse and children | Family floater vs individual comparison; cost-benefit per member |
| **Senior citizen** | Age 56+, limited digital literacy, needs high coverage | Simplified UI; well-known insurer preference; jargon-free output |
| **Privacy-conscious professional** | Reluctant to upload medical data to unknown services | JWT-protected endpoints; Supabase Row-Level Security; data minimisation |

---

## Section 2 — Proposed Solution

### 2.1 Solution Summary

**Fidsurance** is a privacy-first, AI-powered insurance recommendation platform for the Indian market. A user completes a guided multi-step intake form capturing demographics, health conditions, and financial constraints, then optionally uploads a clinical lab report — the platform uses AI to extract HbA1c, blood pressure, and BMI, and sends only 10 numeric values to a FastAPI backend running a three-stage ML pipeline (XGBoost risk classification → weighted 6-factor suitability scoring → cosine similarity KNN ranking) that ranks a catalogue of 154 real Indian insurance plans by personalised match score. Each recommendation includes a GPT-4o–generated plain-English explanation, amber warning flags for plan risks, a Buy Plan redirect to the insurer, and access to a persistent conversational AI Agent that can re-run the full pipeline, simulate emergency costs, and compare plans — all from a single dashboard.

### 2.2 Key Features

| # | Feature Name | Priority | Brief Description |
|---|---|---|---|
| 1 | Secure JWT Authentication | M | Supabase Auth with JWT tokens. Email login/register. Session persists across restarts. |
| 2 | Multi-Step Guided Intake Form | M | Collects demographics, health conditions (diabetes, hypertension, smoker), financials, and family size with a progress bar. |
| 3 | AI Document Extraction | M | User uploads a PDF or photo of a lab report. AI extracts HbA1c, BP, and BMI. Raw document not stored on server. |
| 4 | Privacy Verification Screen | M | All 10 extracted values shown as editable fields with confidence indicators before any data is transmitted. |
| 5 | 3-Stage ML Pipeline — XGBoost Classifier | M | Trained on 100,000 synthetic + real health records. Outputs risk tier (Low/Medium/High/Critical) and score. 87.1% accuracy, F1: 0.8710. |
| 6 | 3-Stage ML Pipeline — Weighted Suitability Scorer | M | 6-factor scoring per plan: Budget Fit (20%), Condition Match (30%), Risk Alignment (15%), Age Gate (10%), Coverage (10%), Family Fit (15%). |
| 7 | 3-Stage ML Pipeline — Cosine Similarity Ranker | M | KNN cosine similarity between 10D user vector and plan ideal_vector. Final score = 60% suitability + 40% similarity. |
| 8 | Explainable Risk Card | M | Bar chart of XGBoost feature importances on the dashboard — shows which health factors drove the risk tier with % contributions. |
| 9 | Top Plan Recommendations (154 plans) | M | Each card shows insurer, match score, premium, coverage, Day 1 badges, warning flags, and a GPT-4o personalised explanation. |
| 10 | Plan Explorer with Filters | M | Full catalogue filterable by price range, coverage type, and insurer. |
| 11 | Side-by-Side Plan Comparison | M | Up to 3 plans compared across co-payment, room rent, waiting period, Day 1 covers, claim settlement ratio, exclusions. |
| 12 | Buy Plan Button | M | Prominent CTA on every plan card redirecting user to the insurer's official portal in a new tab. |
| 13 | Privacy Controls | M | JWT-protected routes. Supabase RLS at DB layer. Only 10 numeric values cross the network per assessment. |
| 14 | Responsive Web UI | M | Next.js + TypeScript + Tailwind CSS v4. Fully responsive across mobile, tablet, and desktop. |
| 15 | Stress Test Emergency Simulator | G | 7 preset + unlimited AI-generated emergency scenarios. Calculates room-rent penalty, co-payment, and out-of-pocket verdict. |
| 16 | Persistent AI Agent Chatbar | G | Always-visible conversational chatbot. Re-runs ML pipeline, generates custom stress tests, compares plans — all via natural language. Powered by OpenAI GPT-4o with Gemini 2.5 Flash auto-fallback. |
| 17 | Plan Warning Flags | G | Up to 3 amber badges per card ("4-yr wait for diabetes cover", "20% co-payment") auto-generated by the scoring engine. |

### 2.3 What makes your solution different or novel?

Fidsurance is differentiated on three fronts no other team is likely to match simultaneously. First, we implement all three ML techniques the problem statement specifies — XGBoost classification, weighted suitability scoring, and cosine similarity ranking — in a single stacked pipeline whose every output is inspectable in the API response. Second, we catalogued 154 real Indian insurance plans (vs. the 15–20 typical of hackathon demos), making recommendations genuinely meaningful. Third, our persistent AI Agent goes beyond chat: typing "what if I get a heart attack" automatically generates a cost scenario, pre-fills the Stress Test modal with AI-estimated parameters, and returns a personalised out-of-pocket verdict — closing the loop from curiosity to financial clarity in a single message.

---

## Section 3 — Architecture Design

### 3.1 High-Level Architecture Diagram

> *[ Architecture Diagram — attach digital diagram here. Generated using eraser.io / draw.io ]*

```
┌──────────────────────────────────────────────────────────┐
│               USER'S BROWSER (Next.js Web App)           │
│                                                          │
│  Intake Form → Health Agent → Privacy Screen → Dashboard │
│  (Demographics)  (PDF/Photo)   (Verify 10 values)  + AI  │
│                                                          │
│         Only 10 numeric values sent via HTTPS + JWT      │
└──────────────────────────────┬───────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────┐
│              FASTAPI BACKEND (Python / Uvicorn)          │
│                                                          │
│  POST /api/assess                                        │
│  ┌────────────────────────────────────────────────────┐  │
│  │ STAGE 1: XGBoost → risk_tier + risk_score +        │  │
│  │          feature_importance[]                       │  │
│  └──────────────────────┬─────────────────────────────┘  │
│                         │                                │
│  ┌──────────────────────▼─────────────────────────────┐  │
│  │ STAGE 2: Weighted 6-Factor Suitability Scorer      │  │
│  │ Output: suitability_score (0–10) per plan          │  │
│  └──────────────────────┬─────────────────────────────┘  │
│                         │                                │
│  ┌──────────────────────▼─────────────────────────────┐  │
│  │ STAGE 3: Cosine Similarity KNN Ranker              │  │
│  │ user_vector (10D) vs plan ideal_vector (10D)       │  │
│  │ Final score = 0.60 × suitability + 0.40 × cosine  │  │
│  └──────────────────────┬─────────────────────────────┘  │
│                         │                                │
│  ┌──────────────────────▼─────────────────────────────┐  │
│  │ LLM Layer — llm_service.py                         │  │
│  │ PRIMARY:  OpenAI GPT-4o                            │  │
│  │ FALLBACK: Gemini 2.5 Flash (auto-switched)         │  │
│  └──────────────────────┬─────────────────────────────┘  │
│                         │                                │
│  POST /api/agent    POST /api/stress-test               │
│  (6-tool chatbot)   (Emergency cost simulator)          │
└──────────────────────────┬───────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────┐
│              SUPABASE (PostgreSQL + Auth)                 │
│  JWT Auth · RLS on all tables                           │
│  profiles · assessment_sessions · recommendations       │
│  plan_bookmarks · chat_messages                         │
└──────────────────────────────────────────────────────────┘
```

### 3.2 Technology Stack

| Layer | Technology Chosen | Reason for Choice |
|---|---|---|
| **Frontend** | Next.js (App Router) + TypeScript | File-based routing, server components, zero-config TypeScript. Single codebase for web and mobile browser. |
| **Styling** | Tailwind CSS v4 | Utility-first; v4 CSS-native variables allow rapid design iteration without custom CSS. |
| **Backend** | FastAPI + Uvicorn (Python) | Async, auto-generates OpenAPI docs, ideal for an ML-heavy Python stack with sub-10ms serialisation. |
| **AI / ML** | XGBoost + Custom Scorer + Cosine Similarity + OpenAI GPT-4o (primary) + Gemini 2.5 Flash (fallback) | Full 3-stage pipeline matching all three problem statement techniques; LLM for plain-English generation with automatic failover. |
| **Database** | Supabase (PostgreSQL) | Managed Postgres with Row-Level Security, built-in Auth, and a free-tier JS SDK — removes infrastructure overhead. |
| **Authentication** | Supabase Auth + JWT (HS256) | Industry-standard JWT with automatic refresh; verified on every sensitive backend route. |
| **Hosting / Deployment** | FastAPI on localhost:8000 + Next.js dev server on localhost:3000 | Hackathon scope — both services run on the demo laptop. Plan catalogue (154 plans) served from in-memory Python constant for sub-ms lookup. |

---

## Section 4 — Wireframe

### 4.1 Core User Flow

> *[ Wireframes — attach screenshots or design snapshots here. Include success and failure/error states. ]*

**Success flow:**
```
Login / Register
      │
      ▼
Step 1 — Personal Details (Name · Age · Gender · City · Income · Budget)
      │
      ▼
Step 2 — Health Conditions (Diabetes · Hypertension · Smoker · Chronic count)
      │
      ▼
Step 3 — Document Upload / Manual Entry
  [Upload PDF]  [Take Photo]  [Enter Manually]
  AI extracts HbA1c / BP / BMI
      │
      ▼
Step 4 — Privacy Verify Screen
  10 editable fields with confidence badges
  "Only these numbers go to our server."
      │
      ▼  POST /api/assess
Dashboard
  [RISK CARD: HIGH · 74/100 · HbA1c 31% | BMI 18%]
  [PLAN CARDS: Match score · Premium · Coverage · Day 1 badges]
  [Details] [Compare] [Stress Test] [Buy Plan →]
  [✦ AI Agent Bar always pinned at bottom]
      │              │
      ▼              ▼
Plan Detail      Compare Drawer
(Stress Test)    (Side-by-side up to 3)
```

**Failure / error states:**
- Backend unreachable → dashboard shows "Simulated mode" amber warning banner; plans loaded from fallback defaults.
- LLM API failure → plan cards rendered without explanation text; agent returns error message to user.
- Invalid JWT → user redirected to `/login` automatically via middleware.
- Document extraction failure → user prompted to enter vitals manually; no data lost.

### 4.2 Plain-English Walkthrough

1. **Login / Register:** User signs in via email and password. Supabase Auth issues a JWT stored in the browser session.
2. **Step 1 — Personal Details:** Form collects name, age, city, gender, annual income, monthly budget, and individual vs. family coverage type.
3. **Step 2 — Health Conditions:** Toggle switches capture diabetes, hypertension, smoking status, and a count of chronic conditions.
4. **Step 3 — Document / Manual Entry:** User uploads a lab report PDF or photo, or types values manually. AI extracts HbA1c, BP, and BMI from the document.
5. **Step 4 — Privacy Screen:** 10 labelled, editable fields displayed with confidence indicators (green = clean extraction, amber = inferred, red = defaulted). User confirms before any data is transmitted.
6. **Dashboard:** Risk Card shows tier (colour-coded), score, and XGBoost feature importance bar chart. Below it, plan cards show match score, premium, coverage, Day 1 badges, warning flags, GPT-4o explanation, and four action buttons: Details, Compare, Stress Test, Buy Plan.
7. **AI Agent Chatbar:** Persistent bar at screen bottom. Natural language queries trigger live ML re-assessments, pre-filled stress test modals, or plan comparisons — all returned inline as a conversational reply.
8. **Stress Test / Compare:** User selects or describes an emergency scenario to see out-of-pocket costs, or adds up to 3 plans to a side-by-side comparison table.

---

## Section 5 — Database Design

### 5.1 ER Diagram

> *[ ER Diagram — attach hand-drawn or digital diagram here. Minimum 5 entities with attributes and relationship cardinalities labelled. ]*

**Entity-relationship text notation:**

```
[profiles] 1 ────────────── N [assessment_sessions]
    id (PK)                       id (PK)
    full_name                     user_id (FK → profiles)
    city                          age, bmi, hba1c, bp_systolic
    created_at                    smoker, has_diabetes, has_hypertension
                                  chronic_count, monthly_budget, income_lakh
                                  coverage_for, family_members
                                  risk_tier, risk_score, confidence_pct
                                  created_at

[assessment_sessions] 1 ─── N [recommendations]
    id (PK)                       id (PK)
                                  assessment_id (FK → assessment_sessions)
                                  top_plan_ids (JSONB — ranked plan list)
                                  match_score, suitability_score
                                  cosine_similarity_score
                                  plain_english_explanation
                                  created_at

[profiles] 1 ────────────── N [plan_bookmarks]
    id (PK)                       id (PK)
                                  user_id (FK → profiles)
                                  plan_id (int — references plans_db.py)
                                  bookmarked_at

[assessment_sessions] 1 ─── N [chat_messages]
    id (PK)                       id (PK)
                                  assessment_id (FK → assessment_sessions)
                                  user_id (FK → profiles)
                                  role (user | assistant)
                                  content (text)
                                  tool_used (text, nullable)
                                  created_at

[profiles] 1 ────────────── N [stress_test_results]
    id (PK)                       id (PK)
                                  user_id (FK → profiles)
                                  plan_id (int)
                                  scenario_name (text)
                                  total_cost, covered_amount
                                  out_of_pocket, verdict
                                  created_at
```

**Relationship cardinalities:**
- `profiles` → `assessment_sessions`: **1:N** — one user completes multiple assessments over time
- `assessment_sessions` → `recommendations`: **1:N** — each assessment stores a ranked result set (JSONB)
- `profiles` → `plan_bookmarks`: **1:N** — a user can bookmark multiple plans
- `assessment_sessions` → `chat_messages`: **1:N** — chat history scoped per assessment context
- `profiles` → `stress_test_results`: **1:N** — simulation results stored per user per scenario

### 5.2 Key Tables / Collections

| Table / Collection | Key Fields | Purpose |
|---|---|---|
| `profiles` | `id`, `full_name`, `city`, `created_at` | User profile metadata. Row-Level Security enforced at DB layer by Supabase. |
| `assessment_sessions` | `id`, `user_id`, `age`, `bmi`, `hba1c`, `bp_systolic`, `risk_tier`, `risk_score`, `monthly_budget`, `income_lakh`, `created_at` | Stores each completed health intake. Only 10 numeric vitals — raw documents never persisted. |
| `recommendations` | `id`, `assessment_id`, `top_plan_ids` (JSONB), `match_score`, `plain_english_explanation`, `created_at` | Persists full ML pipeline output. JSONB stores ranked plan list with per-factor suitability breakdowns. |
| `plan_bookmarks` | `id`, `user_id`, `plan_id`, `bookmarked_at` | User-saved plans. Plan catalogue lives in `plans_db.py` (154 plans) for sub-millisecond in-memory lookup. |
| `chat_messages` | `id`, `assessment_id`, `user_id`, `role`, `content`, `tool_used`, `created_at` | Full agent conversation history. `role` is `user` or `assistant`. Scoped per assessment so agent always knows which profile it is advising. |
| `stress_test_results` | `id`, `user_id`, `plan_id`, `scenario_name`, `total_cost`, `out_of_pocket`, `verdict`, `created_at` | Persisted simulation results for the stress test feature. |

### 5.3 Database Choice & Justification

**Database chosen: Supabase (managed PostgreSQL)**

We chose Supabase for three reasons aligned with our specific data patterns. First, our core tables are highly relational (FK constraints across profiles, assessments, recommendations, and chats), while `top_plan_ids` uses JSONB for the variable-structure ranked plan list — giving us structured storage with document-style flexibility in one layer. Second, Supabase's Row-Level Security enforces at the PostgreSQL engine level that a user can only read their own rows — a stronger privacy guarantee than application-only guards, essential for health and financial data. Third, Supabase's free-tier hosted Postgres, REST API, JavaScript SDK, and admin console eliminated all infrastructure setup during the hackathon build sprint.

---

## Section 6 — Demo Justification

### 6.1 What will your demo look like?

A judge will watch *Priya, 35, Bangalore, HbA1c 6.8%* complete the intake form, upload a sample blood sugar report, and receive a dashboard showing **HIGH RISK · Score 74/100** with a ranked plan list — the top match carrying a GPT-4o explanation reading *"Recommended because your HbA1c indicates pre-diabetic risk — this plan covers diabetes hospitalization from Day 1"* and a visible **Buy Plan** button. The judge will then watch the AI Agent Bar receive the query *"What if I get a heart attack?"*, trigger a live ML re-run, generate a cardiac cost scenario, pre-fill the Stress Test modal, and return an out-of-pocket verdict conversationally — all without leaving the dashboard. The full flow covers JWT login, AI document extraction, all three ML stages, explainable risk, conversational AI agent, stress test simulation, plan comparison, and purchase redirect in under 4 minutes.

---

*File name for submission: `Fid2026_Synopsis_Fidsurance.pdf`*
*Convert: File → Save As → PDF before submission. Maximum 6 pages of written content (diagrams excluded).*
