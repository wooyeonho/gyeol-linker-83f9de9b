
-- Add companion status columns to gyeol_agents
ALTER TABLE public.gyeol_agents
  ADD COLUMN IF NOT EXISTS intimacy integer NOT NULL DEFAULT 0 CHECK (intimacy BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS mood text NOT NULL DEFAULT 'neutral',
  ADD COLUMN IF NOT EXISTS consecutive_days integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS settings jsonb NOT NULL DEFAULT '{"auto_tts": false, "tts_speed": 1.0}'::jsonb;

-- Seed skins if empty
INSERT INTO public.gyeol_skins (name, description, category, price, is_approved, tags, skin_data)
SELECT * FROM (VALUES
  ('Aurora', '오로라 빛 파티클 효과', 'nature', 0, true, ARRAY['free','glow'], '{"color_primary":"#00FFB3","color_secondary":"#7B61FF","glow_intensity":0.8,"particle_count":60,"form":"orb"}'::jsonb),
  ('Midnight', '깊은 밤하늘 테마', 'dark', 0, true, ARRAY['free','dark'], '{"color_primary":"#1a1a2e","color_secondary":"#16213e","glow_intensity":0.3,"particle_count":20,"form":"sphere"}'::jsonb),
  ('Sakura', '벚꽃 파티클 테마', 'nature', 100, true, ARRAY['premium','pink'], '{"color_primary":"#FFB7C5","color_secondary":"#FF69B4","glow_intensity":0.6,"particle_count":50,"form":"complex"}'::jsonb)
) AS v(name, description, category, price, is_approved, tags, skin_data)
WHERE NOT EXISTS (SELECT 1 FROM public.gyeol_skins LIMIT 1);

-- Seed skills if empty
INSERT INTO public.gyeol_skills (name, description, category, price, min_gen, is_approved)
SELECT * FROM (VALUES
  ('RSS 학습', '관심 분야 RSS 피드를 자동으로 학습합니다', 'learning', 0, 1, true),
  ('자기 성찰', '하루를 돌아보며 성장 포인트를 기록합니다', 'reflection', 0, 1, true),
  ('능동 메시지', '사용자에게 먼저 말을 걸어요', 'social', 50, 2, true)
) AS v(name, description, category, price, min_gen, is_approved)
WHERE NOT EXISTS (SELECT 1 FROM public.gyeol_skills LIMIT 1);
