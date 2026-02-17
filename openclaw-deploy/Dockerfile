FROM coollabsio/openclaw:latest

# Copy GYEOL custom config (merged on top of defaults)
COPY openclaw.json /app/config/openclaw.json

# Copy GYEOL workspace (skills, system prompt, learning sources)
COPY workspace/ /data/workspace/

EXPOSE 8080
