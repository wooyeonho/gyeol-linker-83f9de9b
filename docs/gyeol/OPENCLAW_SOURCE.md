# OpenClaw 소스 사용하기

GYEOL은 [OpenClaw](https://github.com/openclaw/openclaw) 오픈소스 기반으로 설계되었습니다.  
다운로드한 `openclaw-main.zip`을 프로젝트에 풀어서 로컬에서 Gateway를 실행할 수 있습니다.

## 1. 압축 해제

### 방법 A: npm 스크립트 (권장)

1. `openclaw-main.zip`을 **다운로드 폴더**에 둔 상태에서:
   ```bash
   npm install
   npm run openclaw:extract
   ```
2. zip이 다른 경로에 있으면:
   ```bash
   # Windows (PowerShell)
   $env:OPENCLAW_ZIP="C:\경로\openclaw-main.zip"; npm run openclaw:extract

   # macOS/Linux
   OPENCLAW_ZIP=/경로/openclaw-main.zip npm run openclaw:extract
   ```
3. 풀린 소스는 프로젝트 루트의 **`openclaw-src/`** 에 생성됩니다.

### 방법 B: 수동

1. `openclaw-main.zip`을 압축 해제합니다.
2. 안에 있는 **openclaw-main** 폴더 내용 전체를 프로젝트의 **`openclaw-src`** 폴더로 복사합니다.
   - 예: `openclaw-main/package.json`, `openclaw-main/README.md` 등 → `openclaw-src/package.json`, `openclaw-src/README.md` 등

## 2. OpenClaw Gateway 실행

OpenClaw는 Node 22+, pnpm 사용을 권장합니다.

```bash
cd openclaw-src
pnpm install
pnpm build
pnpm start gateway
# 또는 개발 모드: pnpm run gateway:dev
```

기본 포트: **18789** (WebSocket/HTTP).  
설정: `~/.openclaw/openclaw.json` 또는 온보딩 시 생성되는 워크스페이스 설정.

## 3. GYEOL과 연동

- **웹 채팅**: 현재 GYEOL은 `/api/gyeol/chat`에서 Groq를 직접 호출합니다.  
  OpenClaw Gateway를 쓰려면 `OPENCLAW_GATEWAY_URL`(예: `http://localhost:18789`)을 설정하고, 채팅 API에서 해당 URL로 요청을 프록시하도록 수정할 수 있습니다.
- **텔레그램/채널**: OpenClaw Gateway에 채널(Telegram 등)을 연결하면, 같은 에이전트가 웹과 텔레그램에서 동시에 동작합니다.
- **스킬/Heartbeat**: OpenClaw 워크스페이스에 `docs/gyeol/` 의 AGENT.md, HEARTBEAT.md, 스킬(SKILL.md)을 복사해 사용합니다.

## 4. 참고

- OpenClaw 공식: https://openclaw.ai  
- 문서: https://docs.openclaw.ai  
- 저장소: https://github.com/openclaw/openclaw
