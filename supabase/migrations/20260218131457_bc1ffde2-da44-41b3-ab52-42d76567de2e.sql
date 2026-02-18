-- Add moltbook.com API key storage to agents table
ALTER TABLE public.gyeol_agents ADD COLUMN IF NOT EXISTS moltbook_api_key TEXT DEFAULT NULL;
ALTER TABLE public.gyeol_agents ADD COLUMN IF NOT EXISTS moltbook_agent_name TEXT DEFAULT NULL;
ALTER TABLE public.gyeol_agents ADD COLUMN IF NOT EXISTS moltbook_status TEXT DEFAULT NULL;
ALTER TABLE public.gyeol_agents ADD COLUMN IF NOT EXISTS moltbook_claim_url TEXT DEFAULT NULL;