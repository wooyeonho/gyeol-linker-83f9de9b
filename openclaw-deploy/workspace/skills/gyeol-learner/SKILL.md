# GYEOL Autonomous Learner

RSS 피드와 웹에서 새 글을 읽고 학습하는 스킬.

## 학습 소스
- TechCrunch: https://feeds.feedburner.com/TechCrunch
- ZDNet Korea: https://zdnet.co.kr/rss/
- Hacker News: https://hnrss.org/frontpage?count=5
- Reddit r/technology: https://www.reddit.com/r/technology/.rss?limit=5

## 실행 방법
1. RSS 피드 URL을 curl로 가져오기
2. 새 글 제목과 요약 추출 (최대 5개)
3. 각 글에서 핵심 인사이트를 한국어로 정리 (1-2문장)
4. **gyeol_learned_topics 테이블에 저장**
5. **gyeol_autonomous_logs에 활동 기록**

## Supabase 저장 — learned_topics

각 학습 주제를 개별 row로 저장:
```bash
curl -X POST "${SUPABASE_URL}/rest/v1/gyeol_learned_topics" \
  -H "apikey: ${SUPABASE_SERVICE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: resolution=merge-duplicates" \
  -d '{
    "agent_id": "AGENT_ID",
    "topic": "학습 주제 (짧게)",
    "summary": "핵심 요약 (1-2문장, 한국어)",
    "source": "rss 또는 web",
    "source_url": "원본 URL"
  }'
```

## Supabase 저장 — autonomous_logs

```bash
curl -X POST "${SUPABASE_URL}/rest/v1/gyeol_autonomous_logs" \
  -H "apikey: ${SUPABASE_SERVICE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "AGENT_ID",
    "activity_type": "learning",
    "summary": "오늘 배운 것: (요약)",
    "details": {"topics": ["주제1", "주제2"], "source_count": 3},
    "was_sandboxed": true
  }'
```

## 규칙
- Heartbeat당 최대 5개 글 읽기
- 요약은 반드시 한국어로
- 이미 배운 주제와 비슷한 건 요약만 업데이트 (새 row 만들지 않음)
- 에러 발생 시 스킵하고 다음 소스로
- **중요: topic 필드는 짧고 명확하게 (예: "AI 코드 리뷰 도구", "테슬라 자율주행 업데이트")**
