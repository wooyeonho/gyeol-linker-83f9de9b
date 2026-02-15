# GYEOL OpenClaw — 배포 가이드

## 사전 준비

- GROQ_API_KEY (Groq API 키)
- TELEGRAM_BOT_TOKEN (텔레그램 봇 토큰, @BotFather에서 발급)
- OPENCLAW_GATEWAY_TOKEN (OpenClaw 게이트웨이 인증 토큰)

---

## Option A: Koyeb 배포 (권장)

Koyeb 무료(Nano) 티어로 배포. 네트워크 제한 없어서 텔레그램 API 호출 가능.

### 1. Koyeb 계정 생성

1. https://app.koyeb.com 접속, 가입
2. Settings > API Tokens에서 API 토큰 생성

### 2. Koyeb CLI로 배포

```bash
# CLI 설치
curl -fsSL https://raw.githubusercontent.com/koyeb/koyeb-cli/master/install.sh | sh

# 배포 (openclaw-deploy/ 디렉토리에서)
cd openclaw-deploy
koyeb deploy . gyeol-openclaw/gyeol-openclaw \
  --instance-type nano \
  --region fra \
  --port 8000:http \
  --env PORT=8000 \
  --env GROQ_API_KEY=<your-key> \
  --env TELEGRAM_BOT_TOKEN=<your-token> \
  --env OPENCLAW_GATEWAY_TOKEN=<your-gateway-token>
```

### 3. 배포 확인

- App URL: `https://gyeol-openclaw-<your-org>.koyeb.app`
- 헬스체크: `https://gyeol-openclaw-<your-org>.koyeb.app/healthz`

### 4. Vercel 환경변수 업데이트

```
OPENCLAW_GATEWAY_URL=https://gyeol-openclaw-<your-org>.koyeb.app
```

---

## Option B: Hugging Face Spaces 배포

HF Spaces Docker SDK로 배포. 네트워크 제한 있음(텔레그램 API 불가).

### 1. HF Space 생성

1. https://huggingface.co/new-space 접속
2. Space name: `gyeol-openclaw`
3. SDK: Docker, Port: 8080
4. Visibility: Private (권장)

### 2. 환경변수 설정

Space Settings > Repository secrets:

| Secret | 값 |
|---|---|
| `GROQ_API_KEY` | Groq API 키 |
| `TELEGRAM_BOT_TOKEN` | 텔레그램 봇 토큰 |
| `OPENCLAW_GATEWAY_TOKEN` | 게이트웨이 토큰 |

### 3. 코드 Push

```bash
cd openclaw-deploy
git init
git remote add space https://huggingface.co/spaces/YOUR_USERNAME/gyeol-openclaw
git add .
git commit -m "Initial deploy"
git push space main
```

---

## 파일 구조

```
openclaw-deploy/
├── Dockerfile                # coollabsio/openclaw 기반
├── README.md                 # HF Spaces 메타데이터
├── openclaw.json             # OpenClaw 설정 (모델, 채널)
├── entrypoint-wrapper.sh     # DNS 수정, 포트 오버라이드, iframe 헤더 제거
├── DEPLOY.md                 # 이 문서
└── workspace/
    ├── AGENT.md              # GYEOL 시스템 프롬프트
    ├── HEARTBEAT.md          # 자율 행동 체크리스트
    └── skills/
        ├── gyeol-supabase-sync/SKILL.md
        ├── gyeol-personality-evolve/SKILL.md
        ├── gyeol-learner/SKILL.md
        ├── gyeol-proactive/SKILL.md
        └── gyeol-security/SKILL.md
```
