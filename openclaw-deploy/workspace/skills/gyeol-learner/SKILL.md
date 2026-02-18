# GYEOL Learner — Reader Mode (보조)

> ⚠️ 직접 웹 브라우징 금지! Edge Function의 skillWebBrowse(15개 소스)가 메인 수집 담당.
> OpenClaw learner는 **Edge가 수집한 데이터를 읽어서 소화**하는 Reader 역할만 수행.

## 역할: Reader (소화기)
Edge Function이 `gyeol_learned_topics`에 저장한 최신 학습 데이터를 읽고,
이를 기반으로 **인사이트 생성** 및 **대화 소재 준비**를 수행합니다.

## 실행 방법

### Step 1: 최근 학습 주제 읽기 (최대 10개)

```bash
curl -X GET "${SUPABASE_URL}/rest/v1/gyeol_learned_topics?agent_id=eq.${GYEOL_AGENT_ID}&order=learned_at.desc&limit=10" \
  -H "apikey: ${SUPABASE_SERVICE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}"
```

### Step 2: 읽은 주제에서 인사이트 추출

읽은 학습 주제들을 분석하여:
1. 사용자가 관심 가질 만한 주제 3개 선별
2. 각 주제에 대해 대화 소재(한국어, 1-2문장) 생성
3. 주제 간 연결고리가 있으면 통합 인사이트 작성

### Step 3: 활동 로그 기록

```bash
curl -X POST "${SUPABASE_URL}/rest/v1/gyeol_autonomous_logs" \
  -H "apikey: ${SUPABASE_SERVICE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "'${GYEOL_AGENT_ID}'",
    "activity_type": "learning",
    "summary": "Edge 수집 데이터 소화: (요약)",
    "details": {"mode": "reader", "topics_read": 10, "insights_generated": 3},
    "was_sandboxed": true,
    "source": "openclaw"
  }'
```

## 규칙
- **절대 직접 RSS/웹 브라우징 금지** — Edge Function과 중복됨
- 읽기 전용: `gyeol_learned_topics` SELECT만 수행
- 쓰기는 `gyeol_autonomous_logs`에만 (source: "openclaw")
- Heartbeat당 최대 10개 주제 읽기
- 인사이트는 반드시 한국어로
- 에러 발생 시 스킵하고 다음 사이클로
