# GYEOL 최종 보완 지시서 V4 (DEVIN_FINAL_POLISH_V4.md)

> **원칙**: 기존 기능 삭제 금지. 각 Phase 완료 후 `npm run build` → 에러 없음 확인 → 커밋.
> V3 지시서에서 **실제로 안 된 것**만 모아 재정리. V1~V3에서 중복되던 항목 통합.

---

## V3 실제 완료 현황 (검증 결과)

| 항목 | 상태 | 상세 |
|------|------|------|
| DB 8개 컬럼 추가 | ❌ 미완료 | `gyeol_conversations`에 여전히 9개 컬럼만 존재 |
| `--accent-pink` CSS 변수 | ✅ 완료 | `app/globals.css` + `tailwind.config.ts` 모두 추가됨 |
| 하드코딩 컬러 교체 | ✅ 완료 | Phase 2-B 8개 파일 46건 모두 교체됨 |
| `as any` 제거 | ❌ 미완료 | 53개 파일 781건 잔존 |
| React.memo | ❌ 미완료 | 0건 적용 |
| 한국어 하드코딩 | ❌ 미완료 | 82개 파일 1861건 한국어 텍스트 잔존 |
| Settings.tsx 분리 | ✅ 완료 | 241줄로 성공적으로 분리됨 |
| 이미지 lazy loading | 미확인 | 별도 확인 필요 |

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

## Phase 2: `as any` 핵심 정리 (781건 → 400건 이하 목표)

### 2-A. `supabase.from('테이블' as any)` 일괄 제거

**types.ts에 정의된 테이블** (as any 제거 가능):
`gyeol_agents`, `gyeol_conversations`, `gyeol_achievements`, `gyeol_achievement_unlocks`,
`gyeol_agent_skills`, `gyeol_agent_skins`, `gyeol_skills`, `gyeol_skins`,
`gyeol_gamification_profiles`, `gyeol_quest_progress`, `gyeol_quests`,
`gyeol_seasons`, `gyeol_season_progress`, `gyeol_system_state`,
`gyeol_community_activities`, `gyeol_community_replies`,
`gyeol_moltbook_posts`, `gyeol_moltbook_likes`, `gyeol_moltbook_comments`,
`gyeol_follows`, `gyeol_matches`, `gyeol_byok_keys`,
`gyeol_telegram_links`, `gyeol_taste_vectors`, `gyeol_leaderboard`,
`gyeol_autonomous_logs`, `gyeol_reflections`, `gyeol_learned_topics`,
`gyeol_push_subscriptions`, `gyeol_proactive_messages`,
`gyeol_inventory`, `gyeol_shop_items`, `gyeol_currency_logs`,
`gyeol_breeding_logs`, `gyeol_agent_dms`, `gyeol_conversation_insights`

**types.ts에 없는 테이블** (as any 유지):
`gyeol_user_keywords`, `gyeol_feedback`, `gyeol_referrals`, `gyeol_evolution_logs`, `gyeol_mutations`, `gyeol_daily_events`, `gyeol_user_feeds`, `gyeol_user_memories`

### 2-B. `agent.settings` 접근 패턴

`settings`는 `Json` 타입이므로 안전한 접근 유틸 만들기:

```ts
// src/utils/agent-settings.ts
import type { Json } from '@/src/integrations/supabase/types';

type AgentSettings = {
  mode?: string;
  persona?: string;
  customSystemPrompt?: string;
  customThemeColor?: string;
  profilePicture?: string;
  readSpeed?: number;
  referral_code?: string;
  evolution_threshold?: number;
  auto_tts?: boolean;
  tts_speed?: number;
  [key: string]: unknown;
};

export function parseSettings(settings: Json): AgentSettings {
  if (typeof settings === 'object' && settings !== null && !Array.isArray(settings)) {
    return settings as unknown as AgentSettings;
  }
  return {};
}
```

그 후 모든 파일에서:
```ts
// Before:
const s = (agent?.settings as any) ?? {};
// After:
import { parseSettings } from '@/src/utils/agent-settings';
const s = parseSettings(agent?.settings ?? {});
```

### 2-C. `.update({ ... } as any)` / `.insert({ ... } as any)` 제거

타입에 맞는 필드만 전달하면 as any 불필요:
```ts
// Before:
await supabase.from('gyeol_agents').update({ settings: { ...s, mode: 'simple' } } as any).eq('id', id);
// After:
await supabase.from('gyeol_agents').update({ settings: { ...s, mode: 'simple' } }).eq('id', id);
```

### 2-D. `'postgres_changes' as any` 제거

```ts
// Before:
.on('postgres_changes' as any, { event: 'INSERT', ... }, ...)
// After:
.on('postgres_changes', { event: 'INSERT', ... }, ...)
```

---

## Phase 3: React.memo 적용 (3개)

```tsx
// src/components/simple-chat/MessageBubble.tsx
// 1. import { memo } from 'react';
// 2. 기존: export function MessageBubble(...) { ... }
// 변경: function MessageBubbleInternal(...) { ... }
//       export const MessageBubble = memo(MessageBubbleInternal);

// src/components/social/PostCard.tsx — 동일 패턴
// src/components/BottomNav.tsx — 동일 패턴
```

