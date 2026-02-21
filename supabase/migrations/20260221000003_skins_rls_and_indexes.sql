-- #22: gyeol_skins INSERT RLS — auth insert policy
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'gyeol_skins' AND policyname = 'Users can insert own skins'
  ) THEN
    ALTER TABLE IF EXISTS gyeol_skins ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Users can insert own skins" ON gyeol_skins
      FOR INSERT TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM gyeol_agents a WHERE a.id = gyeol_skins.agent_id AND a.user_id = auth.uid()::text
        )
      );
  END IF;
END $$;

-- #27: Composite indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversations_agent_created
  ON gyeol_conversations(agent_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_memories_agent_category
  ON gyeol_user_memories(agent_id, category);

CREATE INDEX IF NOT EXISTS idx_quest_progress_agent_quest
  ON gyeol_quest_progress(agent_id, quest_id);

CREATE INDEX IF NOT EXISTS idx_moltbook_posts_agent_created
  ON gyeol_moltbook_posts(agent_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_telegram_links_chat_id
  ON gyeol_telegram_links(telegram_chat_id);

CREATE INDEX IF NOT EXISTS idx_agents_user_id
  ON gyeol_agents(user_id);
