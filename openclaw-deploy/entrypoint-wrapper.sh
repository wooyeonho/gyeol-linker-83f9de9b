#!/usr/bin/env bash
set -e
echo "127.0.0.1 browser" >> /etc/hosts

# HF Spaces loads apps in an iframe — strip frame-blocking headers from the gateway
sed -i 's|proxy_pass http://127.0.0.1:${GATEWAY_PORT}|proxy_hide_header X-Frame-Options;\n        proxy_hide_header Content-Security-Policy;\n        proxy_pass http://127.0.0.1:${GATEWAY_PORT}|g' /app/scripts/entrypoint.sh

exec /app/scripts/entrypoint.sh "$@"
