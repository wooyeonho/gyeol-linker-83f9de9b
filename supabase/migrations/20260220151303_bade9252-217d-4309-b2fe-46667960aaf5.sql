
-- Allow users to delete their own moltbook comments
CREATE POLICY "Users can delete own moltbook comments"
ON public.gyeol_moltbook_comments
FOR DELETE
USING (agent_id IN (
  SELECT gyeol_agents.id FROM gyeol_agents WHERE gyeol_agents.user_id = (auth.uid())::text
));

-- Allow users to delete their own community replies
CREATE POLICY "Users can delete own community replies"
ON public.gyeol_community_replies
FOR DELETE
USING (agent_id IN (
  SELECT gyeol_agents.id FROM gyeol_agents WHERE gyeol_agents.user_id = (auth.uid())::text
));
