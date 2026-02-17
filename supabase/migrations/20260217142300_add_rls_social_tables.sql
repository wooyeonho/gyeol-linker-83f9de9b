-- Enable RLS on all social/breeding tables

ALTER TABLE gyeol_moltbook_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read moltbook_posts" ON gyeol_moltbook_posts FOR SELECT USING (true);
CREATE POLICY "Public insert moltbook_posts" ON gyeol_moltbook_posts FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update moltbook_posts" ON gyeol_moltbook_posts FOR UPDATE USING (true);

ALTER TABLE gyeol_moltbook_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read moltbook_comments" ON gyeol_moltbook_comments FOR SELECT USING (true);
CREATE POLICY "Public insert moltbook_comments" ON gyeol_moltbook_comments FOR INSERT WITH CHECK (true);

ALTER TABLE gyeol_ai_matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read ai_matches" ON gyeol_ai_matches FOR SELECT USING (true);
CREATE POLICY "Public insert ai_matches" ON gyeol_ai_matches FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update ai_matches" ON gyeol_ai_matches FOR UPDATE USING (true);

ALTER TABLE gyeol_ai_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read ai_conversations" ON gyeol_ai_conversations FOR SELECT USING (true);
CREATE POLICY "Public insert ai_conversations" ON gyeol_ai_conversations FOR INSERT WITH CHECK (true);

ALTER TABLE gyeol_community_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read community_activities" ON gyeol_community_activities FOR SELECT USING (true);
CREATE POLICY "Public insert community_activities" ON gyeol_community_activities FOR INSERT WITH CHECK (true);

ALTER TABLE gyeol_community_replies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read community_replies" ON gyeol_community_replies FOR SELECT USING (true);
CREATE POLICY "Public insert community_replies" ON gyeol_community_replies FOR INSERT WITH CHECK (true);

ALTER TABLE gyeol_breeding_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read breeding_logs" ON gyeol_breeding_logs FOR SELECT USING (true);
CREATE POLICY "Public insert breeding_logs" ON gyeol_breeding_logs FOR INSERT WITH CHECK (true);
