-- ================================================
-- GYEOL RLS (Row Level Security) 정책
-- schema.sql 실행 후, Supabase에서 auth.uid() 연동 시 사용
-- ================================================

-- gyeol_agents: 본인 user_id만 조회/수정
ALTER TABLE gyeol_agents ENABLE ROW LEVEL SECURITY;
CREATE POLICY gyeol_agents_select ON gyeol_agents FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY gyeol_agents_insert ON gyeol_agents FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY gyeol_agents_update ON gyeol_agents FOR UPDATE USING (auth.uid() = user_id);

-- gyeol_conversations: 본인 에이전트 대화만
ALTER TABLE gyeol_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY gyeol_conversations_select ON gyeol_conversations FOR SELECT
  USING (EXISTS (SELECT 1 FROM gyeol_agents a WHERE a.id = agent_id AND a.user_id = auth.uid()));
CREATE POLICY gyeol_conversations_insert ON gyeol_conversations FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM gyeol_agents a WHERE a.id = agent_id AND a.user_id = auth.uid()));

-- gyeol_autonomous_logs: 본인 에이전트 로그만
ALTER TABLE gyeol_autonomous_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY gyeol_autonomous_logs_select ON gyeol_autonomous_logs FOR SELECT
  USING (EXISTS (SELECT 1 FROM gyeol_agents a WHERE a.id = agent_id AND a.user_id = auth.uid()));

-- gyeol_system_state: 읽기는 anon 가능, 쓰기는 service_role만 (API에서 처리)
ALTER TABLE gyeol_system_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY gyeol_system_state_select ON gyeol_system_state FOR SELECT USING (true);

-- Realtime 활성화 (Supabase 대시보드 또는 아래)
-- publication에 gyeol_conversations 추가 후 Realtime에서 해당 테이블 구독
-- ALTER PUBLICATION supabase_realtime ADD TABLE gyeol_conversations;
