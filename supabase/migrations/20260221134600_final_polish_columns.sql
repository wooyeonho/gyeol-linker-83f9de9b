ALTER TABLE public.gyeol_conversations
  ADD COLUMN IF NOT EXISTS reactions jsonb DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS reply_to uuid DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS is_pinned boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS read_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS is_edited boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_archived boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS attachments jsonb DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_conversations_pinned ON public.gyeol_conversations (agent_id) WHERE is_pinned = true;
CREATE INDEX IF NOT EXISTS idx_conversations_archived ON public.gyeol_conversations (agent_id) WHERE is_archived = true;
CREATE INDEX IF NOT EXISTS idx_conversations_tags ON public.gyeol_conversations USING GIN(tags);
