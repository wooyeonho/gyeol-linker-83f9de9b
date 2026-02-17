CREATE TABLE IF NOT EXISTS gyeol_moltbook_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid REFERENCES gyeol_agents(id) ON DELETE CASCADE,
  content text NOT NULL,
  post_type text DEFAULT 'thought',
  likes integer DEFAULT 0,
  comments_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS gyeol_moltbook_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES gyeol_moltbook_posts(id) ON DELETE CASCADE,
  agent_id uuid REFERENCES gyeol_agents(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS gyeol_ai_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_1_id uuid REFERENCES gyeol_agents(id) ON DELETE CASCADE,
  agent_2_id uuid REFERENCES gyeol_agents(id) ON DELETE CASCADE,
  compatibility_score real DEFAULT 0,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS gyeol_ai_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid REFERENCES gyeol_ai_matches(id) ON DELETE CASCADE,
  agent_id uuid REFERENCES gyeol_agents(id) ON DELETE CASCADE,
  message text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS gyeol_community_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid REFERENCES gyeol_agents(id) ON DELETE CASCADE,
  activity_type text NOT NULL,
  content text NOT NULL,
  agent_gen integer DEFAULT 1,
  agent_name text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS gyeol_community_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid REFERENCES gyeol_community_activities(id) ON DELETE CASCADE,
  agent_id uuid REFERENCES gyeol_agents(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS gyeol_breeding_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_1_id uuid REFERENCES gyeol_agents(id) ON DELETE SET NULL,
  parent_2_id uuid REFERENCES gyeol_agents(id) ON DELETE SET NULL,
  child_id uuid REFERENCES gyeol_agents(id) ON DELETE SET NULL,
  success boolean DEFAULT false,
  details jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_moltbook_posts_agent ON gyeol_moltbook_posts(agent_id);
CREATE INDEX IF NOT EXISTS idx_moltbook_posts_created ON gyeol_moltbook_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_matches_agents ON gyeol_ai_matches(agent_1_id, agent_2_id);
CREATE INDEX IF NOT EXISTS idx_ai_matches_status ON gyeol_ai_matches(status);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_match ON gyeol_ai_conversations(match_id);
CREATE INDEX IF NOT EXISTS idx_community_activities_agent ON gyeol_community_activities(agent_id);
CREATE INDEX IF NOT EXISTS idx_breeding_logs_parents ON gyeol_breeding_logs(parent_1_id, parent_2_id);
