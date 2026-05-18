# OUTSURANCE — Master Architecture & Flow Plan
### Fidelity Hackathon 2026 | FinTech / HealthTech / AI-ML

![Outsurance](frontend/public/fidsurance-logo.png)
> **FINAL BUILD — All systems implemented and tested.**

---

## The Big Picture in One Line

> User uploads a lab report (PDF or photo) → **Gemma 3 1B reads it, extracts vitals, asks for missing values** → data goes through a **3-stage ML pipeline** (XGBoost risk classification → weighted suitability scorer → cosine similarity ranker) → top 5 plans with **0–10 match scores** → Gemma explains each plan in plain English → User can **keep chatting with the AI agent** to refine, ask "what if", or re-run.

---

## The Three Key Differences From Every Other Team

| Other teams | Outsurance |
|---|---|
| Send PDF to cloud AI (ChatGPT / Gemini API) | Gemma runs **on your GPU via FastAPI** — raw document never leaves the user's network |
| Score health risk, then filter plans by price | **3-stage ML pipeline**: XGBoost classifies risk → weighted scorer evaluates 6 factors → KNN cosine similarity blends in data-driven matching |
| One recommendation screen | **Master Orchestration Agent** — 6 tools wired to the full ML pipeline, operates the entire system through natural language |

---

## ML Pipeline — 3 Stages (PS Requires ALL THREE)

> The PS explicitly asks for: "classification models, scoring systems, and similarity-based recommendation engines."
> **We implement all three, stacked into a single pipeline.**

### Stage 1 — XGBoost Health Risk Classifier

```
Input: 11 features (age, bmi, hba1c, bp_systolic, smoker,
                    has_diabetes, has_hypertension, chronic_count,
                    bmi_age_interaction*, metabolic_risk_score*)
                    (* engineered features)

Output: risk_tier (Low / Medium / High / Critical)
        risk_score (0.0 → 1.0, model confidence)
        feature_importance_explanation (top 6 drivers, shown as bar chart in UI)
```

**Trained Model Metrics (100,000 synthetic patients, Indian population epidemiology):**

| Metric | Value |
|---|---|
| Accuracy | **87.1%** (Realistic generalisation) |
| Weighted F1 | **0.8710** |
| 5-Fold CV F1 Mean | **0.8710** |
| CV Std Dev | 0.0019 (very stable) |
| Critical class recall | 99% |

**Per-class F1:**
- Critical: 0.846
- High: 0.874
- Low: 0.906
- Medium: 0.820

**Top Feature Importances (from `get_booster().get_fscore()`):**
| Feature | Importance |
|---|---|
| chronic_count | 38.2% |
| has_diabetes | 34.6% |
| hba1c | 11.5% |
| smoker | 3.6% |
| bp_systolic | 3.4% |
| metabolic_risk_score | 2.4% |
| has_hypertension | 2.3% |
| age | 1.9% |

**XGBoost Hyperparameters:**
```python
n_estimators=300, max_depth=6, learning_rate=0.05,
subsample=0.8, colsample_bytree=0.8,
reg_alpha=0.1, reg_lambda=1.0,
objective='multi:softprob', eval_metric='mlogloss'
```

---

### Stage 2 — Weighted 5-Factor Suitability Scorer

```
Input: user profile + risk_tier (from Stage 1) + each plan's attributes
Output: suitability_score per plan (0-10)
```

**5 scoring factors with weights:**

| Factor | Weight | Logic |
|---|---|---|
| Budget Fit | 25% | Monthly premium vs budget ratio — hard reject if >130% of budget |
| Condition Match | 35% | Diabetes Day 1? Hypertension Day 1? Pre-existing wait period? |
| Risk Tier Alignment | 20% | Does plan type (Basic/Standard/Comprehensive) match risk tier? |
| Age Eligibility | 10% | Hard gate — ineligible plans return 0 and are hidden |
| Coverage Adequacy | 10% | Plan coverage vs user's annual income × 2 |

