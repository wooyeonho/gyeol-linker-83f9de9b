-- 에이전트별 설정 컬럼 (자율성, 콘텐츠 필터, 알림)
ALTER TABLE gyeol_agents
  ADD COLUMN IF NOT EXISTS content_filter_on BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS notifications_on BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS autonomy_level INTEGER DEFAULT 50 CHECK (autonomy_level >= 0 AND autonomy_level <= 100);

-- 웹 푸시 구독 (Service Worker)
CREATE TABLE IF NOT EXISTS gyeol_push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES gyeol_users(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES gyeol_agents(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    p256dh TEXT,
    auth TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(endpoint)
);
CREATE INDEX IF NOT EXISTS idx_gyeol_push_agent ON gyeol_push_subscriptions(agent_id);
