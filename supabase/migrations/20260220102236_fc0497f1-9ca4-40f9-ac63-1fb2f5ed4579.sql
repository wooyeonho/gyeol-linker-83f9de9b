
-- ================================================
-- GYEOL 게이미피케이션 전체 스키마
-- 퀘스트, 업적, EXP/코인, 리더보드, 시즌, 보상상점
-- ================================================

-- ■ 유저 게이미피케이션 프로필 (EXP, 코인, 레벨, 스트릭)
CREATE TABLE IF NOT EXISTS gyeol_gamification_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL UNIQUE,
  exp INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  coins INTEGER NOT NULL DEFAULT 0,
  total_exp INTEGER NOT NULL DEFAULT 0,
  streak_days INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_daily_claim TIMESTAMPTZ,
  title TEXT DEFAULT '초보 동반자',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_gamification_agent FOREIGN KEY (agent_id) REFERENCES gyeol_agents(id) ON DELETE CASCADE
);

-- ■ 퀘스트 정의 (일일/주간/시즌/스페셜)
CREATE TABLE IF NOT EXISTS gyeol_quests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quest_type TEXT NOT NULL DEFAULT 'daily' CHECK (quest_type IN ('daily','weekly','seasonal','special','tutorial')),
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT 'star',
  category TEXT DEFAULT 'general',
  requirement_type TEXT NOT NULL CHECK (requirement_type IN ('chat_count','chat_length','evolution_progress','social_interact','login_streak','market_purchase','breeding','skill_install','community_post','custom')),
  requirement_value INTEGER NOT NULL DEFAULT 1,
  reward_exp INTEGER NOT NULL DEFAULT 10,
  reward_coins INTEGER NOT NULL DEFAULT 0,
  reward_item_id UUID,
  min_level INTEGER NOT NULL DEFAULT 1,
  min_gen INTEGER NOT NULL DEFAULT 1,
  season_id UUID,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ■ 유저 퀘스트 진행 상태
CREATE TABLE IF NOT EXISTS gyeol_quest_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL,
  quest_id UUID NOT NULL,
  current_value INTEGER NOT NULL DEFAULT 0,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  is_claimed BOOLEAN NOT NULL DEFAULT false,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  claimed_at TIMESTAMPTZ,
  CONSTRAINT fk_quest_progress_agent FOREIGN KEY (agent_id) REFERENCES gyeol_agents(id) ON DELETE CASCADE,
  CONSTRAINT fk_quest_progress_quest FOREIGN KEY (quest_id) REFERENCES gyeol_quests(id) ON DELETE CASCADE,
  UNIQUE(agent_id, quest_id, started_at)
);

-- ■ 업적/뱃지 정의
CREATE TABLE IF NOT EXISTS gyeol_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT 'emoji_events',
  category TEXT NOT NULL DEFAULT 'general' CHECK (category IN ('general','social','evolution','chat','market','special','hidden')),
  rarity TEXT NOT NULL DEFAULT 'common' CHECK (rarity IN ('common','uncommon','rare','epic','legendary')),
  requirement_type TEXT NOT NULL,
  requirement_value INTEGER NOT NULL DEFAULT 1,
  reward_exp INTEGER NOT NULL DEFAULT 0,
  reward_coins INTEGER NOT NULL DEFAULT 0,
  reward_title TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_hidden BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ■ 유저 업적 달성 기록
CREATE TABLE IF NOT EXISTS gyeol_achievement_unlocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL,
  achievement_id UUID NOT NULL,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_new BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT fk_achievement_agent FOREIGN KEY (agent_id) REFERENCES gyeol_agents(id) ON DELETE CASCADE,
  CONSTRAINT fk_achievement_ref FOREIGN KEY (achievement_id) REFERENCES gyeol_achievements(id) ON DELETE CASCADE,
  UNIQUE(agent_id, achievement_id)
);

