#!/bin/bash
set -e

echo "=== GYEOL OpenClaw Server - Oracle Cloud Deploy ==="
echo ""

if [ -z "$GROQ_API_KEY" ]; then
  echo "ERROR: GROQ_API_KEY not set."
  echo "  export GROQ_API_KEY=gsk_your_key_here"
  exit 1
fi

echo "[1/6] System update + Docker install..."
sudo apt-get update -y
sudo apt-get install -y docker.io docker-compose-plugin curl
sudo systemctl enable docker
sudo systemctl start docker
sudo usermod -aG docker "$USER"

echo "[2/6] Firewall setup..."
sudo iptables -I INPUT -p tcp --dport 8000 -j ACCEPT
sudo iptables -I INPUT -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT -p tcp --dport 443 -j ACCEPT
sudo iptables-save | sudo tee /etc/iptables/rules.v4 > /dev/null 2>&1 || true

echo "[3/6] Environment config..."
cat > .env << EOF
GROQ_API_KEY=${GROQ_API_KEY}
GROQ_MODEL=${GROQ_MODEL:-llama-3.3-70b-versatile}
GYEOL_APP_URL=${GYEOL_APP_URL:-https://gyeol-ai.vercel.app}
HEARTBEAT_INTERVAL_MINUTES=${HEARTBEAT_INTERVAL_MINUTES:-30}
SUPABASE_URL=${SUPABASE_URL:-}
SUPABASE_SERVICE_KEY=${SUPABASE_SERVICE_KEY:-}
TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN:-}
TELEGRAM_WEBHOOK_SECRET=${TELEGRAM_WEBHOOK_SECRET:-}
EOF

echo "[4/6] Docker build..."
sudo docker compose build

echo "[5/6] Start server..."
sudo docker compose down 2>/dev/null || true
sudo docker compose up -d

echo "[6/6] Health check..."
sleep 3
PUBLIC_IP=$(curl -s ifconfig.me)

if curl -sf "http://localhost:8000/api/health" > /dev/null; then
  echo ""
  echo "=== Deploy success! ==="
  echo "Server: http://${PUBLIC_IP}:8000"
  echo "Status: http://${PUBLIC_IP}:8000/api/status"
  echo "Docs:   http://${PUBLIC_IP}:8000/docs"
  echo ""
  echo "Set on Vercel:"
  echo "  OPENCLAW_GATEWAY_URL=http://${PUBLIC_IP}:8000"
else
  echo ""
  echo "WARNING: Health check failed. Check logs:"
  echo "  sudo docker compose logs -f"
fi
