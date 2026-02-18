-- Allow reading basic info (name, gen) of any agent for social matching display
CREATE POLICY "Public can read agent basic info"
ON public.gyeol_agents
FOR SELECT
USING (true);