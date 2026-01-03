# 프롬프트 정음 (Prompt Jeongeom)

> **Premium Curated AI Prompt Marketplace**

프롬프트 정음은 전문가가 검증한 고품질 AI 프롬프트를 거래하는 프리미엄 마켓플레이스입니다. 판매자와 구매자를 연결하고, 커뮤니티를 통해 지식을 공유하며, AI 추천 엔진으로 개인화된 경험을 제공합니다.

## ✨ 주요 기능

### 🎯 핵심 기능
- **프롬프트 마켓플레이스**: 승인된 고품질 프롬프트만 판매
- **판매자 대시보드**: 실시간 성과 분석, 매출 추이 차트, 전환율 분석
- **커뮤니티 시스템**: 사용자 간 지식 공유, Q&A, 프롬프트 활용 팁
- **AI 추천 엔진**: 구매 이력 기반 개인화 추천, 연관 프롬프트 추천
- **실시간 알림**: 리뷰, 출금, 프롬프트 승인 상태 변경 알림
- **소셜 공유**: KakaoTalk, X(Twitter), Facebook 공유 최적화

### 🎨 프리미엄 UI/UX
- **Apple & Toss 스타일**: 절제된 디자인, 부드러운 애니메이션
- **스크롤 리빌 애니메이션**: Framer Motion 기반 자연스러운 인터랙션
- **다크 모드**: 눈의 피로를 줄이는 어두운 테마
- **반응형 디자인**: 모바일, 태블릿, 데스크톱 완벽 지원

### 🌐 다국어 지원
- 한국어 (기본)
- 영어

## 🛠 기술 스택

### Frontend
- **Next.js 15**: React 기반 풀스택 프레임워크
- **React 18**: 사용자 인터페이스 라이브러리
- **TypeScript**: 타입 안전성 보장
- **Tailwind CSS**: 유틸리티 퍼스트 CSS 프레임워크
- **Framer Motion**: 고급 애니메이션 라이브러리

### Backend & Database
- **Supabase**: 
  - PostgreSQL 데이터베이스
  - 인증 시스템 (Google OAuth)
  - 실시간 구독 (Realtime)
  - Row Level Security (RLS)

### 기타 라이브러리
- **next-intl**: 국제화 (i18n)
- **recharts**: 데이터 시각화 (대시보드 차트)
- **react-markdown**: 마크다운 렌더링
- **remark-gfm**: GitHub Flavored Markdown 지원
- **lucide-react**: 아이콘 라이브러리

## 🚀 시작하기

### 사전 요구사항

- **Node.js**: 18.0.0 이상
- **npm** 또는 **yarn**
- **Supabase 계정**: [supabase.com](https://supabase.com)에서 생성

### 설치

1. 저장소 클론
```bash
git clone <repository-url>
cd prompt-jeongeom
```

2. 의존성 설치
```bash
npm install
```

3. 환경 변수 설정
```bash
cp .env.example .env.local
```

`.env.local` 파일을 열어 다음 환경 변수를 설정하세요:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
ADMIN_EMAIL=your_admin_email@example.com
NEXT_PUBLIC_SITE_URL=https://your-domain.com
```

4. 데이터베이스 마이그레이션 실행

Supabase 대시보드의 SQL Editor에서 다음 순서로 마이그레이션 파일을 실행하세요:

```
supabase/migrations/
├── 001_initial_schema.sql
├── 002_add_average_rating.sql
├── 003_make_prompt_fields_optional.sql
├── 004_create_payouts_table.sql
├── 005_add_username_field.sql
├── 006_enhance_rls_security.sql
├── 007_notifications.sql
├── 008_community_system.sql
└── 009_cleanup_test_data.sql (선택적, 프로덕션 배포 전 실행)
```

5. 개발 서버 실행
```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 확인하세요.

## 📁 프로젝트 구조

```
prompt-jeongeom/
├── app/
│   ├── [locale]/              # 다국어 라우팅
│   │   ├── page.tsx           # 메인 랜딩 페이지
│   │   ├── prompts/           # 프롬프트 관련 페이지
│   │   ├── seller/            # 판매자 페이지
│   │   ├── community/         # 커뮤니티 페이지
│   │   └── admin/             # 관리자 페이지
│   ├── actions/               # Server Actions
│   └── globals.css            # 전역 스타일
├── components/                # 재사용 가능한 컴포넌트
├── dictionaries/              # 다국어 번역 파일
│   ├── ko.json
│   └── en.json
├── lib/                       # 유틸리티 함수
│   └── supabase/             # Supabase 클라이언트
├── supabase/
│   └── migrations/           # 데이터베이스 마이그레이션
└── i18n/                     # 국제화 설정
```

## 🔐 환경 변수

### 필수 환경 변수

| 변수명 | 설명 | 예시 |
|--------|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL | `https://xxxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Anon Key | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `ADMIN_EMAIL` | 관리자 이메일 (출금 승인 등) | `admin@example.com` |
| `NEXT_PUBLIC_SITE_URL` | 사이트 URL (소셜 공유용) | `https://prompt-jeongeum.com` |

자세한 내용은 `.env.example` 파일을 참조하세요.

## 🚢 배포

### Vercel 배포 (권장)

1. [Vercel](https://vercel.com)에 프로젝트 연결
2. 환경 변수 설정 (Vercel 대시보드 → Settings → Environment Variables)
3. 빌드 명령어: `npm run build` (기본값)
4. 배포 완료 후 도메인 연결

### Supabase 프로덕션 설정

1. Supabase 프로젝트에서 프로덕션 데이터베이스 생성
2. 모든 마이그레이션 파일 실행
3. RLS 정책 활성화 확인
4. Google OAuth 설정 (인증 → Providers → Google)

### 프로덕션 빌드 테스트

로컬에서 프로덕션 빌드를 테스트하려면:

```bash
npm run build
npm start
```

## 🔒 보안

### Row Level Security (RLS)

모든 테이블에 RLS가 활성화되어 있습니다:

- **prompts**: 승인된 프롬프트만 공개, `content`는 구매자만 접근
- **orders**: 구매자는 본인 주문만, 판매자는 본인 프롬프트 주문만 조회
- **community_posts**: 모든 사용자 조회 가능, 작성자만 수정/삭제
- **payouts**: 판매자는 본인 출금 요청만 조회

### 환경 변수 보안

- `.env.local` 파일은 절대 커밋하지 마세요 (`.gitignore`에 포함됨)
- 프로덕션 환경에서는 Vercel 등의 플랫폼 환경 변수 설정 사용

## 📊 성능 최적화

### 이미지 최적화
- 메인 페이지 첫 4개 프롬프트 카드: `priority={true}` 적용
- 프롬프트 상세 페이지 첫 이미지: `loading="eager"` 적용

### LCP (Largest Contentful Paint) 최적화
- Hero Section 애니메이션 최소화 (`y: 10`)
- 중요 이미지 우선 로딩
- 폰트 최적화

## 🧪 테스트

```bash
# 린트 검사
npm run lint

# 타입 체크
npx tsc --noEmit
```

## 📝 라이선스

이 프로젝트는 비공개 프로젝트입니다.

## 🤝 기여

현재 이 프로젝트는 비공개입니다. 기여에 대한 문의는 프로젝트 관리자에게 연락하세요.

## 📧 문의

프로젝트 관련 문의사항이 있으시면 이슈를 생성해 주세요.

---

**프롬프트 정음** - Premium Curated AI Prompt Marketplace


