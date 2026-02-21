-- B11 Chat Deepening: Add columns for reactions, reply, pin, read, edit, tags, archive, attachments
ALTER TABLE gyeol_conversations ADD COLUMN IF NOT EXISTS reactions jsonb DEFAULT '{}';
ALTER TABLE gyeol_conversations ADD COLUMN IF NOT EXISTS reply_to uuid REFERENCES gyeol_conversations(id);
ALTER TABLE gyeol_conversations ADD COLUMN IF NOT EXISTS is_pinned boolean DEFAULT false;
ALTER TABLE gyeol_conversations ADD COLUMN IF NOT EXISTS read_at timestamptz;
ALTER TABLE gyeol_conversations ADD COLUMN IF NOT EXISTS is_edited boolean DEFAULT false;
ALTER TABLE gyeol_conversations ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';
ALTER TABLE gyeol_conversations ADD COLUMN IF NOT EXISTS is_archived boolean DEFAULT false;
ALTER TABLE gyeol_conversations ADD COLUMN IF NOT EXISTS attachments jsonb DEFAULT '[]';

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_gyeol_conv_pinned ON gyeol_conversations(agent_id, is_pinned) WHERE is_pinned = true;
CREATE INDEX IF NOT EXISTS idx_gyeol_conv_archived ON gyeol_conversations(agent_id, is_archived) WHERE is_archived = true;
CREATE INDEX IF NOT EXISTS idx_gyeol_conv_reply ON gyeol_conversations(reply_to) WHERE reply_to IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_gyeol_conv_tags ON gyeol_conversations USING gin(tags) WHERE tags != '{}';