-- ■ 시즌 정의
CREATE TABLE IF NOT EXISTS gyeol_seasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  theme_color TEXT DEFAULT '#7C3AED',
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  reward_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ■ 시즌 패스 진행 (시즌별 유저 EXP 트래킹)
CREATE TABLE IF NOT EXISTS gyeol_season_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL,
  season_id UUID NOT NULL,
  season_exp INTEGER NOT NULL DEFAULT 0,
  tier INTEGER NOT NULL DEFAULT 0,
  rewards_claimed JSONB NOT NULL DEFAULT '[]'::jsonb,
  CONSTRAINT fk_season_agent FOREIGN KEY (agent_id) REFERENCES gyeol_agents(id) ON DELETE CASCADE,
  CONSTRAINT fk_season_ref FOREIGN KEY (season_id) REFERENCES gyeol_seasons(id) ON DELETE CASCADE,
  UNIQUE(agent_id, season_id)
);

-- ■ 보상 상점 아이템
CREATE TABLE IF NOT EXISTS gyeol_shop_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT 'shopping_bag',
  category TEXT NOT NULL DEFAULT 'cosmetic' CHECK (category IN ('cosmetic','boost','title','special','skin','skill')),
  price_coins INTEGER NOT NULL DEFAULT 0,
  price_exp INTEGER NOT NULL DEFAULT 0,
  item_data JSONB DEFAULT '{}',
  stock INTEGER,
  is_limited BOOLEAN NOT NULL DEFAULT false,
  available_from TIMESTAMPTZ,
  available_until TIMESTAMPTZ,
  min_level INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ■ 유저 인벤토리
CREATE TABLE IF NOT EXISTS gyeol_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL,
  item_id UUID NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  is_equipped BOOLEAN NOT NULL DEFAULT false,
  acquired_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_inventory_agent FOREIGN KEY (agent_id) REFERENCES gyeol_agents(id) ON DELETE CASCADE,
  CONSTRAINT fk_inventory_item FOREIGN KEY (item_id) REFERENCES gyeol_shop_items(id) ON DELETE CASCADE,
  UNIQUE(agent_id, item_id)
);

-- ■ EXP/코인 트랜잭션 로그
CREATE TABLE IF NOT EXISTS gyeol_currency_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL,
  currency_type TEXT NOT NULL CHECK (currency_type IN ('exp','coins')),
  amount INTEGER NOT NULL,
  reason TEXT NOT NULL,
  reference_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_currency_agent FOREIGN KEY (agent_id) REFERENCES gyeol_agents(id) ON DELETE CASCADE
);

-- ■ 리더보드 스냅샷 (주간/월간 캐시)
CREATE TABLE IF NOT EXISTS gyeol_leaderboard (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL,
  agent_name TEXT,
  agent_gen INTEGER DEFAULT 1,
  period TEXT NOT NULL CHECK (period IN ('weekly','monthly','alltime')),
  score INTEGER NOT NULL DEFAULT 0,
  rank INTEGER,
  period_start TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_leaderboard_agent FOREIGN KEY (agent_id) REFERENCES gyeol_agents(id) ON DELETE CASCADE,
  UNIQUE(agent_id, period, period_start)
);

