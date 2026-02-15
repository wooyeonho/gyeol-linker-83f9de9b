#!/usr/bin/env bash
set -e
echo "127.0.0.1 browser" >> /etc/hosts
exec /app/scripts/entrypoint.sh "$@"
