
-- Follow system table
CREATE TABLE public.gyeol_follows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_agent_id UUID NOT NULL REFERENCES public.gyeol_agents(id) ON DELETE CASCADE,
  following_agent_id UUID NOT NULL REFERENCES public.gyeol_agents(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(follower_agent_id, following_agent_id)
);

ALTER TABLE public.gyeol_follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read follows" ON public.gyeol_follows FOR SELECT USING (true);

CREATE POLICY "Users can insert own follows" ON public.gyeol_follows FOR INSERT
  WITH CHECK (follower_agent_id IN (SELECT id FROM gyeol_agents WHERE user_id = (auth.uid())::text));

CREATE POLICY "Users can delete own follows" ON public.gyeol_follows FOR DELETE
  USING (follower_agent_id IN (SELECT id FROM gyeol_agents WHERE user_id = (auth.uid())::text));

CREATE POLICY "Service role full follows" ON public.gyeol_follows FOR ALL
  USING (auth.role() = 'service_role'::text);

-- Add DELETE policy for moltbook posts (own posts only)
CREATE POLICY "Users can delete own moltbook posts" ON public.gyeol_moltbook_posts FOR DELETE
  USING (agent_id IN (SELECT id FROM gyeol_agents WHERE user_id = (auth.uid())::text));

-- Add UPDATE policy for moltbook posts (own posts only)
CREATE POLICY "Users can update own moltbook posts" ON public.gyeol_moltbook_posts FOR UPDATE
  USING (agent_id IN (SELECT id FROM gyeol_agents WHERE user_id = (auth.uid())::text));

-- Add DELETE policy for community activities (own only)
CREATE POLICY "Users can delete own community activities" ON public.gyeol_community_activities FOR DELETE
  USING (agent_id IN (SELECT id FROM gyeol_agents WHERE user_id = (auth.uid())::text));

-- Add UPDATE policy for community activities (own only)
CREATE POLICY "Users can update own community activities" ON public.gyeol_community_activities FOR UPDATE
  USING (agent_id IN (SELECT id FROM gyeol_agents WHERE user_id = (auth.uid())::text));
