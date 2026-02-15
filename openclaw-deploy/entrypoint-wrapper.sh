#!/usr/bin/env bash
set -e
echo "127.0.0.1 browser" >> /etc/hosts

# Fix DNS: some containers lack a working resolver (HF Spaces, etc.)
if ! getent hosts api.telegram.org >/dev/null 2>&1; then
  echo "[entrypoint-wrapper] DNS broken, adding Google DNS"
  echo "nameserver 8.8.8.8" > /etc/resolv.conf
  echo "nameserver 8.8.4.4" >> /etc/resolv.conf
fi

# Force Node.js to prefer IPv4
export NODE_OPTIONS="${NODE_OPTIONS:+$NODE_OPTIONS }--dns-result-order=ipv4first"

# Strip frame-blocking headers (needed for HF Spaces iframe, harmless elsewhere)
sed -i 's|proxy_pass http://127.0.0.1:${GATEWAY_PORT}|proxy_hide_header X-Frame-Options;\n        proxy_hide_header Content-Security-Policy;\n        proxy_pass http://127.0.0.1:${GATEWAY_PORT}|g' /app/scripts/entrypoint.sh

exec /app/scripts/entrypoint.sh "$@"
