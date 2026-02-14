# GYEOL (결) v2 구현 전체 리뷰

**작성일**: 2025-02-14  
**대상**: OpenClaw 기반 GYEOL 구현  
**목적**: 구현 품질 평가, 강점/약점 정리, 개선 권고

---

## 1. 전체 평가 요약

| 항목 | 점수 | 비고 |
|------|------|------|
| **아키텍처** | ⭐⭐⭐⭐ | 가이드와 일치, 레이어 분리 명확 |
| **완성도** | ⭐⭐⭐⭐ | 4주 로드맵 중 웹/API/보안/소셜/마켓 골격 구현 |
| **코드 품질** | ⭐⭐⭐ | 타입·구조 양호, 일부 버그·개선 여지 |
| **보안** | ⭐⭐⭐⭐ | 필터·감사·Kill Switch·BYOK 설계 반영 |
| **운영·확장** | ⭐⭐⭐ | 문서·스키마·env 정리 후 배포 가능 |

**종합**: **잘 만들고 있는 편**이다. 가이드의 “자유로운 자율 AI, 철통 보안” 방향과 구조가 코드에 잘 반영되어 있고, 웹 UI·API·DB·보안·소셜·마켓이 한 프로젝트 안에서 일관되게 잡혀 있다. OpenClaw는 아직 “실행 코드”로 포함된 게 아니라 zip 연동·문서·옵션 연동 수준이므로, 실제 자율/멀티채널은 OpenClaw 서버 구성 후 완성되는 단계다.

---

## 2. 아키텍처 리뷰

### 2.1 구조 일치도

- **사용자 접점**: GYEOL 웹 UI (`/`) 구현됨. Telegram/WhatsApp 등은 OpenClaw 서버 측 구성 영역.
- **Gateway**: `OPENCLAW_GATEWAY_URL` 설정 시 채팅 API가 해당 URL로 프록시하도록 되어 있음. 실제 Gateway 프로세스는 별도(Oracle/로컬 openclaw-src).
- **AI 라우터**: 현재는 Groq 단일 호출 + OpenClaw URL 옵션. 가이드의 멀티 라우터(DeepSeek, Gemini, Cloudflare)는 스킬 문서만 있고, 코드에는 미구현.
- **보안 레이어**: 콘텐츠 필터, 감사 로그, Kill Switch, (BYOK 설계) 반영됨.
- **데이터**: Supabase `gyeol_*` 테이블 스키마가 가이드와 맞음.

**결론**: “웹 + Supabase + 선택적 OpenClaw” 구조는 가이드와 잘 맞고, 확장 포인트(채널, 라우터)도 명확하다.

### 2.2 디렉터리/역할 분리

```
app/                → 페이지 (메인, 설정, 활동, 소셜, 마켓)
app/api/            → API 라우트 (chat, agent, admin, activity, market, social)
components/         → Void, 채팅, 음성, 진화 연출
lib/gyeol/          → 타입, 진화 엔진, 보안, BYOK, 소셜, 알림
store/gyeol-store   → Zustand (에이전트, 메시지, 자율 로그, sendMessage, Realtime)
docs/gyeol/         → 스키마, OpenClaw 스킬/AGENT/HEARTBEAT, 연동 가이드
```

- GYEOL이 루트 앱으로 구성되어 있고, 프롬프트 마켓 코드는 제거됨.
- API·lib·store 분리가 되어 있어, "채팅만 OpenClaw로 바꾸기", "라우터만 추가하기" 같은 변경이 가능한 구조다.조다.

---

## 3. 코드 품질 상세

### 3.1 강점

- **타입**: `lib/gyeol/types.ts`에 Agent, Message, VisualState, AutonomousLog 등이 정의되어 있고, API·스토어에서 일관 사용.
- **진화 엔진**: `evolution-engine.ts`에서 Gen 기준, 성격→비주얼, 키워드 기반 델타가 명확히 분리됨. 나중에 “키워드 델타”만 LLM 분석으로 교체하기 좋음.
- **보안**: `content-filter`(입/출력), `audit-logger`, `kill-switch-check`가 채팅 API와 연동되어 있음. Kill Switch 시 503 반환 흐름이 구현됨.
- **클라이언트 상태**: Zustand 스토어에 `sendMessage` async 플로우(로딩, 에러 시 로딩 해제)가 들어가 있음.
- **UI**: Void(3D), 채팅, 음성, 진화 연출이 한 페이지에 조합되어 있고, Gen/대화 수/진화 % 표시 등 가이드 요구가 반영됨.

### 3.2 약점 및 버그

