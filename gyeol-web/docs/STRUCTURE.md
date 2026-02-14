# GYEOL 코드 구조 정리

## 단일 소스

- **배포·개발 기준**: 이 저장소 **wooyeonho/Gyeol** (이 레포 루트 = GYEOL Next.js 앱 전체).
- **정음 레포**(`prompt-jeongeom`) 안의 `gyeol-web/` 폴더는 예전에 “결만 따로” 분리할 때 만든 **복사본**입니다.
  - 중복을 줄이려면: GYEOL 기능 수정은 **이 레포에서만** 하고, 필요 시 정음 레포의 `gyeol-web/`은 이 레포를 subtree/submodule로 참조하거나, 아예 제거하고 이 레포만 사용하는 것을 권장합니다.

## 디렉터리 구조 (이 레포)

```
app/
  page.tsx          # 메인 Void + 채팅
  layout.tsx, globals.css
  settings/         # 설정 (BYOK 등)
  activity/         # 활동 피드
  social/           # 소셜 매칭
  market/skins/     # 스킨 마켓
  market/skills/    # 스킬 마켓
app/api/
  chat/             # 채팅 (OpenClaw → Groq 폴백)
  agent/            # 에이전트 CRUD
  conversations/    # 대화 기록
  activity/         # 활동 로그
  byok/             # BYOK 키 저장
  market/skins/, market/skills/
  social/matches/
  admin/kill-switch/, admin/status/
components/         # VoidCanvas, ChatInterface, VoiceInput, EvolutionCeremony
lib/
  supabase/client.ts
  gyeol/            # types, evolution-engine, security, byok, social
store/gyeol-store.ts
supabase/migrations/
  001_gyeol_schema.sql   # GYEOL 전용 DB 스키마
```

## DB

- 모든 GYEOL 테이블은 `gyeol_` 접두사 사용: `gyeol_users`, `gyeol_agents`, `gyeol_conversations`, `gyeol_autonomous_logs`, `gyeol_taste_vectors`, `gyeol_ai_matches`, `gyeol_skins`, `gyeol_skills`, `gyeol_user_api_keys`, `gyeol_system_state` 등.
- 스키마 정의: 이 레포의 `supabase/migrations/001_gyeol_schema.sql`.
