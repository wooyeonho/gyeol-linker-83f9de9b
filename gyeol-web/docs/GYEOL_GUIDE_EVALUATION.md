# GYEOL 완전 구현 가이드 대비 평가

가이드 문서: `# GYEOL (결) 완전 구현 가이드.txt`  
평가 기준: gyeol-web (wooyeonho/Gyeol) 현재 코드

---

## 요약

| 구분 | 가이드 대비 | 설명 |
|------|-------------|------|
| **WEEK 1** | 약 60% | 웹·DB·채팅·BYOK 뼈대 있음. OpenClaw/Oracle/텔레그램 미구현 |
| **WEEK 2** | 약 50% | 진화·보안 기초 있음. Gen별 비주얼·성격 분석 AI·설정 UI 미완 |
| **WEEK 3** | 약 10% | 활동 로그 페이지만 있음. 자율 학습·사색·먼저 말 걸기·푸시 없음 |
| **WEEK 4** | 약 25% | 소셜·마켓 페이지 껍데기 있음. 매칭·AI 대화·실제 구매/설치 없음 |

**전체**: 가이드의 “OpenClaw 24/7 + 웹 + 텔레그램 + 자율 활동”까지 가려면 **서버(OpenClaw)·Heartbeat·스킬·웹 푸시·소셜/마켓 실제 로직**이 추가로 필요함.  
현재는 **웹 단일 채널 + BYOK + env AI + 진화/보안 기초**까지 구현된 상태.

---

## WEEK 1: OpenClaw + 기초 인프라

### ✅ 잘 맞는 부분

| 가이드 | 현재 구현 | 비고 |
|--------|-----------|------|
| Supabase GYEOL 스키마 | `supabase/migrations/001_gyeol_schema.sql` | 테이블명 `gyeol_*` (가이드는 users/agents 등, 정음과 구분 위해 접두사 사용) |
| Next.js + 타입·스토어·API | `lib/gyeol/types.ts`, `store/gyeol-store.ts`, `app/api/*` | 구조 일치 |
| 채팅 API → AI | `app/api/chat/route.ts` | OpenClaw URL → BYOK → env GROQ 순서 |
| Void UI (빛의 점) | `VoidCanvas.tsx` | Sphere + 글로우 + 파티클 |
| 채팅 UI·음성 입력 | `ChatInterface.tsx`, `VoiceInput.tsx` | |
| BYOK 암호화·저장·채팅 연동 | `lib/gyeol/byok.ts`, `/api/byok`, chat에서 BYOK 우선 | 대화 히스토리·Gemini 포함 |

### ❌ 가이드 대비 부족한 부분

| 가이드 | 현재 | 격차 |
|--------|------|------|
| Oracle Cloud VM + OpenClaw 설치 | 없음 | 가이드 Day 1–2: OpenClaw Gateway 24/7 상주 없음 |
| AGENT.md / HEARTBEAT.md | 없음 | OpenClaw 워크스페이스·설정 파일 없음 |
| 텔레그램 봇 | 없음 | 채널은 웹만 존재 |
| OpenClaw ↔ Supabase 스킬 | 없음 | `SKILL.md` 형태의 Supabase Connector 없음 |
| AI 멀티 라우터 “스킬” | 웹 쪽만 구현 | Groq/OpenAI/DeepSeek/Anthropic/Gemini BYOK+env. Cloudflare·라우팅 규칙(분석→DeepSeek 등) 없음 |

---

## WEEK 2: 성격 진화 + 비주얼 + 보안

### ✅ 잘 맞는 부분

