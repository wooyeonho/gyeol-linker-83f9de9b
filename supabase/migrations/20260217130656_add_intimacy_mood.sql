ALTER TABLE gyeol_agents ADD COLUMN IF NOT EXISTS intimacy real DEFAULT 0;
ALTER TABLE gyeol_agents ADD COLUMN IF NOT EXISTS mood text DEFAULT 'neutral';
ALTER TABLE gyeol_agents ADD COLUMN IF NOT EXISTS consecutive_days integer DEFAULT 0;
