# GYEOL 최종 보완 지시서 V2 (DEVIN_FINAL_POLISH_V2.md)

> **원칙**: 기존 기능 삭제 금지. 각 Phase 완료 후 `npm run build` → 에러 없음 확인 → 커밋.

---

## 이전 지시서 완료 현황

| Phase | 상태 | 비고 |
|-------|------|------|
| Phase 1: DB 마이그레이션 | ❌ 미완료 | 8개 컬럼 아직 없음 |
| Phase 2-A: SimpleChat 분리 | ✅ 완료 | 265줄 |
| Phase 2-B: Settings 분리 | ❌ 미완료 | 599줄 (목표 300줄) |
| Phase 2-C: Social 분리 | ✅ 완료 | 110줄 |
| Phase 3: 하드코딩 컬러 | ⚠️ 부분 | 5개 파일 26건 잔존 |
| Phase 4-A: `as any` 제거 | ❌ 미완료 | 60개 파일 1,299건 |
| Phase 4-B: 접근성(a11y) | ⚠️ 부분 | 중복 aria-hidden 수정 완료, 나머지 미확인 |
| Phase 4-C: 성능 최적화 | ❌ 미확인 | React.memo 등 |
| Phase 5: UX 마무리 | ❌ 미확인 | 스켈레톤, 빈 상태 등 |

---

## Phase 1: DB 마이그레이션 (최우선)

`gyeol_conversations` 테이블에 아래 8개 컬럼 추가. Supabase SQL Editor에서 실행:

```sql
ALTER TABLE public.gyeol_conversations
  ADD COLUMN IF NOT EXISTS reactions jsonb DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS reply_to uuid DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS is_pinned boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS read_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS is_edited boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_archived boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS attachments jsonb DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_conversations_pinned ON public.gyeol_conversations (agent_id) WHERE is_pinned = true;
CREATE INDEX IF NOT EXISTS idx_conversations_archived ON public.gyeol_conversations (agent_id) WHERE is_archived = true;
CREATE INDEX IF NOT EXISTS idx_conversations_tags ON public.gyeol_conversations USING GIN(tags);
```

**검증**: `SELECT column_name FROM information_schema.columns WHERE table_name='gyeol_conversations';` 로 17개 컬럼 확인.

---

## Phase 2: Settings.tsx 분리 (599줄 → 300줄 이하)

현재 `src/views/Settings.tsx`가 599줄로 여전히 큼.

**분리 대상:**
1. `src/components/settings/PersonalitySection.tsx` — 성격 슬라이더 + 프리셋 (이미 존재하면 더 많은 로직 이동)
2. `src/components/settings/BYOKSection.tsx` — BYOK 키 관리
3. `src/components/settings/FeedKeywordSection.tsx` — RSS/키워드 관리
4. `src/components/settings/SafetySection.tsx` — Safety, Kill Switch
5. `src/components/settings/TelegramSection.tsx` — 텔레그램 연동
6. `src/components/settings/AnalysisDomainSection.tsx` — 분석 도메인 토글
7. `src/components/settings/ModeCharacterSection.tsx` — 모드/캐릭터 선택

**작업 방법:**
- 각 섹션의 UI + 상태를 새 파일로 이동
- `Settings.tsx`에서 import하여 조립
- 기존 props 구조: `{ agent, user, settings, updateSettings, ... }` 전달

---

## Phase 3: 잔존 하드코딩 컬러 교체 (5개 파일, 26건)

### 파일별 교체 목록:

**1. `src/components/AuthDeep.tsx` (1건)**
- `hover:bg-slate-500/10` → `hover:bg-muted/50`

**2. `src/components/AnimatedCharacter.tsx` (2건)**
- `bg-pink-300/30` → `bg-[hsl(var(--accent-pink)/0.3)]`

**3. `src/components/GamificationDeep.tsx` (1건)**
- `text-amber-600` → `text-[hsl(var(--warning))]`

**4. `src/hooks/useGamification.ts` (1건)**
- `bg-slate-400/10 border-slate-400/20` → `bg-muted/40 border-border/20`

**5. `src/views/Onboarding.tsx` (1건)**
- `placeholder:text-slate-600` → `placeholder:text-muted-foreground/60`

### CSS 변수 확인 (이미 추가됨 ✅):
- `--warning: 38 92% 50%`
- `--info: 199 89% 48%`
- `--success: 142 71% 45%`

### 아직 없는 CSS 변수 추가:
```css
/* app/globals.css의 :root 및 .dark에 추가 */
--accent-pink: 330 80% 70%;
```

