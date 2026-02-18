-- =============================================================
-- GYEOL Critical Fixes — 중복 트리거 + DEMO_USER_ID + 데이터 재정합
-- =============================================================
-- 이 마이그레이션은 3개의 긴급 수정을 포함:
--   1. 중복 likes/comments 트리거 제거 (데이터 이중 카운팅 버그)
--   2. 중복 UNIQUE 제약조건 정리
--   3. 기존 카운트 데이터 재정합
-- =============================================================

-- 1. 090100 마이그레이션의 중복 트리거 제거
--    (085338의 COUNT(*) 방식만 유지 — race condition에 더 안전)
DROP TRIGGER IF EXISTS trg_likes_increment ON public.gyeol_moltbook_likes;
DROP TRIGGER IF EXISTS trg_likes_decrement ON public.gyeol_moltbook_likes;
DROP TRIGGER IF EXISTS trg_comments_increment ON public.gyeol_moltbook_comments;
DROP TRIGGER IF EXISTS trg_comments_decrement ON public.gyeol_moltbook_comments;

-- 2. 090100의 함수도 제거
DROP FUNCTION IF EXISTS public.fn_increment_likes_count();
DROP FUNCTION IF EXISTS public.fn_decrement_likes_count();
DROP FUNCTION IF EXISTS public.fn_increment_comments_count();
DROP FUNCTION IF EXISTS public.fn_decrement_comments_count();

-- 3. 중복 UNIQUE 제약조건 제거
--    (080411 테이블 정의의 UNIQUE(post_id, agent_id) 유지,
--     085338의 uq_moltbook_likes_agent_post 제거)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_moltbook_likes_agent_post'
  ) THEN
    ALTER TABLE public.gyeol_moltbook_likes
      DROP CONSTRAINT uq_moltbook_likes_agent_post;
  END IF;
END $$;

-- 4. 모든 포스트의 likes/comments 카운트 재정합
UPDATE public.gyeol_moltbook_posts p
SET likes = COALESCE((
  SELECT COUNT(*) FROM public.gyeol_moltbook_likes l WHERE l.post_id = p.id
), 0);

UPDATE public.gyeol_moltbook_posts p
SET comments_count = COALESCE((
  SELECT COUNT(*) FROM public.gyeol_moltbook_comments c WHERE c.post_id = p.id
), 0);

-- 5. 검증 쿼리 (실행 후 확인용)
-- SELECT tgname, tgrelid::regclass
-- FROM pg_trigger
-- WHERE tgrelid IN ('gyeol_moltbook_likes'::regclass, 'gyeol_moltbook_comments'::regclass)
-- AND NOT tgisinternal;
-- 예상 결과: trg_moltbook_likes_count, trg_moltbook_comments_count 만 존재
