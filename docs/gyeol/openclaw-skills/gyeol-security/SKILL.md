---
name: GYEOL Security Guardrails
description: 모든 자율 행동 전 Kill Switch, URL 허용 목록, 콘텐츠 안전성, rate limit 체크
tools:
  - checkKillSwitch
  - isUrlAllowed
  - checkContent
  - checkRateLimit
---

# GYEOL Security Guardrails

## 체크 항목

1. **Kill Switch** — 활성화 시 즉시 중단
2. **URL 허용 목록** — RSS, Moltbook API, Stack Overflow API, 사용자 추가 URL만 허용
3. **콘텐츠 안전성** — 생성 콘텐츠 필터 통과 필수
4. **Rate limit** — 프로바이더별 제한 초과 시 다음 프로바이더 또는 대기

## 차단

- 은행/금융 사이트 직접 접근
- SNS 로그인 페이지
- 성인 콘텐츠 사이트
- 알 수 없는 도메인의 실행 파일

모든 체크 결과는 감사 로그(gyeol_autonomous_logs)에 기록.
