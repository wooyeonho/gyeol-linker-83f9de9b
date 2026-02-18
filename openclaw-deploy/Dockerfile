FROM coollabsio/openclaw:latest

COPY openclaw.json /data/.openclaw/openclaw.json
COPY workspace/ /data/.openclaw/workspace/

COPY entrypoint-wrapper.sh /app/scripts/entrypoint-wrapper.sh
RUN chmod +x /app/scripts/entrypoint-wrapper.sh

ENV OPENCLAW_HOME=/data/.openclaw
ENV OPENCLAW_HOST=0.0.0.0

EXPOSE 8080

ENTRYPOINT ["/app/scripts/entrypoint-wrapper.sh"]
