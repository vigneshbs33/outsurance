# Outsurance

![Outsurance](frontend/public/fidsurance-logo.png)

**Outsurance** — an AI-driven, privacy-first insurance recommendation platform built for the Fidelity Hackathon 2026.

This project consists of:
1. **FastAPI Backend (Python)**: Houses the 3-stage ML pipeline (XGBoost + Weighted Scorer + Cosine Similarity) and the Gemma local LLM agent.
2. **Next.js 16 Frontend (TypeScript)**: The web-first UI for health assessments, plan discovery, and AI chat — built with Tailwind CSS v4, GSAP, and Framer Motion.
3. **Raspberry Pi Fallback**: A secure, isolated kiosk module.

---

## 🚀 How to Run the Project

### 1. Start the Backend (API + ML + AI Agent)
The backend needs Python 3.12+ and uses Uvicorn.
```bash
cd backend
# Create and activate a virtual environment (recommended)
python -m venv venv
.\venv\Scripts\activate   # Windows
# source venv/bin/activate # Mac/Linux

# Install dependencies
pip install -r requirements.txt

# Start the server
uvicorn app.main:app --reload --port 8000
```
> The API will be available at `http://localhost:8000`.
> Swagger UI documentation is at `http://localhost:8000/docs`.

### 2. Start the Frontend (UI)
The frontend is a Next.js 16 app with TypeScript and Tailwind CSS v4.
```bash
cd frontend

# Install dependencies
npm install

# Start the Next.js development server
npm run dev
```
> Open **http://localhost:3000** in your browser.
> Make sure the backend server is also running at port 8000.

---

## API Endpoints

| Method | Path | What it does |
|---|---|---|
| `GET` | `/api/health` | Backend status (model loaded, plan count) |
| `GET` | `/api/plans` | All 20 insurance plans |
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