| 가이드 | 현재 구현 | 비고 |
|--------|-----------|------|
| 매 10회 대화 시 진화 트리거 | `chat/route.ts`에서 EVOLUTION_INTERVAL(10)마다 분석·업데이트 | |
| evolution-engine | `analyzeConversationSimple`, `applyPersonalityDelta`, `calculateVisualState`, `checkEvolution` | |
| 진화 기준 (대화 20/50/100/200) | `EVOLUTION_THRESHOLDS` 동일 | |
| 콘텐츠 필터 (입출력) | `content-filter.ts` | |
| 감사 로그 | `audit-logger.ts` → `gyeol_autonomous_logs` | |
| Kill Switch | `kill-switch-check.ts`, `api/admin/kill-switch`, `gyeol_system_state` | |
| BYOK + 설정 페이지 | BYOK 저장·채팅 연동, `/settings` BYOK 카드 | |
| 진화 연출 | `EvolutionCeremony.tsx` | |

### ❌ 가이드 대비 부족한 부분

| 가이드 | 현재 | 격차 |
|--------|------|------|
| 성격 분석: Groq로 대화 분석 → 델타 | `analyzeConversationSimple`: 정규식 키워드만 사용 | “대화할수록 AI가 변한다” 경험이 약함 |
| Void Gen별 형상 | Gen 1~5 전부 Sphere, radius만 0.03→0.1→0.2→0.25→0.3 | 가이드: Gen1 점, Gen2 구+노이즈, Gen3 파동+오비탈, Gen4 빛줄기+성운, Gen5 왜곡 |
| 성격 → 색상 | creativity+humor만 색상에 반영 | 가이드: warmth=오렌지, logic=시안 등 5축 매핑 |
| OpenClaw 성격 동기화 스킬 | 없음 | AGENT.md ↔ Supabase 동기화 없음 |
| 설정 페이지 전체 | BYOK만 구현 | 자율성 슬라이더, 콘텐츠 필터/알림 토글, Emergency Stop 빨간 버튼, 성격 레이더 차트 없음 |
| OpenClaw 보안 가드레일 스킬 | 없음 | 스킬 런타임 측 보안 스킬 없음 |

---

## WEEK 3: 자율 활동

### ✅ 잘 맞는 부분

| 가이드 | 현재 구현 | 비고 |
|--------|-----------|------|
| 활동 로그 페이지 | `/activity`, `api/activity` | autonomous_logs 조회 |

### ❌ 가이드 대비 부족한 부분

| 가이드 | 현재 | 격차 |
|--------|------|------|
| RSS 자율 학습 스킬 | 없음 | Heartbeat·OpenClaw 스킬 없음 |
| 자기 사색 스킬 | 없음 | |
| Moltbook 소셜 스킬 | 없음 | |
| 먼저 말 걸기 스킬 | 없음 | |
| 웹 푸시 알림 | 없음 | Service Worker·구독·Realtime 연동 없음 |
| Heartbeat 30분 주기 | 없음 | OpenClaw 미설치로 자율 순환 자체 없음 |

→ **자율 활동은 가이드 대비 거의 미구현.** OpenClaw 서버 + Heartbeat + 스킬 구축이 선행되어야 함.

---

## WEEK 4: 소셜 + 마켓 + 배포

### ✅ 잘 맞는 부분

| 가이드 | 현재 구현 | 비고 |
|--------|-----------|------|
| 소셜·마켓 라우트 | `/social`, `/market/skins`, `/market/skills` | |
| API 라우트 | `api/social/matches`, `api/market/skins`, `api/market/skills` | 스킨/스킬 목록 조회 수준 |
| 취향 벡터 테이블 | `gyeol_taste_vectors` | 스키마만 존재 |
| AI 매칭 테이블 | `gyeol_ai_matches`, `gyeol_ai_conversations` | |
| Vercel 배포 안내 | README + vercel.json | |

### ❌ 가이드 대비 부족한 부분

| 가이드 | 현재 | 격차 |
|--------|------|------|
| 취향 분석 + 매칭 로직 | `taste-vector.ts`, `ai-chat.ts` 있으나 매칭/호환성 계산 미연동 | findTopMatches·calculateCompatibility·실제 매칭 플로우 없음 |
| AI 간 대화 생성 | `generateAIConversation` | 미구현. “연결” 후 대화 생성·저장 없음 |
| 소셜 UI “연결” 동작 | 버튼만 있음 | API 호출·상태 변경·대화 보기 없음 |
| 스킨/스킬 “사용”·“설치” | 버튼만 있음 | 구매·적용·OpenClaw 스킬 디렉터리 연동 없음 |
| 스킬 → OpenClaw 연동 | 없음 | 웹에서 설치해도 OpenClaw skills/ 반영 없음 |

