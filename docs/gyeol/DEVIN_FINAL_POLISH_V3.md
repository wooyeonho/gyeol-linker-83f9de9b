# GYEOL 최종 보완 지시서 V3 (DEVIN_FINAL_POLISH_V3.md)

> **원칙**: 기존 기능 삭제 금지. 각 Phase 완료 후 `npm run build` → 에러 없음 확인 → 커밋.
> V2 지시서에서 **실제로 안 된 것**만 모아 재정리.

---

## 이전 지시서 실제 완료 현황 (V2 검증 결과)

| 항목 | 상태 | 상세 |
|------|------|------|
| DB 8개 컬럼 추가 | ❌ 미완료 | `gyeol_conversations`에 9개 컬럼만 존재 (id, agent_id, role, content, channel, provider, tokens_used, response_time_ms, created_at) |
| Settings.tsx 분리 | ⚠️ 부분완료 | 7개 섹션 컴포넌트 추출했으나 **여전히 599줄** — 더 이동 필요 |
| 하드코딩 컬러 교체 | ⚠️ 부분완료 | 8개 파일 46건 잔존. `--accent-pink` CSS 변수 미추가 |
| `as any` 제거 | ❌ 미완료 | src/views 8파일 266건, src/components 40파일 611건 = **총 877건** |
| React.memo | ❌ 미완료 | 0건 적용 (SocialEmptyState 제외) |
| 한국어 하드코딩 | ❌ 미완료 | 26개 파일 227건 한국어 UI 텍스트 잔존 |

---

## Phase 1: DB 마이그레이션 (최우선)

Supabase SQL Editor에서 아래 실행:

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

**검증**: 
```sql
SELECT column_name FROM information_schema.columns WHERE table_name='gyeol_conversations';
```
→ 17개 컬럼이어야 함.

---

## Phase 2: 하드코딩 컬러 교체 (8개 파일 46건)

### 2-A. CSS 변수 추가

`app/globals.css`의 `:root`와 `.dark` 블록에 추가:
```css
--accent-pink: 330 80% 70%;
```

`tailwind.config.ts`의 `colors`에 추가:
```ts
'accent-pink': 'hsl(var(--accent-pink))',
```

### 2-B. 파일별 교체 목록

| 파일 | 변경 전 | 변경 후 |
|------|---------|---------|
| `src/components/AnimatedCharacter.tsx` | `bg-pink-300/30` (2건) | `bg-accent-pink/30` |
| `src/components/AuthDeep.tsx` | `hover:bg-slate-500/10` | `hover:bg-muted/50` |
| `src/components/GamificationDeep.tsx` | `text-amber-600` | `text-warning` |
| `src/components/ErrorUX.tsx` | `bg-green-500/20 border-green-500/30 text-green-400` | `bg-success/20 border-success/30 text-success` |
| `src/components/ErrorUX.tsx` | `bg-yellow-500/90` | `bg-warning/90` |
| `src/components/MemoryDashboard.tsx` | `bg-green-500/20 text-green-400` | `bg-success/20 text-success` |
| `src/components/EvolutionProgress.tsx` | `text-green-400` | `text-success` |
| `src/hooks/useGamification.ts` | `bg-slate-400/10 border-slate-400/20` | `bg-muted/40 border-border/20` |
| `src/views/Onboarding.tsx` | `placeholder:text-slate-600` | `placeholder:text-muted-foreground/60` |

---

## Phase 3: `as any` 핵심 정리 (주요 뷰 파일만)

전체 877건 중 **뷰 파일과 스토어** 위주로 정리. 목표: 주요 파일에서 `as any` 50% 이상 감소.

### 3-A. Supabase `.from()` 호출 (모든 파일 공통)

이미 `types.ts`에 정의된 테이블:
- `gyeol_agents`, `gyeol_conversations`, `gyeol_achievements`, `gyeol_achievement_unlocks`
- `gyeol_agent_skills`, `gyeol_agent_skins`, `gyeol_skills`, `gyeol_skins`
- `gyeol_gamification_profiles`, `gyeol_quest_progress`, `gyeol_quests`
- `gyeol_seasons`, `gyeol_season_progress`, `gyeol_system_state`
- `gyeol_community_activities`, `gyeol_community_replies`
- `gyeol_moltbook_posts`, `gyeol_moltbook_likes`, `gyeol_moltbook_comments`
- `gyeol_follows`, `gyeol_matches`, `gyeol_byok_keys`
- `gyeol_telegram_links`, `gyeol_taste_vectors`, `gyeol_leaderboard`
- `gyeol_autonomous_logs`, `gyeol_reflections`, `gyeol_learned_topics`
- `gyeol_push_subscriptions`, `gyeol_proactive_messages`
- `gyeol_inventory`, `gyeol_shop_items`, `gyeol_currency_logs`
- `gyeol_user_feeds`, `gyeol_conversation_insights`
- `gyeol_breeding_logs`, `gyeol_agent_dms`

