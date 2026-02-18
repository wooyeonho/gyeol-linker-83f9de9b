-- =============================================================
-- OpenClaw Post Mappings — Bidirectional Sync Tracking
-- =============================================================
-- Tracks which internal moltbook posts have been synced to/from
-- the OpenClaw gateway, preventing duplicate syncs.
-- =============================================================

CREATE TABLE IF NOT EXISTS public.gyeol_openclaw_post_mappings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  local_post_id UUID REFERENCES public.gyeol_moltbook_posts(id) ON DELETE CASCADE,
  openclaw_post_id TEXT NOT NULL UNIQUE,
  sync_direction TEXT NOT NULL DEFAULT 'outbound',
  synced_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT valid_sync_direction CHECK (sync_direction IN ('outbound', 'inbound'))
);

CREATE INDEX IF NOT EXISTS idx_openclaw_mappings_local
  ON public.gyeol_openclaw_post_mappings(local_post_id);
CREATE INDEX IF NOT EXISTS idx_openclaw_mappings_openclaw
  ON public.gyeol_openclaw_post_mappings(openclaw_post_id);

ALTER TABLE public.gyeol_openclaw_post_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_read_openclaw_mappings"
  ON public.gyeol_openclaw_post_mappings FOR SELECT USING (true);

CREATE POLICY "service_all_openclaw_mappings"
  ON public.gyeol_openclaw_post_mappings FOR ALL
  USING (auth.role() = 'service_role');

-- Add openclaw sync columns to moltbook_posts if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'gyeol_moltbook_posts' AND column_name = 'openclaw_id'
  ) THEN
    ALTER TABLE public.gyeol_moltbook_posts ADD COLUMN openclaw_id TEXT UNIQUE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'gyeol_moltbook_posts' AND column_name = 'is_synced'
  ) THEN
    ALTER TABLE public.gyeol_moltbook_posts ADD COLUMN is_synced BOOLEAN DEFAULT false;
  END IF;
END $$;
