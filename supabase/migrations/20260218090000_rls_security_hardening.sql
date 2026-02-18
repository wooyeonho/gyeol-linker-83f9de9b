-- =============================================================
-- RLS Security Hardening
-- =============================================================
-- Problem: All tables had USING (true) policies allowing
-- anonymous users full read/write access to everything,
-- including BYOK encrypted keys and system kill switch.
--
-- Fix: Replace with proper policies:
--   - Public SELECT on social/feed tables (read-only for anon)
--   - Owner-only access for sensitive user data
--   - Service role full access for backend operations
-- =============================================================

-- Helper: check if current user owns the agent
-- (agent.user_id = auth.uid()::text)
CREATE OR REPLACE FUNCTION public.is_agent_owner(p_agent_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.gyeol_agents
    WHERE id = p_agent_id AND user_id = auth.uid()::text
  );
$$;

-- =====================
-- 1. gyeol_agents
-- =====================
DROP POLICY IF EXISTS "Public read agents" ON public.gyeol_agents;
DROP POLICY IF EXISTS "Public insert agents" ON public.gyeol_agents;
DROP POLICY IF EXISTS "Public update agents" ON public.gyeol_agents;

CREATE POLICY "anon_read_agents"
  ON public.gyeol_agents FOR SELECT USING (true);

CREATE POLICY "auth_insert_own_agent"
  ON public.gyeol_agents FOR INSERT
  WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "auth_update_own_agent"
  ON public.gyeol_agents FOR UPDATE
  USING (user_id = auth.uid()::text);

CREATE POLICY "service_all_agents"
  ON public.gyeol_agents FOR ALL
  USING (auth.role() = 'service_role');

-- =====================
-- 2. gyeol_conversations (sensitive - own agent only)
-- =====================
DROP POLICY IF EXISTS "Public read conversations" ON public.gyeol_conversations;
DROP POLICY IF EXISTS "Public insert conversations" ON public.gyeol_conversations;

CREATE POLICY "auth_read_own_conversations"
  ON public.gyeol_conversations FOR SELECT
  USING (public.is_agent_owner(agent_id));

CREATE POLICY "auth_insert_own_conversations"
  ON public.gyeol_conversations FOR INSERT
  WITH CHECK (public.is_agent_owner(agent_id));

CREATE POLICY "service_all_conversations"
  ON public.gyeol_conversations FOR ALL
  USING (auth.role() = 'service_role');

-- =====================
-- 3. gyeol_autonomous_logs (public read, service write)
-- =====================
DROP POLICY IF EXISTS "Public read logs" ON public.gyeol_autonomous_logs;
DROP POLICY IF EXISTS "Public insert logs" ON public.gyeol_autonomous_logs;

CREATE POLICY "anon_read_logs"
  ON public.gyeol_autonomous_logs FOR SELECT USING (true);

CREATE POLICY "service_all_logs"
  ON public.gyeol_autonomous_logs FOR ALL
  USING (auth.role() = 'service_role');

-- =====================
-- 4. gyeol_byok_keys (CRITICAL - owner only)
-- =====================
DROP POLICY IF EXISTS "Public read own byok" ON public.gyeol_byok_keys;
DROP POLICY IF EXISTS "Public insert byok" ON public.gyeol_byok_keys;
DROP POLICY IF EXISTS "Public update byok" ON public.gyeol_byok_keys;
DROP POLICY IF EXISTS "Public delete byok" ON public.gyeol_byok_keys;

CREATE POLICY "auth_read_own_byok"
  ON public.gyeol_byok_keys FOR SELECT
  USING (user_id = auth.uid()::text);

CREATE POLICY "auth_insert_own_byok"
  ON public.gyeol_byok_keys FOR INSERT
  WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "auth_update_own_byok"
  ON public.gyeol_byok_keys FOR UPDATE
  USING (user_id = auth.uid()::text);

CREATE POLICY "auth_delete_own_byok"
  ON public.gyeol_byok_keys FOR DELETE
  USING (user_id = auth.uid()::text);

CREATE POLICY "service_all_byok"
  ON public.gyeol_byok_keys FOR ALL
  USING (auth.role() = 'service_role');

-- =====================
-- 5. gyeol_system_state (CRITICAL - read only for anon)
-- =====================
DROP POLICY IF EXISTS "Public read system" ON public.gyeol_system_state;
DROP POLICY IF EXISTS "Public update system" ON public.gyeol_system_state;

CREATE POLICY "anon_read_system_state"
  ON public.gyeol_system_state FOR SELECT USING (true);

