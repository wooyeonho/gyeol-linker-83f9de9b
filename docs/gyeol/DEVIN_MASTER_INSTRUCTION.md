# DEVIN 마스터 실행 지시서 — UI 리디자인 + B11~B15 기능 구현

**⚠️ 이 문서는 "실행 명세서"입니다. 읽고 그대로 실행하세요.**
**⚠️ 기능 삭제 금지 — 숨기거나 재배치만.**
**⚠️ 하드코딩 컬러 금지 — Tailwind semantic token만 사용 (`text-foreground`, `bg-primary`, `text-muted-foreground` 등).**

---

## 실행 순서

```
Phase A: UI 리디자인 (4단계)
Phase B: B11 채팅 심화 (38개 기능)
Phase C: B12 에이전트 심화 (34개 기능)  
Phase D: B13 진화 심화 (34개 기능)
Phase E: B14 게이미피케이션 심화 (70개 기능)
Phase F: B15 소셜 심화 (60개 기능)

각 Phase 완료 후 → `npm run build` 에러 없는지 확인 → 스크린샷
```

---

# Phase A: UI 리디자인

> **참고 문서**: `docs/gyeol/DEVIN_UI_REDESIGN.md` (상세 코드 스니펫 포함)
> **이 섹션은 요약본입니다. 코드 레벨 디테일은 반드시 위 문서를 참조하세요.**

## A-1: 홈 채팅 풀스크린 (`src/views/Index.tsx`)

### 해야 할 것:
1. `chatExpanded` state 제거 → 항상 채팅 뷰 표시
2. 상단바: GenBadge/Search/Notif/Export/Evolution 5개 버튼 → **햄버거 메뉴 1개**로 통합
3. `menuOpen` state 추가, AnimatePresence 메뉴 패널 구현 (Search, Notifications, Memory, Export, Evolution, Profile, Daily Reward)
4. `!chatExpanded` 블록의 모든 위젯 제거 (AnimatedCharacter, GamificationWidget, PersonalityRadar, MoodHistory, MoodStats, StreakBonus, StreakCalendar, EvolutionGuide, DataVisualization, LeaderboardWidget, ConversationStats)
5. **위 컴포넌트 파일은 삭제하지 않음** — import만 제거
6. 메시지 없을 때 인사말 empty state 구현 (아이콘 + 텍스트)
7. 입력바의 `onFocus`에서 `setChatExpanded(true)` 제거

### 삭제할 import:
```
AnimatedCharacter, GenBadge, GamificationWidget, PersonalityRadar, 
MoodHistory, MoodStats, StreakBonus, StreakCalendar, EvolutionGuide,
DataVisualization, LeaderboardWidget, ConversationStats
```

### 삭제할 state:
```
chatExpanded, setChatExpanded, shareCardOpen, convStatsOpen
```

## A-2: 비주얼 통일 (`app/globals.css` + 전체 컴포넌트)

### CSS 토큰 추가:
```css
:root {
  --card-bg: hsl(240 10% 12% / 0.6);
  --card-border: hsl(240 10% 20% / 0.3);
  --card-radius: 16px;
  --card-padding: 16px;
  --glow-primary: 0 0 20px hsl(260 80% 60% / 0.15);
  --text-title: 1.125rem;
  --text-body: 0.9375rem;
  --text-caption: 0.8125rem;
  --text-micro: 0.75rem;
}
```

### 규칙:
- `.aurora-bg` → 홈(/)에서만 사용, 다른 페이지에서 제거
- 글로우 효과 → CTA 버튼과 진화 순간에만 허용
- 그라디언트 텍스트 → 페이지 제목에만 허용
- 카드 패딩 → 모두 `p-4`, 라운딩 `rounded-2xl`

### 적용 대상 파일:
- `src/views/Social.tsx` — `.aurora-bg` 제거
- `src/views/Settings.tsx` — `.aurora-bg` 제거
- `src/views/Activity.tsx` — `.aurora-bg` 제거
- `src/views/Gamification.tsx` — `.aurora-bg` 제거

## A-3: 소셜 탭 정리 (`src/views/Social.tsx`)

### 변경:
```tsx
// 변경 전
const [tab, setTab] = useState<'foryou' | 'following' | 'moltbook' | 'timeline'>('foryou');

// 변경 후
const [tab, setTab] = useState<'feed' | 'matching' | 'friends'>('feed');
```

### 탭 매핑:
- `feed` = 기존 `foryou` + `moltbook` 합침
- `matching` = 매칭 카드 + Recommended Matches
- `friends` = 기존 `following` + DM 목록

