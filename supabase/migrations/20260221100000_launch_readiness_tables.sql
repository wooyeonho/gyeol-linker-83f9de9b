-- Launch Readiness Migration
-- P0: L-003 Rate Limits, L-005 Reports/Blocks, L-007 System State
-- P1: L-012 Feedback
-- P2: L-013 Referrals
-- P0: L-021 Performance Indexes

-- Rate Limits (L-003)
CREATE TABLE IF NOT EXISTS gyeol_rate_limits (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id text NOT NULL,
  endpoint text NOT NULL DEFAULT 'api',
  window_start timestamptz NOT NULL DEFAULT now(),
  count integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE gyeol_rate_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role manages rate limits" ON gyeol_rate_limits FOR ALL USING (true) WITH CHECK (true);

-- Reports (L-005)
CREATE TABLE IF NOT EXISTS gyeol_reports (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_agent_id uuid NOT NULL,
  target_type text NOT NULL CHECK (target_type IN ('post', 'comment', 'moltbook', 'dm')),
  target_id text NOT NULL,
  reason text NOT NULL CHECK (reason IN ('spam', 'hate', 'sexual', 'scam', 'other')),
  details text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'dismissed')),
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE gyeol_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can create reports" ON gyeol_reports FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can view own reports" ON gyeol_reports FOR SELECT USING (reporter_agent_id::text = auth.uid()::text OR auth.role() = 'service_role');

-- Blocks (L-005)
CREATE TABLE IF NOT EXISTS gyeol_blocks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  blocker_agent_id uuid NOT NULL,
  blocked_agent_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(blocker_agent_id, blocked_agent_id)
);
ALTER TABLE gyeol_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own blocks" ON gyeol_blocks FOR ALL USING (true) WITH CHECK (true);

-- System State (L-007)
CREATE TABLE IF NOT EXISTS gyeol_system_state (
  id text PRIMARY KEY DEFAULT 'global',
  kill_switch boolean NOT NULL DEFAULT false,
  reason text,
  announcement text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE gyeol_system_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read system state" ON gyeol_system_state FOR SELECT USING (true);
CREATE POLICY "Service role manages system state" ON gyeol_system_state FOR ALL USING (true) WITH CHECK (true);
INSERT INTO gyeol_system_state (id, kill_switch) VALUES ('global', false) ON CONFLICT (id) DO NOTHING;

-- Feedback (L-012)
CREATE TABLE IF NOT EXISTS gyeol_feedback (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id uuid,
  user_id uuid,
  category text NOT NULL CHECK (category IN ('bug', 'feature', 'ui', 'other')),
  message text NOT NULL,
  contact_email text,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'resolved')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE gyeol_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can submit feedback" ON gyeol_feedback FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can view own feedback" ON gyeol_feedback FOR SELECT USING (user_id = auth.uid() OR auth.role() = 'service_role');

-- Referrals (L-013)
CREATE TABLE IF NOT EXISTS gyeol_referrals (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_agent_id uuid NOT NULL,
  referee_agent_id uuid NOT NULL,
  referral_code text NOT NULL,
  referrer_reward integer NOT NULL DEFAULT 100,
  referee_reward integer NOT NULL DEFAULT 50,
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'expired')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(referee_agent_id)
);
ALTER TABLE gyeol_referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage referrals" ON gyeol_referrals FOR ALL USING (true) WITH CHECK (true);

-- Login History for DAU tracking (L-007)
CREATE TABLE IF NOT EXISTS gyeol_login_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  login_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE gyeol_login_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role manages login history" ON gyeol_login_history FOR ALL USING (true) WITH CHECK (true);

-- Conversation Archive (L-022)
CREATE TABLE IF NOT EXISTS gyeol_conversation_archive (
  id uuid PRIMARY KEY,
  agent_id uuid NOT NULL,
  role text NOT NULL,
  content text NOT NULL,
  metadata jsonb DEFAULT '{}',
  original_created_at timestamptz NOT NULL,
  archived_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE gyeol_conversation_archive ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own archived conversations" ON gyeol_conversation_archive FOR SELECT USING (true);
CREATE POLICY "Service role manages archives" ON gyeol_conversation_archive FOR ALL USING (true) WITH CHECK (true);

-- Performance Indexes (L-021)
CREATE INDEX IF NOT EXISTS idx_conversations_agent_created ON gyeol_conversations(agent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_moltbook_posts_agent ON gyeol_moltbook_posts(agent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gamification_agent ON gyeol_gamification(agent_id);
CREATE INDEX IF NOT EXISTS idx_rate_limits_user_endpoint ON gyeol_rate_limits(user_id, endpoint, window_start);
CREATE INDEX IF NOT EXISTS idx_reports_status ON gyeol_reports(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_blocks_blocker ON gyeol_blocks(blocker_agent_id);
CREATE INDEX IF NOT EXISTS idx_feedback_status ON gyeol_feedback(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON gyeol_referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_login_history_user ON gyeol_login_history(user_id, login_at DESC);
CREATE INDEX IF NOT EXISTS idx_archive_agent ON gyeol_conversation_archive(agent_id, original_created_at DESC);
