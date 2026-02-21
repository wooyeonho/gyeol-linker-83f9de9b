# GYEOL 출시 준비 — Devin 구현 가이드

**목표**: "AI계의 카카오톡" — 무료 서비스, 대규모 사용자 대응
**우선순위**: 🔴 출시 전 필수 → 🟡 출시 1주 내 → 🟢 출시 2주 내

---

## 🔴 P0: 출시 전 반드시 완료 (법적/안전/인프라)

### L-001. 이용약관 페이지 (`/terms`)
- 한국어 기본, 영어 전환 가능
- 항목: 서비스 정의, 이용 조건, 금지 행위, 면책, AI 생성 콘텐츠 책임, 지적재산권, 계정 해지
- 회원가입 시 "이용약관에 동의합니다" 체크박스 필수
- 마지막 업데이트 날짜 표시

### L-002. 개인정보처리방침 페이지 (`/privacy`)
- 수집 항목: 이메일, 대화 내용(암호화), AI 성격 데이터
- 수집 목적: 서비스 제공, AI 성격 진화, 서비스 개선
- 보관 기간: 회원 탈퇴 시 즉시 삭제
- 제3자 제공: AI 모델 제공사(Groq, Google 등)에 대화 내용 전달 (익명화)
- GDPR/개인정보보호법 준수 문구
- 쿠키 정책
- 개인정보 보호책임자 연락처 (플레이스홀더 OK)

### L-003. Rate Limiting (Edge Function)
- `supabase/functions/rate-limiter/index.ts` 생성
- 또는 기존 chat 함수에 인라인으로 구현
- 규칙:
  - 채팅: 분당 20회 / 시간당 200회 / 일 1000회
  - API 전체: 분당 60회
  - 소셜 글쓰기: 분당 5회
  - 회원가입: IP당 시간당 5회
- 저장: `gyeol_rate_limits` 테이블 (user_id, endpoint, window_start, count)
- 초과 시: 429 응답 + "잠시 후 다시 시도해주세요" 메시지
- 남은 횟수 헤더: `X-RateLimit-Remaining`, `X-RateLimit-Reset`

### L-004. 에러 UX 통합
- 네트워크 오류: "인터넷 연결을 확인해주세요" 토스트
- 서버 오류 (500): "서버가 잠시 바쁩니다. 곧 돌아올게요!" 
- Rate Limit (429): "너무 빠르게 보내고 있어요. {N}초 후 다시 시도해주세요"
- 인증 만료 (401): 자동 리프레시 시도 → 실패 시 로그인 페이지로 리다이렉트
- 채팅 전송 실패: 메시지 옆 ❌ 아이콘 + "다시 보내기" 버튼
- 오프라인 모드: 상단 배너 "오프라인 상태입니다" + 이전 대화 읽기만 가능

### L-005. 신고/차단 시스템
- 신고 대상: 커뮤니티 글, 댓글, 몰트북 게시물, DM
- 신고 사유: 스팸, 욕설/혐오, 성적 콘텐츠, 사기, 기타
- `gyeol_reports` 테이블: reporter_agent_id, target_type, target_id, reason, details, status, created_at
- 차단: `gyeol_blocks` 테이블: blocker_agent_id, blocked_agent_id
- 차단한 사용자의 콘텐츠는 피드/매칭에서 숨김
- 신고 5회 이상 누적 시 자동 숨김 처리
- 관리자 알림 (텔레그램 또는 이메일)

### L-006. 계정 삭제 완전 구현 확인
- 기존 `delete-account` Edge Function 동작 검증
- 삭제 대상: agents, conversations, memories, insights, gamification, social 전부
- 삭제 전 확인: "삭제합니다" 입력 필수
- 삭제 후: 로그아웃 + 홈으로 리다이렉트
- 삭제 로그 기록 (법적 보존 30일)

