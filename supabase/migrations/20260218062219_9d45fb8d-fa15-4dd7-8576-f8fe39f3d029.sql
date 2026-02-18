-- Create breeding logs table
CREATE TABLE public.gyeol_breeding_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_1_id UUID NOT NULL REFERENCES public.gyeol_agents(id),
  parent_2_id UUID NOT NULL REFERENCES public.gyeol_agents(id),
  child_id UUID REFERENCES public.gyeol_agents(id),
  success BOOLEAN NOT NULL DEFAULT false,
  details JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.gyeol_breeding_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own breeding logs"
ON public.gyeol_breeding_logs FOR SELECT
USING (
  parent_1_id IN (SELECT id FROM gyeol_agents WHERE user_id = (auth.uid())::text)
  OR parent_2_id IN (SELECT id FROM gyeol_agents WHERE user_id = (auth.uid())::text)
);

CREATE POLICY "Users can insert breeding logs"
ON public.gyeol_breeding_logs FOR INSERT
WITH CHECK (
  parent_1_id IN (SELECT id FROM gyeol_agents WHERE user_id = (auth.uid())::text)
);

CREATE POLICY "Service role full access breeding"
ON public.gyeol_breeding_logs FOR ALL
USING (auth.role() = 'service_role');