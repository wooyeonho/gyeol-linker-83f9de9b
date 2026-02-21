-- Add UPDATE policy for gyeol_agent_skills (needed for skill active/inactive toggle)
CREATE POLICY "Users can update own agent skills"
ON public.gyeol_agent_skills
FOR UPDATE
USING (agent_id IN (
  SELECT id FROM gyeol_agents WHERE user_id = (auth.uid())::text
));