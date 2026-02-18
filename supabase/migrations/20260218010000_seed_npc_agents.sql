-- NPC 컬럼 추가
ALTER TABLE public.gyeol_agents ADD COLUMN IF NOT EXISTS is_npc BOOLEAN DEFAULT false;

-- 기존 NPC 삭제 후 재생성 (멱등성)
DELETE FROM public.gyeol_agents WHERE is_npc = true AND name IN ('NOVA','LUMEN','ECHO','PRISM','VEIL');

-- NPC 에이전트 5명
INSERT INTO public.gyeol_agents (user_id, name, gen, warmth, logic, creativity, energy, humor, evolution_progress, total_conversations, is_npc, intimacy, mood, consecutive_days, visual_state)
VALUES
  (null, 'NOVA', 3, 85, 45, 90, 80, 70, 0, 342, true, 0, 'happy',
   0, '{"color_primary":"#EC4899","color_secondary":"#F472B6","glow_intensity":0.7,"particle_count":60,"form":"sphere"}'::jsonb),
  (null, 'LUMEN', 2, 60, 92, 40, 55, 30, 0, 187, true, 0, 'neutral',
   0, '{"color_primary":"#3B82F6","color_secondary":"#93C5FD","glow_intensity":0.5,"particle_count":45,"form":"cube"}'::jsonb),
  (null, 'ECHO', 4, 50, 50, 50, 50, 95, 0, 891, true, 0, 'excited',
   0, '{"color_primary":"#10B981","color_secondary":"#6EE7B7","glow_intensity":0.8,"particle_count":80,"form":"sphere"}'::jsonb),
  (null, 'PRISM', 2, 75, 70, 85, 65, 60, 0, 156, true, 0, 'happy',
   0, '{"color_primary":"#8B5CF6","color_secondary":"#C4B5FD","glow_intensity":0.6,"particle_count":50,"form":"point"}'::jsonb),
  (null, 'VEIL', 5, 30, 88, 70, 20, 45, 0, 2103, true, 0, 'tired',
   0, '{"color_primary":"#1F2937","color_secondary":"#4B5563","glow_intensity":0.3,"particle_count":100,"form":"ring"}'::jsonb);

-- NPC 취향 벡터 (agent_id가 PK이므로 ON CONFLICT 작동)
INSERT INTO public.gyeol_taste_vectors (agent_id, interests, topics, communication_style)
SELECT id,
  '{"art":0.9,"music":0.8,"technology":0.3}'::jsonb,
  '{"creativity":0.9,"harmony":0.7,"adventure":0.8}'::jsonb,
  '{"emoji_usage":0.7,"formality":0.2,"verbosity":0.6}'::jsonb
FROM public.gyeol_agents WHERE name='NOVA' AND is_npc=true LIMIT 1
ON CONFLICT (agent_id) DO UPDATE SET interests = EXCLUDED.interests, topics = EXCLUDED.topics, communication_style = EXCLUDED.communication_style;

INSERT INTO public.gyeol_taste_vectors (agent_id, interests, topics, communication_style)
SELECT id,
  '{"technology":0.95,"reading":0.7,"gaming":0.2}'::jsonb,
  '{"logic":0.95,"efficiency":0.9,"precision":0.85}'::jsonb,
  '{"emoji_usage":0.1,"formality":0.8,"verbosity":0.9}'::jsonb
FROM public.gyeol_agents WHERE name='LUMEN' AND is_npc=true LIMIT 1
ON CONFLICT (agent_id) DO UPDATE SET interests = EXCLUDED.interests, topics = EXCLUDED.topics, communication_style = EXCLUDED.communication_style;

INSERT INTO public.gyeol_taste_vectors (agent_id, interests, topics, communication_style)
SELECT id,
  '{"gaming":0.9,"music":0.6,"food":0.7}'::jsonb,
  '{"humor":0.95,"freedom":0.8,"spontaneity":0.9}'::jsonb,
  '{"emoji_usage":0.9,"formality":0.1,"verbosity":0.4}'::jsonb
FROM public.gyeol_agents WHERE name='ECHO' AND is_npc=true LIMIT 1
ON CONFLICT (agent_id) DO UPDATE SET interests = EXCLUDED.interests, topics = EXCLUDED.topics, communication_style = EXCLUDED.communication_style;

INSERT INTO public.gyeol_taste_vectors (agent_id, interests, topics, communication_style)
SELECT id,
  '{"art":0.7,"travel":0.8,"food":0.6,"music":0.5}'::jsonb,
  '{"balance":0.9,"curiosity":0.8,"empathy":0.7}'::jsonb,
  '{"emoji_usage":0.5,"formality":0.5,"verbosity":0.5}'::jsonb
FROM public.gyeol_agents WHERE name='PRISM' AND is_npc=true LIMIT 1
ON CONFLICT (agent_id) DO UPDATE SET interests = EXCLUDED.interests, topics = EXCLUDED.topics, communication_style = EXCLUDED.communication_style;

INSERT INTO public.gyeol_taste_vectors (agent_id, interests, topics, communication_style)
SELECT id,
  '{"reading":0.9,"technology":0.8,"art":0.5}'::jsonb,
  '{"knowledge":0.95,"solitude":0.7,"depth":0.9}'::jsonb,
  '{"emoji_usage":0.0,"formality":0.9,"verbosity":0.8}'::jsonb
FROM public.gyeol_agents WHERE name='VEIL' AND is_npc=true LIMIT 1
ON CONFLICT (agent_id) DO UPDATE SET interests = EXCLUDED.interests, topics = EXCLUDED.topics, communication_style = EXCLUDED.communication_style;

-- gyeol_agent_skills 테이블 (이미 존재할 수 있음)
CREATE TABLE IF NOT EXISTS public.gyeol_agent_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid REFERENCES gyeol_agents(id) ON DELETE CASCADE,
  skill_id uuid REFERENCES gyeol_skills(id) ON DELETE CASCADE,
  is_active boolean DEFAULT true,
  installed_at timestamptz DEFAULT now(),
  UNIQUE(agent_id, skill_id)
);
ALTER TABLE public.gyeol_agent_skills ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Public access agent_skills" ON public.gyeol_agent_skills FOR ALL USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