### 상단 헤더: 탭별 1개 액션 버튼만
- `feed` → New Post 버튼
- `matching` → Filter 버튼
- `friends` → Search 버튼

## A-4: 설정 그룹핑 (`src/views/Settings.tsx`)

### 5개 그룹으로 재구성:
1. **General** — Theme, Language, Notifications+Push
2. **AI** — Mode, Personality, System Prompt, Provider+BYOK, TTS, Proactive
3. **Appearance** — Character Preset, Skin, Character Editor
4. **Integrations** — Telegram, OpenClaw, Moltbook, Feeds & Keywords
5. **Info** — 버전, Terms/Privacy, Kill Switch, Delete Account

각 그룹을 `glass-card rounded-2xl overflow-hidden`으로 감싸고, 그룹 제목 표시.

---

# Phase B: B11 채팅 심화 (38개)

## B11-1: 메시지 송수신 (4개)

### #80 파일 첨부
- `src/components/FileDropZone.tsx` (이미 존재) → 채팅 입력바에 연결
- 파일 선택 버튼 추가 (input type="file")
- Lovable Cloud Storage에 업로드 → URL을 메시지에 포함
- 지원 형식: 이미지 (jpg/png/gif/webp), PDF, 최대 10MB

### #81 링크 미리보기
- `src/components/LinkPreview.tsx` (이미 존재) → 메시지 버블에 연결
- URL 정규식: `/(https?:\/\/[^\s]+)/g`
- og:title, og:description, og:image 파싱 (Edge Function 필요)
- 미리보기 카드: 이미지 + 제목 + 설명 + 도메인

### #84 메시지 수정
- 메시지 롱프레스/더블클릭 → 편집 모드
- 수정 API: `supabase.from('gyeol_conversations').update({ content }).eq('id', msgId)`
- 수정된 메시지에 "(수정됨)" 라벨 표시
- 본인 메시지만 수정 가능

### #85 드래그 앤 드롭 파일 업로드
- `onDragOver`, `onDrop` 핸들러를 채팅 영역에 추가
- 드래그 중 오버레이 UI 표시 (반투명 + 아이콘)
- #80과 동일한 업로드 로직 재사용

## B11-2: 메시지 UI (5개)

### #104 이미지 메시지 표시
- `src/components/ImageMessage.tsx` (이미 존재) → 메시지 렌더링에 통합
- 이미지 URL 감지 → ImageMessage 컴포넌트로 렌더
- 클릭 시 풀스크린 모달

### #105 리액션 선택 UI
- `src/components/MessageReactions.tsx` (이미 존재) → 메시지 버블에 연결
- 메시지 롱프레스 → 6종 이모지 피커 (❤️👍😂😮😢🔥)
- DB: `gyeol_conversations` 에 `reactions` jsonb 컬럼 추가 필요

### #106 메시지 스레드/답장
- `src/components/MessageReply.tsx` (이미 존재) → 채팅에 연결
- 스와이프 또는 버튼으로 답장 모드 진입
- 답장 시 원본 메시지 미리보기 표시
- DB: `reply_to` 컬럼 추가 필요

### #108 메시지 핀
- 핀 토글 버튼 (메시지 컨텍스트 메뉴)
- DB: `is_pinned` boolean 컬럼 추가
- 핀 메시지 → 채팅 상단에 고정 배너

### #110 메시지 읽음 표시
- `src/components/ReadReceipt.tsx` (이미 존재) → 메시지 버블에 연결
- ✓ 전송됨, ✓✓ 읽음
- DB: `read_at` timestamp 컬럼 추가

## B11-3: 대화 관리 (6개)

### #119 대화 고정
- `is_pinned` boolean → 대화 목록 상단 고정
- 고정/해제 토글 UI

### #120 대화 아카이브
- `is_archived` boolean → 아카이브 탭 분리
- 아카이브/복원 토글

### #122 대화 통계
- `src/components/ConversationStats.tsx` (이미 존재) → 확장
- 총 메시지 수, 평균 메시지 길이, 대화 기간, 가장 활발한 시간대

### #123 대화 공유 링크
- `src/components/ConversationShare.tsx` (이미 존재) → 확장
- UUID 기반 공유 URL 생성

### #124 대화 태그
- 태그 입력 UI (칩 형태)
- DB: `tags` text[] 컬럼 추가
- 태그별 필터

### #125 대화 필터
- `src/components/ConversationFilter.tsx` (이미 존재) → 확장
- 날짜 범위 + 태그 + 키워드 복합 필터

## B11-4: AI 프로바이더 (6개)

