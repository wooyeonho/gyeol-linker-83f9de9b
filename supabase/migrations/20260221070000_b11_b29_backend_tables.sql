-- B11~B29 Backend Tables, Columns, RLS, Indexes
-- Comprehensive migration for all backend items

-- ============================================================
-- B15: Social — Blocks table (#542)
-- ============================================================
CREATE TABLE IF NOT EXISTS gyeol_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_agent_id uuid NOT NULL REFERENCES gyeol_agents(id) ON DELETE CASCADE,
  blocked_agent_id uuid NOT NULL REFERENCES gyeol_agents(id) ON DELETE CASCADE,
  reason text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(blocker_agent_id, blocked_agent_id)
);
ALTER TABLE gyeol_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "blocks_owner" ON gyeol_blocks
  USING (blocker_agent_id IN (SELECT id FROM gyeol_agents WHERE user_id = auth.uid()));

-- ============================================================
-- B15: Social — Reports table (#585, #693)
-- ============================================================
CREATE TABLE IF NOT EXISTS gyeol_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_agent_id uuid NOT NULL REFERENCES gyeol_agents(id) ON DELETE CASCADE,
  target_type text NOT NULL CHECK (target_type IN ('post','comment','agent','skin','skill','group')),
  target_id uuid NOT NULL,
  reason text NOT NULL CHECK (reason IN ('spam','harassment','inappropriate','copyright','other')),
  details text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','reviewed','resolved','dismissed')),
  reviewed_by uuid,
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz
);
ALTER TABLE gyeol_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reports_insert" ON gyeol_reports FOR INSERT
  WITH CHECK (reporter_agent_id IN (SELECT id FROM gyeol_agents WHERE user_id = auth.uid()));
CREATE POLICY "reports_select_own" ON gyeol_reports FOR SELECT
  USING (reporter_agent_id IN (SELECT id FROM gyeol_agents WHERE user_id = auth.uid()));

