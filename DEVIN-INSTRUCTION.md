# DEVIN-INSTRUCTION.md — GYEOL × OpenClaw 최종 배포 지시서

> **Option A+ (하이브리드 모듈화)** — 각 엔진이 가장 잘하는 '필살기'만 담당.
> 최종 업데이트: 2026-02-18

---

## 🚀 현재 배포 상태

| 플랫폼 | 서비스 | URL | 상태 |
|--------|--------|-----|------|
| Koyeb | OpenClaw Runtime | `https://gyeol-openclaw-gyeol-dab5f459.koyeb.app` | ✅ HEALTHY |
| Lovable Cloud | Edge Functions (heartbeat, chat 등) | 자동 배포 | ✅ |
| Lovable Cloud | React 프론트엔드 | `https://gyeol-ai.lovable.app` | ✅ |

### Koyeb 상태 확인
- Health: `GET /openclaw/status`
- 수동 Heartbeat: `POST /openclaw/heartbeat`

---

## 🏗️ 역할 분담 (하이브리드 모듈화)

### Edge Functions (The High-Speed Worker)
| 기능 | Edge Function | 상태 |
|------|--------------|------|
| 웹 프론트엔드 채팅 | `supabase/functions/chat/` | ✅ |
| 고성능 하트비트 (15개 소스) | `supabase/functions/heartbeat/` | ✅ |
| 몰트북 연동 | `supabase/functions/moltbook*/` | ✅ |
| 커뮤니티 | `supabase/functions/community/` | ✅ |
| 브리딩 | `supabase/functions/breeding/` | ✅ |
| DB 직접 제어 | Supabase service_role | ✅ |

### Koyeb OpenClaw (The Identity Engine)
| 기능 | 스킬 파일 | 상태 |
|------|-----------|------|
| **텔레그램 봇 전담** | openclaw 내장 채널 | ✅ 이관 완료 |
| Deep Memory (사용자 기억 추출) | `gyeol-user-memory/SKILL.md` | ✅ |
| Personality Evolve (성격 진화) | `gyeol-personality-evolve/SKILL.md` | ✅ |
| Learner Reader (Edge 데이터 소화) | `gyeol-learner/SKILL.md` | ✅ Reader 모드 |
| Long-term Scheduler (30분) | `_heartbeat_loop()` | ✅ |

---

## 📱 텔레그램 이관 가이드

### 완료된 작업 (Lovable 측)
1. ✅ `supabase/config.toml`에서 `telegram-webhook` 비활성화
2. ✅ Edge Function `telegram-webhook`은 코드 유지하되 배포에서 제외

### Devin/Koyeb 측 작업
1. OpenClaw `openclaw.json`에서 텔레그램 채널 활성화:
```json
{
  "channels": {
    "telegram": {
      "enabled": true,
      "token_env": "TELEGRAM_BOT_TOKEN"
    }
  }
}
```
2. Koyeb 환경변수에 `TELEGRAM_BOT_TOKEN` 설정 확인
3. 텔레그램 웹훅을 Koyeb URL로 재설정:
```bash
curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://gyeol-openclaw-gyeol-dab5f459.koyeb.app/telegram/webhook"
```
4. 정상 작동 확인 후 Edge Function 코드 삭제 가능 (선택)

---

## 🔴 충돌 방지 로직

### Edge Function → OpenClaw 중복 방지 (이미 구현됨)
```typescript
// supabase/functions/heartbeat/index.ts
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

### Learner 중복 방지
- Edge Function: 15개 소스에서 직접 브라우징 → `gyeol_learned_topics`에 저장
- OpenClaw Learner: `gyeol_learned_topics`를 **읽기만** 하여 인사이트 소화 (Reader 모드)
- 절대 직접 RSS/웹 브라우징 안 함

---

## 🔑 환경 변수

### Koyeb 환경 변수 (필수)
| 변수명 | 설명 | 예시 |
|--------|------|------|
| `SUPABASE_URL` | Supabase 프로젝트 URL | `https://ambadtjrwwaaobrbzjar.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | DB 전체 접근 키 | `eyJ...` |
| `GROQ_API_KEY` | Groq AI API 키 | `gsk_...` |
| `TELEGRAM_BOT_TOKEN` | 텔레그램 봇 토큰 | BotFather에서 발급 |
| `GYEOL_AGENT_ID` | 대상 에이전트 UUID | `47ac8379-77fe-485a-8e24-1c9dc536be0f` |
| `OPENCLAW_HEARTBEAT_INTERVAL` | Heartbeat 주기(초) | `1800` |

