# GYEOL Supabase Sync

Supabase에 GYEOL 데이터를 동기화하는 스킬.

## 환경변수
- `SUPABASE_URL`: Supabase 프로젝트 URL
- `SUPABASE_SERVICE_KEY`: Supabase 서비스 키

## 기능

### 대화 저장
대화가 끝나면 Supabase `gyeol_conversations` 테이블에 저장:
```bash
curl -X POST "${SUPABASE_URL}/rest/v1/gyeol_conversations" \
  -H "apikey: ${SUPABASE_SERVICE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"agent_id": "AGENT_ID", "role": "user", "content": "MESSAGE", "channel": "telegram"}'
```

### 활동 기록
자율 활동을 `gyeol_autonomous_logs` 테이블에 기록:
```bash
curl -X POST "${SUPABASE_URL}/rest/v1/gyeol_autonomous_logs" \
  -H "apikey: ${SUPABASE_SERVICE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"agent_id": "AGENT_ID", "activity_type": "TYPE", "summary": "SUMMARY"}'
```

### 성격 업데이트
성격 파라미터를 `gyeol_agents` 테이블에 업데이트:
```bash
curl -X PATCH "${SUPABASE_URL}/rest/v1/gyeol_agents?id=eq.AGENT_ID" \
  -H "apikey: ${SUPABASE_SERVICE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"warmth": 55, "logic": 50, "creativity": 60, "energy": 50, "humor": 50}'
```

## 규칙
- 모든 Supabase 호출은 서비스 키 사용
- 에러 발생 시 3회 재시도 후 스킵
- 하루 최대 100회 API 호출
