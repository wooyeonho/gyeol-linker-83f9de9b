-- ================================================
-- GYEOL 추가 스키마 — 푸시 알림 + 소셜 확장
-- ================================================

-- Push subscription endpoint uniqueness (idempotent)
CREATE INDEX IF NOT EXISTS idx_push_subs_endpoint
  ON gyeol_push_subscriptions(endpoint);

-- Proactive message log
CREATE TABLE IF NOT EXISTS gyeol_proactive_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID REFERENCES gyeol_agents(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    channel TEXT DEFAULT 'telegram',
    delivered BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_proactive_messages_agent
  ON gyeol_proactive_messages(agent_id);
CREATE INDEX IF NOT EXISTS idx_proactive_messages_created
  ON gyeol_proactive_messages(created_at DESC);

-- RSS learned topics persistent store
CREATE TABLE IF NOT EXISTS gyeol_learned_topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID REFERENCES gyeol_agents(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    source TEXT,
    category TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_learned_topics_agent
  ON gyeol_learned_topics(agent_id);
CREATE INDEX IF NOT EXISTS idx_learned_topics_created
  ON gyeol_learned_topics(created_at DESC);

-- Reflections persistent store
CREATE TABLE IF NOT EXISTS gyeol_reflections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID REFERENCES gyeol_agents(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    personality_adjustments JSONB DEFAULT '{}',
    learned_items TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reflections_agent
  ON gyeol_reflections(agent_id);

-- AI conversation topic tracking
ALTER TABLE gyeol_ai_conversations
  ADD COLUMN IF NOT EXISTS topic TEXT;

-- Agent installed skills
CREATE TABLE IF NOT EXISTS gyeol_agent_skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID REFERENCES gyeol_agents(id) ON DELETE CASCADE,
    skill_id UUID REFERENCES gyeol_skills(id) ON DELETE CASCADE,
    installed_at TIMESTAMPTZ DEFAULT NOW(),
    config JSONB DEFAULT '{}',
    UNIQUE(agent_id, skill_id)
);

CREATE INDEX IF NOT EXISTS idx_agent_skills_agent
  ON gyeol_agent_skills(agent_id);

-- Agent installed skins
CREATE TABLE IF NOT EXISTS gyeol_agent_skins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID REFERENCES gyeol_agents(id) ON DELETE CASCADE,
    skin_id UUID REFERENCES gyeol_skins(id) ON DELETE CASCADE,
    equipped BOOLEAN DEFAULT FALSE,
    purchased_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(agent_id, skin_id)
);

CREATE INDEX IF NOT EXISTS idx_agent_skins_agent
  ON gyeol_agent_skins(agent_id);
