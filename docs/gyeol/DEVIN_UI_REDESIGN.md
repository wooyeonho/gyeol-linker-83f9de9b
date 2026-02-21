# GYEOL UI 리디자인 — Devin 실행 명세서

**⚠️ 이 문서는 가이드가 아닌 "실행 명세서"입니다. 각 파일의 정확한 변경 내용을 포함합니다.**
**⚠️ 기능 삭제 금지 — 숨기거나 재배치만 합니다.**
**⚠️ 모든 색상은 Tailwind semantic token (`text-foreground`, `bg-primary`, `text-muted-foreground` 등) 사용. 절대로 하드코딩 컬러 금지.**

---

## 실행 순서: 1 → 2 → 3 → 4 (각 단계 완료 후 스크린샷 확인)

---

## 1단계: 홈(채팅) 풀스크린화 — `src/views/Index.tsx`

### 현재 문제
- `chatExpanded === false`일 때 캐릭터 비주얼 + Growth Status + Streak + Evolution Guide + GamificationWidget + PersonalityRadar + MoodHistory + MoodStats + DataVisualization + LeaderboardWidget 등이 전부 표시됨 (약 200줄 분량)
- 채팅 영역이 화면의 절반도 안 됨
- 상단바에 GenBadge, Search, Notification, Export, Evolution 버튼이 5개나 있음

### 변경사항 A: 상단바 간소화 (라인 266~307)

**변경 전 (현재):**
```tsx
<div className="relative z-20 flex items-center justify-between px-5 pt-safe pb-2" ...>
  <div className="flex items-center gap-3">
    {/* 에이전트 아이콘 + 이름 + Online */}
  </div>
  <div className="flex items-center gap-2">
    {/* persona 뱃지 */}
    {/* GenBadge (glass-card) */}
    {/* Search 버튼 */}
    {/* Notification 버튼 */}
    {/* Export 버튼 */}
    {/* Evolution 버튼 */}
  </div>
</div>
```

**변경 후:**
```tsx
<div className="relative z-20 flex items-center justify-between px-5 pt-safe pb-2" style={{ paddingTop: 'max(env(safe-area-inset-top), 12px)' }}>
  <div className="flex items-center gap-3">
    {/* 에이전트 아이콘 + 이름 — 기존 유지 */}
    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary p-[1px] shadow-lg shadow-primary/20">
      <div className="w-full h-full rounded-[7px] bg-background flex items-center justify-center">
        <span className="material-icons-round text-transparent bg-clip-text bg-gradient-to-br from-primary to-secondary text-sm">smart_toy</span>
      </div>
    </div>
    <div>
      <span className="text-sm font-bold text-foreground tracking-tight">{agentName}</span>
      <div className="flex items-center gap-1.5 mt-0.5">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(52,211,153,0.6)]" />
        <span className="text-[10px] text-muted-foreground">Online</span>
        <span className="text-[10px] text-muted-foreground/50 ml-1">Gen {agent?.gen ?? 1}</span>
      </div>
    </div>
  </div>
  {/* 우측: 햄버거 메뉴 1개만 */}
  <button type="button" onClick={() => setMenuOpen(!menuOpen)}
    className="w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground transition"
    aria-label="Menu">
    <span className="material-icons-round text-[20px]">menu</span>
  </button>
</div>
```

**추가할 state:** `const [menuOpen, setMenuOpen] = useState(false);`

