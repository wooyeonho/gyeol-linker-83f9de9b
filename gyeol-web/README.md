# GYEOL Web

GYEOL만 단독으로 동작하는 Next.js 앱입니다. (정음 프로젝트와 분리된 “결만 따로” 버전)

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
cd gyeol-web
npm install
cp .env.example .env
# .env에 NEXT_PUBLIC_SUPABASE_*, SUPABASE_SERVICE_ROLE_KEY, GROQ_API_KEY 등 설정
npm run dev
```

브라우저에서 `http://localhost:3000` 접속.

## DB 스키마

Supabase에 GYEOL 테이블이 있어야 합니다.  
정음 프로젝트의 `docs/gyeol/schema.sql`을 Supabase SQL Editor에서 실행해 두면 됩니다.

## 페이지

- `/` — Void + 채팅
- `/settings` — My AI, BYOK
- `/activity` — 활동 피드
- `/social` — 소셜 매칭
- `/market/skins` — 스킨 마켓
- `/market/skills` — 스킬 마켓

API는 `/api/chat`, `/api/agent`, `/api/conversations`, `/api/activity`, `/api/byok`, `/api/market/skins`, `/api/market/skills`, `/api/social/matches` 등으로만 사용합니다 (gyeol prefix 없음).