---

## Phase 4: 한국어 → 영어 (우선 파일 20개)

### 4-A. 핵심 UI 컴포넌트 (우선순위 높음)

| 파일 | 주요 한국어 예시 → 영어 |
|------|------------------------|
| `DeleteAccountModal.tsx` | `모든 대화 기록이 영구 Delete됩니다` → `All conversations will be permanently deleted` |
| `DeleteAccountModal.tsx` | `Delete합니다` → `DELETE` |
| `DeleteAccountModal.tsx` | `계속` → `Continue`, `뒤로` → `Back` |
| `DeleteAccountModal.tsx` | `최종 Confirm` → `Final Confirmation` |
| `BreedingResult.tsx` | `사용자 이름: 연호` → `Username: Yeonho` (mock data) |
| `InventoryPanel.tsx` | `최신순` → `Latest` |
| `OnboardingTutorial.tsx` | `대화하기` → `Chat`, `연속 접속` → `Login Streak` |
| `SeasonPass.tsx` | `시즌 패스` → `Season Pass`, `시즌 EXP` → `Season EXP` |
| `EvolutionProgress.tsx` | `기본 대화` → `Basic conversation` |
| `NotificationPanel.tsx` | `학습` → `Learning`, `성찰` → `Reflection` |
| `MemoryDashboard.tsx` | `Confirm됨` → `Confirmed`, `추정` → `Estimated` |
| `ErrorUX.tsx` | `Offline 상태입니다` → `You are offline` |
| `GamificationDeep.tsx` | 모든 한국어 라벨 → 영어 |
| `PersonalityHistory.tsx` | `아직 Personality 변화 데이터가 없어요` → `No personality change data yet` |

### 4-B. 뷰 파일

| 파일 | 주요 변경 |
|------|---------|
| `Gamification.tsx` | `랭킹` → `Ranking`, `시즌` → `Season`, `일일` → `Daily`, `주간` → `Weekly` |
| `Terms.tsx` | 전체 한국어 법률 문서 → 영어 |
| `Privacy.tsx` | 전체 한국어 개인정보처리방침 → 영어 |

### 4-C. 주석은 그대로 유지
- TSDoc 주석의 한국어는 유지해도 됨 (사용자에게 보이지 않음)
- **UI에 렌더링되는 텍스트만** 영어로 교체

---

## Phase 5: 이미지 lazy loading

```bash
# 누락 확인:
grep -rn '<img' src/ --include="*.tsx" | grep -v 'loading='
```
누락된 모든 `<img>` 태그에 `loading="lazy"` 추가.

---

## Phase 6: 추가 품질 개선

### 6-A. `(data ?? []) ?? []` 이중 nullish 제거
이미 대부분 수정했으나, 추가 잔존 확인:
```bash
grep -rn '?? \[\]) ?? \[\]' src/ --include="*.tsx" --include="*.ts"
```

### 6-B. Supabase Realtime 타입 수정
```ts
// 모든 파일에서:
.on('postgres_changes' as any, ...)
// → 
.on('postgres_changes', ...)
```

---

## 체크리스트

- [ ] Phase 1: DB 8개 컬럼 추가 → 검증 SQL 실행
- [ ] Phase 2-A: `supabase.from()` as any 일괄 제거
- [ ] Phase 2-B: `agent-settings.ts` 유틸 생성 + 적용
- [ ] Phase 2-C: `.update()` / `.insert()` as any 제거
- [ ] Phase 2-D: `'postgres_changes' as any` 제거
- [ ] Phase 3: React.memo 3개 (MessageBubble, PostCard, BottomNav)
- [ ] Phase 4-A: 핵심 UI 컴포넌트 한국어 → 영어 (14개 파일)
- [ ] Phase 4-B: 뷰 파일 한국어 → 영어 (Terms, Privacy, Gamification)
- [ ] Phase 5: `<img>` lazy loading 확인
- [ ] Phase 6-A: 이중 nullish 제거
- [ ] Phase 6-B: Realtime 타입 수정
- [ ] 최종 `npm run build` 에러 0

---

## Devin 실행 명령

```
docs/gyeol/DEVIN_FINAL_POLISH_V4.md를 읽고 Phase 1부터 순서대로 실행해.
기존 기능 삭제 금지. 리팩터링 시 기존 로직 100% 보존.
각 Phase 완료 후 npm run build → 에러 없는지 확인 → 커밋.
Phase 2의 as any 제거 시 types.ts에 정의된 테이블만 as any 제거.
정의 안 된 테이블(gyeol_referrals, gyeol_evolution_logs, gyeol_mutations, gyeol_daily_events, gyeol_user_feeds, gyeol_user_memories 등)은 as any 유지.
Phase 2-B에서 agent-settings.ts 유틸을 먼저 만들고, 모든 (agent?.settings as any) 패턴을 교체해.
Phase 4에서 TSDoc 주석의 한국어는 유지. UI 렌더링 텍스트만 영어로 교체.
```