---

## 가이드와 다른 설계 선택

1. **테이블 이름**  
   가이드: `users`, `agents`, `conversations` …  
   현재: `gyeol_users`, `gyeol_agents`, `gyeol_conversations` …  
   → 정음 등 다른 앱과 같은 Supabase 사용을 전제로 한 선택. 가이드 의도와 충돌하지 않음.

2. **AI 라우터 위치**  
   가이드: OpenClaw 스킬로 “GYEOL AI Router” 구현.  
   현재: Next.js API(`chat-ai.ts` + chat route)에서 BYOK·env로 처리.  
   → OpenClaw 없이도 웹 채널만으로 동작하도록 한 선택. OpenClaw 도입 시 라우터를 스킬로 이전 가능.

3. **채널**  
   가이드: 웹 + 텔레그램 + (WhatsApp 등).  
   현재: 웹만.  
   → 텔레그램 등은 OpenClaw Gateway·봇 연동 시 추가 가능.

---

## 우선 보완하면 좋은 항목 (가이드 충족도 기준)

1. **설정 페이지**  
   자율성 슬라이더, 콘텐츠 필터/알림 토글, Emergency Stop, 성격 레이더 차트 → 가이드 WEEK 2 완성도 상승.

2. **Void Gen별 비주얼**  
   Gen별로 형상·이펙트 차별화 + 성격 5축 색상 반영 → 가이드 “살아있는 외형”에 근접.

3. **성격 분석 AI 연동**  
   정규식 대신 Groq(또는 분석용 모델)로 대화 분석 → 델타 계산 → “대화할수록 AI가 변한다” 체감.

4. **소셜**  
   취향·호환성 계산, 매칭 API, “연결” 시 `generateAIConversation` 호출·저장·표시 → WEEK 4 소셜 부분 구현.

5. **마켓**  
   스킨/스킬 “사용”·“설치” 시 DB 반영 및 (가능하면) OpenClaw 스킬 연동 → WEEK 4 마켓 부분 구현.

6. **OpenClaw·자율 활동**  
   Oracle Cloud + OpenClaw 설치, AGENT.md/HEARTBEAT.md, Supabase·AI 라우터·보안·학습·사색·먼저 말 걸기 스킬 → 가이드 WEEK 1·3 전체와 가이드 철학(“AI가 잠들지 않음”) 충족.

---

## 체크리스트 (가이드 완성 기준)

- **WEEK 1**  
  - [x] Supabase GYEOL 스키마  
  - [x] Next.js + Void + 채팅 + BYOK  
  - [ ] Oracle Cloud + OpenClaw  
  - [ ] 텔레그램 봇  
  - [ ] OpenClaw Supabase/AI 라우터 스킬  

- **WEEK 2**  
  - [x] 진화 트리거·엔진·연출  
  - [x] 콘텐츠 필터·감사 로그·Kill Switch  
  - [ ] 성격 분석 AI  
  - [ ] Gen별 Void 형상·성격 색상  
  - [ ] 설정 페이지 전체 (자율성·토글·Emergency Stop·레이더)  

- **WEEK 3**  
  - [x] 활동 로그 페이지  
  - [ ] RSS 학습·사색·Moltbook·먼저 말 걸기 스킬  
  - [ ] 웹 푸시  

- **WEEK 4**  
  - [x] 소셜·마켓 라우트·API  
  - [ ] 매칭·AI 대화 생성·연결/설치 플로우  
  - [x] Vercel 배포 준비  

이 문서는 가이드 txt 기준으로 “잘 되고 있는지”를 주기적으로 다시 점검할 때 사용하면 됩니다.