### tailwind.config.ts에 추가 확인:
```ts
'accent-pink': 'hsl(var(--accent-pink))',
```

---

## Phase 4: `as any` 핵심 제거 (주요 파일만)

전체 1,299건 중 **주요 뷰 파일** 위주로 정리. 100% 제거 불필요, 타입 안전성 향상 목표.

### 4-A. `src/views/Index.tsx` (핵심)
```typescript
// Before:
const intimacy = (agent as any).intimacy ?? 0;
// After:
const intimacy = agent?.intimacy ?? 0;

// Before:
supabase.from('gyeol_conversations' as any)
// After:
supabase.from('gyeol_conversations')

// Before:
(data as any[]).reverse()
// After:
(data ?? []).reverse()
```

### 4-B. `src/views/MarketSkills.tsx`
- `supabase.from('gyeol_skills' as any)` → `supabase.from('gyeol_skills')`
- `supabase.from('gyeol_agent_skills' as any)` → `supabase.from('gyeol_agent_skills')`
- 모든 `as any` 결과값에 타입 단언 추가

### 4-C. `src/views/SimpleChat.tsx`
- `(agent as any)?.consecutive_days` → `agent?.consecutive_days`

### 4-D. `src/components/SeasonPass.tsx`
- `setSeason(s as any)` → 적절한 타입 사용

### 참고사항
- Supabase 타입 파일(`types.ts`)에 해당 테이블이 이미 정의되어 있으므로 `as any` 없이 `.from('table_name')` 직접 사용 가능
- 데이터 결과는 `data` 변수가 이미 타입 추론됨

---

## Phase 5: 성능 최적화

### 5-A. React.memo 적용
- `src/components/simple-chat/MessageBubble.tsx` → `React.memo(MessageBubble)`
- `src/components/social/PostCard.tsx` → `React.memo(PostCard)`
- `src/components/BottomNav.tsx` → `React.memo(BottomNav)`

### 5-B. useCallback 누락 확인
- `Index.tsx`의 `handleSend`, `handleSummarize` 등 리스트 렌더링 내부 함수에 `useCallback` 적용
- `Settings.tsx`의 `toggleSection`, `updateSettings` 등

### 5-C. 이미지 lazy loading
- 프로젝트 내 모든 `<img>` 태그에 `loading="lazy"` 확인 (이미 적용된 곳 스킵)

---

## Phase 6: UX 마무리

### 6-A. 로딩 스켈레톤 확인
- `src/components/skeletons/index.tsx` 존재 여부 확인
- Social 피드, Activity 로그, Gamification 퀘스트에 스켈레톤 적용 확인
- 미적용 시 글래스 카드 형태 스켈레톤 3~5개 추가

### 6-B. 빈 상태(Empty State) 일관성
- `src/components/social/EmptyState.tsx` 존재 여부 확인
- Activity, Gamification 퀘스트, 리더보드, 상점에 빈 상태 확인
- 모든 빈 리스트: 아이콘 + 설명 + CTA 버튼

### 6-C. 한/영 텍스트 통일
- 기본 영어로 통일 (i18n 훅 유지, 기본값 영어)
- 검색: 한국어 UI 텍스트가 직접 하드코딩된 곳 (`퀘스트`, `초보 동반자` 등)
- 교체: 영어 기본값으로 변경

---

## 체크리스트

- [ ] Phase 1: DB 8개 컬럼 추가
- [ ] Phase 2: Settings.tsx 분리 (599→300줄)
- [ ] Phase 3: 하드코딩 컬러 5개 파일 교체 + `--accent-pink` CSS 변수 추가
- [ ] Phase 4: 주요 파일 `as any` 정리 (Index, MarketSkills, SimpleChat, SeasonPass)
- [ ] Phase 5-A: React.memo 적용 (MessageBubble, PostCard, BottomNav)
- [ ] Phase 5-B: useCallback 누락 보완
- [ ] Phase 5-C: 이미지 lazy loading 확인
- [ ] Phase 6-A: 로딩 스켈레톤 확인/추가
- [ ] Phase 6-B: 빈 상태 일관성
- [ ] Phase 6-C: 한/영 텍스트 통일
- [ ] 최종 `npm run build` 에러 0

---

## Devin 실행 명령

```
docs/gyeol/DEVIN_FINAL_POLISH_V2.md를 읽고 Phase 1부터 순서대로 실행해.
기존 기능 삭제 금지. 리팩터링 시 기존 로직 100% 보존.
각 Phase 완료 후 npm run build → 에러 없는지 확인 → 커밋.
```
