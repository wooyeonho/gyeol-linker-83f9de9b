# Telegram Channel Configuration

## Bot Info
- Bot Name: GYEOL
- Username: @ai_gyeol_bot
- Webhook URL: {OPENCLAW_GATEWAY_URL}/api/telegram/webhook

## Commands
| Command | Description |
|---------|-------------|
| /start | Welcome message + bot introduction |
| /status | Show GYEOL's current personality + stats |
| /link <agent_id> | Link Telegram chat to a GYEOL agent |

## Message Handling
- All non-command messages are routed to Groq LLM
- Responses follow AGENT.md communication rules
- Language auto-detected from user message
- Conversations stored in memory_store and synced to Supabase

## Proactive Messages
- GYEOL sends proactive messages to linked chats
- Triggered by heartbeat learn-rss + proactive-message skills
- Respects user notification preferences

## Setup
1. Set TELEGRAM_BOT_TOKEN in .env
2. Call POST /api/telegram/setup with webhookUrl
3. Verify with GET https://api.telegram.org/bot{TOKEN}/getWebhookInfo
