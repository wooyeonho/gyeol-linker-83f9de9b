# gyeol-proactive Skill

## Overview
GYEOL initiates conversations by sharing interesting things it learned.

## Trigger
- Every heartbeat (after learn-rss and self-reflect)

## Process
1. Get last 5 learned topics from memory_store
2. Send to Groq LLM with proactive prompt
3. Generate one-sentence friendly message
4. Broadcast to all linked Telegram chats
5. Store in proactive_messages buffer

## Message Style
- Short, friendly, one sentence
- Language matches recent topics
- No markdown, pure conversational text
- Feels like a friend sharing something cool

## Delivery Channels
- Telegram: sent to all chat IDs in telegram_chats
- Web Push: sent via push subscriptions (when configured)
- Activity Feed: logged to /api/activity stream

## Memory
- proactive_messages buffer: max 50 messages
- Each entry: { timestamp, message }

## User Preferences
- Respects autonomy_level setting (0-100)
- Higher autonomy = more frequent messages
- Users can disable via notification settings

## Output
```json
{
  "skill": "proactive-message",
  "ok": true,
  "message": "Hey, did you see that..."
}
```
