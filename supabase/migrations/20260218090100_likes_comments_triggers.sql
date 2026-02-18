-- =============================================================
-- Likes & Comments Count Triggers
-- =============================================================
-- Problem: likes and comments_count on gyeol_moltbook_posts are
-- manually incremented in application code, leading to race
-- conditions and inconsistent counts.
--
-- Fix: Use DB triggers to automatically maintain counts when
-- rows are inserted/deleted in gyeol_moltbook_likes and
-- gyeol_moltbook_comments.
-- =============================================================

-- -----------------------------------------------------------
-- 1. Likes count trigger (gyeol_moltbook_likes -> posts.likes)
-- -----------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_increment_likes_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.gyeol_moltbook_posts
  SET likes = likes + 1
  WHERE id = NEW.post_id;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_decrement_likes_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.gyeol_moltbook_posts
  SET likes = GREATEST(0, likes - 1)
  WHERE id = OLD.post_id;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_likes_increment ON public.gyeol_moltbook_likes;
CREATE TRIGGER trg_likes_increment
  AFTER INSERT ON public.gyeol_moltbook_likes
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_increment_likes_count();

DROP TRIGGER IF EXISTS trg_likes_decrement ON public.gyeol_moltbook_likes;
CREATE TRIGGER trg_likes_decrement
  AFTER DELETE ON public.gyeol_moltbook_likes
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_decrement_likes_count();

-- -----------------------------------------------------------
-- 2. Comments count trigger (gyeol_moltbook_comments -> posts.comments_count)
-- -----------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_increment_comments_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.gyeol_moltbook_posts
  SET comments_count = comments_count + 1
  WHERE id = NEW.post_id;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_decrement_comments_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.gyeol_moltbook_posts
  SET comments_count = GREATEST(0, comments_count - 1)
  WHERE id = OLD.post_id;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_comments_increment ON public.gyeol_moltbook_comments;
CREATE TRIGGER trg_comments_increment
  AFTER INSERT ON public.gyeol_moltbook_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_increment_comments_count();

DROP TRIGGER IF EXISTS trg_comments_decrement ON public.gyeol_moltbook_comments;
CREATE TRIGGER trg_comments_decrement
  AFTER DELETE ON public.gyeol_moltbook_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_decrement_comments_count();

-- -----------------------------------------------------------
-- 3. Fix existing counts (one-time reconciliation)
-- -----------------------------------------------------------

UPDATE public.gyeol_moltbook_posts p
SET likes = (
  SELECT COUNT(*) FROM public.gyeol_moltbook_likes l
  WHERE l.post_id = p.id
)
WHERE EXISTS (SELECT 1 FROM public.gyeol_moltbook_likes l WHERE l.post_id = p.id);

UPDATE public.gyeol_moltbook_posts p
SET comments_count = (
  SELECT COUNT(*) FROM public.gyeol_moltbook_comments c
  WHERE c.post_id = p.id
)
WHERE EXISTS (SELECT 1 FROM public.gyeol_moltbook_comments c WHERE c.post_id = p.id);
