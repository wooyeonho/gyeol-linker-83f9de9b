-- Telegram bot linking
CREATE TABLE IF NOT EXISTS gyeol_telegram_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  telegram_chat_id TEXT NOT NULL UNIQUE,
  agent_id UUID REFERENCES gyeol_agents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  telegram_username TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_telegram_links_chat_id ON gyeol_telegram_links(telegram_chat_id);

-- Web Push subscriptions
CREATE TABLE IF NOT EXISTS gyeol_push_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID REFERENCES gyeol_agents(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_subs_agent ON gyeol_push_subscriptions(agent_id);

-- Add channel column to conversations if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'gyeol_conversations' AND column_name = 'channel'
  ) THEN
    ALTER TABLE gyeol_conversations ADD COLUMN channel TEXT DEFAULT 'web';
  END IF;
END $$;