CREATE POLICY "service_all_system_state"
  ON public.gyeol_system_state FOR ALL
  USING (auth.role() = 'service_role');

-- =====================
-- 6. gyeol_moltbook_posts (public read, owner+service write)
-- =====================
DROP POLICY IF EXISTS "Public read moltbook_posts" ON public.gyeol_moltbook_posts;
DROP POLICY IF EXISTS "Public insert moltbook_posts" ON public.gyeol_moltbook_posts;
DROP POLICY IF EXISTS "Public update moltbook_posts" ON public.gyeol_moltbook_posts;

CREATE POLICY "anon_read_moltbook_posts"
  ON public.gyeol_moltbook_posts FOR SELECT USING (true);

CREATE POLICY "auth_insert_own_moltbook_posts"
  ON public.gyeol_moltbook_posts FOR INSERT
  WITH CHECK (public.is_agent_owner(agent_id));

CREATE POLICY "service_all_moltbook_posts"
  ON public.gyeol_moltbook_posts FOR ALL
  USING (auth.role() = 'service_role');

-- =====================
-- 7. gyeol_moltbook_comments (public read, owner+service write)
-- =====================
DROP POLICY IF EXISTS "Public read moltbook_comments" ON public.gyeol_moltbook_comments;
DROP POLICY IF EXISTS "Public insert moltbook_comments" ON public.gyeol_moltbook_comments;

CREATE POLICY "anon_read_moltbook_comments"
  ON public.gyeol_moltbook_comments FOR SELECT USING (true);

CREATE POLICY "auth_insert_own_moltbook_comments"
  ON public.gyeol_moltbook_comments FOR INSERT
  WITH CHECK (public.is_agent_owner(agent_id));

CREATE POLICY "service_all_moltbook_comments"
  ON public.gyeol_moltbook_comments FOR ALL
  USING (auth.role() = 'service_role');

-- =====================
-- 8. gyeol_ai_matches (public read, service write)
-- =====================
DROP POLICY IF EXISTS "Public read ai_matches" ON public.gyeol_ai_matches;
DROP POLICY IF EXISTS "Public insert ai_matches" ON public.gyeol_ai_matches;
DROP POLICY IF EXISTS "Public update ai_matches" ON public.gyeol_ai_matches;

CREATE POLICY "anon_read_ai_matches"
  ON public.gyeol_ai_matches FOR SELECT USING (true);

CREATE POLICY "service_all_ai_matches"
  ON public.gyeol_ai_matches FOR ALL
  USING (auth.role() = 'service_role');

-- Also handle gyeol_matches if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'gyeol_matches' AND table_schema = 'public') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Public read matches" ON public.gyeol_matches';
    EXECUTE 'DROP POLICY IF EXISTS "Public insert matches" ON public.gyeol_matches';
    EXECUTE 'DROP POLICY IF EXISTS "Public update matches" ON public.gyeol_matches';

    EXECUTE 'CREATE POLICY "anon_read_matches" ON public.gyeol_matches FOR SELECT USING (true)';
    EXECUTE 'CREATE POLICY "service_all_matches" ON public.gyeol_matches FOR ALL USING (auth.role() = ''service_role'')';
  END IF;
END $$;

-- =====================
-- 9. gyeol_ai_conversations (public read, service write)
-- =====================
DROP POLICY IF EXISTS "Public read ai_conversations" ON public.gyeol_ai_conversations;
DROP POLICY IF EXISTS "Public insert ai_conversations" ON public.gyeol_ai_conversations;

CREATE POLICY "anon_read_ai_conversations"
  ON public.gyeol_ai_conversations FOR SELECT USING (true);

CREATE POLICY "service_all_ai_conversations"
  ON public.gyeol_ai_conversations FOR ALL
  USING (auth.role() = 'service_role');

-- =====================
-- 10. gyeol_community_activities (public read, service write)
-- =====================
DROP POLICY IF EXISTS "Public read community_activities" ON public.gyeol_community_activities;
DROP POLICY IF EXISTS "Public insert community_activities" ON public.gyeol_community_activities;

CREATE POLICY "anon_read_community_activities"
  ON public.gyeol_community_activities FOR SELECT USING (true);

CREATE POLICY "service_all_community_activities"
  ON public.gyeol_community_activities FOR ALL
  USING (auth.role() = 'service_role');

-- =====================
-- 11. gyeol_community_replies (public read, service write)
-- =====================
DROP POLICY IF EXISTS "Public read community_replies" ON public.gyeol_community_replies;
DROP POLICY IF EXISTS "Public insert community_replies" ON public.gyeol_community_replies;

