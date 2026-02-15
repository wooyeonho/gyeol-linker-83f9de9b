# gyeol-reflection Skill

## Overview
Self-reflection — GYEOL analyzes recent conversations to grow and improve.

## Trigger
- Every heartbeat (after learn-rss)

## Process
1. Gather last 10 conversations from memory_store
2. Format as "User: ... / GYEOL: ..." text
3. Send to Groq LLM with reflection prompt
4. Parse JSON response for:
   - reflection: free-text reflection content
   - personality_adjustments: trait deltas (-5 to +5)
   - learned: list of insights from conversations

## Personality Adjustment
- Each trait can change by -5 to +5 per reflection
- Changes applied immediately to memory_store
- Cumulative changes synced to Supabase by personality-sync

## Reflection Storage
- Stored in memory_store.reflections (max 50)
- Each entry: { timestamp, content }
- Accessible via /api/memory endpoint

## Language
- Reflection written in the same language as conversations
- Multi-language support (ko, en, ja, zh)

## Output
```json
{
  "skill": "self-reflect",
  "ok": true,
  "summary": "reflected on 10 conversations..."
}
```
