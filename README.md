# Outsurance

![Outsurance](frontend/public/fidsurance-logo.png)

**Outsurance** — an AI-driven, privacy-first insurance recommendation platform built for the Fidelity Hackathon 2026.

This project consists of:
1. **FastAPI Backend (Python)**: Houses the 3-stage ML pipeline (XGBoost + Weighted Scorer + Cosine Similarity) and the Gemma local LLM agent.
2. **Next.js 16 Frontend (TypeScript)**: The web-first UI for health assessments, plan discovery, and AI chat — built with Tailwind CSS v4, GSAP, and Framer Motion.
3. **Raspberry Pi Fallback**: A secure, isolated kiosk module.

---

## Requirements

- **Node.js** 18+ and **npm**
- **Python** 3.12+

## Installation (once)

Clone the repo, then from the **project root**:

```bash
git clone https://github.com/vigneshbs33/outsurance.git
cd outsurance
npm run setup
```

This installs backend Python packages (`backend/venv`) and frontend npm packages (`frontend/node_modules`). You only need to run this again after pulling dependency changes.

Equivalent without npm:

```bash
bash scripts/install.sh
```

## Run (every time)

From the **project root**:

```bash
npm start
```

| Service | URL |
|---------|-----|
| **App (UI)** | http://localhost:3000 |
| **API** | http://localhost:8000 |
| **Swagger** | http://localhost:8000/docs |

Press **Ctrl+C** to stop backend and frontend.

```bash
bash scripts/start.sh   # same as npm start
```

---

## Manual setup (optional)

<details>
<summary>Run backend and frontend in separate terminals</summary>

**Terminal 1 — API**
```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

**Terminal 2 — UI**
```bash
cd frontend
npm run dev
```

</details>

---

## API Endpoints

| Method | Path | What it does |
|---|---|---|
| `GET` | `/api/health` | Backend status (model loaded, plan count) |
| `GET` | `/api/plans` | Full insurance catalogue (~154 plans) |
| `POST` | `/api/rank-plans` | Score entire catalogue with KNN + suitability |
| `POST` | `/api/assess` | **3-stage ML pipeline** — returns risk tier + top 5 plans with warning flags |
| `POST` | `/api/agent` | **Master Orchestration Agent** — natural language, 6 tools (reassess / budget_sim / stress_test / compare / explain_risk / plan_info) |
| `POST` | `/api/chat` | Simple conversational chat (no tool execution) |
| `POST` | `/api/extract` | Gemma extracts health values from PDF text or image |
| `POST` | `/api/stress-test` | Emergency cost simulation (7 scenarios) |

### Using `/api/agent`

```json
POST /api/agent
{
  "messages": [
    { "role": "user", "content": "What if I also have kidney disease?" }
  ],
  "session": {
    "profile":       { "age": 35, "hba1c": 6.8, "monthly_budget": 1200 },
    "risk_data":     { "risk_tier": "High", "confidence_pct": 74 },
    "current_plans": [ ... ]
  }
}
```

Response:
```json
{
  "response":        "With kidney disease added, your risk tier has moved to Critical...",
  "tool_used":       "reassess",
  "tool_result":     { "risk_assessment": {...}, "recommended_plans": [...] },
  "updated_session": { "profile": {...}, "risk_data": {...}, "current_plans": [...] }
}
```

---

## 📂 Key Files
- `Outsurance_Master_Plan.md` — Complete architectural blueprint, ML metrics, and agent design.
- `ML_Details.md` — XGBoost training pipeline and synthetic dataset details.
- `UI_Context.md` — Frontend context for UI/UX engineers.

---

*Built for the Fidelity Hackathon 2026*
