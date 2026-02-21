# DEVIN 백엔드 구현 지시서 — GYEOL 미구현 150개 기능

> **대상**: Devin AI  
> **작성일**: 2026-02-21  
> **범위**: DB/Edge Functions/API/보안/인프라 (프론트엔드는 `DEVIN_FRONTEND_INSTRUCTION.md` 참조)

---

## ⚠️ 필수 규칙

### 1. 디렉토리 규칙
- **Edge Functions**: `supabase/functions/{name}/index.ts`
- **DB 마이그레이션**: `supabase/migrations/` 에 `.sql` 파일 생성
- **공유 유틸**: `supabase/functions/_shared/`
- **백엔드 로직**: `lib/gyeol/`
- **API Routes**: `app/api/` (Next.js)

### 2. 수정 불가 파일
- `src/` — 프론트엔드 (Lovable 전담)
- `components/` — UI 컴포넌트 (Lovable 전담)
- `store/` — 상태관리 (Lovable 전담)
- `src/integrations/supabase/client.ts`
- `src/integrations/supabase/types.ts`
- `.env`, `package.json`, `supabase/config.toml`

### 3. 커밋 규칙
```
[backend] B19: RLS 세분화 정책 추가
[backend] B27: matching Edge Function 구현
```

### 4. 인증/보안
- 모든 테이블에 RLS 정책 필수
- Edge Functions에서 `verify_jwt = false` + 코드 내 검증
- UUID 검증: `supabase/functions/_shared/validate-uuid.ts` 사용
- 콘텐츠 필터: `supabase/functions/_shared/content-filter.ts` 사용

### 5. AI 호출
- **Lovable AI Gateway**: `https://ai.gateway.lovable.dev/v1/chat/completions`
  - 키: `LOVABLE_API_KEY` (자동 제공)
  - 기본 모델: `google/gemini-2.5-flash`
  - 경량 작업: `google/gemini-2.5-flash-lite`
- **Groq**: 폴백 전용 (`GROQ_API_KEY`)

---

## 📦 B19: 보안 심화 (21개)

### 콘텐츠 필터 강화 (3개)
```
#878 다국어 욕설 필터
- supabase/functions/_shared/content-filter.ts 확장
- 영어, 일본어, 중국어 욕설 패턴 추가
- 기존 한국어 필터에 병합

#879 필터 강도 설정
- gyeol_agents.settings에 content_filter_level (1~5) 필드 추가
- Edge Function에서 레벨에 따라 필터 임계값 조정
- 레벨 1: 최소 필터 (심각한 것만), 레벨 5: 최대 필터

#880 커스텀 금지어
- gyeol_user_blocked_words 테이블 생성
  (id UUID, agent_id UUID FK, word TEXT, created_at TIMESTAMPTZ)
- RLS: agent 소유자만 CRUD
- content-filter에서 사용자 금지어 병합 체크
```

### Kill Switch (3개)
```
#888 Kill Switch 알림
- Kill Switch 활성화 시 텔레그램/푸시 알림 발송
- gyeol_system_state UPDATE 트리거 → push-notify 호출

#889 Kill Switch 예약
- scheduled_kill_switch_at TIMESTAMPTZ 컬럼 추가
- cron Edge Function에서 체크 → 시간 도달 시 kill_switch = true

#890 Kill Switch 이력
- gyeol_kill_switch_logs 테이블
  (id, activated_at, deactivated_at, reason, activated_by)
- INSERT 트리거로 자동 기록
```

### 감사 로그 (5개)
```
#896 감사 로그 조회 API
- GET /api/audit?agent_id=&type=&from=&to=&limit=
- gyeol_autonomous_logs 쿼리 + 페이지네이션

#897 감사 로그 필터
- activity_type, source, date range, security_flags 필터
- 복합 인덱스: (agent_id, activity_type, created_at)

#898 감사 로그 내보내기
- GET /api/audit/export?format=csv|json
- CSV 생성 → 다운로드 응답

#899 감사 이상 감지 알림
- 1시간 내 동일 activity_type 50회 이상 → 알림
- Edge Function cron 체크

#900 감사 대시보드 API
- GET /api/audit/dashboard
- 일별 활동 카운트, 보안 플래그 카운트, 최근 이상 목록
```

