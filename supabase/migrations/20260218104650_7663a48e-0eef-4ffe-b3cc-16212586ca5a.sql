
-- User-managed RSS feeds
CREATE TABLE public.gyeol_user_feeds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES public.gyeol_agents(id) ON DELETE CASCADE,
  feed_url TEXT NOT NULL,
  feed_name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_fetched_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.gyeol_user_feeds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own feeds" ON public.gyeol_user_feeds
  FOR SELECT USING (agent_id IN (SELECT id FROM gyeol_agents WHERE user_id = (auth.uid())::text));

CREATE POLICY "Users can insert own feeds" ON public.gyeol_user_feeds
  FOR INSERT WITH CHECK (agent_id IN (SELECT id FROM gyeol_agents WHERE user_id = (auth.uid())::text));

CREATE POLICY "Users can update own feeds" ON public.gyeol_user_feeds
  FOR UPDATE USING (agent_id IN (SELECT id FROM gyeol_agents WHERE user_id = (auth.uid())::text));

CREATE POLICY "Users can delete own feeds" ON public.gyeol_user_feeds
  FOR DELETE USING (agent_id IN (SELECT id FROM gyeol_agents WHERE user_id = (auth.uid())::text));

CREATE POLICY "Service role full access feeds" ON public.gyeol_user_feeds
  FOR ALL USING (auth.role() = 'service_role'::text);

-- User-managed interest keywords
CREATE TABLE public.gyeol_user_keywords (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES public.gyeol_agents(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.gyeol_user_keywords ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own keywords" ON public.gyeol_user_keywords
  FOR SELECT USING (agent_id IN (SELECT id FROM gyeol_agents WHERE user_id = (auth.uid())::text));

CREATE POLICY "Users can insert own keywords" ON public.gyeol_user_keywords
  FOR INSERT WITH CHECK (agent_id IN (SELECT id FROM gyeol_agents WHERE user_id = (auth.uid())::text));

CREATE POLICY "Users can delete own keywords" ON public.gyeol_user_keywords
  FOR DELETE USING (agent_id IN (SELECT id FROM gyeol_agents WHERE user_id = (auth.uid())::text));

CREATE POLICY "Service role full access keywords" ON public.gyeol_user_keywords
  FOR ALL USING (auth.role() = 'service_role'::text);
