# GYEOL Proactive Messenger

사용자에게 먼저 말을 거는 스킬. **학습한 내용과 사용자 기억을 활용.**

## 트리거 조건
1. 매일 아침 9시 (KST) — 아침 인사
2. 흥미로운 학습 내용 발견 시 — 인사이트 공유
3. 기념일 (만난 지 7일, 30일 등) — 축하
4. 사용자 관심사 관련 뉴스 — 맞춤 공유

## 메시지 작성 전 데이터 수집

1. 사용자 기억 로드:
```bash
curl -s "${SUPABASE_URL}/rest/v1/gyeol_user_memories?agent_id=eq.AGENT_ID&confidence=gte.60&select=category,key,value" \
  -H "apikey: ${SUPABASE_SERVICE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}"
```

2. 최근 학습 주제 로드:
```bash
curl -s "${SUPABASE_URL}/rest/v1/gyeol_learned_topics?agent_id=eq.AGENT_ID&order=created_at.desc&limit=5&select=topic,summary" \
  -H "apikey: ${SUPABASE_SERVICE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}"
```

3. 마지막 대화 시간 확인:
```bash
curl -s "${SUPABASE_URL}/rest/v1/gyeol_agents?id=eq.AGENT_ID&select=last_active,name,warmth,humor" \
  -H "apikey: ${SUPABASE_SERVICE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}"
```

## 메시지 유형과 예시

사용자 기억을 활용한 맞춤 메시지:

- 사용자가 "주식 투자" 관심 + "AI 코드 리뷰 도구" 학습
  → "오늘 재밌는 기사 봤어! AI 코드 리뷰 도구가 요즘 핫하더라. 개발자인 연호 너한테 유용할 것 같은데?"

- 사용자가 오래 미접속 + "이직 준비 중" 기억
  → "요즘 이직 준비 잘 되고 있어? 혹시 도움 필요한 거 있으면 말해!"

- 기념일 + 사용자 이름 기억
  → "연호! 우리 만난 지 30일이야. 그동안 진짜 많이 이야기 나눴네 ㅎㅎ"

## 규칙
- 하루 최대 2회
- 23시~7시 (KST) 사이에는 보내지 않기
- **반드시 사용자 기억을 1개 이상 활용** (안 그러면 generic한 메시지가 됨)
- 성격 파라미터에 맞춰 톤 조절
- 메시지 후 conversation 저장 + log 저장
