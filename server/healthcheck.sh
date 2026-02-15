#!/bin/bash

OPENCLAW_URL="${OPENCLAW_URL:-http://localhost:8000}"
LOG_FILE="/tmp/gyeol-healthcheck.log"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

response=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$OPENCLAW_URL/api/health" 2>/dev/null)

if [ "$response" = "200" ]; then
    echo "$TIMESTAMP [OK] OpenClaw healthy (HTTP $response)" >> "$LOG_FILE"
else
    echo "$TIMESTAMP [FAIL] OpenClaw unhealthy (HTTP $response)" >> "$LOG_FILE"

    if command -v pm2 &> /dev/null; then
        echo "$TIMESTAMP [ACTION] Restarting via PM2..." >> "$LOG_FILE"
        pm2 restart gyeol-openclaw 2>> "$LOG_FILE"
    fi
fi

tail -100 "$LOG_FILE" > "${LOG_FILE}.tmp" && mv "${LOG_FILE}.tmp" "$LOG_FILE"
