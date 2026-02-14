---
name: GYEOL AI Router
description: 상황에 맞게 Groq/DeepSeek/Gemini/Cloudflare 중 최적의 AI를 선택하는 스킬
tools:
  - route
  - getProvider
---

# GYEOL AI Router

## 프로바이더

1. **Groq** (기본, 무료) — 일반 대화, 빠른 응답  
   - 모델: llama-3.3-70b-versatile  
   - 엔드포인트: https://api.groq.com/openai/v1/chat/completions

2. **DeepSeek** (분석, 초저가) — 복잡한 분석, 코딩, 추론  
   - 모델: deepseek-chat  
   - 엔드포인트: https://api.deepseek.com/v1/chat/completions

3. **Gemini Flash** (멀티모달, 무료) — 이미지 분석, 백업  
   - 모델: gemini-2.5-flash

4. **Cloudflare Workers AI** (경량, 무료) — 감정 분석, 단순 작업  
   - 모델: @cf/meta/llama-3.1-8b-instruct

## 라우팅 로직

- 일반 대화 → Groq
- '분석해줘', '코드 짜줘' → DeepSeek
- 이미지 관련 → Gemini
- 감정/분위기 판단 → Cloudflare
- Groq rate limit 시 → 다음 프로바이더로 자동 전환

모든 프로바이더는 OpenAI 호환 형식으로 통일.  
사용자가 BYOK로 등록한 키가 있으면 해당 프로바이더 최우선 사용 (Supabase `gyeol_user_api_keys` 조회).

## 환경 변수

- GROQ_API_KEY, DEEPSEEK_API_KEY, GEMINI_API_KEY
- CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN
