#!/usr/bin/env bash
# Rebuild platform-specific dependencies after moving this repo from Linux to macOS.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> Checking Homebrew dependencies..."
if ! command -v brew >/dev/null 2>&1; then
  echo "Homebrew is required. Install from https://brew.sh and re-run this script."
  exit 1
fi

brew install python@3.12 ffmpeg

PYTHON="$(brew --prefix python@3.12)/bin/python3.12"
if [[ ! -x "$PYTHON" ]]; then
  echo "python@3.12 not found at $PYTHON"
  exit 1
fi

echo "==> Using $("$PYTHON" --version) at $PYTHON"

remove_linux_artifacts() {
  local dir="$1"
  echo "==> Cleaning $dir"
  rm -rf "$dir/venv" "$dir/.venv" "$dir/__pycache__"
  find "$dir" -type d -name "__pycache__" -prune -exec rm -rf {} + 2>/dev/null || true
}

setup_python_service() {
  local service="$1"
  local venv_path="$service/.venv"
  echo "==> Setting up Python service: $service"
  remove_linux_artifacts "$service"
  "$PYTHON" -m venv "$venv_path"
  # shellcheck disable=SC1091
  source "$venv_path/bin/activate"
  python -m pip install --upgrade pip
  pip install -r "$service/requirements.txt"
  deactivate
}

echo "==> Removing Linux-built frontend artifacts..."
rm -rf frontend/node_modules frontend/.next

setup_python_service auth-service
setup_python_service video-service
setup_python_service transcoding-service

echo "==> Installing frontend dependencies..."
(
  cd frontend
  npm ci
)

echo ""
echo "Setup complete."
echo ""
echo "Activate a service venv:"
echo "  source auth-service/.venv/bin/activate"
echo "  source video-service/.venv/bin/activate"
echo "  source transcoding-service/.venv/bin/activate"
echo ""
echo "Run services:"
echo "  cd auth-service && uvicorn main:app --reload --port 8000"
echo "  cd video-service && uvicorn main:app --reload --port 8001"
echo "  cd transcoding-service && python worker.py"
echo "  cd frontend && npm run dev"
echo ""
echo "API gateway (Docker):"
echo "  cd api-gateway && docker compose up -d"
