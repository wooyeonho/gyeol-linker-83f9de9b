# GYEOL Heartbeat — Autonomous Activity Cycle

## Schedule
- Interval: 30 minutes (configurable via HEARTBEAT_INTERVAL_MINUTES)
- First run: Immediately on server start
- Engine: APScheduler AsyncIOScheduler

## Skill Execution Order

### 1. learn-rss
- Fetch RSS from Google News (AI tech KR, tech trends US, programming KR)
- Extract up to 3 titles per feed
- Deduplicate against known topics
- Rolling buffer: 200 topics max

### 2. self-reflect
- Analyze last 10 conversations via Groq LLM
- Generate reflection text
- Suggest personality adjustments (-5 to +5 per trait)
- Apply changes to memory store

### 3. proactive-message
- Generate friendly message from recent topics
- Broadcast to all linked Telegram chats
- Store in proactive_messages buffer (max 50)

### 4. personality-evolve
- Triggered every 10 conversations
- Analyze conversation patterns
- Adjust personality traits based on interaction style

### 5. security-scan
- Count total conversations and blocked attempts
- Log security status

### 6. supabase-sync
- Verify Supabase connectivity
- Sync personality changes
- Sync activity logs

### 7. topic-research
- Deep dive into recently learned topics
- Generate insights for future conversations

### 8. telegram-broadcast
- Send proactive messages to linked Telegram chats
- Respect user notification preferences

## Monitoring Endpoints
- GET /api/status — Server status + last heartbeat
- GET /api/skills — Skill list + last run results
- GET /api/memory — Memory store summary
- GET /api/health — Health check
- POST /api/heartbeat — Manual trigger

## Failure Handling
- Individual skill failures don't block others
- Errors logged but don't crash heartbeat
- Graceful degradation when dependencies missing
