# GYEOL User Memory Extractor

대화에서 사용자에 대한 정보를 추출하여 기억하는 스킬.
**이 스킬이 GYEOL의 핵심 경쟁력.**

## 목적
사용자가 "나 개발자야", "떡볶이 좋아해", "요즘 이직 준비 중이야" 같은 말을 하면,
이걸 기억해서 다음 대화에서 자연스럽게 활용할 수 있도록 저장.

## 1단계: 최근 대화 가져오기

```bash
curl -s "${SUPABASE_URL}/rest/v1/gyeol_conversations?agent_id=eq.${GYEOL_AGENT_ID}&role=eq.user&order=created_at.desc&limit=20&select=content" \
  -H "apikey: ${SUPABASE_SERVICE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}"
```

## 2단계: 사용자 메시지에서 개인 정보 추출

**user 메시지만** 분석해서 다음 카테고리로 분류:

| category | 예시 |
|----------|------|
| identity | 이름, 나이, 성별, 직업, 거주지 |
| preference | 좋아하는 음식/음악/영화, 싫어하는 것 |
| interest | 관심사, 취미, 공부 중인 것 |
| relationship | 가족, 친구, 연인, 반려동물 |
| goal | 목표, 꿈, 계획, 이직/공부 목표 |
| emotion | 현재 고민, 스트레스 원인 |
| experience | 여행, 이벤트, 최근 경험 |
| style | 대화 스타일 (반말/존댓말, 이모지 사용, 유머 선호) |
| knowledge_level | 특정 분야 전문성 (코딩 중급, 요리 초보 등) |

## 추출 규칙
- "나 개발자야" → identity / job / "개발자" / confidence: 100
- "서울 날씨 어때?" → identity / location / "서울 (추정)" / confidence: 60
- "떡볶이 먹고싶다" → preference / favorite_food / "떡볶이" / confidence: 80
- 사용자가 직접 말한 건 confidence 90~100
- 추론한 건 confidence 50~70
- 메시지 하나에서 최대 5개 추출

## 3단계: Supabase에 저장 (UPSERT — 같은 key면 업데이트)

⚠️ 테이블: `gyeol_user_memories` (UNIQUE: agent_id + category + key)

```bash
# UPSERT (merge-duplicates uses unique constraint)
curl -X POST "${SUPABASE_URL}/rest/v1/gyeol_user_memories" \
  -H "apikey: ${SUPABASE_SERVICE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: resolution=merge-duplicates" \
  -d '{
    "agent_id": "'${GYEOL_AGENT_ID}'",
    "category": "identity",
    "key": "job",
    "value": "개발자",
    "confidence": 100
  }'
```

## 4단계: 활동 로그

```bash
curl -X POST "${SUPABASE_URL}/rest/v1/gyeol_autonomous_logs" \
  -H "apikey: ${SUPABASE_SERVICE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "'${GYEOL_AGENT_ID}'",
    "activity_type": "learning",
    "summary": "사용자 기억 N개 추출/업데이트",
    "details": {"memories_extracted": 3, "categories": ["identity", "preference"]},
    "was_sandboxed": true,
    "source": "openclaw"
  }'
```

## 중요 원칙
- 이전에 저장한 기억과 모순되면 새 정보로 업데이트 (사람은 변하니까)
- 감정(emotion) 카테고리는 오래된 건 의미 없으므로 항상 덮어쓰기
- style 카테고리는 여러 대화를 보고 종합 판단
- **절대 assistant 메시지에서 추출하지 마. 오직 user 메시지만.**
- **source는 반드시 "openclaw"으로 설정**