---

### Stage 3 — Cosine Similarity KNN Ranker

```
Input: user profile vector (10D normalized) + each plan's ideal_vector
Output: cosine_similarity score per plan (0-10)
```

**Final blend:**
```
match_score = 0.60 × suitability_score (Stage 2)
            + 0.40 × cosine_similarity  (Stage 3)
```

Rules dominate (60%) to enforce hard constraints. Similarity adds data-driven nuance (40%).

---

## Complete User Flow — Step by Step

```
┌─────────────────────────────────────────────────────────────────┐
│ STEP 1 — MULTI-STEP INTAKE FORM (Steps 1 & 2)                  │
│ Age, Gender, City, Income, Budget, Conditions, Smoker?          │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 2 — HEALTH AGENT SCREEN (Step 3)                           │
│ Tool: Native file input + pdfjs-dist (browser-native)           │
│                                                                 │
│ User can:                                                       │
│  [A] Upload PDF → pdfjs-dist extracts text ON DEVICE           │
│  [B] Take photo / gallery image → sent to /api/extract          │
│  [C] Type values manually in chat                               │
│  [D] Skip → use safe defaults                                   │
│                                                                 │
│ Gemma Agent extracts: HbA1c, BP, BMI                           │
│ If missing → agent asks: "I couldn't find your HbA1c..."       │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 3 — VERIFY VITALS (Step 4 — Privacy Screen)               │
│ Every extracted value shown as editable field                   │
│ Confidence banner (green/amber/red)                             │
│ "Only these numbers go to our server. Your document stays here."│
└─────────────────────────────────────────────────────────────────┘
         │  Only 10 values sent (no PDF, no name)
         ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 4 — FASTAPI BACKEND (3-Stage ML Pipeline)                  │
│                                                                 │
│ POST /api/assess                                                │
│                                                                 │
│  Stage 1: XGBoost → risk_tier + risk_score                     │
│           + feature_importance_explanation                      │
│                                                                 │
│  Stage 2: Weighted scorer → suitability_score per plan         │
│           (5 factors, per-factor breakdown returned)           │
│                                                                 │
│  Stage 3: Cosine similarity → blended match_score (0-10)       │
│                                                                 │
│  Gemma: plain-English explanation per top-5 plan               │
│                                                                 │
│  Returns: {risk_assessment, recommended_plans[5]}              │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 5 — RESULTS DASHBOARD                                      │
│                                                                 │
│  • XGBoost Risk Card: MEDIUM RISK | Score 74/100               │
│    → Bar chart of top 4 risk drivers (feature importances)     │
│  • Top 5 Plan Cards:                                           │
│    - Plan name + insurer                                        │
│    - Match Score: 8.4 / 10                                     │
│    - Coverage + Annual Premium                                  │
│    - Gemma explanation (2 sentences, specific to this user)    │
│    - Day 1 badges / wait period badges                         │
│  • [Compare All] button → side-by-side up to 3 plans          │
│  • AI Chat bottom sheet (continuous agent)                     │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 6 — POST-RESULT CONTINUOUS AGENT CHAT                      │
│                                                                 │
│  "What if I also have kidney disease?"                         │
│  → Gemma re-calls /api/assess with updated profile             │
│  → New rankings appear live                                    │
│                                                                 │
│  "Explain the diabetes waiting period for plan 2?"             │
│  → Gemma looks up plan data and explains                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## Full Stack — Exact Tools

| Layer | Tool | Status |
|---|---|---|
| Auth | Supabase Auth + JWT | ✅ Done |
| Frontend | Next.js 16 (App Router) + TypeScript + Tailwind CSS v4 | ✅ Done |
| PDF Upload | Native browser `<input type="file">` + pdfjs-dist | ✅ Done |
| Photo/Image Upload | Native browser `<input type="file" accept="image/*">` | ✅ Done |
| PDF Extraction (on-device) | pdfjs-dist | ✅ Done |
| Image OCR | Gemma 3 1B via /api/extract | ✅ Done |
| Health Agent Chat (Step 3) | Gemma 3 1B | ✅ Done |
| Stage 1 ML | XGBoost (300 trees, 100k training rows) | ✅ Trained |
| Stage 2 Scorer | Weighted 5-factor Python engine | ✅ Done |
| Stage 3 Ranker | Cosine Similarity (10D vectors) | ✅ Done |
| Plain English Explanations | Gemma 3 1B via /api/chat | ✅ Done |
| Master Orchestration Agent | agent.py + /api/agent (6 tools) | ✅ Done |
| Warning Flags per Plan | scorer.get_warning_flags() | ✅ Done |
| Stress Test (7 scenarios) | stress_test.py + /api/stress-test | ✅ Done |
| API Server | FastAPI + Uvicorn | ✅ Done |
| LLM Runtime | HuggingFace Transformers (local GPU) | ✅ Done |
| Database | Supabase (PostgreSQL) | ✅ Done |
| Plan Comparison | CompareDrawer.tsx (up to 3) | ✅ Done |
| Raspberry Pi Kiosk | Secure hospital kiosk vision | 📋 Planned |

---

## Insurance Plan Database — 15 Plans

| # | Plan | Type | Premium/yr | Coverage | Day 1 Diabetes |
|---|---|---|---|---|---|
| 1 | Arogya Sanjeevani (Star) | Basic | ₹3,600 | ₹5L | ❌ |
| 2 | HDFC Optima Secure | Comprehensive | ₹8,200 | ₹10L | ❌ |
| 3 | Star Health Diabetes Safe | Comprehensive | ₹14,000 | ₹5L | ✅ |
| 4 | Niva Bupa ReAssure 2.0 | Comprehensive | ₹11,500 | ₹25L | ❌ |
| 5 | Care Health Care Supreme | Comprehensive | ₹9,800 | ₹15L | ❌ |
| 6 | LIC Arogya Rakshak | Senior | ₹18,000 | ₹10L | ❌ |
| 7 | Bajaj Allianz Health Guard | Standard | ₹7,200 | ₹7.5L | ❌ |
| 8 | ICICI Lombard Complete Health | Standard | ₹8,800 | ₹10L | ❌ |
| 9 | Aditya Birla Activ One | Comprehensive | ₹13,200 | ₹20L | ❌ |
| 10 | ManipalCigna Prime Senior | Senior | ₹22,000 | ₹25L | ❌ |
| 11 | Tata AIG CritiCare | Critical Illness | ₹6,500 | ₹15L | ❌ |
| 12 | LIC Tech Term | Term Life | ₹8,000 | ₹50L | ❌ |
| 13 | Max Bupa Heartbeat | Comprehensive | ₹15,000 | ₹30L | ❌ |
| 14 | SBI General Arogya Premier | Standard | ₹10,500 | ₹10L | ❌ |
| 15 | Religare Health Care Freedom | Senior | ₹19,500 | ₹5L | ❌ |

---

## Hackathon Requirements — Every One Covered

| Requirement | How | Status |
|---|---|---|
| Secure JWT login | Supabase Auth | ✅ |
| Multi-step intake form | Steps 1–4 | ✅ |
| AI extraction from clinical documents | pdfjs-dist (browser) + file input + Gemma | ✅ |
| Trained ML model (classification) | XGBoost — 87.1% accuracy, 100k training rows | ✅ |
| Scoring system | Weighted 5-factor scorer (Stage 2) | ✅ |
| Similarity-based recommendation | Cosine similarity KNN ranker (Stage 3) | ✅ |
| Explainable recommendations | Feature importance bar chart + Gemma plain English | ✅ |
| Plan listing with filters | PlanExplorerScreen | ✅ |
| Side-by-side comparison (up to 3) | CompareScreen.js | ✅ |
| Privacy controls | On-device extraction, vitals deleted after assess | ✅ |
| Responsive UI (mobile + web) | Next.js 16 + Tailwind CSS v4 + GSAP + Framer Motion | ✅ |
| Chatbot guiding users | Master Orchestration Agent — 6 tools, full pipeline access | ✅ |
| 15–20 insurance plans | 20 plans including Family Floaters | ✅ |
| Stress Test Simulator | 7 scenarios, room-rent penalty, verdict rating | ✅ |
| Affordability Simulator | Budget slider + /api/agent budget_sim tool | ✅ |
| Model confidence indicator | confidence_pct on risk card + warning_flags per plan | ✅ |

---

## Master Orchestration Agent — Architecture

```
User message (natural language)
        │
        ▼
  Intent Classifier  ←  6 regex rule sets, <1 ms, deterministic
        │
        ├── "reassess"    → _tool_reassess()      → full 3-stage ML re-run
        ├── "budget_sim"  → _tool_budget_sim()    → scorer re-rank, skip XGBoost
        ├── "stress_test" → _tool_stress_test()   → emergency cost simulation
        ├── "compare"     → _tool_compare()       → 14-field comparison table
        ├── "explain_risk"→ _tool_explain_risk()  → feature-importance narrative
        ├── "plan_info"   → _tool_plan_info()     → full plan detail lookup
        └── (no match)    → Gemma answers conversationally from session context
        │
        ▼
  Gemma 3 1B  ←  session_ctx + tool_ctx + chat history
        │
        ▼
  { response, tool_used, tool_result, updated_session }
