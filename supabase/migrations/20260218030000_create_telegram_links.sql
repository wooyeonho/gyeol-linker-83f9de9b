CREATE TABLE IF NOT EXISTS gyeol_telegram_links (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  telegram_chat_id text NOT NULL,
  agent_id uuid NOT NULL REFERENCES gyeol_agents(id) ON DELETE CASCADE,
  user_id text NOT NULL DEFAULT 'telegram-auto',
  created_at timestamptz DEFAULT now(),
  UNIQUE(telegram_chat_id)
);

ALTER TABLE gyeol_telegram_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own telegram links"
  ON gyeol_telegram_links FOR SELECT
  USING (auth.uid()::text = user_id OR user_id = 'telegram-auto');

CREATE POLICY "Service role full access telegram links"
  ON gyeol_telegram_links FOR ALL
  USING (auth.role() = 'service_role');
