
-- GYEOL Agents
CREATE TABLE public.gyeol_agents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT 'GYEOL',
  gen INT NOT NULL DEFAULT 1,
  total_conversations INT NOT NULL DEFAULT 0,
  evolution_progress NUMERIC NOT NULL DEFAULT 0,
  warmth INT NOT NULL DEFAULT 50,
  logic INT NOT NULL DEFAULT 50,
  creativity INT NOT NULL DEFAULT 50,
  energy INT NOT NULL DEFAULT 50,
  humor INT NOT NULL DEFAULT 50,
  visual_state JSONB NOT NULL DEFAULT '{"color_primary":"#4F46E5","color_secondary":"#818CF8","glow_intensity":0.5,"particle_count":30,"form":"sphere"}',
  skin_id TEXT,
  preferred_provider TEXT NOT NULL DEFAULT 'groq',
  openclaw_agent_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_active TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.gyeol_agents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read agents" ON public.gyeol_agents FOR SELECT USING (true);
CREATE POLICY "Public insert agents" ON public.gyeol_agents FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update agents" ON public.gyeol_agents FOR UPDATE USING (true);

-- GYEOL Conversations
CREATE TABLE public.gyeol_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES public.gyeol_agents(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user','assistant','system')),
  content TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'web',
  provider TEXT,
  tokens_used INT,
  response_time_ms INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.gyeol_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read conversations" ON public.gyeol_conversations FOR SELECT USING (true);
CREATE POLICY "Public insert conversations" ON public.gyeol_conversations FOR INSERT WITH CHECK (true);

-- Enable realtime for conversations
ALTER PUBLICATION supabase_realtime ADD TABLE public.gyeol_conversations;

-- GYEOL Autonomous Logs
CREATE TABLE public.gyeol_autonomous_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES public.gyeol_agents(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('learning','reflection','social','proactive_message','skill_execution','error')),
  summary TEXT,
  details JSONB NOT NULL DEFAULT '{}',
  was_sandboxed BOOLEAN NOT NULL DEFAULT false,
  security_flags TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.gyeol_autonomous_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read logs" ON public.gyeol_autonomous_logs FOR SELECT USING (true);
CREATE POLICY "Public insert logs" ON public.gyeol_autonomous_logs FOR INSERT WITH CHECK (true);

-- Enable realtime for logs
ALTER PUBLICATION supabase_realtime ADD TABLE public.gyeol_autonomous_logs;

-- GYEOL AI Matches
CREATE TABLE public.gyeol_matches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_1_id UUID NOT NULL REFERENCES public.gyeol_agents(id) ON DELETE CASCADE,
  agent_2_id UUID NOT NULL REFERENCES public.gyeol_agents(id) ON DELETE CASCADE,
  compatibility_score NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','matched','chatting','ended')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.gyeol_matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read matches" ON public.gyeol_matches FOR SELECT USING (true);
CREATE POLICY "Public insert matches" ON public.gyeol_matches FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update matches" ON public.gyeol_matches FOR UPDATE USING (true);

-- GYEOL Taste Vectors
CREATE TABLE public.gyeol_taste_vectors (
  agent_id UUID NOT NULL REFERENCES public.gyeol_agents(id) ON DELETE CASCADE PRIMARY KEY,
  interests JSONB NOT NULL DEFAULT '{}',
  topics JSONB NOT NULL DEFAULT '{}',
  communication_style JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.gyeol_taste_vectors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read taste" ON public.gyeol_taste_vectors FOR SELECT USING (true);
CREATE POLICY "Public upsert taste" ON public.gyeol_taste_vectors FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update taste" ON public.gyeol_taste_vectors FOR UPDATE USING (true);

-- GYEOL Skins
CREATE TABLE public.gyeol_skins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  creator_id TEXT,
  price INT NOT NULL DEFAULT 0,
  preview_url TEXT,
  skin_data JSONB,
  category TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  downloads INT NOT NULL DEFAULT 0,
  rating NUMERIC NOT NULL DEFAULT 0,
  is_approved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.gyeol_skins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read skins" ON public.gyeol_skins FOR SELECT USING (true);

-- GYEOL Skills
CREATE TABLE public.gyeol_skills (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  creator_id TEXT,
  price INT NOT NULL DEFAULT 0,
  skill_code TEXT,
  category TEXT,
  min_gen INT NOT NULL DEFAULT 1,
  downloads INT NOT NULL DEFAULT 0,
  rating NUMERIC NOT NULL DEFAULT 0,
  is_approved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.gyeol_skills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read skills" ON public.gyeol_skills FOR SELECT USING (true);

-- GYEOL System State
CREATE TABLE public.gyeol_system_state (
  id TEXT NOT NULL DEFAULT 'global' PRIMARY KEY,
  kill_switch BOOLEAN NOT NULL DEFAULT false,
  reason TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.gyeol_system_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read system" ON public.gyeol_system_state FOR SELECT USING (true);
CREATE POLICY "Public update system" ON public.gyeol_system_state FOR UPDATE USING (true);

-- BYOK Keys
CREATE TABLE public.gyeol_byok_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  encrypted_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, provider)
);
ALTER TABLE public.gyeol_byok_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read own byok" ON public.gyeol_byok_keys FOR SELECT USING (true);
CREATE POLICY "Public insert byok" ON public.gyeol_byok_keys FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update byok" ON public.gyeol_byok_keys FOR UPDATE USING (true);
CREATE POLICY "Public delete byok" ON public.gyeol_byok_keys FOR DELETE USING (true);

-- Push Subscriptions
CREATE TABLE public.gyeol_push_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES public.gyeol_agents(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  subscription JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.gyeol_push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read push" ON public.gyeol_push_subscriptions FOR SELECT USING (true);
CREATE POLICY "Public insert push" ON public.gyeol_push_subscriptions FOR INSERT WITH CHECK (true);
CREATE POLICY "Public delete push" ON public.gyeol_push_subscriptions FOR DELETE USING (true);

-- Insert default system state
INSERT INTO public.gyeol_system_state (id, kill_switch, reason) VALUES ('global', false, 'Initial state');

-- Insert sample skins
INSERT INTO public.gyeol_skins (name, description, price, category, tags, downloads, rating, is_approved) VALUES
  ('Cosmic Blue', '우주 느낌의 블루 글로우', 0, '기본', ARRAY['블루','글로우'], 120, 4.5, true),
  ('Amber Warm', '따뜻한 앰버 톤', 500, '프리미엄', ARRAY['앰버','따뜻한'], 89, 4.8, true),
  ('Neon Pulse', '네온 사이버펑크 스타일', 300, '테마', ARRAY['네온','사이버'], 65, 4.2, true),
  ('Forest Zen', '숲속 명상 테마', 0, '기본', ARRAY['자연','명상'], 200, 4.7, true);

-- Insert sample skills
INSERT INTO public.gyeol_skills (name, description, category, min_gen, price, downloads, rating, is_approved) VALUES
  ('RSS 학습', 'RSS 피드에서 자동 학습', '유틸리티', 1, 0, 200, 4.5, true),
  ('Moltbook 소셜', '다른 AI와 소셜 활동', '소셜', 2, 0, 150, 4.8, true),
  ('코드 리뷰', 'GitHub PR 자동 리뷰', '개발', 3, 1000, 45, 4.3, true),
  ('일기 분석', '감정 패턴 분석 및 리포트', '웰니스', 1, 0, 310, 4.6, true);
