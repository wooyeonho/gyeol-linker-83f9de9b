FROM coollabsio/openclaw:latest

# HF Spaces: wrapper entrypoint adds "browser" hostname for nginx resolution
COPY entrypoint-wrapper.sh /app/scripts/entrypoint-wrapper.sh
RUN chmod +x /app/scripts/entrypoint-wrapper.sh

# Copy GYEOL custom config (merged on top of defaults)
COPY openclaw.json /app/config/openclaw.json

# Copy GYEOL workspace (skills, system prompt, learning sources)
COPY workspace/ /data/workspace/

EXPOSE 8080

ENTRYPOINT ["/app/scripts/entrypoint-wrapper.sh"]
