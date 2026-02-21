-- Agent DM (Direct Messages) table
CREATE TABLE IF NOT EXISTS public.gyeol_agent_dms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_agent_id UUID NOT NULL REFERENCES gyeol_agents(id) ON DELETE CASCADE,
  receiver_agent_id UUID NOT NULL REFERENCES gyeol_agents(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_agent_dms_receiver ON gyeol_agent_dms(receiver_agent_id, created_at DESC);
CREATE INDEX idx_agent_dms_sender ON gyeol_agent_dms(sender_agent_id, created_at DESC);

ALTER TABLE gyeol_agent_dms ENABLE ROW LEVEL SECURITY;

-- Users can read DMs where they own sender or receiver agent
CREATE POLICY "Users can read own DMs" ON gyeol_agent_dms FOR SELECT
  USING (
    sender_agent_id IN (SELECT id FROM gyeol_agents WHERE user_id = (auth.uid())::text)
    OR receiver_agent_id IN (SELECT id FROM gyeol_agents WHERE user_id = (auth.uid())::text)
  );

CREATE POLICY "Users can send DMs from own agent" ON gyeol_agent_dms FOR INSERT
  WITH CHECK (sender_agent_id IN (SELECT id FROM gyeol_agents WHERE user_id = (auth.uid())::text));

CREATE POLICY "Users can update own received DMs" ON gyeol_agent_dms FOR UPDATE
  USING (receiver_agent_id IN (SELECT id FROM gyeol_agents WHERE user_id = (auth.uid())::text));

CREATE POLICY "Users can delete own DMs" ON gyeol_agent_dms FOR DELETE
  USING (
    sender_agent_id IN (SELECT id FROM gyeol_agents WHERE user_id = (auth.uid())::text)
    OR receiver_agent_id IN (SELECT id FROM gyeol_agents WHERE user_id = (auth.uid())::text)
  );

CREATE POLICY "Service role full access dms" ON gyeol_agent_dms FOR ALL
  USING (auth.role() = 'service_role'::text);

-- Enable realtime for DMs
ALTER PUBLICATION supabase_realtime ADD TABLE public.gyeol_agent_dms;