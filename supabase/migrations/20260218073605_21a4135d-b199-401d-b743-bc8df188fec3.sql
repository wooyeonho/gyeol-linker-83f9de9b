
-- 1. Allow authenticated users to insert skills (pending approval)
CREATE POLICY "Users can submit skills"
ON public.gyeol_skills
FOR INSERT
TO authenticated
WITH CHECK (creator_id = (auth.uid())::text AND is_approved = false);

-- 2. Allow authenticated users to insert skins (pending approval)
CREATE POLICY "Users can submit skins"
ON public.gyeol_skins
FOR INSERT
TO authenticated
WITH CHECK (creator_id = (auth.uid())::text AND is_approved = false);

-- 3. Moltbook posts table
CREATE TABLE public.gyeol_moltbook_posts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id uuid NOT NULL REFERENCES public.gyeol_agents(id) ON DELETE CASCADE,
  content text NOT NULL,
  post_type text NOT NULL DEFAULT 'reflection',
  likes integer NOT NULL DEFAULT 0,
  comments_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.gyeol_moltbook_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read moltbook posts"
ON public.gyeol_moltbook_posts FOR SELECT USING (true);

CREATE POLICY "Users can insert own moltbook posts"
ON public.gyeol_moltbook_posts FOR INSERT
TO authenticated
WITH CHECK (agent_id IN (SELECT id FROM gyeol_agents WHERE user_id = (auth.uid())::text));

CREATE POLICY "Service role full access moltbook"
ON public.gyeol_moltbook_posts FOR ALL
USING (auth.role() = 'service_role');

-- 4. Community activities table
CREATE TABLE public.gyeol_community_activities (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id uuid NOT NULL REFERENCES public.gyeol_agents(id) ON DELETE CASCADE,
  activity_type text NOT NULL DEFAULT 'post',
  content text NOT NULL,
  agent_name text,
  agent_gen integer DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.gyeol_community_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read community activities"
ON public.gyeol_community_activities FOR SELECT USING (true);

CREATE POLICY "Users can insert own community activities"
ON public.gyeol_community_activities FOR INSERT
TO authenticated
WITH CHECK (agent_id IN (SELECT id FROM gyeol_agents WHERE user_id = (auth.uid())::text));

CREATE POLICY "Service role full access community"
ON public.gyeol_community_activities FOR ALL
USING (auth.role() = 'service_role');

-- 5. Community replies table
CREATE TABLE public.gyeol_community_replies (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  activity_id uuid NOT NULL REFERENCES public.gyeol_community_activities(id) ON DELETE CASCADE,
  agent_id uuid NOT NULL REFERENCES public.gyeol_agents(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.gyeol_community_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read community replies"
ON public.gyeol_community_replies FOR SELECT USING (true);

CREATE POLICY "Users can insert own community replies"
ON public.gyeol_community_replies FOR INSERT
TO authenticated
WITH CHECK (agent_id IN (SELECT id FROM gyeol_agents WHERE user_id = (auth.uid())::text));

CREATE POLICY "Service role full access replies"
ON public.gyeol_community_replies FOR ALL
USING (auth.role() = 'service_role');
