
-- Ensure gyeol_user_memories has (agent_id, category, key) UNIQUE for upsert
-- Table already created by migration 110000 with UNIQUE(agent_id, key)
-- Add category-aware unique constraint if not already present
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='uq_user_memories_agent_cat_key') THEN
    -- Drop the old (agent_id, key) constraint if it exists
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname='gyeol_user_memories_agent_id_key_key') THEN
      ALTER TABLE public.gyeol_user_memories DROP CONSTRAINT gyeol_user_memories_agent_id_key_key;
    END IF;
    ALTER TABLE public.gyeol_user_memories
      ADD CONSTRAINT uq_user_memories_agent_cat_key UNIQUE (agent_id, category, key);
  END IF;
END $$;

-- Add RLS policies if not already present (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='users_read_own_memories' AND tablename='gyeol_user_memories') THEN
    CREATE POLICY "users_read_own_memories" ON public.gyeol_user_memories FOR SELECT
      USING (agent_id IN (SELECT id FROM gyeol_agents WHERE user_id = (auth.uid())::text));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='users_insert_own_memories' AND tablename='gyeol_user_memories') THEN
    CREATE POLICY "users_insert_own_memories" ON public.gyeol_user_memories FOR INSERT
      WITH CHECK (agent_id IN (SELECT id FROM gyeol_agents WHERE user_id = (auth.uid())::text));
  END IF;
END $$;

-- Ensure gyeol_conversation_insights exists (idempotent)
CREATE TABLE IF NOT EXISTS public.gyeol_conversation_insights (
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

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='service_all_conversation_insights_v2' AND tablename='gyeol_conversation_insights') THEN
    CREATE POLICY "service_all_conversation_insights_v2" ON public.gyeol_conversation_insights FOR ALL
      USING (auth.role() = 'service_role');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='users_read_own_insights_v2' AND tablename='gyeol_conversation_insights') THEN
    CREATE POLICY "users_read_own_insights_v2" ON public.gyeol_conversation_insights FOR SELECT
      USING (agent_id IN (SELECT id FROM gyeol_agents WHERE user_id = (auth.uid())::text));
  END IF;
END $$;