```

**Session state** carried across every turn:
```json
{
  "profile":       { "age": 35, "hba1c": 6.8, "monthly_budget": 1200, ... },
  "risk_data":     { "risk_tier": "High", "confidence_pct": 74, ... },
  "current_plans": [ { "id": 3, "name": "Star Health Diabetes Safe", ... } ]
}
```

The `updated_session` the agent returns is fed back into the next call — so profile changes from "What if I also have kidney disease?" persist for the rest of the conversation.

### Tool: `reassess`
Triggers on: "what if I also have...", "add condition", "re-assess", "update my profile"
- Parses new conditions (kidney, cancer, hypertension, etc.) and updates `chronic_count` / flags
- Parses new budget if mentioned in the same message
- Re-runs full XGBoost → scorer → cosine pipeline
- Regenerates Gemma explanations for new top-5

### Tool: `budget_sim`
Triggers on: "what if my budget was ₹2000/month", "can I afford..."
- Skips XGBoost (risk tier doesn't change with budget)
- Re-runs Stage 2 + Stage 3 scorer only → faster re-rank
- Returns `old_budget`, `new_budget`, new top-5

### Tool: `stress_test`
Triggers on: "cardiac event", "ICU", "cancer", "how much would it cost", "surgery"
- 7 scenarios: ICU Stay, Cardiac, Knee Replacement, Appendix, Diabetic Emergency, Cancer (chemo), Stroke + Rehab
- Calculates: room-rent penalty → coverage cap → co-payment → out-of-pocket
- Returns `verdict`: Fully covered / Minimal / Manageable / Significant / High financial risk

### Tool: `compare`
Triggers on: "compare plan 3 and plan 9", "vs", "side by side"
- Extracts plan IDs by number or by plan name substring match
- Returns 14-field comparison table (premium, coverage, wait periods, Day 1 flags, CSR, network, etc.)

### Tool: `explain_risk`
Triggers on: "why am I High risk", "what drove my score", "explain my risk"
- Returns top-4 feature importances from XGBoost with % contribution
- Plain-English tier description + actionable advice

### Tool: `plan_info`
Triggers on: "tell me more about plan 2", "what are the exclusions for..."
- Returns complete plan dict including coverage_highlights, exclusions, pros, cons, premium breakdown

---

## 5 USPs That Win

### USP 1 — Privacy-First Architecture (Three Verifiable Layers)

Most teams will send a lab report to ChatGPT or Gemini. We do not. Every layer of our stack was designed so that a judge can **verify the privacy claim live** — not just read it on a slide.

**Layer 1 — Device (pdfjs-dist)**
The PDF is parsed by `pdfjs-dist` entirely in JavaScript memory in the browser. The raw document bytes are never placed in a `fetch()` body, FormData, or any outbound request. A judge can open DevTools → Network tab during the upload step and confirm: zero document bytes, zero file name, zero patient name in any outbound request. Only 10 numbers leave the browser.

**Layer 2 — Gemma 3 1B (Local GPU, Not a Cloud API)**
When a user uploads a photo of a lab report (image OCR), the extraction runs on our team's local GPU via HuggingFace Transformers — not via OpenAI, Gemini API, or any third-party cloud LLM. The raw image is sent only to our own `/api/extract` endpoint, which runs Gemma 3 1B locally, extracts the 3 numeric values (HbA1c, BP, BMI), and discards the image immediately after. No photo is stored. No third-party AI ever sees the user's medical document. This is materially different from every team that calls `openai.chat.completions.create()` with a base64 image — their user's medical data is now in OpenAI's logs. Ours is not.

**Layer 3 — Supabase (Row-Level Security, Not Application-Level Access Control)**
Most teams using Supabase just add a `WHERE user_id = auth.uid()` in their frontend query and call it "secure." We enforce security at the database layer using PostgreSQL Row-Level Security (RLS). Every table (`assessments`, `recommendations`, `plan_bookmarks`, `chat_messages`) has RLS policies that reject queries for rows that don't belong to the authenticated JWT — even if a developer accidentally writes a query without a WHERE clause, even if the API is compromised, the database itself refuses to return another user's data. The JWT is verified by Supabase's Auth server (HS256), auto-refreshed, and verified on every protected FastAPI endpoint before the ML pipeline runs.

**What we store vs. what we don't:**

| Data | Stored? | Where |
|---|---|---|
| Raw PDF document | ❌ Never | Stays in browser memory only |
| Lab report photo | ❌ Deleted after OCR | Never persisted |
| Patient name | ❌ Never | Not collected |
| HbA1c / BP / BMI raw values | ❌ Deleted after `/api/assess` returns | Ephemeral only |
| Risk tier + risk score | ✅ Yes | Supabase `assessments` table, JWT-protected, RLS |
| Plan recommendations | ✅ Yes | Supabase `recommendations` table, RLS |
| Saved plan IDs | ✅ Yes | Supabase `plan_bookmarks`, RLS |

**The verifiable demo moment:** During the live demo, open browser DevTools → Network → click "Find My Plans" → every judge can see the request body contains only 10 numbers. No name. No document. No image. This one 30-second demo moment wins the privacy argument more convincingly than any number of architecture slides.

### USP 2 — 3-Stage ML Pipeline (Classification + Scoring + Similarity)
The only team that uses all three approaches the PS mentions. Each stage is visible in the API response with per-factor breakdowns.

### USP 3 — Explainable AI (Feature Importance Bar Chart + Warning Flags)
The dashboard shows exactly which health factors drove the risk tier — colour-coded bars. Every plan card now also shows up to 3 amber warning flags (e.g., "4-yr wait for diabetes cover", "20% co-payment on all claims").

### USP 4 — Master Orchestration Agent (Not Just a Chat Box)
After seeing results, the user keeps chatting. The agent has 6 tools and decides which one to use. "What if I also have kidney disease?" → re-runs the full 3-stage pipeline. "What if my budget was ₹800/month?" → re-ranks plans instantly. "Compare plan 3 and plan 9" → 14-field comparison table. This is the PS "Good to Have" chatbot — implemented as a proper tool-use agent.

### USP 5 — Stress Test Simulator (7 Emergency Scenarios)
Cardiac event, ICU stay, cancer chemotherapy, stroke rehabilitation, knee replacement, appendix surgery, diabetic emergency — each with realistic 2024 Indian hospital cost estimates, room-rent penalty calculation, and a plain-English verdict.

### BONUS USP 6 — Raspberry Pi Secure Hospital Kiosk
A dedicated, air-gapped kiosk at the hospital. User logs in with JWT, sees only their saved plan rankings. No raw vitals, no documents on the shared machine.

---

## How to Run

```bash
# Backend (Python)
cd backend
python -m ml.generate_dataset   # generates 100,000 training rows
python -m ml.train_model         # trains XGBoost (87.1% acc), ~90s
uvicorn app.main:app --reload --port 8000

