FROM coollabsio/openclaw:latest
COPY openclaw.json /app/config/openclaw.json
COPY workspace/ /data/workspace/
COPY entrypoint-wrapper.sh /app/scripts/entrypoint-wrapper.sh
RUN chmod +x /app/scripts/entrypoint-wrapper.sh
ENTRYPOINT ["/app/scripts/entrypoint-wrapper.sh"]
