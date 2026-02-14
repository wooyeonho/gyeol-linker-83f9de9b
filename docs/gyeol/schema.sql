-- ================================================
-- GYEOL 전체 스키마 (Phase 1 + 2 통합)
-- OpenClaw 연동을 고려한 설계
-- Supabase SQL Editor에서 실행
-- ================================================

-- ■ 사용자 (기존 auth.users와 연동하거나 별도 프로필)
CREATE TABLE IF NOT EXISTS gyeol_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE,
    display_name TEXT,
    timezone TEXT DEFAULT 'Asia/Seoul',
    openclaw_linked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ■ AI 에이전트
CREATE TABLE IF NOT EXISTS gyeol_agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES gyeol_users(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT 'GYEOL',
    gen INTEGER DEFAULT 1 CHECK (gen BETWEEN 1 AND 5),
    total_conversations INTEGER DEFAULT 0,
    evolution_progress DECIMAL(5,2) DEFAULT 0 CHECK (evolution_progress BETWEEN 0 AND 100),
    warmth INTEGER DEFAULT 50 CHECK (warmth BETWEEN 0 AND 100),
    logic INTEGER DEFAULT 50 CHECK (logic BETWEEN 0 AND 100),
    creativity INTEGER DEFAULT 50 CHECK (creativity BETWEEN 0 AND 100),
    energy INTEGER DEFAULT 50 CHECK (energy BETWEEN 0 AND 100),
    humor INTEGER DEFAULT 50 CHECK (humor BETWEEN 0 AND 100),
    visual_state JSONB DEFAULT '{"color_primary": "#FFFFFF", "color_secondary": "#4F46E5", "glow_intensity": 0.3, "particle_count": 10, "form": "point"}'::jsonb,
    skin_id UUID,
    preferred_provider TEXT DEFAULT 'groq',
    openclaw_agent_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_active TIMESTAMPTZ DEFAULT NOW()
);

-- ■ 대화 기록
CREATE TABLE IF NOT EXISTS gyeol_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID REFERENCES gyeol_agents(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    channel TEXT DEFAULT 'web',
    provider TEXT,
    tokens_used INTEGER,
    response_time_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ■ 자율 활동 로그
CREATE TABLE IF NOT EXISTS gyeol_autonomous_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID REFERENCES gyeol_agents(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL,
    summary TEXT,
    details JSONB DEFAULT '{}',
    was_sandboxed BOOLEAN DEFAULT TRUE,
    security_flags TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ■ 취향 벡터
CREATE TABLE IF NOT EXISTS gyeol_taste_vectors (
    agent_id UUID PRIMARY KEY REFERENCES gyeol_agents(id) ON DELETE CASCADE,
    interests JSONB DEFAULT '{}',
    topics JSONB DEFAULT '{}',
    communication_style JSONB DEFAULT '{}',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ■ AI 매칭
CREATE TABLE IF NOT EXISTS gyeol_ai_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_1_id UUID REFERENCES gyeol_agents(id),
    agent_2_id UUID REFERENCES gyeol_agents(id),
    compatibility_score DECIMAL(5,2),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending','matched','chatting','ended')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(agent_1_id, agent_2_id)
);

-- ■ AI 간 대화
CREATE TABLE IF NOT EXISTS gyeol_ai_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID REFERENCES gyeol_ai_matches(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES gyeol_agents(id),
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ■ 스킨 마켓
CREATE TABLE IF NOT EXISTS gyeol_skins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    creator_id UUID REFERENCES gyeol_users(id),
    price INTEGER DEFAULT 0,
    preview_url TEXT,
    skin_data JSONB,
    category TEXT,
    tags TEXT[],
    downloads INTEGER DEFAULT 0,
    rating DECIMAL(3,2) DEFAULT 0,
    is_approved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ■ 스킬 마켓
CREATE TABLE IF NOT EXISTS gyeol_skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    creator_id UUID REFERENCES gyeol_users(id),
    price INTEGER DEFAULT 0,
    skill_code TEXT,
    category TEXT,
    min_gen INTEGER DEFAULT 1,
    downloads INTEGER DEFAULT 0,
    rating DECIMAL(3,2) DEFAULT 0,
    is_approved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ■ 구매 내역
CREATE TABLE IF NOT EXISTS gyeol_purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES gyeol_users(id),
    item_type TEXT CHECK (item_type IN ('skin', 'skill')),
    item_id UUID,
    price INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ■ 사용자 API 키 (BYOK)
CREATE TABLE IF NOT EXISTS gyeol_user_api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES gyeol_users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    encrypted_key TEXT NOT NULL,
    is_valid BOOLEAN DEFAULT TRUE,
    last_used TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ■ 보안: Kill Switch / 시스템 상태
CREATE TABLE IF NOT EXISTS gyeol_system_state (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO gyeol_system_state (key, value) VALUES 
    ('kill_switch', '{"active": false, "reason": null, "activated_at": null}'::jsonb),
    ('maintenance_mode', '{"active": false}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ■ 인덱스
CREATE INDEX IF NOT EXISTS idx_gyeol_agents_user ON gyeol_agents(user_id);
CREATE INDEX IF NOT EXISTS idx_gyeol_conversations_agent ON gyeol_conversations(agent_id);
CREATE INDEX IF NOT EXISTS idx_gyeol_conversations_created ON gyeol_conversations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gyeol_autonomous_logs_agent ON gyeol_autonomous_logs(agent_id);
CREATE INDEX IF NOT EXISTS idx_gyeol_autonomous_logs_type ON gyeol_autonomous_logs(activity_type);
CREATE INDEX IF NOT EXISTS idx_gyeol_autonomous_logs_created ON gyeol_autonomous_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gyeol_matches_agents ON gyeol_ai_matches(agent_1_id, agent_2_id);
CREATE INDEX IF NOT EXISTS idx_gyeol_skins_category ON gyeol_skins(category);
CREATE INDEX IF NOT EXISTS idx_gyeol_skills_category ON gyeol_skills(category);

-- RLS (Row Level Security) — 필요 시 활성화
-- ALTER TABLE gyeol_agents ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE gyeol_conversations ENABLE ROW LEVEL SECURITY;
-- 등
