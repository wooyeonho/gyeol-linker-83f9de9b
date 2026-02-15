# gyeol-learner Skill

## Overview
RSS-based autonomous learning. GYEOL reads news feeds to stay current.

## Trigger
- Every heartbeat (first skill to run)

## RSS Sources
See LEARNING_SOURCES.md for full list.

Default feeds:
- AI technology (Korean)
- Technology trends (English)
- Programming (Korean)

## Processing
1. Fetch each RSS feed via HTTP GET
2. Parse XML, extract <title> elements
3. Take first 3 titles per feed (skip feed title)
4. Clean CDATA tags
5. Deduplicate against memory_store.learned_topics
6. Append new topics to learned_topics

## Memory Management
- Rolling buffer: 200 topics maximum
- Oldest topics dropped when limit reached
- Topics used by proactive-message skill

## Output
```json
{
  "skill": "learn-rss",
  "ok": true,
  "summary": "Learned 5 new topics",
  "topics": ["topic1", "topic2", ...]
}
```

## Failure Handling
- Individual feed failures don't block others
- Network timeouts: 10 seconds per feed
- Returns partial results if some feeds fail
