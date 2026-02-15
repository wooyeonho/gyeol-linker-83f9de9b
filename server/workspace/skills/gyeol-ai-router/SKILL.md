# gyeol-ai-router Skill

## Overview
Routes chat requests to the optimal AI provider based on context and availability.

## Trigger
- On every chat request

## Routing Priority
1. OpenClaw server (Groq/Llama) — default, free
2. BYOK provider (user's own API key) — if configured
3. Groq direct fallback — if OpenClaw unavailable
4. Built-in responses — emergency fallback

## Provider Support
| Provider | Model | Use Case |
|----------|-------|----------|
| Groq | llama-3.3-70b-versatile | Default, fast |
| OpenAI | gpt-4o | BYOK premium |
| Anthropic | claude-3.5-sonnet | BYOK premium |
| DeepSeek | deepseek-chat | BYOK budget |
| Gemini | gemini-pro | BYOK alternative |

## Language Detection
- Auto-detect from user message (ko, en, ja, zh)
- System prompt selected based on detected language
- Response language matches user input

## Response Processing
- clean_response() strips all markdown symbols
- No **, ##, -, * in output
- Pure conversational text
