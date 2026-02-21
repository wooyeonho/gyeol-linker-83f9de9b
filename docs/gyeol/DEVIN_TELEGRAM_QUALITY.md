# 텔레그램 대화 품질 개선 가이드

> **긴급도**: 🔴 높음  
> **담당**: Lovable (Edge Function) + Devin (OpenClaw)
> **작성일**: 2026-02-21

---

## 🔍 현재 문제점 분석

### 1. 히스토리 부족 (심각)
- **현재**: 최근 10개 메시지만 로드 (history.slice(-10))
- **웹 채팅**: 20개 메시지 로드
- **결과**: 맥락 유지 능력 부족, 이전 대화 내용을 잊음

### 2. 후처리(Post-processing) 누락 (심각)
- **현재**: 텔레그램에서 대화 후 기억 추출/게이미피케이션 틱 없음
- **웹 채팅**: `doPostProcessing`으로 기억 추출 + 페르소나 진화 + EXP/코인 지급
- **결과**: 텔레그램에서 아무리 대화해도 AI가 사용자를 기억 못함

### 3. 페르소나 진화 모델 약함
- **현재**: `llama-3.1-8b-instant` (Groq 8B 모델)
- **웹 채팅**: `google/gemini-2.5-flash-lite` (Lovable AI)
- **결과**: 페르소나 진화 품질 낮음, 부정확한 분석

### 4. 응답 정제 부족
- **현재**: `cleanResponse`가 간단한 마크다운 제거만
- **웹 채팅**: 한자 제거(cleanChinese) + 시스템 토큰 제거 + 화살표 제거
- **결과**: 가끔 한자, 마크다운 기호, 시스템 토큰 노출

### 5. Heartbeat 필터 누락
- **현재**: heartbeat 메시지 필터는 있지만 불완전
- **결과**: proactive 메시지가 히스토리에 혼입될 가능성

---

## ✅ 해결 방안 (Lovable 구현 완료)

### 수정 파일: `supabase/functions/telegram-webhook/index.ts`

#### 1. 히스토리 확대
```typescript
// Before
.limit(15)  // → history.slice(-10)

// After  
.limit(25)  // → history.slice(-20)
```

#### 2. 기억 추출 추가 (doPostProcessing 이식)
```typescript
// 대화 저장 후, AI 응답 발송 전에 fire-and-forget으로 실행:
// - Lovable AI Gateway로 사용자 메시지에서 기억 추출
// - gyeol_user_memories UPSERT
// - 결과: 텔레그램에서도 사용자 기억 축적
```

#### 3. 페르소나 진화 모델 업그레이드
```typescript
// Before: Groq llama-3.1-8b-instant
// After: Lovable AI google/gemini-2.5-flash-lite
```

#### 4. 응답 정제 강화
```typescript
function cleanResponse(text: string): string {
  return text
    .replace(/[\u4E00-\u9FFF\u3400-\u4DBF]/g, '')  // 한자 제거
    .replace(/<\|[^|]*\|>/g, '')  // 시스템 토큰 제거
    .replace(/<\/?(?:system|user|assistant)[^>]*>/gi, '')
    .replace(/\[\/?\s*INST\s*\]/gi, '')
    .replace(/\*\*/g, '').replace(/#{1,6}\s/g, '')
    .replace(/^[-*]\s/gm, '').replace(/```[^`]*```/gs, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
```

#### 5. 게이미피케이션 틱 추가
```typescript
// 대화 후 EXP/코인 지급
// gamification-tick Edge Function 호출 (fire-and-forget)
```

---

## 📋 Devin 측 작업 (OpenClaw/Koyeb)

텔레그램이 OpenClaw로 이관되었거나 이관 예정이라면:

### 1. OpenClaw 텔레그램 핸들러 개선
- `server/openclaw_runtime.py`에서 텔레그램 응답 생성 시:
  - 히스토리 20개 이상 로드
  - 사용자 기억 매 대화마다 추출
  - 한자/시스템토큰 정제 적용

### 2. 대화 품질 모니터링
- `gyeol_conversations` 에서 channel='telegram' 필터
- 평균 응답 길이, 사용자 만족도 추적
- 이상 패턴 (너무 짧은 응답, 반복 응답) 감지

### 3. 프로액티브 메시지 품질
- Koyeb heartbeat에서 발송하는 proactive 메시지:
  - 사용자 기억 기반으로 개인화
  - 최근 학습 주제 반영
  - 시간대별 톤 조절 (아침: 가벼운, 저녁: 깊은)

---

## 🔄 품질 체크리스트

- [ ] 20개 이상 메시지 히스토리 로드
- [ ] 매 대화 후 기억 추출 실행
- [ ] 한자 자동 제거 확인
- [ ] 시스템 토큰 노출 없음 확인
- [ ] 페르소나 진화가 Lovable AI 모델 사용
- [ ] 게이미피케이션 틱 작동 확인
- [ ] 프로액티브 메시지 개인화 확인
