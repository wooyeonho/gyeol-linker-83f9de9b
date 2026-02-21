-- #9: gyeol_gamification_profiles — UPDATE 정책 제거, READ-only for clients
-- 코인/EXP 변경은 service_role(Edge Function)만 허용

DROP POLICY IF EXISTS "Users can update own gamification" ON gyeol_gamification_profiles;
DROP POLICY IF EXISTS "Users can update own gamification profiles" ON gyeol_gamification_profiles;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'gyeol_gamification_profiles' AND policyname = 'Users can read own gamification'
  ) THEN
    CREATE POLICY "Users can read own gamification" ON gyeol_gamification_profiles FOR SELECT USING (
      agent_id IN (SELECT id FROM gyeol_agents WHERE user_id = (auth.uid())::text)
    );
  END IF;
END $$;
