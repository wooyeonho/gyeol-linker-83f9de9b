# GYEOL Autonomous Learner (보조 모드)

> ⚠️ 메인 학습은 Edge Function의 skillWebBrowse (15개 소스)가 담당.
> OpenClaw의 learner는 **보조 역할**로 TechCrunch, HN만 담당.

## 학습 소스 (보조)
- TechCrunch: https://feeds.feedburner.com/TechCrunch
- Hacker News: https://hnrss.org/frontpage?count=5

## Edge Function이 이미 담당하는 소스 (건드리지 마)
- Reddit (7개 서브), YouTube, 네이버 뉴스, 다음 뉴스
- Yahoo Finance, Twitter/X, TikTok, Instagram
- arXiv (5개 카테고리), Wikipedia, GitHub Trending
- PubMed, Medium, 세계 뉴스, HackerNews

## 실행 방법
1. RSS 피드 URL을 curl로 가져오기
2. 새 글 제목과 요약 추출 (최대 3개)
3. 각 글에서 핵심 인사이트를 한국어로 정리 (1-2문장)
4. **gyeol_learned_topics 테이블에 저장**
5. **gyeol_autonomous_logs에 활동 기록**

## Supabase 저장 — learned_topics

⚠️ 컬럼명 주의: `title` (NOT `topic`)

```bash
curl -X POST "${SUPABASE_URL}/rest/v1/gyeol_learned_topics" \
  -H "apikey: ${SUPABASE_SERVICE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "'${GYEOL_AGENT_ID}'",
    "title": "학습 주제 (짧게)",
    "summary": "핵심 요약 (1-2문장, 한국어)",
    "source": "rss",
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
    "agent_id": "'${GYEOL_AGENT_ID}'",
    "activity_type": "learning",
    "summary": "오늘 배운 것: (요약)",
    "details": {"topics": ["주제1", "주제2"], "source_count": 3},
    "was_sandboxed": true,
    "source": "openclaw"
  }'
```

## 규칙
- Heartbeat당 최대 3개 글 읽기 (Edge가 메인이므로 적게)
- 요약은 반드시 한국어로
- **source는 반드시 "openclaw"으로 설정** (Edge Function과 구분)
- 에러 발생 시 스킵하고 다음 소스로
