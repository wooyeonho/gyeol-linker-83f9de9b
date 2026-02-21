# DEVIN 마스터 실행 지시서 — UI 리디자인 + 570개 기능 전체 구현

**⚠️ 이 문서는 "실행 명세서"입니다. 읽고 그대로 실행하세요.**
**⚠️ 기능 삭제 금지 — 숨기거나 재배치만.**
**⚠️ 하드코딩 컬러 금지 — Tailwind semantic token만 사용.**
**⚠️ 이미 생성된 컴포넌트는 재작성하지 말고 import해서 연결만.**

---

## 전체 구조 (10 Phase, 570개 기능 + UI 리디자인)

| Phase | 내용 | 기능 수 | 파일 |
|-------|------|---------|------|
| A | UI 리디자인 | - | Index, Social, Settings, globals.css |
| B | B11 채팅 심화 | 38 | 채팅 관련 |
| C | B12 에이전트 심화 | 34 | 에이전트 관련 |
| D | B13 진화 심화 | 34 | 진화 관련 |
| E | B14 게이미피케이션 심화 | 70 | 게이미피케이션 |
| F | B15 소셜 심화 | 60 | 소셜 관련 |
| G | B16 마켓 + B17 설정 | 78 | 마켓, 설정 |
| H | B18 비주얼 + B19 보안 + B20 인증 | 88 | 비주얼, 보안, 인증 |
| I | B21 온보딩 + B22 텔레그램 + B23 PWA + B24 네비게이션 | 67 | 온보딩, PWA, 네비 |
| J | B25 활동 + B26 OpenClaw + B27 Edge + B28 인프라 + B29 기타 | 76 | 활동, 인프라, 기타 |

**각 Phase 완료 후 → `npm run build` 에러 없는지 확인 → 스크린샷 → 커밋**

---

# Phase A: UI 리디자인

> **상세 코드 스니펫**: `docs/gyeol/DEVIN_UI_REDESIGN.md` 참조

## A-1: 홈 채팅 풀스크린 (`src/views/Index.tsx`)

1. `chatExpanded` state 제거 → 항상 채팅 뷰 표시
2. 상단바: GenBadge/Search/Notif/Export/Evolution 5개 버튼 → **햄버거 메뉴 1개**로 통합
3. `menuOpen` state 추가, AnimatePresence 메뉴 패널 구현
4. `!chatExpanded` 블록의 모든 위젯 제거 (import만 제거, 파일 삭제 금지):
   - AnimatedCharacter, GenBadge, GamificationWidget, PersonalityRadar
   - MoodHistory, MoodStats, StreakBonus, StreakCalendar, EvolutionGuide
   - DataVisualization, LeaderboardWidget, ConversationStats
5. 메시지 없을 때 empty state (아이콘 + 텍스트)
6. 삭제할 state: `chatExpanded`, `setChatExpanded`, `shareCardOpen`, `convStatsOpen`

## A-2: 비주얼 통일 (`app/globals.css`)

CSS 토큰 추가:
```css
:root {
  --card-bg: hsl(240 10% 12% / 0.6);
  --card-border: hsl(240 10% 20% / 0.3);
  --card-radius: 16px;
  --card-padding: 16px;
  --glow-primary: 0 0 20px hsl(260 80% 60% / 0.15);
}
```

규칙:
- `.aurora-bg` → 홈(/)에만, 다른 페이지에서 제거 (Social, Settings, Activity, Gamification)
- 글로우 → CTA/진화에만
- 카드 `p-4 rounded-2xl`

## A-3: 소셜 탭 정리 (`src/views/Social.tsx`)

```tsx
// 변경: 4탭 → 3탭
const [tab, setTab] = useState<'feed' | 'matching' | 'friends'>('feed');
```
- `feed` = foryou + moltbook
- `matching` = 매칭 카드
- `friends` = following + DM
- 상단: 탭별 1개 액션 버튼만

## A-4: 설정 그룹핑 (`src/views/Settings.tsx`)

5개 그룹: General, AI, Appearance, Integrations, Info
각 그룹 `glass-card rounded-2xl overflow-hidden`