### BYOK 보안 (5개)
```
#906 키 만료 설정
- gyeol_byok_keys에 expires_at TIMESTAMPTZ 컬럼 추가
- 만료 체크 로직: chat Edge Function에서 사용 전 검증

#907 키 갱신 알림
- 만료 7일 전 알림 (cron 체크)
- push-notify Edge Function 호출

#908 키 사용 로그
- gyeol_byok_usage_logs 테이블
  (id, byok_key_id FK, used_at, tokens_used, provider)
- 프로바이더 호출 시 자동 기록

#909 키 접근 제한
- gyeol_byok_keys에 allowed_ips TEXT[] 컬럼
- Edge Function에서 요청 IP 검증 (선택적)

#910 키 백업
- 암호화된 키 내보내기 API
- POST /api/byok/export → 암호화된 JSON
```

### RLS & Rate Limiting (5개)
```
#913 세분화 RLS 정책
- gyeol_conversations: 자기 에이전트 대화만 SELECT
- gyeol_user_memories: 자기 에이전트만 SELECT
- gyeol_byok_keys: 자기 키만 CRUD
- 모든 테이블 RLS 재검토 및 강화

#914 API Rate Limiting
- Edge Function별 rate limit 구현
  - chat: 30 req/min per agent
  - heartbeat: 1 req/15min per agent
  - market-purchase: 5 req/min per agent
- 구현: Supabase에 rate_limit_buckets 테이블
  (key TEXT PK, count INT, window_start TIMESTAMPTZ)

#915 접근 감사
- 모든 Edge Function 진입점에 감사 로깅 미들웨어
- 요청 IP, User-Agent, agent_id, timestamp 기록
```

---

## 📦 B22: 텔레그램 확장 (9개 — Koyeb/OpenClaw 측)

> ⚠️ 텔레그램은 OpenClaw(Koyeb) 전담. server/ 디렉토리에서 구현.

```
#922 봇 명령어 확장
- /stats — 성격/Gen/레벨 상세 보고
- /mood — 현재 무드 + 변경
- /memory — 기억 목록 표시
- /export — 최근 대화 내보내기
- /search <query> — 실시간 검색
- /evolve — 진화 히스토리

#923 인라인 키보드
- 응답 하단에 퀵 액션 버튼
- "더 알려줘", "주제 바꿔", "검색해줘"

#924 텔레그램 그룹 지원
- 그룹 채팅에서 @gyeol_bot 멘션 시 응답
- 그룹별 에이전트 연결

#925 미디어 메시지
- 사진/문서 수신 → Storage 업로드
- 이미지 분석 (Gemini vision)

#926 텔레그램 알림 설정
- /quiet — 프로액티브 메시지 중단
- /notify — 프로액티브 메시지 재개
- 시간대 설정

#927 텔레그램 연결 해제
- /unlink — 에이전트 연결 해제
- gyeol_telegram_links DELETE

#928 대화 동기화
- 텔레그램 대화와 웹 대화 통합 히스토리
- channel='telegram' 필터로 구분 가능

#929 텔레그램 스티커
- 커스텀 스티커 팩 생성 API
- 에이전트 비주얼 기반 스티커

#930 텔레그램 프로필 연동
- 텔레그램 프로필 사진/이름 자동 가져오기
- gyeol_telegram_links에 telegram_username 컬럼
```

---

## 📦 B26: OpenClaw & 자율AI (22개)

> ⚠️ server/, openclaw-deploy/ 디렉토리에서 구현

### Gateway & 런타임 (7개)
```
#1039 Gateway 테스트 — /openclaw/test 엔드포인트
#1040 스킬 런타임 개선 — 스킬 hot-reload
#1041 Heartbeat 모니터링 — /openclaw/heartbeat/status
#1042 자율 학습 엔진 — 15개 소스 브라우징 (Edge에서 이관 시)
#1043 자율 반성 엔진 — 자기성찰 로직 OpenClaw에서 실행
#1044 선행 메시지 트리거 — proactive message 생성
#1045 멀티채널 연동 — 텔레그램 외 채널 확장 준비
```