### #140 스트리밍 토큰 사용량 표시
- `src/components/TokenUsageDisplay.tsx` (이미 존재) → 채팅에 연결
- 실시간 토큰 카운터 (입력/출력/총합)

### #141 모델 선택 UI
- `src/components/ModelSelector.tsx` (이미 존재) → 설정 또는 채팅에 연결
- 드롭다운: groq, openai, deepseek, anthropic, gemini

### #142 프로바이더별 속도/비용 표시
- 비교 테이블 컴포넌트
- 각 프로바이더 속도(ms), 비용(tokens/$) 표시

### #143 API 사용량 대시보드
- 일별/주별 토큰 사용 차트 (Recharts)
- DB: `gyeol_conversations.tokens_used` 집계 쿼리

### #144 커스텀 시스템 프롬프트
- `src/components/SystemPromptEditor.tsx` (이미 존재) → 설정에 연결
- 텍스트 에디어 + 저장 + 프리셋 리셋

### #145 토큰 제한 설정
- max_tokens 슬라이더 (256~4096)
- agent.settings에 max_tokens 저장

## B11-5: 검색 연동 (3개)

### #158 웹 검색
- Edge Function `supabase/functions/chat/index.ts` 에서 Perplexity API 호출
- 사용자가 "검색해줘" 또는 "/search" 입력 시 트리거
- 검색 결과를 AI 컨텍스트에 주입

### #159 이미지 검색  
- Perplexity 또는 별도 API 활용
- 검색 결과 이미지 그리드 표시

### #160 검색 결과 캐시
- `lib/gyeol/search-cache.ts` (이미 존재) → 활용
- 동일 쿼리 24시간 캐시

## B11-6: 음성 기능 (6개)

### #171 연속 음성 입력
- `src/components/ContinuousVoiceInput.tsx` (이미 존재) → 채팅에 연결
- `continuous: true`, `interimResults: true`

### #172 다국어 음성 인식
- `recognition.lang` 파라미터를 사용자 설정에서 가져옴
- 지원: ko-KR, en-US, ja-JP

### #174 커스텀 TTS 목소리
- `speechSynthesis.getVoices()` 목록 표시
- 선택한 voice를 agent.settings에 저장

### #175 TTS 음성 선택  
- #174와 통합, 드롭다운 UI

### #170 음성 웨이크워드 (부분)
- 브라우저 제한으로 완전 구현 불가
- "항상 듣기" 모드 토글만 구현 (배터리 경고 포함)

### #173 음성 감정 분석 (부분)
- 텍스트 기반 감정 분석으로 대체 (음성→텍스트→감정 추출)

## B11-7: 컨텍스트 & 메모리 (1개)

### #183 장기 메모리 압축
- Edge Function에서 LLM 호출 → 오래된 메모리 요약
- 요약된 메모리로 교체 (원본 아카이브)

---

# Phase C: B12 에이전트 심화 (34개)

> `docs/gyeol/IMPLEMENTATION_PLAN_REMAINING.md`의 B12 섹션 참조
> 이미 생성된 컴포넌트 활용: `AgentStatsDashboard`, `PersonalityChangeNotif`, `PersonalityRadar`, `PersonalityPresets`, `AgentComparison`, `MoodSelector`, `MoodStats`, `PersonaSystem`