위 테이블은 `supabase.from('table_name' as any)` → `supabase.from('table_name')` 으로 교체 가능.

**types.ts에 없는 테이블** (as any 유지):
- `gyeol_user_keywords`, `gyeol_feedback` — 이 둘만 `as any` 유지.

### 3-B. 주요 파일별 정리

**`src/views/Index.tsx`:**
```ts
// Before:
const intimacy = (agent as any).intimacy ?? 0;
// After (agent 타입에 intimacy 있음):
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

**`src/views/Settings.tsx`:**
```ts
// agent.settings 접근:
// Before: (agent as any).settings
// After: agent?.settings (이미 Json 타입)

// Before: (agent as any).consecutive_days
// After: agent?.consecutive_days (타입에 있음)

// supabase.from() 호출에서 as any 모두 제거 (위 목록 참조)
```

**`src/views/MarketSkills.tsx`:**
- `supabase.from('gyeol_skills' as any)` → `supabase.from('gyeol_skills')`
- `supabase.from('gyeol_agent_skills' as any)` → `supabase.from('gyeol_agent_skills')`
- `(data as any[])` → 타입 추론 활용

**`src/views/SimpleChat.tsx`:**
- `(agent as any)?.consecutive_days` → `agent?.consecutive_days`

**`src/components/SeasonPass.tsx`:**
- `setSeason(s as any)` → 타입 명시 `setSeason(s as Season)`
- `setProgress(p as any)` → `setProgress(p as SeasonProgress)`
- `.update({ ... } as any)` → `.update({ ... })`

**`store/gyeol-store.ts`:**
- `set({ agent: row as any })` → 적절한 타입 캐스팅
- `(ach as any).name` → 타입 추론 활용

### 3-C. 공통 패턴 일괄 교체

모든 파일에서:
1. `supabase.from('정의된_테이블' as any)` → `supabase.from('정의된_테이블')` (types.ts에 있는 것만)
2. `.update({ ... } as any)` → `.update({ ... })` (타입에 맞으면)
3. `.insert({ ... } as any)` → `.insert({ ... })` (타입에 맞으면)

---

## Phase 4: React.memo 적용

현재 **0건** 적용됨. 아래 3개 우선:

```tsx
// src/components/simple-chat/MessageBubble.tsx
export const MessageBubble = React.memo(MessageBubbleInternal);

// src/components/social/PostCard.tsx  
export const PostCard = React.memo(PostCardInternal);