### 자율 엔진 (5개)
```
#1056 자율학습 엔진 — RSS + 웹 크롤링 통합
#1057 반성 엔진 — 주기적 자기평가 + insights 저장
#1058 선행 트리거 — 사용자 부재 시 관심사 기반 메시지 생성
#1059 웹 크롤링 — 허용 URL 목록 내 크롤링
#1060 스케줄러 — cron 대신 내장 스케줄러
```

### 서버 인프라 (6개)
```
#1065 서버 배포 자동화 — GitHub Actions → Koyeb 배포
#1066 서버 모니터링 — /openclaw/metrics Prometheus 형식
#1067 서버 로그 수집 — 구조화된 JSON 로깅
#1068 서버 스케일링 — Koyeb 오토스케일 설정
#1069 서버 헬스체크 — /health 엔드포인트 강화
#1070 서버 백업 — 상태 스냅샷 저장
```

### 스킬 확장 (4개)
```
#1071 gyeol-supabase-sync 스킬 — Edge↔OpenClaw 데이터 동기화
#1072 gyeol-proactive 스킬 — 선행 메시지 AI 생성
#1073 gyeol-security 스킬 — 자율행동 보안 체크 강화
#1074 gyeol-analytics 스킬 — 사용 패턴 분석 + 인사이트
```

---

## 📦 B27: Edge Functions (19개)

### 핵심 Edge Functions
```
#1082 matching — 매칭 알고리즘 (taste_vectors cosine similarity)
- supabase/functions/matching/index.ts (이미 존재, 강화)
- 입력: agent_id → 출력: 상위 5개 매칭 에이전트

#1083 notification — 통합 알림 발송
- supabase/functions/push-notify/index.ts (이미 존재, 확장)
- 알림 유형: 매칭/퀘스트/진화/소셜

#1084 analytics — 에이전트 분석 대시보드 데이터
- 새로 생성: supabase/functions/analytics/index.ts
- 일별/주별 대화량, 토큰 사용, 성격 변화 추이

#1085 scheduler — cron 작업 관리
- 퀘스트 갱신, 리더보드 업데이트, 시즌 처리
- 기존 quest-renew, leaderboard-rewards, season-end 통합

#1086 image-gen — AI 이미지 생성
- Lovable AI Gateway (gemini-2.5-flash-image 모델)
- 에이전트 프로필/카드 이미지 생성

#1087 crawl — 웹 크롤링 (학습용)
- 기존 heartbeat 내 학습 로직 분리
- 15개 소스별 크롤링 + gyeol_learned_topics INSERT

#1088 export — 데이터 내보내기
- 에이전트 전체 데이터 JSON 생성
- GDPR 대응

#1089 import — 데이터 가져오기
- JSON → 에이전트 복원
- 데이터 검증 + INSERT

#1090 admin — 관리자 API
- 시스템 상태 조회/변경
- Kill Switch 토글
- 에이전트 관리
```

### 보조 Edge Functions
```
#1091 stripe-webhook — 결제 웹훅 (Stripe 연동 시)
#1092 email — 이메일 발송 (환영/알림)
#1093 cron — 범용 cron 핸들러
#1094 cache — 캐시 관리 (검색 결과 등)
#1095 migration — DB 마이그레이션 헬퍼
#1096 backup — DB 백업 트리거
#1097 health — 시스템 헬스체크 통합
#1098 rate-limit — Rate Limiting 미들웨어
#1099 audit — 감사 로그 수집기
#1100 report — 리포트 생성
```

---

## 📦 B28: 인프라 & 운영 (20개)

### CI/CD (5개)
```
#1111 GitHub Actions CI — 린트/테스트/빌드 파이프라인
#1112 스테이징 환경 — Vercel Preview + Supabase 브랜치
#1113 APM — 응답 시간/에러율 모니터링
#1114 Sentry — 에러 추적 연동
#1115 성능 모니터링 — Core Web Vitals 추적
```

### SEO (6개)
```
#1120 동적 OG 이미지 — Edge Function으로 동적 OG 이미지 생성
#1121 Twitter Card — meta tags 설정
#1122 JSON-LD — 구조화된 데이터 (Product, FAQ)
#1123 동적 메타 태그 — 페이지별 title/description
#1124 다국어 SEO — hreflang 태그
#1125 검색엔진 최적화 — sitemap.xml 동적 생성
```

