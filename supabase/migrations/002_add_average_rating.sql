-- ============================================
-- average_rating 필드 추가
-- 프롬프트 평점 캐시 필드
-- ============================================

-- average_rating 컬럼 추가
ALTER TABLE prompts
ADD COLUMN IF NOT EXISTS average_rating NUMERIC(3, 2) DEFAULT 0 CHECK (average_rating >= 0 AND average_rating <= 5);

-- 인덱스 추가 (평점순 정렬 최적화)
CREATE INDEX IF NOT EXISTS idx_prompts_average_rating ON prompts(average_rating DESC);

-- 기존 데이터의 평점 계산 (reviews 테이블에서)
UPDATE prompts p
SET average_rating = COALESCE(
  (
    SELECT AVG(rating)::NUMERIC(3, 2)
    FROM reviews r
    WHERE r.prompt_id = p.id
  ),
  0
);

-- 평점 자동 업데이트 함수
CREATE OR REPLACE FUNCTION update_prompt_average_rating()
RETURNS TRIGGER AS $$
BEGIN
  -- 리뷰 추가/수정/삭제 시 해당 프롬프트의 평점 재계산
  UPDATE prompts
  SET average_rating = COALESCE(
    (
      SELECT AVG(rating)::NUMERIC(3, 2)
      FROM reviews
      WHERE prompt_id = COALESCE(NEW.prompt_id, OLD.prompt_id)
    ),
    0
  )
  WHERE id = COALESCE(NEW.prompt_id, OLD.prompt_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 리뷰 추가/수정 시 평점 업데이트
CREATE TRIGGER reviews_update_average_rating
AFTER INSERT OR UPDATE OR DELETE ON reviews
FOR EACH ROW
EXECUTE FUNCTION update_prompt_average_rating();


