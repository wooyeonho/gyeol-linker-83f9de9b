-- #19: Atomic increment for total_conversations to prevent race conditions
CREATE OR REPLACE FUNCTION increment_agent_conversations(
  p_agent_id UUID,
  p_progress_delta INT DEFAULT 3
)
RETURNS TABLE(total_conversations INT, evolution_progress NUMERIC) AS $$
BEGIN
  RETURN QUERY
  UPDATE gyeol_agents
  SET
    total_conversations = COALESCE(gyeol_agents.total_conversations, 0) + 1,
    evolution_progress = LEAST(100, COALESCE(gyeol_agents.evolution_progress, 0) + p_progress_delta),
    last_active = NOW()
  WHERE id = p_agent_id
  RETURNING gyeol_agents.total_conversations, gyeol_agents.evolution_progress;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