---

# Phase B: B11 채팅 심화 (38개)

## 메시지 송수신 (4개)
- **#80 파일 첨부**: FileDropZone → 채팅 입력바 연결, Storage 업로드, 이미지/PDF 최대 10MB
- **#81 링크 미리보기**: LinkPreview → 메시지 버블 연결, URL 감지 → og:image/title 파싱
- **#84 메시지 수정**: 롱프레스 → 편집 모드, PATCH API, "(수정됨)" 라벨
- **#85 드래그앤드롭**: onDragOver/onDrop → 오버레이 UI, #80 로직 재사용

## 메시지 UI (5개)
- **#104 이미지 메시지**: ImageMessage 컴포넌트 연결
- **#105 리액션**: MessageReactions 연결, 6종 이모지 (❤️👍😂😮😢🔥), DB: `reactions` jsonb
- **#106 답장**: MessageReply 연결, 스와이프 답장, DB: `reply_to` uuid
- **#108 핀**: 핀 토글, DB: `is_pinned` boolean, 상단 배너
- **#110 읽음**: ReadReceipt 연결, ✓✓, DB: `read_at` timestamp

## 대화 관리 (6개)
- **#119 고정**: `is_pinned` boolean, 상단 고정
- **#120 아카이브**: `is_archived` boolean, 아카이브 탭
- **#122 통계**: ConversationStats 확장
- **#123 공유 링크**: ConversationShare 확장
- **#124 태그**: DB: `tags` text[], 칩 UI
- **#125 필터**: ConversationFilter 확장, 복합 필터

## AI 프로바이더 (6개)
- **#140 토큰 표시**: TokenUsageDisplay 연결
- **#141 모델 선택**: ModelSelector 연결
- **#142 속도/비용**: 비교 테이블
- **#143 사용량 대시보드**: Recharts 차트
- **#144 시스템 프롬프트**: SystemPromptEditor 연결
- **#145 토큰 제한**: max_tokens 슬라이더

## 검색 (3개)
- **#158 웹 검색**: Perplexity API, "검색해줘" 트리거
- **#159 이미지 검색**: 별도 API
- **#160 캐시**: search-cache.ts 활용

## 음성 (6개)
- **#170 웨이크워드**: "항상 듣기" 토글 (부분 구현)
- **#171 연속 입력**: ContinuousVoiceInput 연결
- **#172 다국어**: recognition.lang 설정
- **#173 감정 분석**: 텍스트 기반 대체
- **#174-175 TTS**: speechSynthesis.getVoices() 목록, 드롭다운

## 메모리 (1개)
- **#183 압축**: Edge Function LLM 요약 → 교체

### DB 마이그레이션 (B11):
```sql
ALTER TABLE gyeol_conversations ADD COLUMN IF NOT EXISTS reactions jsonb DEFAULT '{}';
ALTER TABLE gyeol_conversations ADD COLUMN IF NOT EXISTS reply_to uuid REFERENCES gyeol_conversations(id);
ALTER TABLE gyeol_conversations ADD COLUMN IF NOT EXISTS is_pinned boolean DEFAULT false;
ALTER TABLE gyeol_conversations ADD COLUMN IF NOT EXISTS read_at timestamptz;
ALTER TABLE gyeol_conversations ADD COLUMN IF NOT EXISTS is_edited boolean DEFAULT false;
ALTER TABLE gyeol_conversations ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';
ALTER TABLE gyeol_conversations ADD COLUMN IF NOT EXISTS is_archived boolean DEFAULT false;
ALTER TABLE gyeol_conversations ADD COLUMN IF NOT EXISTS attachments jsonb DEFAULT '[]';
```

---

# Phase C: B12 에이전트 심화 (34개)

## 에이전트 관리 (7개): #194-200
- 멀티 에이전트 리스트 UI, Zustand `activeAgentId`
- 전환/복제/초기화 API
- AgentStatsDashboard 연결
- 백업/복원 (JSON 내보내기/가져오기)
- 에이전트 공유 링크

