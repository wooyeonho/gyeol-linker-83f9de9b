-- ============================================
-- 커뮤니티 시스템
-- 게시글, 댓글, 좋아요 테이블 생성
-- ============================================

-- ============================================
-- 1. Enum 타입 생성
-- ============================================

-- 커뮤니티 카테고리
CREATE TYPE community_category AS ENUM ('tips', 'qna', 'free');

-- ============================================
-- 2. community_posts 테이블 (게시글)
-- ============================================

CREATE TABLE community_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category community_category NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  view_count INTEGER NOT NULL DEFAULT 0,
  prompt_id UUID REFERENCES prompts(id) ON DELETE SET NULL, -- 프롬프트 태깅 (선택적)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_community_posts_author_id ON community_posts(author_id);
CREATE INDEX idx_community_posts_category ON community_posts(category);
CREATE INDEX idx_community_posts_created_at ON community_posts(created_at DESC);
CREATE INDEX idx_community_posts_prompt_id ON community_posts(prompt_id) WHERE prompt_id IS NOT NULL;
CREATE INDEX idx_community_posts_view_count ON community_posts(view_count DESC);

-- RLS 활성화
ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 모든 사용자는 게시글 조회 가능
CREATE POLICY "모든 사용자는 게시글 조회 가능"
ON community_posts FOR SELECT
USING (true);

-- RLS 정책: 로그인한 사용자는 게시글 작성 가능
CREATE POLICY "로그인한 사용자는 게시글 작성 가능"
ON community_posts FOR INSERT
WITH CHECK (author_id = auth.uid());

-- RLS 정책: 작성자는 본인 게시글 수정 가능
CREATE POLICY "작성자는 본인 게시글 수정 가능"
ON community_posts FOR UPDATE
USING (author_id = auth.uid())
WITH CHECK (author_id = auth.uid());

-- RLS 정책: 작성자는 본인 게시글 삭제 가능
CREATE POLICY "작성자는 본인 게시글 삭제 가능"
ON community_posts FOR DELETE
USING (author_id = auth.uid());

-- ============================================
-- 3. community_comments 테이블 (댓글)
-- ============================================

CREATE TABLE community_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_community_comments_post_id ON community_comments(post_id);
CREATE INDEX idx_community_comments_author_id ON community_comments(author_id);
CREATE INDEX idx_community_comments_created_at ON community_comments(created_at DESC);

-- RLS 활성화
ALTER TABLE community_comments ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 모든 사용자는 댓글 조회 가능
CREATE POLICY "모든 사용자는 댓글 조회 가능"
ON community_comments FOR SELECT
USING (true);

-- RLS 정책: 로그인한 사용자는 댓글 작성 가능
CREATE POLICY "로그인한 사용자는 댓글 작성 가능"
ON community_comments FOR INSERT
WITH CHECK (author_id = auth.uid());

-- RLS 정책: 작성자는 본인 댓글 삭제 가능
CREATE POLICY "작성자는 본인 댓글 삭제 가능"
ON community_comments FOR DELETE
USING (author_id = auth.uid());

-- ============================================
-- 4. community_likes 테이블 (좋아요)
-- ============================================

CREATE TABLE community_likes (
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, post_id) -- 중복 좋아요 방지
);

-- 인덱스
CREATE INDEX idx_community_likes_post_id ON community_likes(post_id);
CREATE INDEX idx_community_likes_user_id ON community_likes(user_id);

-- RLS 활성화
ALTER TABLE community_likes ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 모든 사용자는 좋아요 조회 가능
CREATE POLICY "모든 사용자는 좋아요 조회 가능"
ON community_likes FOR SELECT
USING (true);

-- RLS 정책: 로그인한 사용자는 좋아요 작성 가능
CREATE POLICY "로그인한 사용자는 좋아요 작성 가능"
ON community_likes FOR INSERT
WITH CHECK (user_id = auth.uid());

-- RLS 정책: 본인은 본인 좋아요 삭제 가능
CREATE POLICY "본인은 본인 좋아요 삭제 가능"
ON community_likes FOR DELETE
USING (user_id = auth.uid());

-- ============================================
-- 5. Trigger 함수: updated_at 자동 갱신
-- ============================================

CREATE TRIGGER community_posts_updated_at
BEFORE UPDATE ON community_posts
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- ============================================
-- 6. 함수: 게시글 조회수 증가
-- ============================================

CREATE OR REPLACE FUNCTION increment_community_post_view_count(post_uuid UUID)
RETURNS void AS $$
BEGIN
  UPDATE community_posts
  SET view_count = view_count + 1
  WHERE id = post_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 완료
-- ============================================


