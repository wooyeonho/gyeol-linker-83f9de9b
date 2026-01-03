-- ============================================
-- username 필드 추가
-- 판매자 브랜드 페이지를 위한 고유 식별자
-- ============================================

-- username 컬럼 추가 (고유, nullable)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username) WHERE username IS NOT NULL;

-- 기존 사용자에게 username 자동 생성 (email의 로컬 파트 사용)
-- 예: user@example.com -> user
UPDATE profiles
SET username = LOWER(SPLIT_PART(email, '@', 1))
WHERE username IS NULL;

-- username이 중복되는 경우 숫자 추가
DO $$
DECLARE
  rec RECORD;
  base_username TEXT;
  new_username TEXT;
  counter INTEGER;
BEGIN
  FOR rec IN 
    SELECT id, email 
    FROM profiles 
    WHERE username IS NULL OR username IN (
      SELECT username 
      FROM profiles 
      GROUP BY username 
      HAVING COUNT(*) > 1
    )
  LOOP
    base_username := LOWER(SPLIT_PART(rec.email, '@', 1));
    new_username := base_username;
    counter := 1;
    
    -- 중복되지 않는 username 찾기
    WHILE EXISTS (SELECT 1 FROM profiles WHERE username = new_username AND id != rec.id) LOOP
      new_username := base_username || counter;
      counter := counter + 1;
    END LOOP;
    
    UPDATE profiles
    SET username = new_username
    WHERE id = rec.id;
  END LOOP;
END $$;

-- RLS 정책: 모든 사용자는 username으로 프로필 조회 가능 (공개 프로필)
CREATE POLICY "모든 사용자는 username으로 프로필 조회 가능"
ON profiles FOR SELECT
USING (username IS NOT NULL);

-- ============================================
-- 완료
-- ============================================


