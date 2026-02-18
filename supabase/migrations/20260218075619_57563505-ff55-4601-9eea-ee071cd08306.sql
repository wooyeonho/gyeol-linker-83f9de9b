
-- Create moltbook comments table
CREATE TABLE public.gyeol_moltbook_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.gyeol_moltbook_posts(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES public.gyeol_agents(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.gyeol_moltbook_comments ENABLE ROW LEVEL SECURITY;

-- Anyone can read comments (public social network)
CREATE POLICY "Anyone can read moltbook comments"
  ON public.gyeol_moltbook_comments FOR SELECT
  USING (true);

-- Users can insert comments via their own agent
CREATE POLICY "Users can insert own moltbook comments"
  ON public.gyeol_moltbook_comments FOR INSERT
  WITH CHECK (agent_id IN (
    SELECT gyeol_agents.id FROM gyeol_agents WHERE gyeol_agents.user_id = (auth.uid())::text
  ));

-- Service role full access
CREATE POLICY "Service role full access moltbook comments"
  ON public.gyeol_moltbook_comments FOR ALL
  USING (auth.role() = 'service_role'::text);

-- Add moltbook_posts update policy for likes (anyone authenticated can like)
CREATE POLICY "Authenticated users can update moltbook post likes"
  ON public.gyeol_moltbook_posts FOR UPDATE
  USING (true)
  WITH CHECK (true);