**추가할 메뉴 패널 (상단바 아래에 AnimatePresence로):**
```tsx
<AnimatePresence>
  {menuOpen && (
    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
      className="absolute right-4 top-16 z-50 glass-card rounded-2xl p-2 min-w-[180px] shadow-xl border border-border/30">
      <button onClick={() => { setSearchOpen(!searchOpen); setMenuOpen(false); }}
        className="w-full px-4 py-2.5 text-left text-sm text-foreground hover:bg-secondary/50 rounded-xl flex items-center gap-3">
        <span className="material-icons-round text-muted-foreground text-[18px]">search</span> Search
      </button>
      <button onClick={() => { setNotifOpen(true); setMenuOpen(false); }}
        className="w-full px-4 py-2.5 text-left text-sm text-foreground hover:bg-secondary/50 rounded-xl flex items-center gap-3">
        <span className="material-icons-round text-muted-foreground text-[18px]">notifications</span> Notifications
      </button>
      <button onClick={() => { setMemoryOpen(true); setMenuOpen(false); }}
        className="w-full px-4 py-2.5 text-left text-sm text-foreground hover:bg-secondary/50 rounded-xl flex items-center gap-3">
        <span className="material-icons-round text-muted-foreground text-[18px]">psychology</span> Memory
      </button>
      <button onClick={() => { setExportOpen(true); setMenuOpen(false); }}
        className="w-full px-4 py-2.5 text-left text-sm text-foreground hover:bg-secondary/50 rounded-xl flex items-center gap-3">
        <span className="material-icons-round text-muted-foreground text-[18px]">download</span> Export
      </button>
      <button onClick={() => { setEvoOpen(true); setMenuOpen(false); }}
        className="w-full px-4 py-2.5 text-left text-sm text-foreground hover:bg-secondary/50 rounded-xl flex items-center gap-3">
        <span className="material-icons-round text-muted-foreground text-[18px]">trending_up</span> Evolution
      </button>
      <button onClick={() => { setProfileOpen(true); setMenuOpen(false); }}
        className="w-full px-4 py-2.5 text-left text-sm text-foreground hover:bg-secondary/50 rounded-xl flex items-center gap-3">
        <span className="material-icons-round text-muted-foreground text-[18px]">person</span> Profile
      </button>
      <button onClick={() => { setDailyRewardOpen(true); setMenuOpen(false); }}
        className="w-full px-4 py-2.5 text-left text-sm text-foreground hover:bg-secondary/50 rounded-xl flex items-center gap-3">
        <span className="material-icons-round text-muted-foreground text-[18px]">redeem</span> Daily Reward
      </button>
    </motion.div>
  )}
</AnimatePresence>
```

### 변경사항 B: Void 화면(chatExpanded === false) 대폭 축소 (라인 332~510)

**현재 `!chatExpanded` 일 때 표시되는 것들:**
1. AnimatedCharacter (오로라 글로우 포함)
2. 인사말 텍스트 + conversation 수
3. 프로필/기억/진화/보상 4개 버튼
4. Growth Status 카드
5. StreakBonus + StreakCalendar
6. EvolutionGuide
7. GamificationWidget
8. PersonalityRadar
9. MoodHistory + MoodStats
10. Conversation Stats 버튼
11. DataVisualization
12. LeaderboardWidget
13. Intimacy/Mood/Streak 미니 정보
14. Evolve 버튼

**변경 후 — 이 모든 것을 제거하고 바로 채팅 뷰로:**
- `chatExpanded` state를 완전히 제거하거나, 기본값을 `true`로 변경
- 위의 모든 위젯들은 각각 적절한 위치로 이동:
  - AnimatedCharacter → 제거 (또는 채팅 배경으로 opacity 0.03 정도로)
  - 인사말 → 채팅 영역의 첫 번째 시스템 메시지로 이동
  - 4개 버튼 (프로필/기억/진화/보상) → 햄버거 메뉴로 이동 (위에서 이미 처리)
  - Growth Status → 프로필 또는 Activity 페이지로
  - StreakBonus/Calendar → Gamification 페이지로
  - EvolutionGuide → Evolution 모달로
  - GamificationWidget → Gamification 페이지로
  - PersonalityRadar → 프로필 모달로
  - MoodHistory/Stats → Activity 페이지로
  - DataVisualization → Activity 페이지로
  - LeaderboardWidget → Gamification 페이지로

**실제 구현:**
`chatExpanded` 관련 코드 전체를 제거하고, 메인 컨텐츠 영역을 항상 채팅 뷰로 표시:

