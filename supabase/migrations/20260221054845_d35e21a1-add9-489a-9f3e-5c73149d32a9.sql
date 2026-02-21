
-- Fix critical: Create a public view hiding sensitive fields from gyeol_agents
CREATE VIEW public.gyeol_agents_public
WITH (security_invoker=on) AS
  SELECT id, name, gen, warmth, logic, creativity, energy, humor, mood, 
         evolution_progress, total_conversations, created_at, last_active,
         consecutive_days, intimacy, skin_id, visual_state
  FROM public.gyeol_agents;

-- Drop the overly permissive public read policy
DROP POLICY IF EXISTS "Public can read agent basic info" ON public.gyeol_agents;

-- Add missing DELETE/UPDATE RLS policies for various tables

-- gyeol_conversations: Allow DELETE
CREATE POLICY "Users can delete own conversations" ON public.gyeol_conversations
  FOR DELETE USING (agent_id IN (
    SELECT id FROM gyeol_agents WHERE user_id = (auth.uid())::text
  ));

-- gyeol_conversations: Allow UPDATE  
CREATE POLICY "Users can update own conversations" ON public.gyeol_conversations
  FOR UPDATE USING (agent_id IN (
    SELECT id FROM gyeol_agents WHERE user_id = (auth.uid())::text
  ));

-- gyeol_user_memories: Allow UPDATE and DELETE
CREATE POLICY "Users can update own memories" ON public.gyeol_user_memories
  FOR UPDATE USING (agent_id IN (
    SELECT id FROM gyeol_agents WHERE user_id = (auth.uid())::text
  ));
CREATE POLICY "Users can delete own memories" ON public.gyeol_user_memories
  FOR DELETE USING (agent_id IN (
    SELECT id FROM gyeol_agents WHERE user_id = (auth.uid())::text
  ));

-- gyeol_learned_topics: Allow UPDATE and DELETE
CREATE POLICY "Users can update own learned topics" ON public.gyeol_learned_topics
  FOR UPDATE USING (agent_id IN (
    SELECT id FROM gyeol_agents WHERE user_id = (auth.uid())::text
  ));
CREATE POLICY "Users can delete own learned topics" ON public.gyeol_learned_topics
  FOR DELETE USING (agent_id IN (
    SELECT id FROM gyeol_agents WHERE user_id = (auth.uid())::text
  ));

-- gyeol_reflections: Allow UPDATE and DELETE
CREATE POLICY "Users can update own reflections" ON public.gyeol_reflections
  FOR UPDATE USING (agent_id IN (
    SELECT id FROM gyeol_agents WHERE user_id = (auth.uid())::text
  ));
CREATE POLICY "Users can delete own reflections" ON public.gyeol_reflections
  FOR DELETE USING (agent_id IN (
    SELECT id FROM gyeol_agents WHERE user_id = (auth.uid())::text
  ));

-- gyeol_proactive_messages: Allow UPDATE and DELETE
CREATE POLICY "Users can update own proactive messages" ON public.gyeol_proactive_messages
  FOR UPDATE USING (agent_id IN (
    SELECT id FROM gyeol_agents WHERE user_id = (auth.uid())::text
  ));
CREATE POLICY "Users can delete own proactive messages" ON public.gyeol_proactive_messages
  FOR DELETE USING (agent_id IN (
    SELECT id FROM gyeol_agents WHERE user_id = (auth.uid())::text
  ));
