# DEVIN-INSTRUCTION.md — GYEOL × OpenClaw 배포 지시서

> Devin이 만든 가짜 Python 서버(983줄)를 버리고, 진짜 OpenClaw Docker 이미지(coollabsio/openclaw)로 교체.

## 현재 상태
- ✅ 가짜 서버 `openclaw-server/` 삭제 완료
- ✅ `docker-compose.yml` — coollabsio/openclaw:latest 설정 완료
- ✅ `config.json` — OpenClaw 네이티브 설정 완료
- ✅ `fly.toml` — Fly.io 배포 설정 완료
- ✅ GYEOL 커스텀 스킬 6개 — `server/workspace/skills/` 에 SKILL.md 준비 완료
- ✅ 프론트엔드 OpenClaw 클라이언트 업데이트 완료

## OpenClaw이 내장으로 해주는 것
| 기능 | 기존(Devin) | 변경 후(OpenClaw) |
|------|------------|------------------|
| 텔레그램 봇 | ❌ 미구현 | ✅ 내장 채널 |
| Heartbeat 30분 | ❌ 미구현 | ✅ 내장 스케줄러 |
| 스킬 실행 | ❌ 미구현 | ✅ SKILL.md만 넣으면 됨 |
| 메모리/대화기록 | ❌ 미구현 | ✅ 내장 memory_store |
| 샌드박스 | ❌ 미구현 | ✅ 내장 실행 환경 |

## 8단계 배포 순서

### 1단계: Fly.io 앱 생성
```bash
fly apps create gyeol-openclaw
fly volumes create openclaw_data --region nrt --size 1
```

### 2단계: 시크릿 설정
```bash
fly secrets set \
  GROQ_API_KEY=gsk_your_key \
  AUTH_PASSWORD=your_password \
  OPENCLAW_GATEWAY_TOKEN=your_token \
  TELEGRAM_BOT_TOKEN=your_bot_token \
  SUPABASE_URL=https://ambadtjrwwaaobrbzjar.supabase.co \
  SUPABASE_SERVICE_KEY=your_service_role_key
```

### 3단계: 배포
```bash
fly deploy
```

### 4단계: 텔레그램 웹훅 등록
```bash
curl "https://api.telegram.org/bot{BOT_TOKEN}/setWebhook?url=https://gyeol-openclaw.fly.dev/api/telegram"
```

### 5단계: 프론트엔드 환경 변수 설정
Lovable Cloud에서:
- `OPENCLAW_GATEWAY_URL` = `https://gyeol-openclaw.fly.dev`
- `OPENCLAW_GATEWAY_TOKEN` = 2단계에서 설정한 토큰

### 6단계: 스킬 확인
```bash
fly ssh console
ls /app/workspace/skills/
# gyeol-learner, gyeol-reflection, gyeol-personality-sync,
# gyeol-proactive, gyeol-security, gyeol-supabase
```

### 7단계: 헬스체크
```bash
curl https://gyeol-openclaw.fly.dev/api/health
```

### 8단계: 통합 테스트
1. 텔레그램에서 `/start` → 응답 확인
2. 웹 프론트엔드에서 채팅 → OpenClaw 경유 응답 확인
3. 30분 후 Activity 페이지에서 heartbeat 로그 확인

## 파일 구조
```
├── config.json                    # OpenClaw 설정
├── docker-compose.yml             # 로컬 실행용
├── fly.toml                       # Fly.io 배포용
├── system_prompt.md               # GYEOL 시스템 프롬프트
├── server/workspace/              # OpenClaw 워크스페이스
│   ├── AGENT.md
│   ├── HEARTBEAT.md
│   ├── LEARNING_SOURCES.md
│   └── skills/
│       ├── gyeol-learner/SKILL.md
│       ├── gyeol-reflection/SKILL.md
│       ├── gyeol-personality-sync/SKILL.md
│       ├── gyeol-proactive/SKILL.md
│       ├── gyeol-security/SKILL.md
│       └── gyeol-supabase/SKILL.md
├── lib/gyeol/openclaw-client.ts   # 프론트엔드 → OpenClaw API
└── supabase/functions/chat/       # 웹 채팅 Edge Function (OpenClaw 폴백)
```

## 우리가 만드는 것 vs OpenClaw이 해주는 것
**우리가 만드는 것 (6개 SKILL.md + 프론트엔드):**
1. `gyeol-learner` — RSS 학습
2. `gyeol-reflection` — 자기 사색/성격 진화
3. `gyeol-personality-sync` — Supabase 동기화
4. `gyeol-proactive` — 먼저 말 걸기
5. `gyeol-security` — 콘텐츠 필터/킬스위치
6. `gyeol-supabase` — DB 영속성

**OpenClaw이 해주는 것:**
- 텔레그램 봇 (내장 채널)
- 30분 Heartbeat 순환 (내장 스케줄러)
- 스킬 실행 엔진 (SKILL.md 파싱)
- 메모리/대화기록 (내장 memory_store)
- 샌드박스 실행 환경
- Web UI (관리용, 포트 8080)