## 성격 시스템 (9개): #217-225
- PersonalityChangeNotif 연결
- 프리셋 저장/로드, PersonalityPresets 연결
- 성격 비교 (레이더 오버레이)
- 성격 잠금 `is_locked` 토글
- 시스템 프롬프트에 성격 반영 강화
- 밸런스 점수, AI 어드바이스
- 리셋 API (모든 축 50)

## 친밀도 (4개): #241-245
- 레벨별 특수 대화 트리거
- 이모지 매핑, 보너스 이벤트
- 리더보드 친밀도 탭

## 무드 (3개): #263-265
- MoodSelector 채팅 연결
- 무드 변경 토스트
- MoodStats 연결

## 페르소나 (8개): #278-285
- 커스텀 텍스트, 프리셋 5종
- 아바타 변경, JSON 공유
- 퀵 스위처, 평가, 히스토리
- A/B 테스트

---

# Phase D: B13 진화 심화 (34개)

## 진화 엔진 (5개): #298-304
- Gen 6+ 확장
- 퇴화(역진화) 로직
- 진화 보호 아이템
- 카운트다운 표시

## 돌연변이 (3개): #318-320
- 히스토리, 이벤트 한정, 합성

## 비주얼 진화 (9개): #327-335
- CSS 파티클 강화
- framer-motion 전환 애니메이션
- 커스텀 비주얼 슬라이더
- 프리셋 5종, 미리보기
- 공유, 히스토리, 랭킹

## 진화 연출 (9개): #342-350
- 수축→폭발→확장 3단계 (framer-motion keyframes)
- 글로우 확장, 파티클 폭발
- Web Audio API 사운드
- 배경 연출, 캐릭터 모프
- html2canvas 스크린샷
- Web Share, 리플레이

## 일일 이벤트 (6개): #360-365
- 알림, 히스토리, 시즌 연동
- 스케줄, 공유, 카운트다운

---

# Phase E: B14 게이미피케이션 심화 (70개)

## EXP & 레벨 (9개): #377-385
- 레벨별 특전, EXP 부스터
- 히스토리, 일일 제한
- EXP 기프트, 이벤트
- 레벨 캡 100, 마스터 레벨, 전생

## 코인 (9개): #391-400
- 코인 전송 API, 거래소 UI
- 일일 보너스, 더블 이벤트, VIP
- 알림, 통계, 랭킹
- #391 결제 → 🔴 Stripe (스킵 가능)

## 퀘스트 (10개): #416-425
- 자동 갱신(cron), 알림
- 체인/히든/커스텀 퀘스트
- 히스토리, 추천, 난이도
- 카운트다운, 보스 퀘스트

## 업적 (7개): #443-450
- 포인트, 3단계(Bronze/Silver/Gold)
- 프로필 배지, 통계, 리플레이
- 랭킹, 시크릿 업적

## 리더보드 (6개): #459-465
- 카테고리별, 알림, 친구 필터
- 지역, 히스토리, 공유

## 상점 (13개): #478-490
- 미리보기 모달, 리뷰
- 추천, 세일, 번들, 위시리스트
- 구매 히스토리, 환불
- 기프트, NEW 뱃지, 레벨 제한
- 가격 비교, 구매 알림

## 인벤토리 (4개): #501-504
- 버리기 DELETE, 거래, 합성, 강화

## 시즌 (3개): #513-515
- #513 프리미엄 → 🔴 결제
- 카운트다운, 히스토리

## 스트릭 (4개): #521-524
- 보호 아이템, 알림, 랭킹, 마일스톤

---

# Phase F: B15 소셜 심화 (60개)

## 매칭 (9개): #537-545
- cosine similarity 알고리즘
- 추천, 히스토리, 해제, 블록
- AgentDM 연동, 알림, 주기 설정

## 브리딩 (3개): #563-565
- 유전 미리보기, 히스토리, 족보

## Moltbook (7개): #584-590
- Web Share, 신고 테이블
- 검색, 미디어 첨부, 해시태그
- 멘션 자동완성, 알림

