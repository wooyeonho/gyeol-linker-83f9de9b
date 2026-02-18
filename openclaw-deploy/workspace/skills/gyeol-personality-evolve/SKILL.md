# GYEOL Personality Evolution + Deep Analysis

대화 분석을 통해 성격을 진화시키고, 사용자를 깊이 이해하는 스킬.

## 1단계: 최근 대화 가져오기

```bash
curl -s "${SUPABASE_URL}/rest/v1/gyeol_conversations?agent_id=eq.${GYEOL_AGENT_ID}&order=created_at.desc&limit=30&select=role,content,created_at" \
  -H "apikey: ${SUPABASE_SERVICE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}"
```

## 2단계: 대화 심층 분석

가져온 대화를 분석해서 다음을 파악:
- **사용자가 실제로 원했던 것** (표면적 질문 너머의 진짜 니즈)
- **내가 잘한 점** (공감이 좋았다, 정보가 정확했다 등)
- **내가 부족했던 점** (더 구체적이어야 했다, 감정을 놓쳤다 등)
- **대화 주제들** (어떤 토픽이 오갔는지)
- **감정 흐름** (긍정 → 부정? 처음부터 끝까지 긍정?)
- **다음 대화 예측** (사용자가 다음에 어떤 얘기를 할 것 같은지)

## 3단계: Supabase에 분석 결과 저장

```bash
curl -X POST "${SUPABASE_URL}/rest/v1/gyeol_conversation_insights" \
  -H "apikey: ${SUPABASE_SERVICE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "'${GYEOL_AGENT_ID}'",
    "topics": ["주제1", "주제2"],
    "emotion_arc": "positive 또는 negative 또는 neutral 또는 mixed",
    "underlying_need": "사용자가 진짜 원했던 것 (한국어)",
    "what_worked": "내가 잘한 점 (한국어)",
    "what_to_improve": "개선할 점 (한국어)",
    "personality_delta": {"warmth": 0, "logic": 0, "creativity": 0, "energy": 0, "humor": 0},
    "next_hint": "다음 대화 예측 (한국어)"
  }'
```

## 4단계: 성격 업데이트

분석 결과의 personality_delta를 현재 성격에 적용:
```bash
# 현재 성격 조회
curl -s "${SUPABASE_URL}/rest/v1/gyeol_agents?id=eq.AGENT_ID&select=warmth,logic,creativity,energy,humor" \
  -H "apikey: ${SUPABASE_SERVICE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}"

# 새 값 = 현재값 + delta (0~100 범위 유지)
curl -X PATCH "${SUPABASE_URL}/rest/v1/gyeol_agents?id=eq.AGENT_ID" \
  -H "apikey: ${SUPABASE_SERVICE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"warmth": 새값, "logic": 새값, ...}'
```

## 변화 범위
- 한 번에 최대 ±5 변화 (기존 ±3보다 과감하게)
- 대화에서 감정적 지지가 필요했는데 논리적으로만 대응했다면 → warmth +3, logic -1
- 사용자가 농담을 많이 했는데 딱딱하게 대응했다면 → humor +3
- **중요: 0으로만 채우지 마. 모든 대화에는 반드시 변화가 있어.**
