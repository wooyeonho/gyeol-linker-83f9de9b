# GYEOL (결)

> **AI 디지털 동반자 -- 대화할수록 성장하고 진화하는 나만의 AI**

GYEOL은 대화를 통해 성격이 진화하고, 3D 비주얼이 변화하는 AI 디지털 동반자 앱입니다.
BYOK(Bring Your Own Key) 방식으로 사용자가 직접 AI API 키를 등록하여 사용합니다.

## 주요 기능

- **AI 채팅**: OpenClaw / BYOK(OpenAI, Groq, DeepSeek, Anthropic) 멀티 프로바이더 지원
- **성격 진화**: 대화 패턴을 분석하여 AI의 성격이 점진적으로 변화 (warmth, logic, creativity, humor, empathy)
- **3D Void 비주얼**: React Three Fiber 기반, Gen별로 변화하는 파티클 시스템
- **진화 연출**: Gen 레벨업 시 시각적 연출 (EvolutionCeremony)
- **BYOK 암호화**: AES-256-GCM 기반 API 키 암호화 저장
- **보안**: 콘텐츠 필터, Kill Switch, 감사 로그
- **소셜**: AI 매칭, 취향 벡터 기반 추천
- **마켓**: 스킨/스킬 마켓플레이스

## 기술 스택

- **Framework**: Next.js 15 (App Router) + TypeScript
- **Styling**: Tailwind CSS
- **3D**: React Three Fiber + @react-three/drei
- **Database**: Supabase (PostgreSQL + Auth + Realtime)
- **State**: Zustand
- **AI**: OpenAI, Groq, DeepSeek, Anthropic API (BYOK)

## 프로젝트 구조

```
Gyeol/
├── app/
│   ├── page.tsx              # 메인 페이지 (Void + 채팅 + 진화)
│   ├── settings/             # 설정 (BYOK, AI Brain, Safety)
│   ├── activity/             # 활동 피드
│   ├── social/               # AI 매칭/소셜
│   ├── market/
│   │   ├── skins/            # 스킨 마켓
│   │   └── skills/           # 스킬 마켓
│   └── api/
│       ├── chat/             # 채팅 API (멀티 프로바이더)
│       ├── agent/            # 에이전트 CRUD
│       ├── byok/             # BYOK 키 관리
│       ├── conversations/    # 대화 기록
│       ├── activity/         # 활동 로그
│       ├── social/matches/   # AI 매칭
│       ├── market/           # 스킨/스킬
│       └── admin/            # Kill Switch, 상태
├── components/
│   ├── ChatInterface.tsx     # 채팅 UI
│   ├── VoidCanvas.tsx        # 3D 파티클 비주얼
│   ├── EvolutionCeremony.tsx # 진화 연출
│   └── VoiceInput.tsx        # 음성 입력
├── lib/gyeol/
│   ├── types.ts              # 타입 정의
│   ├── constants.ts          # 상수
│   ├── chat-ai.ts            # AI 프로바이더 호출
│   ├── byok.ts               # BYOK 암호화/복호화
│   ├── evolution-engine.ts   # 성격 진화 엔진
│   ├── security/             # 콘텐츠 필터, Kill Switch, 감사 로그
│   └── social/               # 취향 벡터, AI 채팅
├── store/
│   └── gyeol-store.ts        # Zustand 스토어
├── supabase/migrations/
│   └── 010_gyeol_schema.sql  # GYEOL DB 스키마
└── docs/gyeol/               # 설계 문서
```

## 시작하기

### 사전 요구사항

- Node.js 18+
- Supabase 프로젝트

### 설치

```bash
git clone https://github.com/wooyeonho/Gyeol.git
cd Gyeol
npm install
```

### 환경 변수 설정

`.env.local` 파일을 생성하고 다음을 설정합니다:

```env
# Supabase (필수)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# BYOK 암호화 (필수)
ENCRYPTION_SECRET=your_32char_encryption_secret

# AI API (선택 - BYOK 없을 때 폴백)
GROQ_API_KEY=your_groq_api_key

# OpenClaw (선택)
OPENCLAW_GATEWAY_URL=http://localhost:18789

# 관리자 (선택)
KILL_SWITCH_TOKEN=your_admin_token

# 사이트 (선택)
NEXT_PUBLIC_SITE_URL=https://gyeol.app
```

### DB 마이그레이션

Supabase SQL Editor에서 실행:

```
supabase/migrations/010_gyeol_schema.sql
```

### 개발 서버 실행

```bash
npm run dev
```

http://localhost:3000 에서 확인

## AI 호출 순서

채팅 API는 다음 순서로 AI를 호출합니다:

1. **OpenClaw Gateway** (설정된 경우)
2. **BYOK** - 사용자가 등록한 API 키 (preferred_provider 우선, 이후 groq -> openai -> deepseek -> anthropic)
3. **서버 Groq** - 환경변수 GROQ_API_KEY
4. **기본 메시지** - 위 모두 실패 시

## 배포

### Vercel

1. Vercel에 프로젝트 연결
2. Environment Variables에 위 환경변수 설정
3. 자동 배포

## 라이선스

비공개 프로젝트
