# DEVIN 후속 지시서 — 미완성 항목 보완

**⚠️ 이 문서는 감사 후 발견된 미완성/미연결 항목만 다룹니다.**
**⚠️ 기존 완성된 컴포넌트를 재작성하지 마세요.**
**⚠️ 각 섹션 완료 후 `npm run build` 에러 없는지 확인.**

---

## 감사 결과 요약

### ✅ 완료 확인됨 (수정 불필요)
| Phase | 상태 | 비고 |
|-------|------|------|
| A: UI 리디자인 | ✅ | Index.tsx 풀스크린 채팅, 햄버거 메뉴, Social 3탭, Settings 그룹핑, CSS 토큰 |
| B: 채팅 심화 (SimpleChat) | ✅ | FileDropZone, LinkPreview, MessageReactions, MessageReply, ReadReceipt, ModelSelector, ConversationFilter, ContinuousVoiceInput 모두 SimpleChat.tsx에 연결됨 |
| C: 에이전트 심화 | ✅ | PersonalityPresets, PersonalityHistory, PersonaSystem, MoodSelector, IntimacySystem, AgentManager, AgentStatsDashboard 연결됨 |
| D: 진화 심화 | ✅ | EvolutionCeremony (3단계 애니메이션), EvolutionHistory, MutationEffect, EvolutionEngine 연결됨 |
| E: 게이미피케이션 | ✅ | SeasonPass, QuestTimer, DailyReward, StreakBonus, CoinHistory, InventoryPanel, LevelUpCeremony, InsightDashboard 연결됨 |
| F: 소셜 심화 | ✅ | AgentDM, AISpectator, AgentComparison, ProfileTimeline, CommunitySearch, BreedingCeremony, MatchingFilter, MatchingRecommendations 연결됨 |
| G: 마켓 + 설정 | ✅ | SkinEditor, MarketSearch, PurchaseConfirmModal, SkinPreviewCard, SafetyContentFilter, PIIFilter, CharacterEditor 연결됨 |
| H-I: 비주얼/보안/인증/온보딩/PWA | ✅ | AuthDeep (SocialLoginButtons, ProfilePictureUpload), OnboardingDeep (NameDuplicateCheck, PersonalitySliders), PWADeep (OfflineBanner), NavigationDeep (Breadcrumbs) 연결됨 |

### ⚠️ 미완성/보완 필요 항목

---

## 1. Index.tsx (Advanced 모드) 채팅에 B11 기능 연결

**문제**: SimpleChat.tsx에는 모든 B11 기능이 연결되어 있으나, Index.tsx (advanced 모드 홈 화면)의 채팅에는 기본 MessageBubble만 있음.

**작업**: Index.tsx의 채팅 영역에 아래 기능을 연결:

```tsx
// Index.tsx에 추가할 import
import { MessageReactions } from '@/src/components/MessageReactions';
import { ReplyPreview, ReplyBubble } from '@/src/components/MessageReply';
import { FileDropZone, FileAttachmentPreview } from '@/src/components/FileDropZone';
import { LinkPreview, extractUrls } from '@/src/components/LinkPreview';
import { ReadReceipt } from '@/src/components/ReadReceipt';
```

연결할 기능:
1. **MessageBubble에 리액션 버튼 추가** — 메시지 hover 시 이모지 리액션 표시
2. **답장 기능** — 스와이프 또는 롱프레스로 답장
3. **링크 미리보기** — 메시지 내 URL 감지 시 LinkPreview 렌더
4. **읽음 표시** — ReadReceipt 컴포넌트 연결
5. **파일 첨부** — FileDropZone으로 전체 채팅 영역 감싸기
6. **입력바에 파일 첨부 버튼 추가**

---

## 2. Index.tsx 입력바에 고급 기능 추가

현재 Index.tsx 입력바: 텍스트 입력 + 음성 버튼만 있음.

추가할 버튼/기능:
- 📎 파일 첨부 버튼 (FileDropZone 트리거)
- 🎙️ 연속 음성 입력 (ContinuousVoiceInput) — 이미 import됨, 연결만
- AI 모델 선택 인디케이터 (현재 사용 중인 모델 표시)

---

## 3. 대화 관리 기능 Index.tsx에 연결

SimpleChat.tsx에만 있는 대화 관리 기능을 Index.tsx에도 연결:
- **대화 목록** (ConversationList) — 햄버거 메뉴에 "Conversations" 항목 추가
- **대화 필터** (ConversationFilter) — 검색에 필터 옵션
- **대화 통계** (ConversationStats) — 햄버거 메뉴에 "Stats" 항목 추가
- **대화 요약** (SummaryHistory) — 메뉴에 "Summaries" 항목

---

## 4. SimpleChat ↔ Index 기능 통합 검토

현재 두 개의 채팅 뷰가 존재:
- `Index.tsx` (advanced 모드) — 기본 채팅
- `SimpleChat.tsx` (simple 모드) — 풀 기능 채팅

**옵션 A (권장)**: Index.tsx의 채팅 부분을 SimpleChat의 핵심 로직을 재사용하는 공통 `ChatCore` 컴포넌트로 추출
**옵션 B**: Index.tsx에 직접 기능 연결 (현재 방식 확장)

→ 옵션 A를 선택할 경우:
1. `src/components/ChatCore.tsx` 생성 — 메시지 렌더링, 입력, 리액션, 답장, 파일, 링크 프리뷰 포함
2. Index.tsx와 SimpleChat.tsx 모두 ChatCore를 사용
3. Index.tsx는 추가로 햄버거 메뉴, aurora-bg 등 유지
4. SimpleChat.tsx는 추가로 사이드바, 대화 관리 등 유지

---

## 5. DB 마이그레이션 확인

B11 마이그레이션 (reactions, reply_to, is_pinned, is_archived, is_edited, tags, attachments)이 실제 DB에 적용되었는지 확인.

확인 방법:
```sql
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'gyeol_conversations' 
AND column_name IN ('reactions', 'reply_to', 'is_pinned', 'is_archived', 'is_edited', 'tags', 'attachments');
```

적용 안 됐으면:
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

## 6. 하드코딩 컬러 수정

감사 중 발견된 하드코딩 컬러 (수정 필요):
- `Index.tsx` line 253: `bg-emerald-500` → `bg-[hsl(var(--success,142_71%_45%))]` 또는 CSS 토큰 추가
- `Settings.tsx` line 301: `text-slate-500` → `text-muted-foreground`
- `Settings.tsx` line 341: `text-slate-500` → `text-muted-foreground`

---

## Devin 실행 커맨드

```
docs/gyeol/DEVIN_FOLLOWUP_INSTRUCTION.md를 읽고 순서대로 실행해.

1. 먼저 #5 DB 마이그레이션 확인
2. #4 옵션 A로 ChatCore 컴포넌트 추출
3. #1, #2, #3 Index.tsx에 기능 연결
4. #6 하드코딩 컬러 수정
5. `npm run build` 에러 없는지 확인

기능은 절대 삭제하지 말 것.
기존 컴포넌트 재작성 금지 — import해서 연결만.
```