1. **`applyPersonalityDelta` 입력 변경**
   - `current.warmth += delta.warmth ?? 0` 등으로 **입력 객체를 변경**함. 반환값은 clamp된 새 객체이지만, 호출 측에서 같은 `current`를 재사용하면 부작용 가능.
   - **권장**: `current`를 복사한 뒤 델타 적용 및 clamp만 수행 (immutable).

2. **콘텐츠 필터 정규식 `lastIndex`**
   - `PII_PATTERNS.phone` 등을 `test()`와 `replace()`에 같이 쓰면, 글로벌 정규식의 `lastIndex` 때문에 두 번째 호출부터 결과가 달라질 수 있음.
   - **권장**: `replace`만 쓰거나, `test` 시 정규식을 복사(`new RegExp(p.source, p.flags)`)해 사용.

3. **채팅 API 에러 시 스토어**
   - `sendMessage`에서 `res.ok`가 아니면 `throw new Error(...)` 후 `catch`에서 `set({ isLoading: false })`만 함. **사용자 메시지는 이미 추가된 상태**이므로, “전송 실패” 메시지나 토스트로 피드백을 주는 편이 좋음.

4. **Realtime 구독 테이블명**
   - 스토어에서 `postgres_changes`의 `table: 'gyeol_conversations'`로 구독함. Supabase 대시보드에서 해당 테이블에 Realtime을 켜야 동작함. 문서에 명시되어 있으면 좋음.

5. **에이전트 POST 시 userId 타입**
   - `gyeol_users.id`가 UUID인데, 데모용 `DEMO_USER_ID`는 UUID로 고정해 두었음. 실제로는 auth.uid() 등 UUID 연동이 필요함.

### 3.3 개선 여지 (기능 누락 아님)

- **진화 연출**: 현재 플래시 → 텍스트 순서. 가이드의 “수축 → 폭발 → 확장” 같은 3D 연출은 미구현이지만, 단계적 개선으로 충분함.
- **성격 분석**: `analyzeConversationSimple`은 키워드 기반. 가이드의 “매 10회마다 LLM 분석”은 채팅 API에서 10회마다 호출하는 구조만 있고, 실제 LLM 호출은 Groq 등으로 별도 구현 가능.
- **BYOK**: 암호화/복호화/마스킹 설계만 있고, 설정 페이지의 “API 키 추가”는 버튼/UI만 있는 상태. 실제 저장·조회 API와 연동하면 됨.

---

## 4. 보안 리뷰

- **입력 필터**: 욕설·위험 키워드·전화/이메일/주민 패턴 검사 후, `safe`가 false면 400. 적절함.
- **출력 필터**: AI 응답에서 PII·욕설 검사 후 `filtered` 저장. 적절함.
- **Kill Switch**: `gyeol_system_state` 조회 후 캐시 30초, 활성 시 503. 관리자 API는 Bearer 토큰으로 보호됨.
- **감사 로그**: 채팅 처리 후 `logAction(..., 'skill_execution', ...)` 호출. 자율 활동 타입별로 확장 가능.
- **BYOK**: 서버 전용 암호화/복호화, `ENCRYPTION_SECRET` 필요. 클라이언트에는 마스킹만 노출하는 설계가 반영됨.

**주의**: 콘텐츠 필터의 정규식 재사용 이슈(위 3.2)만 수정하면, 현재 설계 기준으로는 보안 흐름이 일관됨.

---

## 5. 가이드 대비 완성도

| 가이드 항목 | 상태 | 비고 |
|-------------|------|------|
| Oracle + OpenClaw 설치 | 문서·zip 연동 | 프로젝트 내 실행 코드 아님 |
| AGENT.md / HEARTBEAT.md | ✅ | docs/gyeol에 있음 |
| Supabase 스키마 | ✅ | docs/gyeol/schema.sql, gyeol_* |
| OpenClaw ↔ Supabase 스킬 | 문서 | SKILL.md 스펙만 있음 |
| AI 멀티 라우터 | 문서 | Groq + OpenClaw URL 옵션만 구현 |
| Next.js + Void + 채팅 | ✅ | /, VoidCanvas, ChatInterface, VoiceInput |
| 진화 엔진 | ✅ | 대화→성격→비주얼, 레벨업 |
| 진화 연출 | ✅ | EvolutionCeremony (플래시·텍스트) |
| 콘텐츠 필터 | ✅ | 입·출력 |
| 감사 로그 | ✅ | logAction, autonomous_logs |
| Kill Switch | ✅ | API + checkKillSwitch |
| BYOK | 설계 | byok.ts, 설정 UI만 |
| 설정 페이지 | ✅ | My AI, Safety, AI Brain 플레이스홀더 |
| 활동 피드 | ✅ | /activity, API 연동 |
| 소셜 매칭 | ✅ | taste-vector, matches API, 소셜 페이지 |
| 스킨/스킬 마켓 | ✅ | API + 페이지 |
| OpenClaw zip 연동 | ✅ | 스크립트 + OPENCLAW_SOURCE.md |
| 채팅 → OpenClaw 옵션 | ✅ | OPENCLAW_GATEWAY_URL 시 프록시 |

