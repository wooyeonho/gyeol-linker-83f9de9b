# GYEOL 최종 보완 지시서 (DEVIN_FINAL_POLISH.md)

> **원칙**: 기존 기능 삭제 금지. 컴포넌트 재작성 시 기존 로직 100% 보존. 각 Phase 완료 후 `npm run build` → 에러 없음 확인 → 커밋.

---

## Phase 1: DB 마이그레이션 (누락 컬럼 추가)

`gyeol_conversations` 테이블에 아래 8개 컬럼이 **아직 없음**. Supabase SQL Editor에서 실행:

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

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_conversations_pinned ON public.gyeol_conversations (agent_id) WHERE is_pinned = true;
CREATE INDEX IF NOT EXISTS idx_conversations_archived ON public.gyeol_conversations (agent_id) WHERE is_archived = true;
CREATE INDEX IF NOT EXISTS idx_conversations_tags ON public.gyeol_conversations USING GIN(tags);
```

**검증**: `SELECT column_name FROM information_schema.columns WHERE table_name='gyeol_conversations';` 로 17개 컬럼 확인.

---

## Phase 2: 거대 파일 분리 리팩터링

### 2-A. `SimpleChat.tsx` (957줄) → 분리

현재 `SimpleChat.tsx`에는 채팅 + 요약 + 번역 + 리액션 + 태그 + 편집 + 북마크 + 음성 + 필터 등이 모두 한 파일에 있음.

**분리 대상:**
1. `src/components/simple-chat/MessageBubble.tsx` — 개별 메시지 렌더링 (리액션, 번역, 편집, 태그, 북마크 포함)
2. `src/components/simple-chat/ChatToolbar.tsx` — 상단 도구바 (요약, 통계, 공유, 내보내기, 필터 버튼)
3. `src/components/simple-chat/ChatInputBar.tsx` — 하단 입력바 (이미지, 파일, 음성, 모델 선택)
4. `src/hooks/useSimpleChatState.ts` — 상태 로직 (bookmarks, pins, tags, reactions, translations 등)

**작업 방법:**
- 기존 `SimpleChat.tsx`에서 해당 코드 블록을 새 파일로 이동
- `SimpleChat.tsx`에서 import하여 조립
- 최종 `SimpleChat.tsx`는 200줄 이하 목표

### 2-B. `Settings.tsx` (1342줄) → 분리

**분리 대상:**
1. `src/components/settings/PersonalitySection.tsx` — 성격 슬라이더 + 프리셋
2. `src/components/settings/BYOKSection.tsx` — BYOK 키 관리
3. `src/components/settings/FeedKeywordSection.tsx` — RSS/키워드 관리
4. `src/components/settings/SafetySection.tsx` — Safety, Kill Switch
5. `src/components/settings/TelegramSection.tsx` — 텔레그램 연동
6. `src/components/settings/AnalysisDomainSection.tsx` — 분석 도메인 토글
7. `src/components/settings/ModeCharacterSection.tsx` — 모드/캐릭터 선택

**작업 방법:**
- 각 섹션 컴포넌트는 `agent`, `user`, 관련 state를 props로 받음
- `Settings.tsx`에서 import & 조립
- 최종 `Settings.tsx`는 300줄 이하 목표

### 2-C. `Social.tsx` (903줄) → 분리

**분리 대상:**
1. `src/components/social/FeedTab.tsx` — For You 피드 (Moltbook + Community)
2. `src/components/social/MatchingTab.tsx` — 매칭 카드 UI
3. `src/components/social/FriendsTab.tsx` — 팔로잉 피드
4. `src/components/social/PostCard.tsx` — 개별 게시물 카드
5. `src/hooks/useSocialFeed.ts` — 피드 데이터 로드/좋아요/댓글 로직

---

## Phase 3: 하드코딩 컬러 → CSS 토큰 교체

아래 매핑표를 참고하여 **37개 파일, ~600건**의 하드코딩 색상을 교체:

| 하드코딩 | 대체 |
|----------|------|
| `text-emerald-*`, `bg-emerald-*` | `text-[hsl(var(--success))]`, `bg-[hsl(var(--success)/0.1)]` |
| `text-red-*`, `bg-red-*` | `text-destructive`, `bg-destructive/10` |
| `text-amber-400` | `text-[hsl(40_95%_64%)]` 또는 CSS 변수 `--warning` 신규 추가 |
| `text-blue-400`, `bg-blue-*` | `text-secondary`, `bg-secondary/10` |
| `text-purple-400`, `bg-purple-*` | `text-primary`, `bg-primary/10` |
| `text-pink-*`, `bg-pink-*` | `text-[hsl(330_80%_70%)]` 또는 CSS 변수 `--accent-pink` 신규 추가 |
| `text-cyan-*`, `bg-cyan-*` | `text-accent`, `bg-accent/10` |
| `text-slate-*`, `bg-slate-*` | `text-muted-foreground`, `bg-muted` |
| `text-gray-*`, `bg-gray-*` | `text-muted-foreground`, `bg-muted` |
| `text-zinc-*`, `bg-zinc-*` | `text-muted-foreground`, `bg-muted` |

### 새 CSS 변수 추가 (globals.css의 `:root` 및 `.dark`):

```css
:root {
  --warning: 40 95% 64%;
  --accent-pink: 330 80% 70%;
  --info: 210 80% 60%;
}
.dark {
  --warning: 40 95% 64%;
  --accent-pink: 330 80% 70%;
  --info: 210 80% 60%;
}
```

### tailwind.config.ts에 추가:

```ts
warning: 'hsl(var(--warning))',
'accent-pink': 'hsl(var(--accent-pink))',
info: 'hsl(var(--info))',
success: 'hsl(var(--success))',
```

### 예외 (교체하지 않아도 되는 것):
- `text-amber-400` for 핀/북마크 아이콘 → `text-warning`으로 교체
- `AnimatedCharacter.tsx`의 `bg-pink-300/30` (볼터치) → `bg-[hsl(var(--accent-pink)/0.3)]`
- `BottomNav.tsx`의 `bg-red-500` (뱃지) → `bg-destructive`

**작업 순서**: 컴포넌트 파일 하나씩 열어서 교체. 한 파일 끝내면 다음 파일. `npm run build` 중간 체크.

---

## Phase 4: 코드 품질 개선

### 4-A. `as any` 제거
- `supabase.from('gyeol_conversations' as any)` → Supabase 타입 제네릭 사용 또는 최소한 타입 단언 정리
- 전체 프로젝트에서 `as any` 사용처 감소 (100% 제거는 불필요, 타입 안전성 높이기)

### 4-B. 접근성(a11y) 보완
- 모든 `<button>`에 `aria-label` 확인
- 모든 `<input>`에 `aria-label` 또는 `<label>` 확인  
- 모든 아이콘 전용 버튼에 `aria-hidden="true"` for 아이콘 + `aria-label` for 버튼
- `role="log"`, `role="main"`, `aria-live` 영역 확인

### 4-C. 성능 최적화
- `React.memo()` 적용: `MessageBubble`, `PostCard`, `BottomNav`
- `useCallback`/`useMemo` 누락 확인 (특히 리스트 렌더링 내부 함수)
- 이미지 lazy loading: `<img loading="lazy" />`

### 4-D. 에러 핸들링 통일
- 모든 `supabase` 호출에서 `error` 체크 추가 (현재 많은 곳에서 무시)
- 사용자에게 `showToast(error.message)` 피드백

---

## Phase 5: UX 마무리

### 5-A. 로딩 스켈레톤
- Social 피드: 글래스 카드 형태 스켈레톤 3개
- Activity 로그: 리스트 형태 스켈레톤 5개
- Gamification: 퀘스트 카드 스켈레톤

### 5-B. 빈 상태(Empty State) 일관성
- 모든 빈 리스트에 아이콘 + 설명 텍스트 + CTA 버튼
- Activity, Gamification 퀘스트, 리더보드, 상점에 빈 상태 확인

### 5-C. 검색 개선
- Social 검색 → 실시간 debounce (300ms)
- Chat 검색 → 하이라이트 매칭 텍스트

### 5-D. 한/영 UI 텍스트 통일
- 현재 일부 한국어(`퀘스트`), 일부 영어(`Settings`) 혼재
- **기본 영어로 통일** (i18n 훅은 유지하되 기본값 영어)

---

## 체크리스트

- [ ] Phase 1: DB 8개 컬럼 추가
- [ ] Phase 2-A: SimpleChat.tsx 분리 (957→200줄)
- [ ] Phase 2-B: Settings.tsx 분리 (1342→300줄)
- [ ] Phase 2-C: Social.tsx 분리 (903→250줄)
- [ ] Phase 3: 하드코딩 컬러 37개 파일 교체
- [ ] Phase 4-A: `as any` 주요 제거
- [ ] Phase 4-B: 접근성 보완
- [ ] Phase 4-C: 성능 최적화 (memo, useCallback)
- [ ] Phase 4-D: 에러 핸들링 통일
- [ ] Phase 5-A: 로딩 스켈레톤
- [ ] Phase 5-B: 빈 상태 일관성
- [ ] Phase 5-C: 검색 개선
- [ ] Phase 5-D: 한/영 텍스트 통일
- [ ] 최종 `npm run build` 에러 0

---

## Devin 실행 명령

```
docs/gyeol/DEVIN_FINAL_POLISH.md를 읽고 Phase 1부터 순서대로 실행해.
기존 기능 삭제 금지. 리팩터링 시 기존 로직 100% 보존.
각 Phase 완료 후 npm run build → 에러 없는지 확인 → 커밋.
```