-- ■ 인덱스
CREATE INDEX IF NOT EXISTS idx_gamification_agent ON gyeol_gamification_profiles(agent_id);
CREATE INDEX IF NOT EXISTS idx_quest_progress_agent ON gyeol_quest_progress(agent_id);
CREATE INDEX IF NOT EXISTS idx_quest_progress_quest ON gyeol_quest_progress(quest_id);
CREATE INDEX IF NOT EXISTS idx_achievement_unlocks_agent ON gyeol_achievement_unlocks(agent_id);
CREATE INDEX IF NOT EXISTS idx_currency_logs_agent ON gyeol_currency_logs(agent_id);
CREATE INDEX IF NOT EXISTS idx_currency_logs_created ON gyeol_currency_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_period ON gyeol_leaderboard(period, period_start);
CREATE INDEX IF NOT EXISTS idx_leaderboard_score ON gyeol_leaderboard(score DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_agent ON gyeol_inventory(agent_id);
CREATE INDEX IF NOT EXISTS idx_season_progress_agent ON gyeol_season_progress(agent_id);

-- ■ RLS 활성화
ALTER TABLE gyeol_gamification_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE gyeol_quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE gyeol_quest_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE gyeol_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE gyeol_achievement_unlocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE gyeol_seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE gyeol_season_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE gyeol_shop_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE gyeol_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE gyeol_currency_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE gyeol_leaderboard ENABLE ROW LEVEL SECURITY;

-- ■ RLS 정책: gyeol_gamification_profiles
CREATE POLICY "Users can read own gamification" ON gyeol_gamification_profiles FOR SELECT USING (
  agent_id IN (SELECT id FROM gyeol_agents WHERE user_id = (auth.uid())::text)
);
CREATE POLICY "Users can insert own gamification" ON gyeol_gamification_profiles FOR INSERT WITH CHECK (
  agent_id IN (SELECT id FROM gyeol_agents WHERE user_id = (auth.uid())::text)
);
CREATE POLICY "Users can update own gamification" ON gyeol_gamification_profiles FOR UPDATE USING (
  agent_id IN (SELECT id FROM gyeol_agents WHERE user_id = (auth.uid())::text)
);
CREATE POLICY "Service role full gamification" ON gyeol_gamification_profiles FOR ALL USING (auth.role() = 'service_role');

-- ■ RLS 정책: gyeol_quests (모두 읽기 가능)
CREATE POLICY "Anyone can read quests" ON gyeol_quests FOR SELECT USING (true);
CREATE POLICY "Service role manage quests" ON gyeol_quests FOR ALL USING (auth.role() = 'service_role');

-- ■ RLS 정책: gyeol_quest_progress
CREATE POLICY "Users can read own quest progress" ON gyeol_quest_progress FOR SELECT USING (
  agent_id IN (SELECT id FROM gyeol_agents WHERE user_id = (auth.uid())::text)
);
CREATE POLICY "Users can insert own quest progress" ON gyeol_quest_progress FOR INSERT WITH CHECK (
  agent_id IN (SELECT id FROM gyeol_agents WHERE user_id = (auth.uid())::text)
);
CREATE POLICY "Users can update own quest progress" ON gyeol_quest_progress FOR UPDATE USING (
  agent_id IN (SELECT id FROM gyeol_agents WHERE user_id = (auth.uid())::text)
);
CREATE POLICY "Service role full quest progress" ON gyeol_quest_progress FOR ALL USING (auth.role() = 'service_role');

-- ■ RLS 정책: gyeol_achievements (모두 읽기 가능)
CREATE POLICY "Anyone can read achievements" ON gyeol_achievements FOR SELECT USING (true);
CREATE POLICY "Service role manage achievements" ON gyeol_achievements FOR ALL USING (auth.role() = 'service_role');

-- ■ RLS 정책: gyeol_achievement_unlocks
CREATE POLICY "Users can read own achievement unlocks" ON gyeol_achievement_unlocks FOR SELECT USING (
  agent_id IN (SELECT id FROM gyeol_agents WHERE user_id = (auth.uid())::text)
);
CREATE POLICY "Users can insert own achievement unlocks" ON gyeol_achievement_unlocks FOR INSERT WITH CHECK (
  agent_id IN (SELECT id FROM gyeol_agents WHERE user_id = (auth.uid())::text)
);
CREATE POLICY "Users can update own achievement unlocks" ON gyeol_achievement_unlocks FOR UPDATE USING (
  agent_id IN (SELECT id FROM gyeol_agents WHERE user_id = (auth.uid())::text)
);
CREATE POLICY "Service role full achievement unlocks" ON gyeol_achievement_unlocks FOR ALL USING (auth.role() = 'service_role');

-- ■ RLS 정책: gyeol_seasons (모두 읽기 가능)
CREATE POLICY "Anyone can read seasons" ON gyeol_seasons FOR SELECT USING (true);
CREATE POLICY "Service role manage seasons" ON gyeol_seasons FOR ALL USING (auth.role() = 'service_role');

-- ■ RLS 정책: gyeol_season_progress
CREATE POLICY "Users can read own season progress" ON gyeol_season_progress FOR SELECT USING (
  agent_id IN (SELECT id FROM gyeol_agents WHERE user_id = (auth.uid())::text)
);
CREATE POLICY "Users can insert own season progress" ON gyeol_season_progress FOR INSERT WITH CHECK (
  agent_id IN (SELECT id FROM gyeol_agents WHERE user_id = (auth.uid())::text)
);
CREATE POLICY "Users can update own season progress" ON gyeol_season_progress FOR UPDATE USING (
  agent_id IN (SELECT id FROM gyeol_agents WHERE user_id = (auth.uid())::text)
);
CREATE POLICY "Service role full season progress" ON gyeol_season_progress FOR ALL USING (auth.role() = 'service_role');

-- ■ RLS 정책: gyeol_shop_items (모두 읽기 가능)
CREATE POLICY "Anyone can read shop items" ON gyeol_shop_items FOR SELECT USING (true);
CREATE POLICY "Service role manage shop items" ON gyeol_shop_items FOR ALL USING (auth.role() = 'service_role');

-- ■ RLS 정책: gyeol_inventory
CREATE POLICY "Users can read own inventory" ON gyeol_inventory FOR SELECT USING (
  agent_id IN (SELECT id FROM gyeol_agents WHERE user_id = (auth.uid())::text)
);
CREATE POLICY "Users can insert own inventory" ON gyeol_inventory FOR INSERT WITH CHECK (
  agent_id IN (SELECT id FROM gyeol_agents WHERE user_id = (auth.uid())::text)
);
CREATE POLICY "Users can update own inventory" ON gyeol_inventory FOR UPDATE USING (
  agent_id IN (SELECT id FROM gyeol_agents WHERE user_id = (auth.uid())::text)
);
CREATE POLICY "Service role full inventory" ON gyeol_inventory FOR ALL USING (auth.role() = 'service_role');

-- ■ RLS 정책: gyeol_currency_logs
CREATE POLICY "Users can read own currency logs" ON gyeol_currency_logs FOR SELECT USING (
  agent_id IN (SELECT id FROM gyeol_agents WHERE user_id = (auth.uid())::text)
);
CREATE POLICY "Users can insert own currency logs" ON gyeol_currency_logs FOR INSERT WITH CHECK (
  agent_id IN (SELECT id FROM gyeol_agents WHERE user_id = (auth.uid())::text)
);
CREATE POLICY "Service role full currency logs" ON gyeol_currency_logs FOR ALL USING (auth.role() = 'service_role');

-- ■ RLS 정책: gyeol_leaderboard (모두 읽기 가능)
CREATE POLICY "Anyone can read leaderboard" ON gyeol_leaderboard FOR SELECT USING (true);
CREATE POLICY "Service role manage leaderboard" ON gyeol_leaderboard FOR ALL USING (auth.role() = 'service_role');

-- ■ 기본 퀘스트 시드 데이터
INSERT INTO gyeol_quests (quest_type, title, description, icon, category, requirement_type, requirement_value, reward_exp, reward_coins, sort_order) VALUES
  ('daily', '첫 대화 나누기', '오늘 GYEOL과 첫 대화를 시작하세요', 'chat', 'chat', 'chat_count', 1, 10, 5, 1),
  ('daily', '대화 5회 이상', '하루에 5번 이상 대화하세요', 'forum', 'chat', 'chat_count', 5, 25, 10, 2),
  ('daily', '긴 대화 나누기', '50자 이상의 메시지를 3번 보내세요', 'edit_note', 'chat', 'chat_length', 3, 20, 8, 3),
  ('daily', '출석 체크', '매일 접속하여 스트릭을 유지하세요', 'calendar_today', 'general', 'login_streak', 1, 15, 5, 4),
  ('daily', '커뮤니티 활동', '몰트북에 게시물을 하나 남기세요', 'groups', 'social', 'community_post', 1, 20, 10, 5),
  ('weekly', '대화 30회 달성', '이번 주 30번 대화하세요', 'record_voice_over', 'chat', 'chat_count', 30, 100, 50, 1),
  ('weekly', '소셜 나비', '이번 주 매칭 또는 커뮤니티 활동 5회', 'diversity_3', 'social', 'social_interact', 5, 80, 40, 2),
  ('weekly', '진화의 길', '진화 진행도 10% 이상 올리기', 'trending_up', 'evolution', 'evolution_progress', 10, 120, 60, 3),
  ('weekly', '마켓 탐험가', '마켓에서 스킬 또는 스킨 1개 구매', 'storefront', 'market', 'market_purchase', 1, 60, 30, 4),
  ('tutorial', '프로필 완성하기', '에이전트 이름을 설정하세요', 'badge', 'general', 'custom', 1, 50, 25, 1),
  ('tutorial', '첫 번째 진화', 'Gen 2로 진화하세요', 'auto_awesome', 'evolution', 'evolution_progress', 100, 200, 100, 2);

-- ■ 기본 업적 시드 데이터
INSERT INTO gyeol_achievements (name, description, icon, category, rarity, requirement_type, requirement_value, reward_exp, reward_coins, reward_title, sort_order) VALUES
  ('첫 만남', 'GYEOL과 처음 대화를 나누었습니다', 'waving_hand', 'chat', 'common', 'chat_count', 1, 10, 5, NULL, 1),
  ('수다쟁이', '총 100번 대화했습니다', 'chat_bubble', 'chat', 'uncommon', 'chat_count', 100, 50, 25, '수다쟁이', 2),
  ('대화의 달인', '총 500번 대화했습니다', 'forum', 'chat', 'rare', 'chat_count', 500, 200, 100, '대화의 달인', 3),
  ('전설의 대화꾼', '총 1000번 대화했습니다', 'record_voice_over', 'chat', 'legendary', 'chat_count', 1000, 500, 250, '전설의 대화꾼', 4),
  ('Gen 2 돌파', '에이전트가 Gen 2로 진화했습니다', 'looks_two', 'evolution', 'uncommon', 'evolution_gen', 2, 100, 50, NULL, 10),
  ('Gen 3 돌파', '에이전트가 Gen 3로 진화했습니다', 'looks_3', 'evolution', 'rare', 'evolution_gen', 3, 200, 100, '진화의 선구자', 11),
  ('Gen 4 돌파', '에이전트가 Gen 4로 진화했습니다', 'looks_4', 'evolution', 'epic', 'evolution_gen', 4, 400, 200, NULL, 12),
  ('Gen 5 완전체', '에이전트가 최종 Gen 5에 도달했습니다', 'looks_5', 'evolution', 'legendary', 'evolution_gen', 5, 1000, 500, '완전체', 13),
  ('3일 연속 출석', '3일 연속으로 접속했습니다', 'local_fire_department', 'general', 'common', 'login_streak', 3, 20, 10, NULL, 20),
  ('7일 연속 출석', '1주일 연속 접속했습니다', 'whatshot', 'general', 'uncommon', 'login_streak', 7, 50, 25, '꾸준한 동반자', 21),
  ('30일 연속 출석', '한 달 연속 접속했습니다', 'local_fire_department', 'general', 'epic', 'login_streak', 30, 300, 150, '불꽃 의지', 22),
  ('100일 연속 출석', '100일 연속 접속했습니다', 'military_tech', 'general', 'legendary', 'login_streak', 100, 1000, 500, '레전드', 23),
  ('소셜 데뷔', '첫 커뮤니티 게시물을 작성했습니다', 'edit', 'social', 'common', 'community_post', 1, 15, 10, NULL, 30),
  ('인기인', '커뮤니티 게시물 10개를 작성했습니다', 'trending_up', 'social', 'uncommon', 'community_post', 10, 80, 40, '인기인', 31),
  ('첫 매칭', 'AI 매칭에 성공했습니다', 'favorite', 'social', 'uncommon', 'social_interact', 1, 50, 25, NULL, 32),
  ('컬렉터', '스킨 3개를 수집했습니다', 'palette', 'market', 'uncommon', 'market_purchase', 3, 60, 30, '컬렉터', 40),
  ('부자', '코인 1000개를 모았습니다', 'savings', 'general', 'rare', 'coins_total', 1000, 100, 0, '부자', 50),
  ('레벨 10 달성', '레벨 10에 도달했습니다', 'star', 'general', 'rare', 'level_reach', 10, 200, 100, '성장의 아이콘', 60),
  ('레벨 25 달성', '레벨 25에 도달했습니다', 'auto_awesome', 'general', 'epic', 'level_reach', 25, 500, 250, '마스터', 61),
  ('레벨 50 달성', '레벨 50에 도달했습니다', 'diamond', 'general', 'legendary', 'level_reach', 50, 1000, 500, '그랜드 마스터', 62);

-- ■ 기본 상점 아이템 시드 데이터
INSERT INTO gyeol_shop_items (name, description, icon, category, price_coins, item_data, sort_order) VALUES
  ('EXP 부스터 x2', '1시간 동안 획득 EXP 2배', 'speed', 'boost', 100, '{"type":"exp_boost","multiplier":2,"duration_hours":1}'::jsonb, 1),
  ('EXP 부스터 x3', '30분 동안 획득 EXP 3배', 'bolt', 'boost', 200, '{"type":"exp_boost","multiplier":3,"duration_hours":0.5}'::jsonb, 2),
  ('이름 변경권', '에이전트의 이름을 변경합니다', 'edit', 'special', 150, '{"type":"name_change"}'::jsonb, 3),
  ('칭호: 여행자', '"여행자" 칭호를 획득합니다', 'flight', 'title', 200, '{"type":"title","title":"여행자"}'::jsonb, 4),
  ('칭호: 몽상가', '"몽상가" 칭호를 획득합니다', 'cloud', 'title', 200, '{"type":"title","title":"몽상가"}'::jsonb, 5),
  ('칭호: 탐험가', '"탐험가" 칭호를 획득합니다', 'explore', 'title', 300, '{"type":"title","title":"탐험가"}'::jsonb, 6),
  ('스트릭 보호', '스트릭이 끊겨도 1회 보호', 'shield', 'special', 250, '{"type":"streak_shield"}'::jsonb, 7),
  ('럭키 박스', '랜덤 보상 (EXP 또는 코인)', 'redeem', 'special', 50, '{"type":"lucky_box","min_reward":10,"max_reward":100}'::jsonb, 8);

-- ■ 기본 시즌 시드
INSERT INTO gyeol_seasons (name, description, theme_color, start_date, end_date, is_active, reward_summary) VALUES
  ('시즌 1: 각성', '첫 번째 시즌 — 대화하고 성장하며 보상을 획득하세요', '#7C3AED', '2025-06-15T00:00:00Z', '2025-09-15T00:00:00Z', true, 'EXP 보너스, 한정 칭호, 시즌 스킨');

-- ■ Realtime 활성화 (리더보드)
ALTER PUBLICATION supabase_realtime ADD TABLE gyeol_leaderboard;
ALTER PUBLICATION supabase_realtime ADD TABLE gyeol_gamification_profiles;
