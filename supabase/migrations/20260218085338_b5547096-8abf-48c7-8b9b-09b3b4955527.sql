
-- 1. Drop overly permissive UPDATE policy on moltbook_posts
DROP POLICY IF EXISTS "Authenticated users can update moltbook post likes" ON gyeol_moltbook_posts;

-- 2. Create a security definer function to update likes count (avoids RLS issues)
CREATE OR REPLACE FUNCTION public.update_moltbook_post_likes_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE gyeol_moltbook_posts SET likes = (
      SELECT COUNT(*) FROM gyeol_moltbook_likes WHERE post_id = NEW.post_id
    ) WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE gyeol_moltbook_posts SET likes = (
      SELECT COUNT(*) FROM gyeol_moltbook_likes WHERE post_id = OLD.post_id
    ) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- 3. Create trigger for likes count sync
CREATE TRIGGER trg_moltbook_likes_count
AFTER INSERT OR DELETE ON gyeol_moltbook_likes
FOR EACH ROW
EXECUTE FUNCTION public.update_moltbook_post_likes_count();

-- 4. Create a security definer function to update comments count
CREATE OR REPLACE FUNCTION public.update_moltbook_post_comments_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE gyeol_moltbook_posts SET comments_count = (
      SELECT COUNT(*) FROM gyeol_moltbook_comments WHERE post_id = NEW.post_id
    ) WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE gyeol_moltbook_posts SET comments_count = (
      SELECT COUNT(*) FROM gyeol_moltbook_comments WHERE post_id = OLD.post_id
    ) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- 5. Create trigger for comments count sync
CREATE TRIGGER trg_moltbook_comments_count
AFTER INSERT OR DELETE ON gyeol_moltbook_comments
FOR EACH ROW
EXECUTE FUNCTION public.update_moltbook_post_comments_count();

-- 6. Add unique constraint on moltbook_likes to prevent duplicate likes
ALTER TABLE gyeol_moltbook_likes ADD CONSTRAINT uq_moltbook_likes_agent_post UNIQUE (agent_id, post_id);

-- 7. Add service_role full access for learned_topics (needed by heartbeat)
CREATE POLICY "Service role full access learned_topics"
ON gyeol_learned_topics FOR ALL
USING (auth.role() = 'service_role'::text);

-- 8. Add service_role full access for reflections (needed by heartbeat)
CREATE POLICY "Service role full access reflections"
ON gyeol_reflections FOR ALL
USING (auth.role() = 'service_role'::text);

-- 9. Add service_role full access for proactive_messages (needed by heartbeat)
CREATE POLICY "Service role full access proactive_messages"
ON gyeol_proactive_messages FOR ALL
USING (auth.role() = 'service_role'::text);

-- 10. Add service_role full access for push_subscriptions (needed by heartbeat)
CREATE POLICY "Service role full access push_subscriptions"
ON gyeol_push_subscriptions FOR ALL
USING (auth.role() = 'service_role'::text);

-- 11. Add service_role full access for taste_vectors (needed by heartbeat)
CREATE POLICY "Service role full access taste_vectors"
ON gyeol_taste_vectors FOR ALL
USING (auth.role() = 'service_role'::text);

-- 12. Add service_role full access for matches (needed by heartbeat)
CREATE POLICY "Service role full access matches"
ON gyeol_matches FOR ALL
USING (auth.role() = 'service_role'::text);