```tsx
{/* Main content area — 항상 채팅 */}
<div className="flex-1 flex flex-col min-h-0 relative z-10">
  <div ref={listRef}
    className="flex-1 overflow-y-auto px-3 space-y-3 gyeol-scrollbar-hide pb-2 pt-2">
    
    {/* 메시지 없을 때 인사말 */}
    {messages.length === 0 && (
      <div className="flex flex-col items-center justify-center h-full gap-4 py-20">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-secondary p-[1px]">
          <div className="w-full h-full rounded-[15px] bg-background flex items-center justify-center">
            <span className="material-icons-round text-primary text-2xl">smart_toy</span>
          </div>
        </div>
        <p className="text-sm text-muted-foreground text-center">
          {getGreeting(agent)}
        </p>
        <p className="text-[11px] text-muted-foreground/50">
          Send a message to start chatting
        </p>
      </div>
    )}

    {/* 기존 메시지 렌더링 — 기존 코드 유지 */}
    {messages.length > 0 && (
      <div className="flex justify-center py-4">
        <span className="px-4 py-1.5 rounded-full glass-card text-[11px] font-medium text-muted-foreground">
          Today, {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    )}
    {(searchQuery ? messages.filter(m => m.content.toLowerCase().includes(searchQuery.toLowerCase())) : messages).map((msg) => (
      <MessageBubble key={msg.id} msg={msg} agentName={agentName} />
    ))}
    {/* error, isLoading indicator — 기존 코드 유지 */}
  </div>
</div>
```

### 변경사항 C: 입력바 (라인 570~602) — 거의 유지, 미세 조정
- `onFocus` 에서 `setChatExpanded(true)` 제거 (chatExpanded가 없으므로)
- 나머지 유지

### 삭제할 import (사용하지 않게 되는 것들):
```
- AnimatedCharacter (홈에서 제거)
- GenBadge (상단바에서 제거)
- GamificationWidget (Gamification 페이지에 이미 있음)
- PersonalityRadar (프로필 모달에 이미 있음)
- MoodHistory, MoodStats (Activity로 이동)
- StreakBonus, StreakCalendar (Gamification으로 이동)
- EvolutionGuide (Evolution 모달에 이미 있음)
- DataVisualization (Activity로 이동)
- LeaderboardWidget (Gamification으로 이동)
- ConversationStats (Activity로 이동)
```

**⚠️ 주의: 이 컴포넌트 파일들은 삭제하지 마세요! import만 제거합니다.**

### 변경사항 D: 제거할 state 변수들
```
- chatExpanded, setChatExpanded
- shareCardOpen (햄버거 메뉴로 이동 가능)
- convStatsOpen (Activity 페이지로 이동)
```

---

## 2단계: 비주얼 통일감 — CSS 토큰 + 컴포넌트 정리

### 파일: `app/globals.css` (또는 프로젝트의 메인 CSS)

**추가할 CSS 변수:**
```css
:root {
  /* 통일 카드 토큰 */
  --card-bg: hsl(240 10% 12% / 0.6);
  --card-border: hsl(240 10% 20% / 0.3);
  --card-radius: 16px;
  --card-padding: 16px;
  
  /* 글로우 제한 */
  --glow-primary: 0 0 20px hsl(260 80% 60% / 0.15);
  
  /* 텍스트 계층 */
  --text-title: 1.125rem;
  --text-body: 0.9375rem;
  --text-caption: 0.8125rem;
  --text-micro: 0.75rem;
}
```

### 규칙 (Devin이 모든 컴포넌트에 적용):
1. `.glass-card` 클래스가 이미 있으면 그것을 사용, 없으면 위 토큰으로 통일
2. **글로우 효과 (`btn-glow`, `shadow-primary/XX`)**: CTA 버튼과 진화 순간에만 허용. 일반 카드/뱃지에서 제거
3. **오로라 배경 (`.aurora-bg`)**: 홈(채팅)에만 사용, 다른 페이지에서는 제거
4. **그라디언트 텍스트**: 페이지 제목에만 허용
5. **카드 내부 패딩**: 모두 `p-4` (16px)
6. **섹션 간격**: `space-y-4` 또는 `gap-4`
7. **텍스트 크기**: 제목 `text-lg`, 본문 `text-sm`, 캡션 `text-xs`, 마이크로 `text-[10px]`

### 적용 대상 파일 목록:
- `src/views/Social.tsx` — `.aurora-bg` 제거
- `src/views/Settings.tsx` — `.aurora-bg` 제거
- `src/views/Activity.tsx` — `.aurora-bg` 제거
- `src/views/Gamification.tsx` — `.aurora-bg` 제거
- 모든 `glass-card` 사용처 — 패딩/라운딩 통일