# Frontend (Next.js)
cd frontend
npm install
npm run dev
# Open http://localhost:3000 in your browser
```

---

## File Structure

```
Outsurance/
├── ML_Details.md                 ← ML strategy & design doc
├── Fidsurance_Master_Plan.md     ← This file (full architecture)
├── UI_Context.md                 ← Frontend context for engineers
├── problemstatement.txt          ← Original PS
├── supabase_setup.sql            ← DB schema
├── backend/
│   ├── requirements.txt          ← fastapi, xgboost, transformers...
│   ├── app/
│   │   ├── main.py               ← FastAPI, 3-stage pipeline wired
│   │   ├── scorer.py             ← Stage 2 + Stage 3 engine
│   │   ├── plans_db.py           ← 20 insurance plans with ideal_vectors
│   │   ├── llm_service.py        ← Gemma 3 1B via HuggingFace
│   │   ├── agent.py              ← Master Orchestration Agent (6 tools)
│   │   └── stress_test.py        ← 7 emergency scenarios
│   └── ml/
│       ├── generate_dataset.py   ← 100k synthetic rows (Indian epidemiology)
│       ├── train_model.py        ← XGBoost training pipeline
│       ├── training_data.csv     ← Generated dataset
│       ├── risk_model.json       ← Trained XGBoost weights
│       ├── label_encoder.pkl     ← Risk tier label encoder
│       └── model_metrics.json    ← Accuracy: 87.1%, F1: 0.8710
└── frontend/                     ← Next.js 16 web app
    ├── next.config.ts
    ├── tailwind.config.ts
    ├── tsconfig.json
    └── src/
        ├── app/                  ← Next.js App Router pages
        │   ├── page.tsx          ← Landing page (GSAP, cinematic loader)
        │   ├── layout.tsx        ← Root layout
        │   ├── globals.css       ← Tailwind + CSS variables
        │   ├── login/page.tsx    ← Login (AuthSplitLayout)
        │   ├── register/page.tsx ← Signup (AuthSplitLayout)
        │   ├── assessment/page.tsx ← 5-step health intake wizard
        │   ├── dashboard/page.tsx  ← Risk card + plan recommendations
        │   ├── explorer/page.tsx   ← Plan listing with filters
        │   ├── explorer/[id]/page.tsx ← Plan detail + stress test
        │   ├── saved/page.tsx      ← Bookmarked plans
        │   └── profile/page.tsx    ← Account management
        ├── components/
        │   ├── AuthSplitLayout.tsx ← Login/register two-panel layout
        │   ├── Sidebar.tsx         ← Navigation sidebar + mobile drawer
        │   ├── StressTestModal.tsx ← Emergency cost calculator
        │   ├── CompareDrawer.tsx   ← Side-by-side plan comparison
        │   └── editorial.tsx       ← Shared UI primitives
        ├── lib/
        │   ├── api.ts              ← Backend API client functions
        │   ├── supabase.ts         ← Supabase auth + DB queries
        │   ├── compare.ts          ← Plan comparison state (localStorage)
        │   └── utils.ts            ← Misc utilities
        ├── data/
        │   └── landing.data.ts     ← Landing page copy & annotations
        └── enums/
            └── landing.enum.ts     ← Brand constants (BRAND_NAME, TAGLINE)
```
