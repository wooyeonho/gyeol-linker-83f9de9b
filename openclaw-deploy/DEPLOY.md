# GYEOL OpenClaw — Hugging Face Spaces 배포 가이드

## 사전 준비

- Hugging Face 계정 (https://huggingface.co)
- ANTHROPIC_API_KEY (Anthropic API 키)
- TELEGRAM_BOT_TOKEN (텔레그램 봇 토큰, @BotFather에서 발급)

## 배포 방법

### 1. Hugging Face Space 생성

1. https://huggingface.co/new-space 접속
2. Space name: `gyeol-openclaw`
3. SDK: **Docker** 선택
4. Visibility: Private (권장)
5. Create Space

### 2. 환경변수 설정

Space Settings > Repository secrets에서 추가:

| Secret 이름 | 값 |
|---|---|
| `ANTHROPIC_API_KEY` | Anthropic API 키 |
| `TELEGRAM_BOT_TOKEN` | 텔레그램 봇 토큰 |

### 3. 코드 Push

```bash
cd openclaw-deploy

git init
git remote add space https://huggingface.co/spaces/YOUR_USERNAME/gyeol-openclaw
git add .
git commit -m "Initial deploy"
git push space main
```

또는 이 레포의 `openclaw-deploy/` 폴더를 HF Space 레포에 복사해서 push.

### 4. 배포 확인

- Space URL: `https://YOUR_USERNAME-gyeol-openclaw.hf.space`
- 헬스체크: `https://YOUR_USERNAME-gyeol-openclaw.hf.space/healthz`

### 5. 텔레그램 봇 연결

TELEGRAM_BOT_TOKEN이 설정되면 OpenClaw이 자동으로 텔레그램 봇을 시작합니다.
봇에게 메시지를 보내서 동작 확인.

## 파일 구조

```
openclaw-deploy/
├── Dockerfile          # coollabsio/openclaw 기반
├── README.md           # HF Spaces 메타데이터
├── openclaw.json       # OpenClaw 설정 (모델, 채널)
├── DEPLOY.md           # 이 문서
└── workspace/
    ├── AGENT.md        # GYEOL 성격 (시스템 프롬프트)
    ├── HEARTBEAT.md    # 자율 행동 체크리스트
    └── skills/
        ├── gyeol-supabase-sync/SKILL.md
        ├── gyeol-personality-evolve/SKILL.md
        ├── gyeol-learner/SKILL.md
        ├── gyeol-proactive/SKILL.md
        └── gyeol-security/SKILL.md
```

## Vercel 환경변수 업데이트

Vercel 프로젝트에서 `OPENCLAW_GATEWAY_URL`을 HF Space URL로 변경:

```
OPENCLAW_GATEWAY_URL=https://YOUR_USERNAME-gyeol-openclaw.hf.space
```
