#!/bin/bash
set -e

echo "=== GYEOL OpenClaw Server Setup ==="

if ! command -v python3 &> /dev/null; then
    echo "Installing Python 3..."
    sudo apt-get update && sudo apt-get install -y python3 python3-pip python3-venv
fi

if ! command -v pm2 &> /dev/null; then
    echo "Installing PM2..."
    if command -v npm &> /dev/null; then
        npm install -g pm2
    else
        echo "npm not found. Installing Node.js..."
        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
        sudo apt-get install -y nodejs
        npm install -g pm2
    fi
fi

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OPENCLAW_DIR="$REPO_ROOT/openclaw-server"

if [ ! -d "$OPENCLAW_DIR" ]; then
    echo "ERROR: openclaw-server directory not found at $OPENCLAW_DIR"
    exit 1
fi

cd "$OPENCLAW_DIR"

if ! command -v poetry &> /dev/null; then
    echo "Installing Poetry..."
    pip3 install poetry
fi

echo "Installing dependencies..."
poetry install --no-root

if [ ! -f ".env" ]; then
    echo "Creating .env from template..."
    cp "$REPO_ROOT/server/.env.server" .env
    echo "IMPORTANT: Edit .env and add your API keys!"
fi

echo ""
echo "=== Setup Complete ==="
echo "Next steps:"
echo "  1. Edit openclaw-server/.env with your API keys"
echo "  2. Run: cd $REPO_ROOT && pm2 start server/ecosystem.config.js"
echo "  3. Run: pm2 save && pm2 startup"
echo ""