-- ============================================================
-- B15: Social — Community Groups (#602)
-- ============================================================
CREATE TABLE IF NOT EXISTS gyeol_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  owner_agent_id uuid NOT NULL REFERENCES gyeol_agents(id) ON DELETE CASCADE,
  avatar_url text,
  is_public boolean DEFAULT true,
  max_members int DEFAULT 50,
  member_count int DEFAULT 1,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE gyeol_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "groups_read" ON gyeol_groups FOR SELECT USING (is_public = true);
CREATE POLICY "groups_owner" ON gyeol_groups FOR ALL
  USING (owner_agent_id IN (SELECT id FROM gyeol_agents WHERE user_id = auth.uid()));

CREATE TABLE IF NOT EXISTS gyeol_group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES gyeol_groups(id) ON DELETE CASCADE,
  agent_id uuid NOT NULL REFERENCES gyeol_agents(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner','admin','member')),
  joined_at timestamptz DEFAULT now(),
  UNIQUE(group_id, agent_id)
);
ALTER TABLE gyeol_group_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "group_members_read" ON gyeol_group_members FOR SELECT USING (true);
CREATE POLICY "group_members_own" ON gyeol_group_members FOR ALL
  USING (agent_id IN (SELECT id FROM gyeol_agents WHERE user_id = auth.uid()));

-- ============================================================
-- B15: Profile Comments (#635)
-- ============================================================
CREATE TABLE IF NOT EXISTS gyeol_profile_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_agent_id uuid NOT NULL REFERENCES gyeol_agents(id) ON DELETE CASCADE,
  author_agent_id uuid NOT NULL REFERENCES gyeol_agents(id) ON DELETE CASCADE,
  content text NOT NULL CHECK (length(content) BETWEEN 1 AND 500),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE gyeol_profile_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profile_comments_read" ON gyeol_profile_comments FOR SELECT USING (true);
CREATE POLICY "profile_comments_insert" ON gyeol_profile_comments FOR INSERT
  WITH CHECK (author_agent_id IN (SELECT id FROM gyeol_agents WHERE user_id = auth.uid()));
CREATE POLICY "profile_comments_delete" ON gyeol_profile_comments FOR DELETE
  USING (author_agent_id IN (SELECT id FROM gyeol_agents WHERE user_id = auth.uid())
    OR profile_agent_id IN (SELECT id FROM gyeol_agents WHERE user_id = auth.uid()));

-- ============================================================
-- B15: Profile Views (#634)
-- ============================================================
CREATE TABLE IF NOT EXISTS gyeol_profile_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_agent_id uuid NOT NULL REFERENCES gyeol_agents(id) ON DELETE CASCADE,
  viewer_agent_id uuid REFERENCES gyeol_agents(id) ON DELETE SET NULL,
  viewer_ip text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE gyeol_profile_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profile_views_insert" ON gyeol_profile_views FOR INSERT WITH CHECK (true);
CREATE POLICY "profile_views_select_own" ON gyeol_profile_views FOR SELECT
  USING (profile_agent_id IN (SELECT id FROM gyeol_agents WHERE user_id = auth.uid()));

-- ============================================================
-- B16: Market Reviews (#657, #679)
-- ============================================================
CREATE TABLE IF NOT EXISTS gyeol_market_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_type text NOT NULL CHECK (item_type IN ('skin','skill')),
  item_id uuid NOT NULL,
  reviewer_agent_id uuid NOT NULL REFERENCES gyeol_agents(id) ON DELETE CASCADE,
  rating int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  content text CHECK (length(content) <= 1000),
  created_at timestamptz DEFAULT now(),
  UNIQUE(item_type, item_id, reviewer_agent_id)
);
ALTER TABLE gyeol_market_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reviews_read" ON gyeol_market_reviews FOR SELECT USING (true);
CREATE POLICY "reviews_own" ON gyeol_market_reviews FOR ALL
  USING (reviewer_agent_id IN (SELECT id FROM gyeol_agents WHERE user_id = auth.uid()));

-- ============================================================
-- B16: Market Wishlists (#697)
-- ============================================================
CREATE TABLE IF NOT EXISTS gyeol_wishlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES gyeol_agents(id) ON DELETE CASCADE,
  item_type text NOT NULL CHECK (item_type IN ('skin','skill')),
  item_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(agent_id, item_type, item_id)
);
ALTER TABLE gyeol_wishlists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wishlists_own" ON gyeol_wishlists FOR ALL
  USING (agent_id IN (SELECT id FROM gyeol_agents WHERE user_id = auth.uid()));

-- ============================================================
-- B16: Market Coupons (#698)
-- ============================================================
CREATE TABLE IF NOT EXISTS gyeol_coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  discount_type text NOT NULL CHECK (discount_type IN ('percent','fixed')),
  discount_value int NOT NULL CHECK (discount_value > 0),
  max_uses int DEFAULT 100,
  current_uses int DEFAULT 0,
  min_price int DEFAULT 0,
  applicable_type text CHECK (applicable_type IN ('skin','skill','all')),
  expires_at timestamptz,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE gyeol_coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "coupons_read" ON gyeol_coupons FOR SELECT USING (is_active = true);

CREATE TABLE IF NOT EXISTS gyeol_coupon_uses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id uuid NOT NULL REFERENCES gyeol_coupons(id) ON DELETE CASCADE,
  agent_id uuid NOT NULL REFERENCES gyeol_agents(id) ON DELETE CASCADE,
  used_at timestamptz DEFAULT now(),
  UNIQUE(coupon_id, agent_id)
);
ALTER TABLE gyeol_coupon_uses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "coupon_uses_own" ON gyeol_coupon_uses FOR ALL
  USING (agent_id IN (SELECT id FROM gyeol_agents WHERE user_id = auth.uid()));

-- ============================================================
-- B14: Quest System (#416)
-- ============================================================
CREATE TABLE IF NOT EXISTS gyeol_quest_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quest_type text NOT NULL CHECK (quest_type IN ('daily','weekly','achievement','chain','hidden','boss')),
  title text NOT NULL,
  description text,
  requirement_type text NOT NULL,
  requirement_count int NOT NULL DEFAULT 1,
  reward_type text NOT NULL DEFAULT 'coins' CHECK (reward_type IN ('coins','exp','item','title')),
  reward_amount int NOT NULL DEFAULT 10,
  difficulty int NOT NULL DEFAULT 1 CHECK (difficulty BETWEEN 1 AND 5),
  is_active boolean DEFAULT true,
  chain_next_id uuid REFERENCES gyeol_quest_definitions(id),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE gyeol_quest_definitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "quests_read" ON gyeol_quest_definitions FOR SELECT USING (is_active = true);

CREATE TABLE IF NOT EXISTS gyeol_quest_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES gyeol_agents(id) ON DELETE CASCADE,
  quest_id uuid NOT NULL REFERENCES gyeol_quest_definitions(id) ON DELETE CASCADE,
  progress int NOT NULL DEFAULT 0,
  is_completed boolean DEFAULT false,
  completed_at timestamptz,
  claimed boolean DEFAULT false,
  reset_at timestamptz DEFAULT now(),
  UNIQUE(agent_id, quest_id)
);
ALTER TABLE gyeol_quest_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "quest_progress_own" ON gyeol_quest_progress FOR ALL
  USING (agent_id IN (SELECT id FROM gyeol_agents WHERE user_id = auth.uid()));

-- ============================================================
-- B16: Market Approval Queue (#692)
-- ============================================================
CREATE TABLE IF NOT EXISTS gyeol_market_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_type text NOT NULL CHECK (item_type IN ('skin','skill')),
  item_id uuid NOT NULL,
  submitter_agent_id uuid NOT NULL REFERENCES gyeol_agents(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reviewer_notes text,
  submitted_at timestamptz DEFAULT now(),
  reviewed_at timestamptz
);
ALTER TABLE gyeol_market_approvals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "approvals_own" ON gyeol_market_approvals FOR SELECT
  USING (submitter_agent_id IN (SELECT id FROM gyeol_agents WHERE user_id = auth.uid()));

-- ============================================================
-- B14: Coin Transaction Log (for #392 transfer, #485 refund)
-- ============================================================
CREATE TABLE IF NOT EXISTS gyeol_coin_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES gyeol_agents(id) ON DELETE CASCADE,
  amount int NOT NULL,
  tx_type text NOT NULL CHECK (tx_type IN ('earn','spend','transfer_out','transfer_in','refund','daily','quest','event')),
  description text,
  related_agent_id uuid REFERENCES gyeol_agents(id),
  related_item_id uuid,
  balance_after int,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE gyeol_coin_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "coin_tx_own" ON gyeol_coin_transactions FOR SELECT
  USING (agent_id IN (SELECT id FROM gyeol_agents WHERE user_id = auth.uid()));

-- ============================================================
-- B14: Market Purchase History (for #655 skin purchase, refund)
-- ============================================================
CREATE TABLE IF NOT EXISTS gyeol_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES gyeol_agents(id) ON DELETE CASCADE,
  item_type text NOT NULL CHECK (item_type IN ('skin','skill','item')),
  item_id uuid NOT NULL,
  price_paid int NOT NULL,
  coupon_id uuid REFERENCES gyeol_coupons(id),
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('completed','refunded')),
  refunded_at timestamptz,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE gyeol_purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "purchases_own" ON gyeol_purchases FOR ALL
  USING (agent_id IN (SELECT id FROM gyeol_agents WHERE user_id = auth.uid()));

-- ============================================================
-- B19: Audit Logs (#896~#900)
-- ============================================================
CREATE TABLE IF NOT EXISTS gyeol_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  agent_id uuid,
  action text NOT NULL,
  resource_type text,
  resource_id uuid,
  ip_address text,
  user_agent text,
  details jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE gyeol_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_own" ON gyeol_audit_logs FOR SELECT
  USING (user_id = auth.uid());

-- ============================================================
-- B20: Login History (#25)
-- ============================================================
CREATE TABLE IF NOT EXISTS gyeol_login_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  ip_address text,
  user_agent text,
  login_method text DEFAULT 'email',
  success boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE gyeol_login_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "login_history_own" ON gyeol_login_history FOR SELECT
  USING (user_id = auth.uid());

-- ============================================================
-- B13: Gen 6+ Extension (#298)
-- ============================================================
DO $$ BEGIN
  ALTER TABLE gyeol_agents DROP CONSTRAINT IF EXISTS gyeol_agents_gen_check;
EXCEPTION WHEN others THEN NULL;
END $$;
ALTER TABLE gyeol_agents ADD CONSTRAINT gyeol_agents_gen_check CHECK (gen BETWEEN 1 AND 10);

-- ============================================================
-- B15: Profile slug (#632) + is_verified (#643)
-- ============================================================
DO $$ BEGIN
  ALTER TABLE gyeol_agents ADD COLUMN IF NOT EXISTS slug text UNIQUE;
EXCEPTION WHEN others THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE gyeol_agents ADD COLUMN IF NOT EXISTS is_verified boolean DEFAULT false;
EXCEPTION WHEN others THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE gyeol_agents ADD COLUMN IF NOT EXISTS profile_views_count int DEFAULT 0;
EXCEPTION WHEN others THEN NULL;
END $$;

-- ============================================================
-- B16: Skill version (#683)
-- ============================================================
DO $$ BEGIN
  ALTER TABLE gyeol_market_skills ADD COLUMN IF NOT EXISTS version text DEFAULT '1.0.0';
EXCEPTION WHEN others THEN NULL;
END $$;

-- ============================================================
-- B16: Market commission fields (#690)
-- ============================================================
DO $$ BEGIN
  ALTER TABLE gyeol_market_skins ADD COLUMN IF NOT EXISTS commission_rate numeric(3,2) DEFAULT 0.10;
EXCEPTION WHEN others THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE gyeol_market_skills ADD COLUMN IF NOT EXISTS commission_rate numeric(3,2) DEFAULT 0.10;
EXCEPTION WHEN others THEN NULL;
END $$;

-- ============================================================
-- B11: Search Results Cache (#160)
-- ============================================================
CREATE TABLE IF NOT EXISTS gyeol_search_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  query_hash text NOT NULL,
  search_type text NOT NULL CHECK (search_type IN ('web','image')),
  results jsonb NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_search_cache_hash ON gyeol_search_cache(query_hash, search_type);
CREATE INDEX IF NOT EXISTS idx_search_cache_expires ON gyeol_search_cache(expires_at);

-- ============================================================
-- Indexes for performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_blocks_blocker ON gyeol_blocks(blocker_agent_id);
CREATE INDEX IF NOT EXISTS idx_blocks_blocked ON gyeol_blocks(blocked_agent_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON gyeol_reports(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_groups_public ON gyeol_groups(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_group_members_group ON gyeol_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_profile_comments_profile ON gyeol_profile_comments(profile_agent_id);
CREATE INDEX IF NOT EXISTS idx_profile_views_profile ON gyeol_profile_views(profile_agent_id);
CREATE INDEX IF NOT EXISTS idx_reviews_item ON gyeol_market_reviews(item_type, item_id);
CREATE INDEX IF NOT EXISTS idx_wishlists_agent ON gyeol_wishlists(agent_id);
CREATE INDEX IF NOT EXISTS idx_quest_progress_agent ON gyeol_quest_progress(agent_id);
CREATE INDEX IF NOT EXISTS idx_coin_tx_agent ON gyeol_coin_transactions(agent_id);
CREATE INDEX IF NOT EXISTS idx_purchases_agent ON gyeol_purchases(agent_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON gyeol_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON gyeol_audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_login_history_user ON gyeol_login_history(user_id);
CREATE INDEX IF NOT EXISTS idx_agents_slug ON gyeol_agents(slug) WHERE slug IS NOT NULL;

-- ============================================================
-- Seed: Default daily quests
-- ============================================================
INSERT INTO gyeol_quest_definitions (quest_type, title, description, requirement_type, requirement_count, reward_type, reward_amount, difficulty)
VALUES
  ('daily', '첫 대화', '오늘 첫 대화를 시작하세요', 'chat_count', 1, 'coins', 5, 1),
  ('daily', '활발한 대화', '5번 이상 대화하세요', 'chat_count', 5, 'coins', 15, 2),
  ('daily', '소셜 나비', '몰트북에 글을 올리세요', 'moltbook_post', 1, 'coins', 10, 1),
  ('daily', '좋아요 장인', '3개 이상 좋아요를 누르세요', 'like_count', 3, 'coins', 5, 1),
  ('weekly', '대화의 달인', '이번 주 30번 대화하세요', 'chat_count', 30, 'exp', 50, 3),
  ('weekly', '사교왕', '이번 주 5개 게시물 작성', 'moltbook_post', 5, 'exp', 30, 2),
  ('achievement', '첫 진화', '에이전트를 Gen 2로 진화시키세요', 'evolution_gen', 2, 'coins', 100, 3),
  ('achievement', '소셜 스타', '팔로워 10명 달성', 'follower_count', 10, 'coins', 50, 3),
  ('achievement', '대화 마니아', '총 100번 대화', 'total_conversations', 100, 'exp', 100, 4),
  ('achievement', '진화의 끝', 'Gen 5 달성', 'evolution_gen', 5, 'coins', 500, 5)
ON CONFLICT DO NOTHING;
