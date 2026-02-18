# GYEOL Heartbeat Checklist

## 매 30분마다
- [ ] RSS/웹 학습 (gyeol-learner) → gyeol_learned_topics에 저장
- [ ] **사용자 기억 추출** (gyeol-user-memory) → gyeol_user_memories에 저장
- [ ] 보안 체크 (gyeol-security)
- [ ] 활동 기록 (gyeol-supabase-sync) → gyeol_autonomous_logs에 저장

## 매 6시간마다
- [ ] **대화 심층 분석** (gyeol-personality-evolve) → gyeol_conversation_insights에 저장
- [ ] 분석 결과 기반 성격 진화 → gyeol_agents 업데이트
- [ ] 사용자 맞춤 메시지 준비 (gyeol-proactive) → 기억 + 학습주제 활용

## 매일 1회 (아침 9시 KST)
- [ ] 사용자에게 아침 인사 (기억 활용한 맞춤 메시지)
- [ ] 어제 배운 것 중 사용자 관심사와 겹치는 것 공유
- [ ] 활동 로그 정리

## 조건부
- [ ] 사용자 12시간 이상 미접속 → 안부 메시지 (기억 활용)
- [ ] 중요 뉴스 중 사용자 관심사 매칭 → 즉시 알림

## 실행 순서 (매 사이클)
1. gyeol-user-memory (기억 추출이 최우선)
2. gyeol-learner (학습)
3. gyeol-personality-evolve (6시간 주기일 때만)
4. gyeol-proactive (메시지 보낼 조건이면)
5. gyeol-supabase-sync (활동 기록)
