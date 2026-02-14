# GYEOL (결)

GYEOL 전용 Next.js 앱입니다. **이 저장소(wooyeonho/Gyeol)가 GYEOL 개발·배포의 단일 소스**입니다.  
(정음 프로젝트 `prompt-jeongeom` 내부의 `gyeol-web` 폴더는 과거 분리용 복사본이며, 실제 서비스 코드는 이 레포 기준입니다.)

## 현재 상태 보기 (Git 푸시)

이 폴더를 **새 Git 저장소**로 푸시해서 현재 상태를 보고 싶다면:

1. **새 원격 저장소 만들기**  
   GitHub/GitLab 등에서 빈 저장소를 하나 만든다 (예: `gyeol-web`).

2. **gyeol-web 폴더에서 Git 초기화 후 푸시**

   ```bash
   cd gyeol-web
   git init
   git add .
   git commit -m "GYEOL 웹 단독 앱 초기 상태"
   git branch -M main
   git remote add origin https://github.com/YOUR_USER/gyeol-web.git
   git push -u origin main
   ```

   `YOUR_USER`와 저장소 이름은 본인 환경에 맞게 바꾸세요.

3. **이후 변경사항 반영**

   정음 레포에서 GYEOL 관련 코드를 수정한 뒤, 이 폴더에 다시 복사했다면:

   ```bash
   cd gyeol-web
   git add .
   git commit -m "업데이트 내용 요약"
   git push
   ```

이렇게 하면 원격 저장소에서 **지금 현재 상태**를 항상 확인할 수 있습니다.

## 로컬 실행

```bash
npm install
cp .env.example .env
# .env에 아래 환경변수 설정 후
npm run dev
```

브라우저에서 `http://localhost:3000` 접속.

## 서버 연결 (Supabase + 환경변수)

실제로 동작하려면 Supabase와 환경변수가 필요합니다. **없으면 API가 500 에러**를 냅니다.

1. **Supabase**: 프로젝트 생성 후 SQL Editor에서 `supabase/migrations/001_gyeol_schema.sql` 실행.
2. **`.env` 또는 `.env.local`** 에 다음 설정:
   - `NEXT_PUBLIC_SUPABASE_URL` — Supabase 프로젝트 URL  
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — anon key  
   - `SUPABASE_SERVICE_ROLE_KEY` — 서버용 service role key  
   - `ENCRYPTION_SECRET` — **32자 이상** (BYOK 키 암호화. 없으면 BYOK 등록/복호화 실패)  
   - `GROQ_API_KEY` — (선택) Groq API 키  
   - `OPENCLAW_GATEWAY_URL` — (선택) OpenClaw 게이트웨이  
   - `KILL_SWITCH_TOKEN` — (선택) 관리자 킬스위치 토큰  

Vercel 배포 시에는 Vercel 대시보드 > Settings > Environment Variables에 위 값들을 넣으면 됩니다.

## DB 스키마

Supabase에 GYEOL 전용 테이블(`gyeol_*`)이 있어야 합니다.

- **이 레포 기준**: `supabase/migrations/001_gyeol_schema.sql`을 Supabase SQL Editor에서 실행하거나, Supabase CLI로 `supabase db push` 실행.
- **정음 레포와 같은 DB 사용 시**: 정음 레포의 `supabase/migrations/010_gyeol_schema.sql`이 GYEOL 테이블을 추가합니다.

## 페이지

- `/` — Void + 채팅
- `/settings` — My AI, BYOK
- `/activity` — 활동 피드
- `/social` — 소셜 매칭
- `/market/skins` — 스킨 마켓
- `/market/skills` — 스킬 마켓

API는 `/api/chat`, `/api/agent`, `/api/conversations`, `/api/activity`, `/api/byok`, `/api/market/skins`, `/api/market/skills`, `/api/social/matches` 등으로만 사용합니다 (gyeol prefix 없음).

## Vercel 배포

- **프로젝트 이름 규칙**: 소문자만 사용, 최대 100자. `a-z`, `0-9`, `.`, `_`, `-` 가능. `---` 연속은 불가.
  - ✅ `gyeol`, `gyeol-web`, `gyeol_web`  
  - ❌ `Gyeol` (대문자), `gyeol---web` (`---` 포함)
- GitHub 저장소(예: `wooyeonho/Gyeol`) 연결 후, Vercel에서 **Project Name**을 위 규칙에 맞게 설정(예: `gyeol` 또는 `gyeol-web`).
- **Environment Variables**에 다음 추가:
  - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
  - `ENCRYPTION_SECRET` (32자 이상, BYOK용)
  - `GROQ_API_KEY` (또는 `OPENCLAW_GATEWAY_URL`)
  - `KILL_SWITCH_TOKEN` (선택)
- 루트가 이 Next.js 앱이므로 Root Directory는 비워 두면 됩니다.
