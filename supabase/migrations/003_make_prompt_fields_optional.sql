-- ============================================
-- 프롬프트 테이블 필드 유연화
-- ai_model, category_ko, category_en을 NULL 허용으로 변경
-- ============================================

-- ai_model 필드를 NULL 허용으로 변경
ALTER TABLE prompts
ALTER COLUMN ai_model DROP NOT NULL;

-- category_ko 필드를 NULL 허용으로 변경
ALTER TABLE prompts
ALTER COLUMN category_ko DROP NOT NULL;

-- category_en 필드를 NULL 허용으로 변경
ALTER TABLE prompts
ALTER COLUMN category_en DROP NOT NULL;

-- ============================================
-- 완료
-- ============================================


