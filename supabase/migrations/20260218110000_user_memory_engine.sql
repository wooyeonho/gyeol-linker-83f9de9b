-- GYEOL Core Engine V2 — User Memory + Conversation Insights

-- 1. User Memory 테이블
CREATE TABLE IF NOT EXISTS public.gyeol_user_memories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES public.gyeol_agents(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN (
    'identity', 'preference', 'interest', 'relationship',
    'goal', 'emotion', 'experience', 'style', 'knowledge_level'
  )),
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  confidence INTEGER NOT NULL DEFAULT 50 CHECK (confidence BETWEEN 0 AND 100),
  access_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(agent_id, key)
);

CREATE INDEX idx_user_memories_agent ON public.gyeol_user_memories(agent_id);
CREATE INDEX idx_user_memories_confidence ON public.gyeol_user_memories(agent_id, confidence DESC);

ALTER TABLE public.gyeol_user_memories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner_read_memories" ON public.gyeol_user_memories FOR SELECT
  USING (public.is_agent_owner(agent_id));
CREATE POLICY "service_all_memories" ON public.gyeol_user_memories FOR ALL
  USING (auth.role() = 'service_role');

-- 2. Conversation Insights 테이블
CREATE TABLE IF NOT EXISTS public.gyeol_conversation_insights (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES public.gyeol_agents(id) ON DELETE CASCADE,
  topics TEXT[] DEFAULT '{}',
  emotion_arc TEXT DEFAULT 'neutral',
  underlying_need TEXT,
  what_worked TEXT,
  what_to_improve TEXT,
  personality_delta JSONB DEFAULT '{}',
  next_hint TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_insights_agent ON public.gyeol_conversation_insights(agent_id, created_at DESC);

ALTER TABLE public.gyeol_conversation_insights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner_read_insights" ON public.gyeol_conversation_insights FOR SELECT
  USING (public.is_agent_owner(agent_id));
CREATE POLICY "service_all_insights" ON public.gyeol_conversation_insights FOR ALL
  USING (auth.role() = 'service_role');

-- 3. learned_topics에 source_url 컬럼 추가
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='gyeol_learned_topics' AND column_name='source_url'
  ) THEN
    ALTER TABLE public.gyeol_learned_topics ADD COLUMN source_url TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='gyeol_learned_topics' AND column_name='source'
  ) THEN
    ALTER TABLE public.gyeol_learned_topics ADD COLUMN source TEXT DEFAULT 'rss';
  END IF;
END $$;

-- 4. autonomous_logs에 source 컨럼 추가 (openclaw vs nextjs 구분)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='gyeol_autonomous_logs' AND column_name='source'
  ) THEN
    ALTER TABLE public.gyeol_autonomous_logs ADD COLUMN source TEXT DEFAULT 'nextjs';
  END IF;
END $$;

-- 5. learned_topics UNIQUE 제약 (upsert 지원)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='uq_learned_topics_agent_topic') THEN
    ALTER TABLE public.gyeol_learned_topics
      ADD CONSTRAINT uq_learned_topics_agent_topic UNIQUE (agent_id, topic);
  END IF;
END $$;
