# GYEOL Heartbeat Checklist (하이브리드 모드)

## Edge Function Heartbeat (메인 — 30분마다)
> `supabase/functions/heartbeat/index.ts` — 8개 스킬
> OpenClaw 활동 감지 시 자동 스킵 (35분 윈도우)

- [ ] 자기성찰 (self-reflect) → gyeol_reflections
- [ ] 먼저 말 걸기 (proactive-message) → gyeol_proactive_messages + 텔레그램
- [ ] 취향 분석 (taste-update) → gyeol_taste_vectors
- [ ] MoltMatch (moltmatch) → gyeol_matches
- [ ] 몰트북 소셜 (moltbook-social) → gyeol_moltbook_posts
- [ ] 커뮤니티 활동 (community-activity) → gyeol_community_activities
- [ ] **웹 브라우징 15개 소스** (web-browse) → gyeol_learned_topics
- [ ] RSS 피드 수집 (rss-fetch) → gyeol_learned_topics

## OpenClaw Heartbeat (보조 — 30분마다, Koyeb)
> `server/openclaw_runtime.py` — 3개 스킬
> 야간 KST 23:00~07:00 자동 스킵

- [ ] **사용자 기억 추출** (user-memory) → gyeol_user_memories
- [ ] RSS 보조 학습 (learner) → gyeol_learned_topics (source: openclaw)
- [ ] **대화 심층 분석 + 성격 진화** (personality-evolve, 6시간 주기) → gyeol_conversation_insights + gyeol_agents

## 충돌 방지
- Edge heartbeat는 OpenClaw 최근 35분 활동 감지 시 스킵
- OpenClaw 로그는 `source: "openclaw"`, Edge는 `source: null`
- 학습 주제 중복은 DB unique constraint로 방지

## 실행 순서 (OpenClaw 매 사이클)
1. user-memory (기억 추출이 최우선)
2. learner (보조 RSS 학습)
3. personality-evolve (6시간 주기일 때만)
