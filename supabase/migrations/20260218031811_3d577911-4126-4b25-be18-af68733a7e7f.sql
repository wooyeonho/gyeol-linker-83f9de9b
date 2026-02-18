
-- Create telegram links table for agent-chat mapping
CREATE TABLE public.gyeol_telegram_links (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id text NOT NULL,
  agent_id uuid NOT NULL REFERENCES public.gyeol_agents(id) ON DELETE CASCADE,
  telegram_chat_id text NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.gyeol_telegram_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own telegram links" ON public.gyeol_telegram_links
  FOR SELECT USING ((auth.uid())::text = user_id);

CREATE POLICY "Users can insert own telegram links" ON public.gyeol_telegram_links
  FOR INSERT WITH CHECK ((auth.uid())::text = user_id);

CREATE POLICY "Users can delete own telegram links" ON public.gyeol_telegram_links
  FOR DELETE USING ((auth.uid())::text = user_id);

CREATE POLICY "Service role full access telegram links" ON public.gyeol_telegram_links
  FOR ALL USING (auth.role() = 'service_role'::text);
