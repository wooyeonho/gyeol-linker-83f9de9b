#!/usr/bin/env bash
set -e

export OPENCLAW_HOME="${OPENCLAW_HOME:-/data/.openclaw}"
export OPENCLAW_HOST="${OPENCLAW_HOST:-0.0.0.0}"

KOYEB_PORT="${PORT:-8080}"
export OPENCLAW_PORT="${KOYEB_PORT}"

echo "=== GYEOL OpenClaw Koyeb Entrypoint ==="
echo "OPENCLAW_HOME=${OPENCLAW_HOME}"
echo "OPENCLAW_PORT=${OPENCLAW_PORT}"
echo "OPENCLAW_HOST=${OPENCLAW_HOST}"
echo "Workspace files:"
ls -la "${OPENCLAW_HOME}/workspace/" 2>/dev/null || echo "  (no workspace found)"
echo "Config:"
cat "${OPENCLAW_HOME}/openclaw.json" 2>/dev/null || echo "  (no config found)"
echo "========================================="

ORIG_ENTRYPOINT="/app/scripts/entrypoint.sh"
PATCHED_ENTRYPOINT="/tmp/entrypoint-patched.sh"

if [ -f "$ORIG_ENTRYPOINT" ]; then
  cp "$ORIG_ENTRYPOINT" "$PATCHED_ENTRYPOINT"
  sed -i 's|proxy_pass http://browser:3000/;|return 404;|g' "$PATCHED_ENTRYPOINT"
  chmod +x "$PATCHED_ENTRYPOINT"
  exec "$PATCHED_ENTRYPOINT" "$@"
else
  echo "Original entrypoint not found, starting openclaw directly..."
  exec openclaw "$@"
fi