## 커뮤니티 (6개): #599-605
- 필터, 검색 (CommunitySearch)
- 이벤트, 그룹 CRUD, 랭킹, 알림

## AI 대화 (8개): #608-615
- AISpectator 관전 모드
- 주제 설정, 히스토리, 평가
- 토론 모드, 협업 글쓰기
- 공유, 알림

## 에이전트 공유 (8개): #618-625
- 공유 링크, QR 코드, SNS
- 임베드 코드, 통계
- 제한 설정, 카드 커스텀, 만료일

## 프로필 (16개): #630-645
- 공개 프로필 `/profile/:id`
- SEO, 커스텀 URL (slug)
- 배경 설정, 방문자 수
- 댓글 테이블, 스킨 미리보기
- ProfileTimeline 연결
- 통계, 팔로워 수, 추천
- verified 배지, 검색, AgentComparison

---

# Phase G: B16 마켓 + B17 설정 (78개)

## B16 스킨 마켓 (11개): #655-665
- 구매 로직 (코인 차감 + agent_skins INSERT)
- 미리보기 모달, 리뷰 테이블
- 에디터, 검색, 정렬 (인기/신규/가격)
- 공유, 할인 표시

## B16 스킬 마켓 (10개): #676-685
- 테스트 UI, 제작 에디터
- 리뷰, 검색, 정렬, 추천
- 버전 관리, 의존성
- #676/#685 sandbox → 🔴 부분 구현

## B16 마켓 공통 (20개): #689-705
- 수수료 계산, 판매자 대시보드
- 승인 프로세스, 신고
- 추천 알고리즘, 배너, 이벤트
- 위시리스트, 쿠폰, 리뷰 관리
- 통계, 크리에이터 프로그램
- API 문서, 어뷰징 감지
- 환불 정책, 추천 시스템
- #689 결제 → 🔴 Stripe

## B17 성격 설정 (5개): #711-715
- 프리셋 빠른 적용, 잠금
- PersonalityHistory 연결, 비교, 추천

## B17 AI 브레인 (8개): #722-730
- API 키 유효성 검사
- 모델 선택, 온도 슬라이더
- 토큰 제한, 속도 테스트
- BYOK 키 갱신, 사용량 통계
- #723 잔액 → 🔴 프로바이더 API

## B17 안전 (7개): #734-740
- 필터 강도 슬라이더
- PII 필터 체크박스, 금지어 목록
- 보호자 모드 PIN, 신고 양식
- 안전 로그 조회, 알림

## B17 캐릭터 (4개): #745-748
- 에디터, 색상 피커
- 악세사리, 애니메이션 설정

## B17 기타 (3+5+6+4+2개):
- #753 모드 프리뷰
- #757-761 테마 커스텀/프리셋/스케줄/내보내기/공유
- #764-769 푸시 구독/소리/시간대/카테고리(NotificationSettings)/DND/히스토리
- #772-775 TTS 음성/언어/볼륨/미리듣기
- #784-785 피드/키워드 카테고리

---

# Phase H: B18 비주얼 + B19 보안 + B20 인증 (88개)

## B18 비주얼 & 캐릭터 (45개)

### 애니메이션 캐릭터 (17개): #799-815
- 커스텀 에디터 (CharacterEditor 확장)
- 악세사리/표정/포즈/의상 선택 UI
- 배경/이모티콘/스티커 시스템
- 월페이퍼, GIF 내보내기
- 애니메이션 세트/사운드
- 상호작용, 360도, 갤러리
- #799 3D / #809 AR → 🔴 고급 (CSS 기반 대체)

### VoidCore & PearlSpheres (10개): #821-830
- 파티클 강화, 터치 반응
- 무드/진화 반응 비주얼
- 환경 반응, 배경 커스텀
- 이펙트 강도, 녹화, 공유
- #821 WebGL → 🔴 (CSS 대체)

### 스킨 비주얼 (8개): #838-845
- 적용 시 즉시 반영
- 배경/캐릭터/사운드/파티클 변형
- 에디터, 애니메이션, 한정판

### UI 컴포넌트 (3개): #862-865
- 마이크로 인터랙션, 제스처
- #865 햅틱 → 🔴 브라우저 제한

