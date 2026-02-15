# GYEOL Learning Sources

## RSS Feeds (Auto-fetched every heartbeat)

### Korean Tech News
- https://news.google.com/rss/search?q=AI+technology&hl=ko&gl=KR
- https://news.google.com/rss/search?q=programming&hl=ko&gl=KR
- https://news.google.com/rss/search?q=startup+tech&hl=ko&gl=KR

### English Tech News
- https://news.google.com/rss/search?q=technology+trends&hl=en&gl=US
- https://news.google.com/rss/search?q=artificial+intelligence&hl=en&gl=US

### Science & Culture
- https://news.google.com/rss/search?q=science+discovery&hl=ko&gl=KR
- https://news.google.com/rss/search?q=culture+trends&hl=ko&gl=KR

## Processing Rules
1. Extract title from each RSS item
2. Clean CDATA tags
3. Deduplicate against previously learned topics
4. Keep rolling buffer of 200 most recent topics
5. Use learned topics as context for proactive messages

## Topic Categories
- AI / Machine Learning
- Programming / Development
- Startup / Business
- Science / Technology
- Culture / Lifestyle

## Usage
- Proactive messages reference recent topics
- Self-reflection considers learned topics
- Conversation responses enriched with current knowledge
