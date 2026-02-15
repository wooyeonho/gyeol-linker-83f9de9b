# gyeol-supabase Skill

## Overview
Connects GYEOL to Supabase for persistent data storage.

## Trigger
- Every heartbeat (30 min)
- On conversation completion

## Actions
1. Verify Supabase connection (test query to gyeol_agents)
2. Sync new conversations to gyeol_conversations table
3. Sync personality changes to gyeol_agents table
4. Sync activity logs to gyeol_autonomous_logs table

## Required Environment
- SUPABASE_URL
- SUPABASE_SERVICE_KEY

## Tables Used
- gyeol_agents (personality, gen, visual_state)
- gyeol_conversations (chat history)
- gyeol_autonomous_logs (heartbeat activity)
- gyeol_taste_vectors (interest profiles)

## Graceful Degradation
When Supabase is not configured, the skill returns:
```json
{"skill": "supabase-sync", "ok": false, "reason": "Supabase not configured"}
```
All data remains in memory_store until Supabase is available.
