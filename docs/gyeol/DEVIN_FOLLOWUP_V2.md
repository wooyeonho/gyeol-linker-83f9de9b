# DEVIN 후속 지시서 V2 — 미완성 항목 보완

**⚠️ 이 문서는 감사 후 발견된 미완성/미연결 항목만 다룹니다.**
**⚠️ 기존 완성된 컴포넌트를 재작성하지 마세요.**
**⚠️ 각 섹션 완료 후 `npm run build` 에러 없는지 확인.**

---

## 감사 결과 요약

### ✅ 완료 확인됨 (수정 불필요)
| 항목 | 상태 |
|------|------|
| ChatCore 컴포넌트 생성 | ✅ `src/components/ChatCore.tsx` 존재, Index.tsx에서 사용 |
| Index.tsx 채팅에 B11 기능 연결 | ✅ ChatCore를 통해 리액션, 답장, 파일첨부, 링크프리뷰, 읽음표시 모두 연결 |
| Index.tsx 입력바 고급 기능 | ✅ 파일첨부 버튼, 모델선택, 연속음성 입력 연결됨 |
| Index.tsx 대화 관리 | ✅ 햄버거 메뉴에 Conversations, Stats, Summaries, ConversationFilter 연결됨 |

### ⚠️ 미완성/보완 필요 항목

---

## 1. DB 마이그레이션 — gyeol_conversations 고급 컬럼 추가 (최우선)

**문제**: `gyeol_conversations` 테이블에 고급 채팅 기능용 컬럼이 없음. 프론트엔드에서 `reactions`, `is_pinned` 등을 업데이트하지만 실제 DB 컬럼이 존재하지 않아 에러 발생.

**실행할 SQL (Supabase SQL Editor에서 실행)**:
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

## 2. 하드코딩 컬러 수정 (25개 파일)

모든 하드코딩 컬러를 CSS 토큰/시맨틱 클래스로 교체해야 함.

### 교체 규칙

| Before | After |
|--------|-------|
| `text-slate-400` | `text-muted-foreground` |
| `text-slate-500` | `text-muted-foreground` |
| `text-white` | `text-foreground` |
| `text-white/XX` | `text-foreground/XX` |
| `bg-emerald-400` | `bg-[hsl(var(--success,142_71%_45%))]` |
| `bg-emerald-500` | `bg-[hsl(var(--success,142_71%_45%))]` |
| `bg-emerald-500/5` | `bg-[hsl(var(--success,142_71%_45%)/0.05)]` |
| `text-emerald-400` | `text-[hsl(var(--success,142_71%_45%))]` |
| `text-emerald-400/70` | `text-[hsl(var(--success,142_71%_45%)/0.7)]` |
| `bg-rose-400/60` | `bg-destructive/60` |

### 수정 대상 파일 목록

아래 파일들에서 `text-slate-`, `bg-emerald-`, `text-emerald-`, `bg-rose-`, `text-white` 를 검색하여 위 규칙대로 교체:

1. `src/views/Settings.tsx` — `text-slate-500`, `bg-emerald-400`
2. `src/views/Activity.tsx` — `text-slate-400`, `text-slate-500`, `bg-emerald-`
3. `src/views/SimpleChat.tsx` — `text-slate-500`
4. `src/components/InsightCard.tsx` — `bg-emerald-500/5`, `text-emerald-400/70`, `bg-emerald-400/60`, `bg-rose-400/60`
5. `src/components/ProfileCustomizer.tsx` — `bg-emerald-400`
6. 나머지 20개 파일도 동일한 규칙 적용

### 주의사항
- `text-white/[0.04]` 같은 매우 낮은 투명도는 `bg-foreground/[0.04]`로 교체
- `bg-white/[0.06]` 같은 배경은 `bg-foreground/[0.06]`로 교체
- 그라디언트 내부 `text-white`는 `text-primary-foreground`로 교체
- `text-white/40` 같은 UI 텍스트는 `text-foreground/40`으로 교체

### CSS 토큰 추가 (필요 시)

`app/globals.css`에 `--success` 토큰이 없으면 추가:
```css
:root {
  --success: 142 71% 45%;
}
.dark {
  --success: 142 71% 45%;
}
```

---

## 3. SimpleChat.tsx에서 ChatCore 사용 (선택적 리팩토링)

현재 SimpleChat.tsx는 독립적으로 메시지 렌더링을 하고 있음 (957줄). ChatCore를 사용하면 코드 중복을 줄일 수 있으나, SimpleChat만의 고유 기능(태그, 북마크, 번역, 인라인 편집, 요약, 날짜 그룹핑 등)이 많아 강제 리팩토링은 불필요.

**권장**: 현재 상태 유지. 추후 ChatCore에 기능을 점진적으로 추가하면서 통합.

---

## Devin 실행 커맨드

```
docs/gyeol/DEVIN_FOLLOWUP_V2.md를 읽고 순서대로 실행해.

1. #1 DB 마이그레이션 실행 (Supabase SQL Editor)
2. #2 하드코딩 컬러 수정 (25개 파일)
3. `npm run build` 에러 없는지 확인

기능은 절대 삭제하지 말 것.
기존 컴포넌트 재작성 금지 — 컬러 교체만.
```