### L-007. 모니터링/알림 기본
- Edge Function 에러 시 텔레그램 관리자 알림
- 헬스체크 엔드포인트: `/api/health` → DB 연결 + 기본 응답 체크
- 에러 카운터: 5분간 에러 10회 이상 시 Kill Switch 자동 검토 알림
- 사용자 수/DAU 대시보드 (관리자 전용 `/admin` 페이지)

---

## 🟡 P1: 출시 후 1주 내 (리텐션/성장)

### L-008. 온보딩 완성
- 첫 방문 시 3단계 튜토리얼:
  1. "결(GYEOL)에 오신 걸 환영해요!" — 서비스 소개
  2. "AI 동반자에게 이름을 지어주세요" — 이름 커스텀 (선택)
  3. "첫 대화를 시작해볼까요?" — 샘플 대화 유도
- 스킵 가능
- 완료 시 보너스 코인 50개

### L-009. 푸시 알림 완성
- 웹 푸시 (Service Worker 기반)
- 알림 종류:
  - 에이전트가 보낸 먼저 말 걸기 (proactive message)
  - 진화 레벨업 축하
  - 일일 퀘스트 리마인더 (오후 8시)
  - 매칭 알림
  - 몰트북 좋아요/댓글
- 설정에서 개별 on/off 가능

### L-010. SEO & 소셜 공유
- OG 태그 완성: 제목, 설명, 이미지 (에이전트 프로필 카드)
- 트위터 카드 메타
- 에이전트 공유 카드: "/share/{agent_id}" → 공개 프로필 + "나도 결 시작하기" CTA
- 구조화된 데이터 (JSON-LD): WebApplication 스키마

### L-011. 성능 최적화
- 이미지 lazy loading 전체 적용
- 코드 스플리팅: 소셜/마켓/설정 → dynamic import
- 채팅 무한 스크롤: 최근 50개만 로드 → 스크롤 시 추가 로드
- 번들 사이즈 분석 및 불필요 의존성 제거
- Lighthouse 성능 점수 80+ 목표

### L-012. 피드백 수집
- 설정 페이지에 "피드백 보내기" 버튼
- `gyeol_feedback` 테이블: user_id, category, content, screenshot_url, created_at
- 카테고리: 버그, 기능 요청, 칭찬, 기타
- 제출 후 "소중한 의견 감사합니다! 💜" 토스트

---

## 🟢 P2: 출시 후 2주 내 (차별화/고도화)

### L-013. 초대/추천 시스템
- 사용자별 추천 코드 생성
- 추천으로 가입 시: 추천인 +100코인, 피추천인 +50코인
- `gyeol_referrals` 테이블: referrer_id, referee_id, code, rewarded, created_at
- 공유 링크: `gyeol.app/join/{code}`

### L-014. 다국어 기본 (i18n)
- 한국어 (기본) + 영어
- 기존 `src/lib/i18n.ts` 확장
- UI 텍스트 전체 키-값 분리
- 브라우저 언어 자동 감지
- 설정에서 수동 전환

### L-015. 접근성 (A11y) 검증
- 키보드 내비게이션 전체 동작 확인
- 스크린리더 호환 (aria-label, role 점검)
- 색상 대비 WCAG AA 이상
- 포커스 인디케이터 모든 인터랙티브 요소

### L-016. 데이터 내보내기
- 설정 → "내 데이터 다운로드"
- JSON 형식: 에이전트 정보, 전체 대화, 성격 변화 히스토리
- GDPR 데이터 이동권 충족

### L-017. 앱 안정성
- ErrorBoundary 모든 라우트 적용 확인
- Sentry 또는 자체 에러 로깅 (Edge Function)
- 크래시 리포트: 에러 발생 시 자동 수집 → 관리자 텔레그램 알림
- 메모리 릭 방지: useEffect cleanup 전수 검사

### L-018. 캐싱 전략
- 에이전트 프로필: 5분 캐시 (TanStack Query staleTime)
- 퀘스트 목록: 10분 캐시
- 리더보드: 30분 캐시
- 스킨/스킬 마켓: 15분 캐시
- 채팅은 캐시 없음 (항상 최신)

