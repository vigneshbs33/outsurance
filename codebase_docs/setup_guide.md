# Setup & Installation Guide

Follow these steps to get the Outsurance development environment running.

## Prerequisites
- **Node.js** (v18+)
- **Python** (3.10+)
- **A modern web browser** (Chrome, Firefox, Edge)
- **Supabase Account** (to get API keys).

---

## 1. Backend Setup (FastAPI)

1. **Navigate to backend**:
   ```bash
   cd backend
   ```
2. **Create a virtual environment**:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```
3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```
4. **Environment Variables**:
   Copy `backend/.env.example` to `backend/.env` and fill in your values:
   ```env
   SUPABASE_JWT_SECRET=your_jwt_secret_from_supabase
   HUGGINGFACE_TOKEN=hf_your_token_here
   CORS_ORIGINS=http://localhost:3000
   ```
5. **Run the server**:
   ```bash
   uvicorn app.main:app --reload
   ```

---

## 2. Frontend Setup (Next.js)

1. **Navigate to frontend**:
   ```bash
   cd frontend
   ```
2. **Install dependencies**:
   ```bash
   npm install
   ```
3. **Environment Variables**:
   Create a `.env.local` file in `frontend/`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   NEXT_PUBLIC_BACKEND_URL=http://localhost:8000/api
   ```
4. **Start Next.js dev server**:
   ```bash
   npm run dev
   ```
5. **Open in browser**: Navigate to `http://localhost:3000`.

---

## 3. Machine Learning Notes
- The XGBoost model is pre-trained and saved in `backend/ml/risk_model.json`. Run `python -m ml.train_model` to regenerate it.
- If you want to use the **Gemma 3 Reasoner**, you need a GPU with at least 4 GB VRAM. Set `HUGGINGFACE_TOKEN` in `backend/.env` with an account that has access to `google/gemma-3-1b-it`.
- If no GPU is available (or the token is unset), the backend automatically uses its high-fidelity demo-fallback responses — no action required.
