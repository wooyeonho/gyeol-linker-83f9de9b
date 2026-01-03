-- ============================================
-- 테스트 데이터 클리닝 스크립트
-- 개발 단계의 테스트 데이터를 안전하게 삭제
-- ============================================

-- 주의: 이 스크립트는 프로덕션 환경에서 실행하기 전에
-- 반드시 백업을 수행하고 테스트 환경에서 먼저 실행해보세요.

-- ============================================
-- 1. 테스트 사용자 식별
-- ============================================

-- 테스트 사용자 ID 수집 (이메일 패턴 기반)
-- test@, example.com, demo@ 등 포함
DO $$
DECLARE
  test_user_ids UUID[];
BEGIN
  -- 테스트 사용자 ID 수집
  SELECT ARRAY_AGG(id) INTO test_user_ids
  FROM profiles
  WHERE email LIKE 'test@%'
     OR email LIKE '%@example.com'
     OR email LIKE 'demo@%'
     OR email LIKE '%test%'
     OR email LIKE '%demo%';
  
  -- 테스트 사용자가 없으면 종료
  IF test_user_ids IS NULL OR array_length(test_user_ids, 1) IS NULL THEN
    RAISE NOTICE '테스트 사용자를 찾을 수 없습니다.';
    RETURN;
  END IF;
  
  RAISE NOTICE '테스트 사용자 % 명 발견', array_length(test_user_ids, 1);
  
  -- ============================================
  -- 2. 참조 무결성을 고려한 역순 삭제
  -- ============================================
  
  -- 2-1. community_likes 삭제
  DELETE FROM community_likes
  WHERE user_id = ANY(test_user_ids)
     OR post_id IN (
       SELECT id FROM community_posts WHERE author_id = ANY(test_user_ids)
     );
  
  RAISE NOTICE 'community_likes 삭제 완료';
  
  -- 2-2. community_comments 삭제
  DELETE FROM community_comments
  WHERE author_id = ANY(test_user_ids)
     OR post_id IN (
       SELECT id FROM community_posts WHERE author_id = ANY(test_user_ids)
     );
  
  RAISE NOTICE 'community_comments 삭제 완료';
  
  -- 2-3. community_posts 삭제 (공식 안내 게시글 제외)
  DELETE FROM community_posts
  WHERE author_id = ANY(test_user_ids)
    AND NOT (
      category = 'tips' AND title LIKE '%안내%'
    );
  
  RAISE NOTICE 'community_posts 삭제 완료';
  
  -- 2-4. reviews 삭제
  DELETE FROM reviews
  WHERE user_id = ANY(test_user_ids)
     OR order_id IN (
       SELECT id FROM orders WHERE buyer_id = ANY(test_user_ids)
     );
  
  RAISE NOTICE 'reviews 삭제 완료';
  
  -- 2-5. orders 삭제
  DELETE FROM orders
  WHERE buyer_id = ANY(test_user_ids)
     OR prompt_id IN (
       SELECT id FROM prompts WHERE seller_id = ANY(test_user_ids)
     );
  
  RAISE NOTICE 'orders 삭제 완료';
  
  -- 2-6. payouts 삭제
  DELETE FROM payouts
  WHERE seller_id = ANY(test_user_ids);
  
  RAISE NOTICE 'payouts 삭제 완료';
  
  -- 2-7. prompts 삭제 (샘플 프롬프트 제외)
  DELETE FROM prompts
  WHERE seller_id = ANY(test_user_ids)
    AND NOT (
      slug LIKE 'sample-%'
      OR slug LIKE 'example-%'
    );
  
  RAISE NOTICE 'prompts 삭제 완료';
  
  -- 2-8. notifications 삭제
  DELETE FROM notifications
  WHERE user_id = ANY(test_user_ids);
  
  RAISE NOTICE 'notifications 삭제 완료';
  
  -- 2-9. profiles 삭제 (마지막)
  -- CASCADE로 인해 auth.users도 함께 삭제됨
  DELETE FROM profiles
  WHERE id = ANY(test_user_ids);
  
  RAISE NOTICE 'profiles 삭제 완료';
  
  RAISE NOTICE '테스트 데이터 클리닝이 완료되었습니다.';
END $$;

-- ============================================
-- 3. 보존 대상 확인 (선택적)
-- ============================================

-- 공식 안내 게시글 확인
SELECT 
  id,
  title,
  category,
  created_at
FROM community_posts
WHERE category = 'tips' AND title LIKE '%안내%'
ORDER BY created_at DESC;

-- 샘플 프롬프트 확인
SELECT 
  id,
  slug,
  title_ko,
  seller_id,
  created_at
FROM prompts
WHERE slug LIKE 'sample-%' OR slug LIKE 'example-%'
ORDER BY created_at DESC;

-- ============================================
-- 완료
-- ============================================


