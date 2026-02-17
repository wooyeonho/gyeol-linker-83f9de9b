FROM coollabsio/openclaw:latest

COPY openclaw.json /app/config/openclaw.json
COPY workspace/ /data/workspace/
COPY startup.sh /app/scripts/startup.sh
RUN chmod +x /app/scripts/startup.sh

EXPOSE 8080

ENTRYPOINT ["/app/scripts/startup.sh"]
