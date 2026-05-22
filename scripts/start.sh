#!/usr/bin/env bash
# Start Outsurance backend (port 8000) + frontend (port 3000) with one command.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$ROOT/backend"
FRONTEND_DIR="$ROOT/frontend"

echo "▶ Outsurance — starting backend + frontend"
echo "   Repo: $ROOT"
echo ""

# ── Backend venv + deps ─────────────────────────────────────────────────────
cd "$BACKEND_DIR"
if [ ! -d venv ]; then
  echo "▶ Creating Python venv…"
  python3 -m venv venv
fi
# shellcheck source=/dev/null
source venv/bin/activate

if ! python -c "import fastapi" 2>/dev/null; then
  echo "▶ Installing backend dependencies (first run only)…"
  pip install -q -r requirements.txt
fi

# ── Frontend deps ───────────────────────────────────────────────────────────
cd "$FRONTEND_DIR"
if [ ! -d node_modules ]; then
  echo "▶ Installing frontend dependencies (first run only)…"
  npm install
fi

# ── Launch both servers ─────────────────────────────────────────────────────
cleanup() {
  echo ""
  echo "▶ Shutting down…"
  [ -n "${BACKEND_PID:-}" ] && kill "$BACKEND_PID" 2>/dev/null || true
  [ -n "${FRONTEND_PID:-}" ] && kill "$FRONTEND_PID" 2>/dev/null || true
  wait 2>/dev/null || true
  exit 0
}
trap cleanup EXIT INT TERM

cd "$BACKEND_DIR"
source venv/bin/activate
echo "▶ Backend  → http://localhost:8000  (docs: /docs)"
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

cd "$FRONTEND_DIR"
echo "▶ Frontend → http://localhost:3000"
npm run dev &
FRONTEND_PID=$!

echo ""
echo "✓ Both servers running. Press Ctrl+C to stop."
echo "  Open http://localhost:3000 for the app."
echo ""

wait