### 핵심 구현 포인트:
1. **멀티 에이전트** (#194-200): 에이전트 리스트 UI, Zustand에 `activeAgentId` 추가, 전환/복제/초기화 API
2. **성격 시스템** (#217-225): 이미 생성된 컴포넌트들을 설정/프로필에 연결, 성격 잠금 토글, 프리셋 저장/로드
3. **친밀도** (#241-245): 레벨별 특수 대화 트리거, 이모지 매핑, 보너스 이벤트
4. **무드** (#263-265): MoodSelector를 채팅에 연결, 무드 변경 알림
5. **페르소나** (#278-285): PersonaSystem 확장, 프리셋 5종, 퀵 스위처

---

# Phase D: B13 진화 심화 (34개)

> `docs/gyeol/IMPLEMENTATION_PLAN_REMAINING.md`의 B13 섹션 참조
> 이미 생성된 컴포넌트 활용: `EvolutionCeremony`, `EvolutionProgress`, `EvolutionHistory`, `EvolutionGuide`, `MutationEffect`

### 핵심 구현 포인트:
1. **진화 엔진** (#298-304): Gen 6+ 확장, 퇴화 로직, 진화 카운트다운
2. **돌연변이** (#318-320): 히스토리 UI, 이벤트 한정 돌연변이, 합성
3. **비주얼 진화** (#327-335): CSS 기반 파티클, framer-motion 전환 애니메이션, 비주얼 프리셋
4. **진화 연출** (#342-350): 3단계 애니메이션(수축→폭발→확장), 사운드 이펙트(Web Audio API), 스크린샷 저장
5. **일일 이벤트** (#360-365): 이벤트 알림, 시즌 연동, 카운트다운

---

# Phase E: B14 게이미피케이션 심화 (70개)

> `docs/gyeol/IMPLEMENTATION_PLAN_REMAINING.md`의 B14 섹션 참조
> 이미 생성된 컴포넌트 활용: `DailyReward`, `SeasonPass`, `StreakBonus`, `StreakCalendar`, `QuestTimer`, `CoinHistory`, `InventoryPanel`, `ItemDetail`, `PurchaseConfirmModal`, `LeaderboardWidget`

### 핵심 구현 포인트:
1. **EXP & 레벨** (#377-385): 레벨별 특전, EXP 부스터, 히스토리, 일일 제한
2. **코인** (#391-400): 전송 API, 거래소 UI, 일일 보너스 강화, 통계 차트
3. **퀘스트** (#416-425): 자동 갱신(cron), 체인 퀘스트, 히든 퀘스트, 난이도 표시
4. **업적** (#443-450): 포인트 시스템, 3단계(Bronze/Silver/Gold), 프로필 배지
5. **리더보드** (#459-465): 카테고리별, 친구 필터, 히스토리
6. **상점** (#478-490): 미리보기 모달, 리뷰, 세일/할인, 위시리스트, 환불 API
7. **인벤토리** (#501-504): 버리기 API, 합성, 강화
8. **시즌/스트릭** (#513-524): 카운트다운, 보호 아이템, 알림

---

# Phase F: B15 소셜 심화 (60개)

> `docs/gyeol/IMPLEMENTATION_PLAN_REMAINING.md`의 B15 섹션 참조
> 이미 생성된 컴포넌트 활용: `AISpectator`, `AgentDM`, `AgentProfile`, `AgentShareCard`, `AgentComparison`, `CommunitySearch`, `CommunityVote`, `NewPostModal`, `ProfileTimeline`, `ProfileCustomizer`, `ReportBlockSystem`, `MatchingFilter`

### 핵심 구현 포인트:
1. **매칭** (#537-545): 알고리즘 개선(cosine similarity), 히스토리, 블록, 알림
2. **브리딩** (#563-565): 유전 미리보기, 히스토리 UI, 족보
3. **Moltbook** (#584-590): 공유, 신고, 검색, 미디어 첨부, 해시태그, 멘션
4. **커뮤니티** (#599-605): 필터, 이벤트, 그룹 CRUD, 랭킹
5. **AI 대화** (#608-615): 관전 모드, 주제 설정, 토론 모드
6. **에이전트 공유** (#618-625): 공유 링크, QR 코드, SNS 공유, 임베드
7. **프로필** (#630-645): 공개 프로필 페이지, SEO, 방문자 수, 댓글, 팔로워 수

---

# DB 마이그레이션 필요 사항

Phase B에서 필요한 컬럼 추가:
```sql
-- gyeol_conversations 테이블
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

# 공통 규칙 체크리스트 (모든 Phase에서 확인)

- [ ] 하드코딩 컬러 없음 (`text-white` → `text-foreground`)
- [ ] 한 화면에 CTA 3개 이하
- [ ] 카드 중첩 없음
- [ ] 글로우/그라디언트는 CTA/진화에만
- [ ] `.aurora-bg`는 홈(/)에만
- [ ] 삭제된 기능 없음 (숨기기/재배치만)
- [ ] 카드 패딩 `p-4`, 라운딩 `rounded-2xl`
- [ ] `npm run build` 에러 없음
- [ ] 기존 컴포넌트 파일 삭제 금지

---

# Devin 실행 커맨드

```
docs/gyeol/DEVIN_MASTER_INSTRUCTION.md를 읽고 Phase A부터 순서대로 실행해.

Phase A (UI 리디자인) → 빌드 확인 → 스크린샷
Phase B (B11 채팅 심화) → 빌드 확인 → 스크린샷  
Phase C (B12 에이전트 심화) → 빌드 확인 → 스크린샷
Phase D (B13 진화 심화) → 빌드 확인 → 스크린샷
Phase E (B14 게이미피케이션 심화) → 빌드 확인 → 스크린샷
Phase F (B15 소셜 심화) → 빌드 확인 → 스크린샷

각 Phase 내에서도 섹션별로 커밋.
기능은 절대 삭제하지 말 것. 숨기거나 재배치만.
이미 생성된 컴포넌트는 재작성하지 말고 import해서 연결만.
```