---

## 3단계: 소셜 페이지 정리 — `src/views/Social.tsx`

### 현재 문제
- 탭이 4개: `foryou` | `following` | `moltbook` | `timeline`
- Matching 카드가 For You 탭 상단에 갑자기 등장
- Community + Moltbook 피드가 분리되어 있어 혼란

### 변경: 탭 3개로 통합

**변경 전 (라인 94):**
```tsx
const [tab, setTab] = useState<'foryou' | 'following' | 'moltbook' | 'timeline'>('foryou');
```

**변경 후:**
```tsx
const [tab, setTab] = useState<'feed' | 'matching' | 'friends'>('feed');
```

**탭 바 UI 변경:**
```tsx
<div className="flex gap-1 p-1 rounded-2xl bg-secondary/30">
  {[
    { key: 'feed', label: 'Feed', icon: 'dynamic_feed' },
    { key: 'matching', label: 'Matching', icon: 'handshake' },
    { key: 'friends', label: 'Friends', icon: 'people' },
  ].map(t => (
    <button key={t.key} onClick={() => setTab(t.key as any)}
      className={`flex-1 py-2.5 rounded-xl text-xs font-medium transition flex items-center justify-center gap-1.5 ${
        tab === t.key ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
      }`}>
      <span className="material-icons-round text-sm">{t.icon}</span>
      {t.label}
    </button>
  ))}
</div>
```

**탭 컨텐츠 매핑:**
- `feed` 탭 = 기존 `foryou` + `moltbook` 합침 (community + moltbook 피드 통합)
- `matching` 탭 = 기존 매칭 카드 + Recommended Matches
- `friends` 탭 = 기존 `following` + DM 목록

**상단 헤더 간소화:**

변경 전 (현재에는 Share, Search, Compare, NewPost 등 버튼이 상단에):
```tsx
<header className="flex items-center justify-between">
  <h1>Social</h1>
  {/* 4-5개 버튼 */}
</header>
```

변경 후:
```tsx
<header className="flex items-center justify-between">
  <h1 className="text-base font-semibold text-foreground/80">Social</h1>
  {/* 탭에 따라 적절한 1개 액션 버튼만 */}
  {tab === 'feed' && (
    <button onClick={() => setNewPostOpen(true)}
      className="w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground transition">
      <span className="material-icons-round text-[20px]">edit_square</span>
    </button>
  )}
  {tab === 'matching' && (
    <button onClick={() => setMatchFilterOpen(true)}
      className="w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground transition">
      <span className="material-icons-round text-[20px]">tune</span>
    </button>
  )}
  {tab === 'friends' && (
    <button onClick={() => setSearchOpen(true)}
      className="w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground transition">
      <span className="material-icons-round text-[20px]">search</span>
    </button>
  )}
</header>
```

**Trending Companions 섹션** (현재 상단에 있는 것) → `matching` 탭으로 이동

---

## 4단계: 설정 페이지 정리 — `src/views/Settings.tsx`

### 현재 문제
- 모든 옵션이 한 페이지에 길게 나열 (1281줄)
- 아코디언이 이미 있지만 카테고리 분류가 불명확
- 섹션이 너무 많음 (mode, personality, character, tts, byok, provider, feeds, keywords, learning, analysis, notifications, push, telegram, moltbook, safety, openclaw, theme, locale, skin...)

### 변경: 5개 카테고리로 그룹핑

기존 `SectionHeader` 컴포넌트는 유지하되, 섹션을 5개 그룹으로 재구성:

**그룹 1: 일반 (General)**
- Theme (다크/라이트) — 기존 `theme` 섹션
- Language — 기존 `locale` 섹션
- Notifications + Push — 기존 `notifications` + `push` 섹션 합침

**그룹 2: AI 설정 (AI)**
- Mode (Simple/Advanced) — 기존 `mode` 섹션
- Personality — 기존 `personality` 섹션
- System Prompt — 기존 `system-prompt` 섹션 (있다면)
- Provider + BYOK — 기존 `provider` + `byok` 섹션 합침
- TTS — 기존 `tts` 섹션
- Proactive Messages — 기존 관련 섹션

