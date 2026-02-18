
-- Add unique constraint on user_id to prevent duplicate agents per user
ALTER TABLE public.gyeol_agents ADD CONSTRAINT gyeol_agents_user_id_unique UNIQUE (user_id);