// src/components/BottomNav.tsx
export const BottomNav = React.memo(BottomNavInternal);
```

방법:
1. 기존 `export function Component` → `function ComponentInternal`
2. 하단에 `export const Component = memo(ComponentInternal);`
3. 상단에 `import { memo } from 'react';` 추가

---

## Phase 5: 한국어 하드코딩 → 영어 기본값

26개 파일 227건. **주요 파일만** 우선 처리:

### 5-A. `src/components/SeasonPass.tsx`
| 한국어 | 영어 |
|--------|------|
| `시즌 패스` | `Season Pass` |
| `시즌 EXP` | `Season EXP` |
| `일 남음` | `days left` |
| `현재 활성 시즌이 없습니다` | `No active season` |
| `Next 시즌을 기대해주세요!` | `Stay tuned for the next season!` |
| `보상 자동 지급!` | `Auto-claimed!` |
| `보상 수령 Done!` | `Reward claimed!` |
| `수령` | `Claim` |

### 5-B. `src/components/EvolutionProgress.tsx`
| 한국어 | 영어 |
|--------|------|
| `기본 대화` | `Basic conversation` |
| `사용자 기억` | `User memory` |
| `선제적 메시지` | `Proactive messages` |
| `감정 인식` | `Emotion recognition` |
| `현재 Gen X 능력` | `Current Gen X abilities` |

### 5-C. `src/components/OnboardingTutorial.tsx`
| 한국어 | 영어 |
|--------|------|
| `대화하기` | `Chat` |
| `입력하세요. AI가...학습합니다` | `Type a message. Your AI learns...` |
| `다국어를 지원해요!` | `Supports multiple languages!` |
| `연속 접속` | `Login Streak` |
| `매일 접속하면...보상이 커집니다` | `Log in daily for streak bonuses...` |
| `수령하세요` | `claim your reward` |

### 5-D. `src/views/Gamification.tsx`
| 한국어 | 영어 |
|--------|------|
| `랭킹` | `Ranking` |
| `시즌` | `Season` |
| `일일` | `Daily` |
| `주간` | `Weekly` |
| `튜토리얼` | `Tutorial` |

### 5-E. `src/views/Terms.tsx`, `src/views/Privacy.tsx`
- 전체 한국어 → 영어 번역 (법률 문서)
- 또는 i18n 훅 활용하여 `t('terms.title')` 등으로 교체

### 5-F. `src/components/ErrorUX.tsx`
| 한국어 | 영어 |
|--------|------|
| `Offline 상태입니다` | `You are offline` |
| `Previous 대화 읽기만 가능합니다` | `Only cached conversations available` |

### 5-G. 기타 파일 (나머지 20개 파일)
- `MemoryDashboard.tsx`: `Confirm됨`, `신뢰도`, `추정` → `Confirmed`, `Confidence`, `Estimated`
- `NotificationPanel.tsx`: `학습`, `성찰`, `선제 메시지` → `Learning`, `Reflection`, `Proactive`
- `GamificationDeep.tsx`: 모든 한국어 라벨 → 영어
- 기타 파일도 동일 패턴으로 교체

---

## Phase 6: Settings.tsx 추가 분리 (599줄 → 350줄 이하)

현재 이미 7개 섹션 컴포넌트가 추출되었으나 **메인 파일에 로직이 남아있음**.

### 추출할 로직:
1. **상태 초기화 + useEffect 묶음** → `src/hooks/useSettingsState.ts` 커스텀 훅으로 이동
   - `useState` 약 40개 → 훅으로 묶기
   - `useEffect` 3개 (agent 로드, BYOK 로드, kill switch 로드) → 훅 내부로
   - `savePersonality`, `addFeed`, `removeFeed`, `addKeyword`, `removeKeyword`, `toggleKillSwitch` → 훅 내부로

2. **Profile Card 섹션** → `src/components/settings/ProfileCard.tsx`
3. **Appearance 섹션** (테마 토글 + 커스텀 색상) → `src/components/settings/AppearanceSection.tsx`
4. **Notifications 섹션** → `src/components/settings/NotificationsSection.tsx`
5. **Account & Data 섹션** (로그아웃, 삭제, 내보내기, 피드백, 추천 코드) → `src/components/settings/AccountSection.tsx`

목표: `Settings.tsx`는 import + 조립만 하는 **300줄 이하** 파일.

---

## Phase 7: 이미지 lazy loading 확인

프로젝트 내 모든 `<img>` 태그에 `loading="lazy"` 추가:
```bash
# 확인 방법:
grep -r '<img' src/ --include="*.tsx" | grep -v 'loading='
```
누락된 곳에 `loading="lazy"` 추가.

---

## 체크리스트

- [ ] Phase 1: DB 8개 컬럼 추가 → 검증 SQL 실행
- [ ] Phase 2-A: `--accent-pink` CSS 변수 + tailwind 추가
- [ ] Phase 2-B: 8개 파일 46건 하드코딩 컬러 교체
- [ ] Phase 3-A: `supabase.from()` as any 일괄 제거 (types.ts에 있는 테이블)
- [ ] Phase 3-B: 주요 뷰 파일 as any 정리 (Index, Settings, MarketSkills, SimpleChat, SeasonPass)
- [ ] Phase 3-C: store/gyeol-store.ts as any 정리
- [ ] Phase 4: React.memo 3개 (MessageBubble, PostCard, BottomNav)
- [ ] Phase 5: 주요 파일 한국어 → 영어 (SeasonPass, EvolutionProgress, OnboardingTutorial, Gamification, ErrorUX 등)
- [ ] Phase 6: Settings.tsx → useSettingsState 훅 + 섹션 분리 (350줄 이하)
- [ ] Phase 7: `<img>` lazy loading 확인
- [ ] 최종 `npm run build` 에러 0

---

## Devin 실행 명령

```
docs/gyeol/DEVIN_FINAL_POLISH_V3.md를 읽고 Phase 1부터 순서대로 실행해.
기존 기능 삭제 금지. 리팩터링 시 기존 로직 100% 보존.
각 Phase 완료 후 npm run build → 에러 없는지 확인 → 커밋.
Phase 3의 as any 제거 시 types.ts에 정의된 테이블만 as any 제거.
정의 안 된 테이블(gyeol_user_keywords, gyeol_feedback 등)은 as any 유지.
```