## B19 보안 심화 (21개)

### 콘텐츠 필터 (3개): #878-880
- 다국어 욕설 DB 확장
- 필터 강도 설정
- 커스텀 금지어 목록

### Kill Switch (3개): #888-890
- 알림 (관리자 이메일/토스트)
- 예약 (시간 설정)
- 이력 (로그 테이블)

### 감사 로그 (5개): #896-900
- 조회 UI, 필터, CSV 내보내기
- 알림, 대시보드

### BYOK 보안 (5개): #906-910
- 키 만료 알림
- 사용 로그, 접근 제한
- 자동 갱신, 백업

### DB 보안 (3개): #913-915
- RLS 세분화
- API Rate Limiting (Edge Function)
- 접근 감사 로그

## B20 인증 & 계정 (22개)

### 소셜 로그인 (3개): #11-13
- Google OAuth (Lovable Cloud Auth)
- Apple Sign-In
- 카카오 → 🔴 (커스텀 OAuth 필요)

### 계정 관리 (7개): #15, #19-25
- 이메일 변경 (재인증)
- 프로필 사진 (Storage 업로드)
- 닉네임 변경, 비활성화
- GDPR 데이터 내보내기
- 로그인 기록, 2FA, 세션 관리

### 보안 강화 (6개): #30-35
- Rate limiting (IP 기반)
- IP 차단, 비정상 로그인 감지
- 로그인 실패 횟수 제한
- 디바이스 신뢰, API 키 갱신

---

# Phase I: B21 + B22 + B23 + B24 (67개)

## B21 온보딩 심화 (9개)
- #47 이름 중복 체크 (API 호출)
- #54-55 커스텀 캐릭터 생성, 설명 상세
- #61-65 성격 슬라이더, 프리셋, AI 추천, 설명, 비교 뷰