### L-019. 봇/자동화 방지
- 회원가입 시 간단한 봇 체크 (허니팟 필드 또는 시간 기반)
- 같은 내용 연속 전송 방지 (중복 메시지 필터)
- 비정상 패턴 감지: 1초 미만 간격 연속 요청 → 자동 쓰로틀

### L-020. 관리자 도구
- `/admin` 페이지 (KILL_SWITCH_TOKEN 인증)
- 기능:
  - Kill Switch on/off
  - 사용자 통계 (총 가입, DAU, MAU)
  - 신고 목록 관리
  - 시스템 상태 모니터링
  - 공지사항 발송

---

## 🔴 P0 추가: 대규모 트래픽 대비

### L-021. DB 인덱스 최적화
```sql
-- 채팅 조회 최적화
CREATE INDEX IF NOT EXISTS idx_conversations_agent_created 
  ON gyeol_conversations(agent_id, created_at DESC);

-- 소셜 피드 최적화
CREATE INDEX IF NOT EXISTS idx_moltbook_created 
  ON gyeol_moltbook_posts(created_at DESC);

-- 매칭 최적화
CREATE INDEX IF NOT EXISTS idx_matches_status 
  ON gyeol_matches(status, created_at DESC);

-- 게이미피케이션 조회
CREATE INDEX IF NOT EXISTS idx_gamification_agent 
  ON gyeol_gamification_profiles(agent_id);

-- Rate limit 조회
CREATE INDEX IF NOT EXISTS idx_rate_limits_user_endpoint 
  ON gyeol_rate_limits(user_id, endpoint, window_start);
```

### L-022. 대화 아카이빙
- 30일 이상 된 대화는 `gyeol_conversations_archive` 테이블로 이동
- 크론잡 (Edge Function + pg_cron): 매일 새벽 3시 실행
- 아카이브된 대화는 "이전 대화 보기" 버튼으로 접근

### L-023. Connection Pooling 확인
- Supabase의 기본 connection pool 설정 확인
- Edge Function에서 단일 클라이언트 재사용
- 불필요한 DB 연결 생성 방지

### L-024. CDN & 정적 자산
- 스킨 이미지: Storage 버킷 + CDN URL 사용
- 폰트: 시스템 폰트 우선 → 웹폰트는 preload
- 아이콘: Material Icons → subset만 포함하도록 최적화

---

## 기술 스택 참고

- **프론트엔드**: React 18 + Vite + Tailwind CSS + Framer Motion
- **백엔드**: Supabase (Lovable Cloud) — Edge Functions (Deno)
- **AI**: Lovable AI (Gemini, GPT 계열) + Groq (BYOK 폴백)
- **인증**: Supabase Auth (이메일 + Google OAuth)
- **상태관리**: Zustand + TanStack Query
- **디자인**: 다크 테마 기본, 글래스모피즘, 모바일 퍼스트

## 구현 규칙

1. 모든 색상은 Tailwind semantic token 사용 (`bg-background`, `text-foreground` 등)
2. 새 테이블 생성 시 반드시 RLS 정책 포함
3. Edge Function CORS 헤더 필수
4. 에러 시 사용자 친화적 메시지 (기술 용어 금지)
5. TypeScript strict mode
6. 모든 API 응답은 JSON 형식
7. 민감 데이터(API 키, 비밀번호)는 절대 클라이언트에 노출 금지

---

## Devin에게 전달할 메시지

```
다음 문서를 참고해서 GYEOL 출시 준비 기능을 구현해주세요:
docs/gyeol/DEVIN_LAUNCH_READINESS.md

우선순위:
1. 🔴 P0 항목 전부 (L-001 ~ L-007, L-021 ~ L-024)
2. 🟡 P1 항목 (L-008 ~ L-012)
3. 🟢 P2 항목 (L-013 ~ L-020)

기존 코드 구조를 유지하면서 구현해주세요.
Terms/Privacy 페이지는 이미 src/views/Terms.tsx, src/views/Privacy.tsx가 있으니 내용을 채워주세요.
```
