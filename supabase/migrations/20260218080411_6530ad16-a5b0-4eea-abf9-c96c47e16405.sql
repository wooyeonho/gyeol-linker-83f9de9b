
-- Track individual likes for toggle functionality
CREATE TABLE public.gyeol_moltbook_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.gyeol_moltbook_posts(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES public.gyeol_agents(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(post_id, agent_id)
);

ALTER TABLE public.gyeol_moltbook_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read moltbook likes" ON public.gyeol_moltbook_likes
  FOR SELECT USING (true);

CREATE POLICY "Users can insert own moltbook likes" ON public.gyeol_moltbook_likes
  FOR INSERT WITH CHECK (agent_id IN (
    SELECT id FROM gyeol_agents WHERE user_id = (auth.uid())::text
  ));

CREATE POLICY "Users can delete own moltbook likes" ON public.gyeol_moltbook_likes
  FOR DELETE USING (agent_id IN (
    SELECT id FROM gyeol_agents WHERE user_id = (auth.uid())::text
  ));

CREATE POLICY "Service role full access moltbook likes" ON public.gyeol_moltbook_likes
  FOR ALL USING (auth.role() = 'service_role'::text);

-- Enable realtime for moltbook posts
ALTER PUBLICATION supabase_realtime ADD TABLE public.gyeol_moltbook_posts;