## B22 텔레그램 & 외부 채널 (24개)
- #922-930 텔레그램: 봇 명령어, 인라인 모드, 그룹 채팅, 미디어, 알림, 해제, 동기화, 스티커, 프로필
- #931-945 외부 채널: 대부분 🔴 — 구현 가능한 것만:
  - 위젯 임베드 (#939)
  - API 엔드포인트 (#940)
  - 나머지 (WhatsApp/Discord/Slack 등) → 스킵 또는 "준비 중" UI

## B23 PWA & 모바일 (25개)
- #954-960 오프라인: SW 캐시 전략, 백그라운드 동기화, 업데이트 프롬프트, 오프라인 대화 큐
- #968-975 모바일: 스와이프(SwipeNavigation 연결), 세이프 에리어, 가로 모드, 태블릿 레이아웃, 스플래시, 앱 배지, 딥링크
- #980-985 푸시: VAPID 키 설정, 실제 push-notify Edge Function 연동, 구독 관리 UI, 카테고리별, 통계
- #968 햅틱 → 🔴 브라우저 제한

## B24 네비게이션 (9개)
- #1000 브레드크럼
- #1007-1010 네비게이션 애니메이션 (PageTransition 확장), 커스텀 순서, 사이드바 (태블릿), 제스처

---

# Phase J: B25 + B26 + B27 + B28 + B29 (76개)

## B25 활동 피드 심화 (10개): #1021-1030
- ActivityExport, ActivityFilter, ActivityStats (이미 존재) 확장
- 카테고리, 일별/주별/월별 요약
- 비교, 목표 설정, 스트릭, 배지

## B26 OpenClaw & 자율AI (22개): #1039-1070
- Gateway 테스트 UI
- Heartbeat 대시보드
- 자율학습/반성/선행메시지 UI
- #1065-1070 서버 인프라 → 🔴 Koyeb 작업 (Lovable 범위 밖)
- 구현 가능한 프론트엔드 UI만 구현

## B27 Edge Functions (19개): #1082-1100
- matching, notification-scheduler, analytics
- image-gen, export-data, import-data
- admin-dashboard, health
- 이미 존재하는 것 확장, 없는 것 생성
- rate-limiter, audit-log (이미 존재) 확장

## B28 인프라 & 운영 (20개): #1111-1140
- SEO: 동적 OG 이미지, Twitter 카드, JSON-LD (SEO 컴포넌트 확장)
- 동적 메타 태그, 다국어 SEO
- 에러 리포팅 UI, 에러 복구
- 쿠키 정책, 라이선스, 접근성 성명 페이지
- #1111-1115 CI/CD, APM → 🔴 외부 서비스

## B29 기타 (5개): #1146-1150
- **#1146 i18n**: useI18n 훅 (이미 존재) 확장, 영어/한국어/일본어
- **#1147 접근성**: aria-label, 키보드 네비게이션, 스크린리더
- **#1148 단위 테스트**: Vitest 기본 테스트
- #1149 E2E → 🔴 Playwright (환경 필요)
- #1150 Storybook → 🔴 (별도 설정)

---

# 🔴 구현 불가/스킵 항목 정리

아래 항목은 외부 서비스/인프라 의존으로 **스킵하거나 "준비 중" UI만 구현**:

| # | 기능 | 이유 |
|---|------|------|
| #391 | 코인 결제 | Stripe 연동 필요 |
| #513 | 프리미엄 시즌패스 | 결제 필요 |
| #676, #685 | 스킬 코드 실행/sandbox | 보안 샌드박스 필요 |
| #689 | 마켓 결제 | Stripe 필요 |
| #723 | API 잔액 표시 | 프로바이더별 API |
| #799 | 3D 모델 | Three.js 고급 (CSS 대체) |
| #809 | AR | WebXR 제한 |
| #821 | WebGL VoidCore | CSS 대체 |
| #865, #968 | 햅틱 피드백 | 브라우저 제한 |
| #931-938 | WhatsApp/Discord/Slack 등 | 외부 API |
| #1065-1070 | 서버 인프라 | Koyeb 별도 |
| #1111-1115 | CI/CD, APM, Sentry | 외부 서비스 |
| #1149 | E2E 테스트 | Playwright 환경 |
| #1150 | Storybook | 별도 설정 |

→ **약 25개 스킵**, 나머지 **545개 실제 구현**

---

# 공통 규칙 체크리스트

모든 Phase에서 확인:

- [ ] 하드코딩 컬러 없음 (`text-white` → `text-foreground`)
- [ ] CTA 3개 이하/화면
- [ ] 카드 중첩 없음
- [ ] 글로우/그라디언트는 CTA/진화에만
- [ ] `.aurora-bg`는 홈에만
- [ ] 기능 삭제 없음 (숨기기/재배치만)
- [ ] 카드 `p-4 rounded-2xl`
- [ ] `npm run build` 에러 없음
- [ ] 기존 컴포넌트 파일 삭제 금지
- [ ] 이미 존재하는 컴포넌트는 import해서 연결

---

# Devin 실행 커맨드

```
docs/gyeol/DEVIN_MASTER_INSTRUCTION.md를 읽고 Phase A부터 순서대로 실행해.

Phase A (UI 리디자인) → 빌드 확인 → 스크린샷
Phase B (B11 채팅) → 빌드 확인 → 스크린샷
Phase C (B12 에이전트) → 빌드 확인 → 스크린샷
Phase D (B13 진화) → 빌드 확인 → 스크린샷
Phase E (B14 게이미피케이션) → 빌드 확인 → 스크린샷
Phase F (B15 소셜) → 빌드 확인 → 스크린샷
Phase G (B16 마켓 + B17 설정) → 빌드 확인 → 스크린샷
Phase H (B18 비주얼 + B19 보안 + B20 인증) → 빌드 확인 → 스크린샷
Phase I (B21~B24) → 빌드 확인 → 스크린샷
Phase J (B25~B29) → 빌드 확인 → 스크린샷

각 Phase 내에서도 섹션별로 커밋.
기능은 절대 삭제하지 말 것. 숨기거나 재배치만.
이미 생성된 컴포넌트는 재작성하지 말고 import 연결만.
🔴 항목은 "준비 중" UI만 표시하고 스킵.
```