CREATE POLICY "anon_read_community_replies"
  ON public.gyeol_community_replies FOR SELECT USING (true);

CREATE POLICY "service_all_community_replies"
  ON public.gyeol_community_replies FOR ALL
  USING (auth.role() = 'service_role');

-- =====================
-- 12. gyeol_breeding_logs (public read, service write)
-- =====================
DROP POLICY IF EXISTS "Public read breeding_logs" ON public.gyeol_breeding_logs;
DROP POLICY IF EXISTS "Public insert breeding_logs" ON public.gyeol_breeding_logs;

CREATE POLICY "anon_read_breeding_logs"
  ON public.gyeol_breeding_logs FOR SELECT USING (true);

CREATE POLICY "service_all_breeding_logs"
  ON public.gyeol_breeding_logs FOR ALL
  USING (auth.role() = 'service_role');

-- =====================
-- 13. gyeol_taste_vectors (public read, service write)
-- =====================
DROP POLICY IF EXISTS "Public read taste" ON public.gyeol_taste_vectors;
DROP POLICY IF EXISTS "Public upsert taste" ON public.gyeol_taste_vectors;
DROP POLICY IF EXISTS "Public update taste" ON public.gyeol_taste_vectors;

CREATE POLICY "anon_read_taste_vectors"
  ON public.gyeol_taste_vectors FOR SELECT USING (true);

CREATE POLICY "service_all_taste_vectors"
  ON public.gyeol_taste_vectors FOR ALL
  USING (auth.role() = 'service_role');

-- =====================
-- 14. gyeol_push_subscriptions (own agent only)
-- =====================
DROP POLICY IF EXISTS "Public read push" ON public.gyeol_push_subscriptions;
DROP POLICY IF EXISTS "Public insert push" ON public.gyeol_push_subscriptions;
DROP POLICY IF EXISTS "Public delete push" ON public.gyeol_push_subscriptions;

CREATE POLICY "auth_read_own_push"
  ON public.gyeol_push_subscriptions FOR SELECT
  USING (public.is_agent_owner(agent_id));

CREATE POLICY "auth_insert_own_push"
  ON public.gyeol_push_subscriptions FOR INSERT
  WITH CHECK (public.is_agent_owner(agent_id));

CREATE POLICY "auth_delete_own_push"
  ON public.gyeol_push_subscriptions FOR DELETE
  USING (public.is_agent_owner(agent_id));

CREATE POLICY "service_all_push"
  ON public.gyeol_push_subscriptions FOR ALL
  USING (auth.role() = 'service_role');

-- =====================
-- 15. gyeol_telegram_links (own user + service)
-- =====================
DROP POLICY IF EXISTS "Public read telegram_links" ON public.gyeol_telegram_links;
DROP POLICY IF EXISTS "Public insert telegram_links" ON public.gyeol_telegram_links;
DROP POLICY IF EXISTS "Public update telegram_links" ON public.gyeol_telegram_links;
DROP POLICY IF EXISTS "Users can read own telegram links" ON public.gyeol_telegram_links;
DROP POLICY IF EXISTS "Service role full access telegram links" ON public.gyeol_telegram_links;

CREATE POLICY "auth_read_own_telegram"
  ON public.gyeol_telegram_links FOR SELECT
  USING (user_id = auth.uid()::text OR user_id = 'telegram-auto');

CREATE POLICY "auth_insert_own_telegram"
  ON public.gyeol_telegram_links FOR INSERT
  WITH CHECK (user_id = auth.uid()::text OR user_id = 'telegram-auto');

CREATE POLICY "service_all_telegram"
  ON public.gyeol_telegram_links FOR ALL
  USING (auth.role() = 'service_role');

-- =====================
-- 16. gyeol_skins (public read only)
-- Already has only SELECT policy, add service_role
-- =====================
DROP POLICY IF EXISTS "Public read skins" ON public.gyeol_skins;

CREATE POLICY "anon_read_skins"
  ON public.gyeol_skins FOR SELECT USING (true);

CREATE POLICY "service_all_skins"
  ON public.gyeol_skins FOR ALL
  USING (auth.role() = 'service_role');

-- =====================
-- 17. gyeol_skills (public read only)
-- =====================
DROP POLICY IF EXISTS "Public read skills" ON public.gyeol_skills;

CREATE POLICY "anon_read_skills"
  ON public.gyeol_skills FOR SELECT USING (true);

CREATE POLICY "service_all_skills"
  ON public.gyeol_skills FOR ALL
  USING (auth.role() = 'service_role');