### 에러 처리 (2개)
```
#1134 에러 리포팅 — 에러 수집 + 알림 파이프라인
#1135 에러 자동 복구 — 재시도 로직 + 서킷 브레이커
```

### 법률 (3개)
```
#1138 쿠키 정책 — 쿠키 동의 배너 로직
#1139 라이선스 표시 — 오픈소스 라이선스 목록 API
#1140 접근성 성명 — WCAG 2.1 적합성 문서
```

### DB 최적화 (4개)
```
#1141 인덱스 최적화 — 쿼리 분석 + 인덱스 추가
#1142 파티셔닝 — gyeol_conversations 날짜별 파티셔닝
#1143 아카이빙 — 90일 이상 오래된 대화 아카이브 테이블 이동
#1144 커넥션 풀링 — PgBouncer 설정 최적화
```

---

## 📦 DB 마이그레이션 필요 목록

### 새 테이블
```sql
-- 사용자 금지어
CREATE TABLE gyeol_user_blocked_words (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID REFERENCES gyeol_agents(id) NOT NULL,
  word TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Kill Switch 이력
CREATE TABLE gyeol_kill_switch_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  activated_at TIMESTAMPTZ DEFAULT now(),
  deactivated_at TIMESTAMPTZ,
  reason TEXT,
  activated_by TEXT
);

-- BYOK 사용 로그
CREATE TABLE gyeol_byok_usage_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  byok_key_id UUID REFERENCES gyeol_byok_keys(id),
  used_at TIMESTAMPTZ DEFAULT now(),
  tokens_used INT DEFAULT 0,
  provider TEXT
);

-- Rate Limit 버킷
CREATE TABLE gyeol_rate_limit_buckets (
  key TEXT PRIMARY KEY,
  count INT DEFAULT 0,
  window_start TIMESTAMPTZ DEFAULT now()
);

-- 메시지 리액션
CREATE TABLE gyeol_message_reactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL,
  agent_id UUID REFERENCES gyeol_agents(id) NOT NULL,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(message_id, agent_id, emoji)
);
```

### 컬럼 추가
```sql
-- BYOK 만료
ALTER TABLE gyeol_byok_keys ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- 대화 관리
ALTER TABLE gyeol_conversations ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false;
ALTER TABLE gyeol_conversations ADD COLUMN IF NOT EXISTS reply_to_id UUID;
ALTER TABLE gyeol_conversations ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

-- Kill Switch 예약
ALTER TABLE gyeol_system_state ADD COLUMN IF NOT EXISTS scheduled_kill_switch_at TIMESTAMPTZ;

-- 텔레그램 확장
ALTER TABLE gyeol_telegram_links ADD COLUMN IF NOT EXISTS telegram_username TEXT;
```

### 인덱스
```sql
CREATE INDEX IF NOT EXISTS idx_autonomous_logs_agent_type_date 
  ON gyeol_autonomous_logs(agent_id, activity_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_agent_date 
  ON gyeol_conversations(agent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_pinned 
  ON gyeol_conversations(agent_id, is_pinned) WHERE is_pinned = true;
```

---

## 🔧 환경 변수 (이미 설정됨)

| 변수 | 용도 | 상태 |
|------|------|------|
| `LOVABLE_API_KEY` | Lovable AI Gateway | ✅ |
| `GROQ_API_KEY` | Groq 폴백 | ✅ |
| `PERPLEXITY_API_KEY` | 실시간 검색 | ✅ |
| `TELEGRAM_BOT_TOKEN` | 텔레그램 봇 | ✅ |
| `SUPABASE_URL` | Supabase | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | DB 관리 | ✅ |
| `OPENCLAW_GATEWAY_URL` | OpenClaw 통신 | ✅ |

---

## 📐 Edge Function 템플릿

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { isValidUUID } from "../_shared/validate-uuid.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 로직 구현

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
```

---

**총 ~150개 백엔드 기능 | B19+B22+B26+B27+B28**
