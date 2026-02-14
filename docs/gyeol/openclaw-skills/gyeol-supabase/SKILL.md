---
name: GYEOL Supabase Connector
description: OpenClaw가 Supabase에 대화/성격/활동 로그를 읽고 쓸 수 있게 하는 스킬
tools:
  - saveConversation
  - getAgent
  - updatePersonality
  - logActivity
  - checkKillSwitch
---

# GYEOL Supabase Connector

## 기능

1. **saveConversation(agentId, role, content, channel)**
   - `gyeol_conversations` 테이블에 대화 한 줄 저장

2. **getAgent(userId)**
   - `gyeol_agents` 테이블에서 해당 user_id의 에이전트 정보 조회

3. **updatePersonality(agentId, changes)**
   - 성격 파라미터(warmth, logic, creativity, energy, humor) 업데이트
   - visual_state도 함께 계산해 업데이트

4. **logActivity(agentId, type, summary, details)**
   - `gyeol_autonomous_logs`에 활동 기록
   - type: learning | reflection | social | proactive_message | skill_execution | error

5. **checkKillSwitch()**
   - `gyeol_system_state`에서 kill_switch 확인
   - active면 모든 자율 활동 중단

## 환경 변수

- `SUPABASE_URL`: Supabase 프로젝트 URL
- `SUPABASE_SERVICE_KEY`: 서비스 롤 키 (서버 전용)

## 사용 예

- Heartbeat에서 학습/사색 결과 저장 시 logActivity 호출
- 메시지 라우팅 후 saveConversation 호출
- 자율 행동 전 checkKillSwitch 호출
