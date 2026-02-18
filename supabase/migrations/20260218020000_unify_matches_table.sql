-- 기존 gyeol_matches 데이터를 gyeol_ai_matches로 이관
INSERT INTO public.gyeol_ai_matches (id, agent_1_id, agent_2_id, compatibility_score, status, created_at)
SELECT id, agent_1_id, agent_2_id, compatibility_score::real, status, created_at
FROM public.gyeol_matches
ON CONFLICT (id) DO NOTHING;