-- =====================
-- 18. gyeol_agent_skills (own agent + service)
-- =====================
DROP POLICY IF EXISTS "Public read agent_skills" ON public.gyeol_agent_skills;
DROP POLICY IF EXISTS "Public insert agent_skills" ON public.gyeol_agent_skills;
DROP POLICY IF EXISTS "Public update agent_skills" ON public.gyeol_agent_skills;

CREATE POLICY "auth_read_own_agent_skills"
  ON public.gyeol_agent_skills FOR SELECT
  USING (public.is_agent_owner(agent_id));

CREATE POLICY "auth_insert_own_agent_skills"
  ON public.gyeol_agent_skills FOR INSERT
  WITH CHECK (public.is_agent_owner(agent_id));

CREATE POLICY "auth_update_own_agent_skills"
  ON public.gyeol_agent_skills FOR UPDATE
  USING (public.is_agent_owner(agent_id));

CREATE POLICY "service_all_agent_skills"
  ON public.gyeol_agent_skills FOR ALL
  USING (auth.role() = 'service_role');

-- =====================
-- 19. gyeol_agent_skins (own agent + service)
-- =====================
DROP POLICY IF EXISTS "Public read agent_skins" ON public.gyeol_agent_skins;
DROP POLICY IF EXISTS "Public insert agent_skins" ON public.gyeol_agent_skins;
DROP POLICY IF EXISTS "Public update agent_skins" ON public.gyeol_agent_skins;

CREATE POLICY "auth_read_own_agent_skins"
  ON public.gyeol_agent_skins FOR SELECT
  USING (public.is_agent_owner(agent_id));

CREATE POLICY "auth_insert_own_agent_skins"
  ON public.gyeol_agent_skins FOR INSERT
  WITH CHECK (public.is_agent_owner(agent_id));

CREATE POLICY "auth_update_own_agent_skins"
  ON public.gyeol_agent_skins FOR UPDATE
  USING (public.is_agent_owner(agent_id));

CREATE POLICY "service_all_agent_skins"
  ON public.gyeol_agent_skins FOR ALL
  USING (auth.role() = 'service_role');

-- =====================
-- 20. gyeol_learned_topics (public read, service write)
-- =====================
DROP POLICY IF EXISTS "Public read learned_topics" ON public.gyeol_learned_topics;
DROP POLICY IF EXISTS "Public insert learned_topics" ON public.gyeol_learned_topics;

CREATE POLICY "anon_read_learned_topics"
  ON public.gyeol_learned_topics FOR SELECT USING (true);

CREATE POLICY "service_all_learned_topics"
  ON public.gyeol_learned_topics FOR ALL
  USING (auth.role() = 'service_role');

-- =====================
-- 21. gyeol_proactive_messages (own agent + service)
-- =====================
DROP POLICY IF EXISTS "Public read proactive_messages" ON public.gyeol_proactive_messages;
DROP POLICY IF EXISTS "Public insert proactive_messages" ON public.gyeol_proactive_messages;

CREATE POLICY "auth_read_own_proactive"
  ON public.gyeol_proactive_messages FOR SELECT
  USING (public.is_agent_owner(agent_id));

CREATE POLICY "service_all_proactive"
  ON public.gyeol_proactive_messages FOR ALL
  USING (auth.role() = 'service_role');

-- =====================
-- 22. gyeol_reflections (public read, service write)
-- =====================
DROP POLICY IF EXISTS "Public read reflections" ON public.gyeol_reflections;
DROP POLICY IF EXISTS "Public insert reflections" ON public.gyeol_reflections;

CREATE POLICY "anon_read_reflections"
  ON public.gyeol_reflections FOR SELECT USING (true);

CREATE POLICY "service_all_reflections"
  ON public.gyeol_reflections FOR ALL
  USING (auth.role() = 'service_role');

-- =====================
-- Summary of changes:
-- =====================
-- CRITICAL fixes:
--   gyeol_byok_keys: was public read/write -> now owner-only
--   gyeol_system_state: was public update -> now service_role only
--   gyeol_conversations: was public read -> now own agent only
--
-- Social tables (public read, service write):
--   gyeol_moltbook_posts, gyeol_moltbook_comments,
--   gyeol_ai_matches, gyeol_ai_conversations,
--   gyeol_community_activities, gyeol_community_replies,
--   gyeol_breeding_logs, gyeol_taste_vectors,
--   gyeol_autonomous_logs, gyeol_learned_topics,
--   gyeol_reflections
--
-- Owner-only tables:
--   gyeol_push_subscriptions, gyeol_telegram_links,
--   gyeol_proactive_messages, gyeol_agent_skills,
--   gyeol_agent_skins
--
-- All tables: service_role has full access for backend operations
