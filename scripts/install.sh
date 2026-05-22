#!/usr/bin/env bash
# One-time setup: backend Python deps + frontend npm packages.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$ROOT/backend"
FRONTEND_DIR="$ROOT/frontend"

echo "▶ Outsurance — installation"
echo ""

# Backend
echo "▶ [1/2] Backend (Python 3.12+)"
cd "$BACKEND_DIR"
if [ ! -d venv ]; then
  python3 -m venv venv
  echo "   Created venv"
fi
# shellcheck source=/dev/null
source venv/bin/activate
pip install -r requirements.txt
echo "   ✓ Backend ready"
echo ""

# Frontend
echo "▶ [2/2] Frontend (Node.js 18+)"
cd "$FRONTEND_DIR"
npm install
echo "   ✓ Frontend ready"
echo ""

echo "✓ Installation complete."
echo "  Run the app:  npm start"
echo "  (from the project root)"
