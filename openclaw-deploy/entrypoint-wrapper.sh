#!/usr/bin/env bash
set -e

# Patch entrypoint.sh to remove the browser sidecar nginx block
# The browser VNC proxy causes "host not found" errors in containers without docker-compose
ORIG_ENTRYPOINT="/app/scripts/entrypoint.sh"
PATCHED_ENTRYPOINT="/tmp/entrypoint-patched.sh"

cp "$ORIG_ENTRYPOINT" "$PATCHED_ENTRYPOINT"

# Remove the browser location block from the nginx config template
# Replace the browser proxy block with a simple 404 return
sed -i 's|proxy_pass http://browser:3000/;|return 404;|g' "$PATCHED_ENTRYPOINT"

chmod +x "$PATCHED_ENTRYPOINT"
exec "$PATCHED_ENTRYPOINT" "$@"
