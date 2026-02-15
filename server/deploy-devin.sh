#!/bin/bash
set -e

echo "=== GYEOL Deploy (Devin Infrastructure) ==="

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OPENCLAW_DIR="$REPO_ROOT/openclaw-server"

cd "$OPENCLAW_DIR"

if [ ! -f ".env" ]; then
    echo "ERROR: .env not found. Run setup.sh first."
    exit 1
fi

if ! command -v poetry &> /dev/null; then
    echo "Installing Poetry..."
    pip3 install poetry
fi

echo "Installing dependencies..."
poetry install --no-root

echo "Starting server with PM2..."
cd "$REPO_ROOT"

if command -v pm2 &> /dev/null; then
    pm2 stop gyeol-openclaw 2>/dev/null || true
    pm2 start server/ecosystem.config.js
    pm2 save
    echo ""
    echo "=== Server started with PM2 ==="
    echo "Monitor: pm2 logs gyeol-openclaw"
    echo "Status:  pm2 status"
else
    echo "PM2 not found. Starting directly..."
    cd "$OPENCLAW_DIR"
    poetry run uvicorn app.main:app --host 0.0.0.0 --port 8000 &
    echo "Server started on port 8000 (background process)"
fi

echo ""
echo "Health check: curl http://localhost:8000/api/health"