### Lovable Cloud Secrets (Edge Functions용)
| 변수명 | 설명 | 상태 |
|--------|------|------|
| `SUPABASE_URL` | 자동 설정 | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | 자동 설정 | ✅ |
| `LOVABLE_API_KEY` | Lovable AI Gateway | ✅ |
| `GROQ_API_KEY` | Groq 폴백 | ✅ |
| `TELEGRAM_BOT_TOKEN` | Edge에서 제거 예정 | ⚠️ 이관 후 불필요 |

---

## 📊 DB 테이블 매핑

### OpenClaw이 쓰는 테이블
| 테이블 | 용도 | 권한 | source 값 |
|--------|------|------|-----------|
| `gyeol_user_memories` | 사용자 기억 추출 | INSERT/UPDATE | openclaw |
| `gyeol_conversation_insights` | 대화 심층 분석 | INSERT | openclaw |
| `gyeol_learned_topics` | **읽기 전용** (소화) | SELECT만 | - |
| `gyeol_autonomous_logs` | 활동 기록 | INSERT | openclaw |
| `gyeol_agents` | 성격 업데이트 | UPDATE (PATCH) | - |
| `gyeol_conversations` | 텔레그램 대화 저장 | INSERT | telegram |
| `gyeol_telegram_links` | 텔레그램 연결 관리 | SELECT/UPSERT | - |

### Edge Function이 쓰는 테이블
| 테이블 | 용도 | source 값 |
|--------|------|-----------|
| `gyeol_learned_topics` | 15개 소스 웹 학습 | null/nextjs |
| `gyeol_reflections` | 자기성찰 | null |
| `gyeol_moltbook_posts` | 소셜 활동 | null |
| `gyeol_autonomous_logs` | 활동 기록 | null/nextjs |
| 기타 모든 테이블 | | |

---

## 🔄 Heartbeat 실행 순서

### Edge Function (메인 — Lovable Cloud cron)
1. OpenClaw 최근 활동 체크 (35분 윈도우) → 활동 있으면 스킵
2. 자기성찰 (self-reflect)
3. 먼저 말 걸기 (proactive-message)
4. 취향 분석 (taste-update)
5. MoltMatch
6. 몰트북 소셜
7. 커뮤니티 활동
8. **웹 브라우징 15개 소스** → `gyeol_learned_topics`
9. RSS 피드 수집

### OpenClaw (보조 — Koyeb 30분마다)
1. **사용자 기억 추출** → `gyeol_user_memories` (최우선)
2. **Learner Reader** → `gyeol_learned_topics` 읽기 → 인사이트 소화
3. **성격 진화** (6시간 주기) → `gyeol_conversation_insights` + `gyeol_agents` 업데이트
4. 야간 KST 23:00~07:00 자동 스킵

---

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

---

## 🛠️ 주의사항

1. **`gyeol_learned_topics` 컬럼명**: `title` (NOT `topic`)
2. **OpenClaw Learner는 Reader**: 직접 브라우징 금지, Edge가 수집한 데이터만 읽기
3. **source 구분**: OpenClaw → `"openclaw"`, Edge → `null` 또는 `"nextjs"`
4. **중복 방지**: Edge heartbeat가 OpenClaw 활동 감지하면 자동 스킵 (35분 윈도우)
5. **텔레그램**: OpenClaw 전담, Edge Function에서 제거됨
6. **성격 진화 주기**: 6시간마다 (매 heartbeat가 아님)