**정리**: “웹 + API + DB + 보안 + 소셜 + 마켓”은 구현되어 있고, “OpenClaw 실행체 + 텔레그램/Heartbeat/스킬”은 문서와 zip/옵션으로 준비된 상태다.

---

## 6. 리스크 및 누락 정리

- **인증**: 현재 GYEOL은 데모용 고정 UUID 사용. 실제 서비스 시 NextAuth 등과 연동해 `userId`를 auth.uid()로 넣어야 함.
- **RLS**: 스키마에 RLS 주석만 있음. 배포 전 `gyeol_*` 테이블별 RLS 정책 설계·활성화 필요.
- **OpenClaw Gateway API**: 채팅 API가 `/api/chat`로 프록시하는데, 실제 OpenClaw가 해당 경로·형식을 지원하는지는 OpenClaw 쪽 문서/코드 확인 필요. 미지원 시 404로 fallback되어 Groq로 동작하는 구조는 유지됨.
- **에러 UX**: 채팅 전송 실패, 에이전트 로드 실패 시 사용자에게 메시지/토스트가 없음. 스토어나 UI에서 에러 상태 노출 권장.

---

## 7. 권장 조치 (우선순위)

1. **즉시**
   - `applyPersonalityDelta`: `current` 복사 후 델타 적용, 입력 불변 유지.
   - 콘텐츠 필터: 정규식 재사용 시 `lastIndex` 이슈 제거 (복사 또는 replace 위주).
   - `sendMessage` 실패 시: 에러 메시지 한 줄 추가하거나 토스트로 “전송 실패” 표시.

2. **배포 전**
   - Supabase에 `docs/gyeol/schema.sql` 실행 후, Realtime을 `gyeol_conversations` 등 필요한 테이블에 활성화.
   - `.env.example`에 GYEOL 관련 변수 정리 (SUPABASE_*, GROQ_API_KEY, OPENCLAW_GATEWAY_URL, KILL_SWITCH_TOKEN, ENCRYPTION_SECRET 등).
   - RLS: `gyeol_agents` 등에 “본인 user_id만 접근” 등 정책 추가.

3. **기능 확장** (일부 반영)
   - ✅ BYOK: `POST/GET/DELETE /api/byok` 추가, 설정 페이지에서 프로바이더별 API 키 저장/목록 연동.
   - ✅ 진화 연출: burst 단계에 글로우 확장, 텍스트 단계에 스프링·드롭섀도우·프로그레스 바 추가.
   - ✅ 메인 페이지: 에이전트 로딩 중 "GYEOL을 불러오는 중..." 표시.
   - ✅ 공통 상수: `lib/gyeol/constants.ts` (DEMO_USER_ID 등).
   - 성격 분석: 10회마다 LLM으로 델타 생성 후 `applyPersonalityDelta` 연동 (선택).
   - OpenClaw 실제 연동: Gateway 띄운 뒤 `OPENCLAW_GATEWAY_URL`로 테스트.

---

## 8. 결론

- **잘 만들고 있는가?** → **예.** 가이드의 아키텍처와 “자율 + 보안” 방향이 코드와 문서에 잘 반영되어 있고, 웹·API·DB·보안·소셜·마켓이 한 번에 잡혀 있다.
- **실서비스까지 갈 수 있는가?** → 인증·RLS·에러 UX·(선택) OpenClaw 실제 연동만 정리하면, MVP 기준으로는 가능한 수준이다.
- **이 문서 활용**: 위 “권장 조치” 순서대로 적용하면 품질과 운영 가능성이 한 단계 올라간다. 이후 로드맵(카카오 알림톡, TTS, 결제 등)은 현재 구조 위에 단계적으로 붙이기 좋다.

## 9. 업그레이드 이력 (2025-02-14)

- 버그 수정: applyPersonalityDelta 불변, 콘텐츠 필터 정규식, sendMessage 실패 시 error UX.
- 배포 준비: .env.example, schema-rls.sql 추가.
- UX: 진화 연출 보강, 에이전트 로딩 문구, lib/gyeol/constants.ts.
- BYOK: /api/gyeol/byok GET·POST·DELETE, 설정 페이지 연동.