**그룹 3: 외형 (Appearance)**
- Character Preset — 기존 `character` 섹션
- Skin — 기존 `skin` 섹션
- Character Editor — 기존 `charEditorOpen` 관련

**그룹 4: 연동 (Integrations)**
- Telegram — 기존 `telegram` 섹션
- OpenClaw — 기존 `openclaw` 섹션
- Moltbook — 기존 `moltbook` 섹션
- Feeds & Keywords — 기존 `feeds` + `keywords` 섹션

**그룹 5: 정보 (Info)**
- 버전 정보
- Terms, Privacy 링크
- Kill Switch (어드민)
- Delete Account

**구현 방법:**
각 그룹을 하나의 카드(`glass-card rounded-2xl p-4`)로 감싸고, 그룹 제목을 표시:

```tsx
{/* 일반 */}
<div className="glass-card rounded-2xl overflow-hidden">
  <div className="px-4 py-3 border-b border-border/20">
    <p className="text-xs font-semibold text-foreground/70 flex items-center gap-2">
      <span className="material-icons-round text-sm text-primary/50">settings</span>
      General
    </p>
  </div>
  <div className="p-4 space-y-2">
    <SectionHeader id="theme" icon="palette" title="Theme" />
    {activeSection === 'theme' && (/* 테마 콘텐츠 */)}
    <SectionHeader id="locale" icon="language" title="Language" />
    {activeSection === 'locale' && (/* 언어 콘텐츠 */)}
    <SectionHeader id="notifications" icon="notifications" title="Notifications" />
    {activeSection === 'notifications' && (/* 알림 콘텐츠 */)}
  </div>
</div>

{/* AI 설정 */}
<div className="glass-card rounded-2xl overflow-hidden">
  {/* 같은 패턴 */}
</div>

{/* ... 나머지 그룹 */}
```

**Delete Account 버튼:** 맨 아래, 빨간색으로:
```tsx
<button onClick={() => setDeleteModalOpen(true)}
  className="w-full py-3 rounded-xl text-sm font-medium text-destructive hover:bg-destructive/10 transition">
  Delete Account
</button>
```

---

## 공통 규칙 체크리스트

Devin은 각 단계 완료 후 이 체크리스트를 확인:

- [ ] 하드코딩된 컬러가 없는가? (`text-white` → `text-foreground`, `text-slate-XXX` → `text-muted-foreground` 등)
- [ ] 한 화면에 CTA 버튼이 3개 이상 보이지 않는가?
- [ ] 카드 안에 카드(중첩)가 없는가?
- [ ] 글로우/그라디언트가 CTA/진화 외에 사용되지 않는가?
- [ ] `.aurora-bg`가 홈 이외 페이지에 없는가?
- [ ] 삭제된 기능이 없는가? (숨기기/재배치만 했는가?)
- [ ] 빈 상태(Empty State)가 이모지 + 한 줄 텍스트인가?
- [ ] 모든 카드의 패딩이 `p-4`, 라운딩이 `rounded-2xl`인가?

---

## Devin 실행 커맨드

```
docs/gyeol/DEVIN_UI_REDESIGN.md를 읽고 그대로 실행해.

순서: 1단계 → 스크린샷 → 2단계 → 스크린샷 → 3단계 → 스크린샷 → 4단계 → 스크린샷

1단계 핵심:
- src/views/Index.tsx에서 chatExpanded 관련 코드 제거, 항상 채팅 뷰 표시
- 상단바: GenBadge/Search/Notif/Export/Evo 버튼 → 햄버거 메뉴 1개로 통합
- AnimatedCharacter, GamificationWidget, PersonalityRadar 등 위젯 → import 제거 (파일 삭제 금지)

2단계 핵심:
- globals.css에 카드/텍스트 디자인 토큰 추가
- 모든 페이지에서 .aurora-bg 제거 (홈만 유지)
- 글로우 효과 CTA 외 제거

3단계 핵심:
- src/views/Social.tsx 탭을 feed | matching | friends 3개로 변경
- 상단 버튼 간소화

4단계 핵심:
- src/views/Settings.tsx 섹션을 5개 그룹(General/AI/Appearance/Integrations/Info)으로 카드 그룹핑

기능은 절대 삭제하지 말 것. 숨기거나 재배치만.
```
