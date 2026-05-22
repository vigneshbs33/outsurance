#!/usr/bin/env bash
# Run backend + frontend (run `npm run setup` first).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$ROOT/backend"
FRONTEND_DIR="$ROOT/frontend"

if [ ! -d "$BACKEND_DIR/venv" ] || [ ! -d "$FRONTEND_DIR/node_modules" ]; then
  echo "✗ Dependencies not installed."
  echo "  Run first:  npm run setup"
  exit 1
fi

echo "▶ Outsurance — starting servers"
echo ""

free_port() {
  local port=$1
  local pids
  pids=$(lsof -ti :"$port" 2>/dev/null || true)
  if [ -n "$pids" ]; then
    echo "   Freeing port $port (was in use)…"
    kill -9 $pids 2>/dev/null || true
    sleep 0.8
  fi
}
free_port 8000
free_port 3000

cleanup() {
  echo ""
  echo "▶ Stopping…"
  [ -n "${BACKEND_PID:-}" ] && kill "$BACKEND_PID" 2>/dev/null || true
  [ -n "${FRONTEND_PID:-}" ] && kill "$FRONTEND_PID" 2>/dev/null || true
  wait 2>/dev/null || true
  exit 0
}
trap cleanup EXIT INT TERM

cd "$BACKEND_DIR"
# shellcheck source=/dev/null
source venv/bin/activate
echo "▶ Backend  → http://localhost:8000  (docs: /docs)"
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

cd "$FRONTEND_DIR"
echo "▶ Frontend → http://localhost:3000"
npm run dev &
FRONTEND_PID=$!

echo ""
echo "✓ Running. Open http://localhost:3000 — Ctrl+C to stop."
echo ""

wait
