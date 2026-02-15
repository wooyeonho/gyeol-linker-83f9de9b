# GYEOL Autonomous Learner

RSS 피드에서 새 글을 읽고 학습하는 스킬.

## 학습 소스
- TechCrunch: https://feeds.feedburner.com/TechCrunch
- ZDNet Korea: https://zdnet.co.kr/rss/
- Hacker News: https://hnrss.org/frontpage?count=5
- Reddit r/technology: https://www.reddit.com/r/technology/.rss?limit=5

## 실행 방법
1. RSS 피드 URL을 curl로 가져오기
2. 새 글 제목과 요약 추출
3. 핵심 인사이트 정리
4. Supabase gyeol_autonomous_logs에 기록 (activity_type: "learning")
5. 관련 성격 파라미터 미세 조정 제안

## 규칙
- Heartbeat당 최대 5개 글 읽기
- 이미 읽은 글은 다시 읽지 않기 (제목으로 판별)
- 요약은 한국어로 작성
- 에러 발생 시 스킵하고 다음 소스로

## RSS 가져오기
```bash
curl -s "https://hnrss.org/frontpage?count=3" | head -200
```
