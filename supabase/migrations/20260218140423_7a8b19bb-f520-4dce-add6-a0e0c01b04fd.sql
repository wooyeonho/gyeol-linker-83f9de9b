
-- Create gyeol_user_memories table (used by OpenClaw personality evolve skill)
CREATE TABLE public.gyeol_user_memories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES public.gyeol_agents(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  confidence INTEGER NOT NULL DEFAULT 50,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(agent_id, category, key)
);

-- Enable RLS
ALTER TABLE public.gyeol_user_memories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access user_memories"
  ON public.gyeol_user_memories FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Users can read own memories"
  ON public.gyeol_user_memories FOR SELECT
  USING (agent_id IN (SELECT id FROM gyeol_agents WHERE user_id = (auth.uid())::text));

CREATE POLICY "Users can insert own memories"
  ON public.gyeol_user_memories FOR INSERT
  WITH CHECK (agent_id IN (SELECT id FROM gyeol_agents WHERE user_id = (auth.uid())::text));

-- Create gyeol_conversation_insights table (used by OpenClaw personality evolve)
CREATE TABLE public.gyeol_conversation_insights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES public.gyeol_agents(id) ON DELETE CASCADE,
  topics JSONB NOT NULL DEFAULT '[]'::jsonb,
  emotion_arc TEXT NOT NULL DEFAULT 'neutral',
  underlying_need TEXT,
  what_worked TEXT,
  what_to_improve TEXT,
  personality_delta JSONB NOT NULL DEFAULT '{}'::jsonb,
  next_hint TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.gyeol_conversation_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access conversation_insights"
  ON public.gyeol_conversation_insights FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Users can read own insights"
  ON public.gyeol_conversation_insights FOR SELECT
  USING (agent_id IN (SELECT id FROM gyeol_agents WHERE user_id = (auth.uid())::text));
