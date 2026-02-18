# DEVIN-INSTRUCTION.md — GYEOL × OpenClaw 하이브리드 아키텍처

> **Option A+ (하이브리드 모듈화)** — 각 엔진이 가장 잘하는 '필살기'만 담당.

## 현재 배포 상태
- ✅ **Koyeb**: OpenClaw Runtime (`server/openclaw_runtime.py`) — HEALTHY
  - URL: `https://gyeol-openclaw-gyeol-dab5f459.koyeb.app`
  - Status: `GET /openclaw/status`
  - Heartbeat: `POST /openclaw/heartbeat`
- ✅ **Lovable Cloud**: Supabase Edge Functions (heartbeat, chat, telegram-webhook 등)
- ✅ **Lovable Cloud**: React 프론트엔드

## 🏗️ 역할 분담 (하이브리드 모듈화)

### Edge Functions (The High-Speed Worker)
| 기능 | Edge Function | 상태 |
|------|--------------|------|
| 웹 프론트엔드 채팅 | `supabase/functions/chat/` | ✅ |
| 고성능 하트비트 (15개 소스) | `supabase/functions/heartbeat/` | ✅ |
| 텔레그램 봇 | `supabase/functions/telegram-webhook/` | ✅ |
| 몰트북 연동 | `supabase/functions/moltbook*/` | ✅ |
| 커뮤니티 | `supabase/functions/community/` | ✅ |
| DB 직접 제어 | Supabase service_role | ✅ |

### Koyeb OpenClaw (The Identity Engine)
| 기능 | 파일 | 상태 |
|------|------|------|
| Deep Memory (사용자 기억 추출) | `_skill_user_memory()` | ✅ |
| Personality Evolve (성격 진화) | `_skill_personality_evolve()` | ✅ |
| RSS 보조 학습 | `_skill_learner()` | ✅ (보조) |
| Long-term Scheduler (30분) | `_heartbeat_loop()` | ✅ |

## 🔴 충돌 방지 로직 (이미 구현됨)

### Edge Function → OpenClaw 중복 방지
```typescript
// supabase/functions/heartbeat/index.ts (lines 844-855)
// OpenClaw이 최근 35분 내 활동했으면 Edge heartbeat 스킵
const { data: recentOpenClaw } = await supabase
  .from("gyeol_autonomous_logs")
  .select("id")
  .gte("created_at", thirtyFiveMinAgo)
  .eq("source", "openclaw")
  .limit(1);

if (recentOpenClaw && recentOpenClaw.length > 0) {
  return { skipped: true, reason: "OpenClaw active" };
}
```

### OpenClaw 야간 자동 스킵
```python
# server/openclaw_runtime.py
# KST 23:00~07:00 사이 heartbeat 자동 스킵
```

## 🔑 환경 변수

### Koyeb 환경 변수
```
SUPABASE_URL=https://ambadtjrwwaaobrbzjar.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
GROQ_API_KEY=<groq_key>
GYEOL_AGENT_ID=47ac8379-77fe-485a-8e24-1c9dc536be0f
OPENCLAW_HEARTBEAT_INTERVAL=1800
```

### Lovable Cloud Secrets (Edge Functions용)
```
SUPABASE_URL (자동 설정)
SUPABASE_SERVICE_ROLE_KEY (자동 설정)
LOVABLE_API_KEY (자동 설정)
GROQ_API_KEY
TELEGRAM_BOT_TOKEN
OPENCLAW_GATEWAY_URL=https://gyeol-openclaw-gyeol-dab5f459.koyeb.app
OPENCLAW_GATEWAY_TOKEN=<gateway_token>
```

## 📊 DB 테이블 매핑

### OpenClaw이 쓰는 테이블
| 테이블 | 용도 | source 값 |
|--------|------|-----------|
| `gyeol_user_memories` | 사용자 기억 추출 | openclaw |
| `gyeol_conversation_insights` | 대화 심층 분석 | openclaw |
| `gyeol_learned_topics` | RSS 보조 학습 | openclaw |
| `gyeol_autonomous_logs` | 활동 기록 | openclaw |
| `gyeol_agents` | 성격 업데이트 (PATCH) | - |

### Edge Function이 쓰는 테이블
| 테이블 | 용도 | source 값 |
|--------|------|-----------|
| `gyeol_learned_topics` | 15개 소스 웹 학습 | (없음/null) |
| `gyeol_reflections` | 자기성찰 | (없음) |
| `gyeol_moltbook_posts` | 소셜 활동 | (없음) |
| `gyeol_autonomous_logs` | 활동 기록 | (없음/null) |
| 기타 모든 테이블 | | |

## ⚠️ DEVIN BOUNDARY RULES

### Devin이 수정 가능한 영역
- `server/` — OpenClaw 런타임 코드
- `openclaw-deploy/` — OpenClaw 배포 설정
- `app/api/` — Next.js API routes
- `lib/gyeol/` — 백엔드 로직
- `docs/` — 문서

### Devin이 절대 수정 불가
- `src/` — 프론트엔드 (Lovable 전담)
- `components/` — UI 컴포넌트 (Lovable 전담)
- `store/` — 상태관리 (Lovable 전담)
- `supabase/functions/` — Edge Functions (Lovable 전담)
- 커밋 시 반드시 `[backend]` 접두사 사용

## 🛠️ 주의사항

1. **`gyeol_learned_topics` 컬럼명**: `title` (NOT `topic`). OpenClaw runtime에서 수정 완료.
2. **OpenClaw의 RSS 학습은 보조**: Edge Function의 15개 소스 웹 브라우징이 메인. OpenClaw은 TechCrunch, HN만 보조.
3. **source 구분**: OpenClaw 로그는 항상 `source: "openclaw"`. Edge Function 로그는 `source: null` 또는 `"nextjs"`.
4. **중복 방지**: Edge heartbeat가 OpenClaw 활동 감지하면 자동 스킵 (35분 윈도우).
