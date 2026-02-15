# GYEOL Heartbeat System

## Overview
The heartbeat is GYEOL's autonomous activity cycle. Every 30 minutes (configurable),
the agent performs a series of skills to learn, reflect, and proactively engage.

## Schedule
- **Interval**: 30 minutes (HEARTBEAT_INTERVAL_MINUTES)
- **First run**: Immediately on server start
- **Scheduler**: APScheduler AsyncIOScheduler

## Skill Execution Order

### 1. learn-rss
Fetches RSS feeds from Google News to learn about current events.
- Sources: AI technology (KR), technology trends (US), programming (KR)
- Extracts up to 3 titles per feed
- Deduplicates against previously learned topics
- Maintains rolling buffer of 200 topics

### 2. self-reflect
Uses Groq LLM to analyze recent conversations.
- Analyzes last 10 conversations
- Generates reflection text
- Suggests personality adjustments (-5 to +5 per trait)
- Extracts learned items from conversations
- Applies personality changes to memory store

### 3. proactive-message
Generates a friendly message based on recently learned topics.
- Uses last 5 learned topics as context
- Generates one-sentence casual message via Groq
- Broadcasts to all linked Telegram chats
- Stores in proactive_messages buffer (max 50)

### 4. security-scan
Reports current security status.
- Counts total conversations
- Counts blocked content attempts
- Logs to skills_log

### 5. supabase-sync
Verifies Supabase connectivity and syncs data.
- Tests connection to gyeol_agents table
- Syncs personality changes
- Syncs activity logs
- Reports connection status

## Activity Logging
Each heartbeat run is logged to `memory_store["skills_log"]` with:
- Timestamp (UTC ISO format)
- Results array with each skill's output
- Rolling buffer of last 50 heartbeat runs

## Monitoring
- GET `/api/status` - Server status including last heartbeat time
- GET `/api/skills` - Skill list and last run results
- GET `/api/memory` - Memory store summary
- GET `/api/health` - Health check
- POST `/api/heartbeat` - Manual heartbeat trigger

## Failure Handling
- Individual skill failures don't block other skills
- Errors are logged but don't crash the heartbeat
- Skills gracefully degrade when dependencies are missing
  (e.g., Supabase sync skips when not configured)
