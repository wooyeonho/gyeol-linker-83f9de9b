/**
 * GYEOL (결) — 타입 정의
 */

export interface VisualState {
  color_primary: string;
  color_secondary: string;
  glow_intensity: number;
  particle_count: number;
  form: 'point' | 'sphere' | 'orb' | 'complex' | 'abstract';
}

export interface Agent {
  id: string;
  user_id: string;
  name: string;
  gen: number;
  total_conversations: number;
  evolution_progress: number;
  warmth: number;
  logic: number;
  creativity: number;
  energy: number;
  humor: number;
  visual_state: VisualState;
  skin_id: string | null;
  preferred_provider: string;
  openclaw_agent_id: string | null;
  created_at: string;
  last_active: string;
}

export interface Message {
  id: string;
  agent_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  channel: string;
  provider: string | null;
  tokens_used: number | null;
  response_time_ms: number | null;
  created_at: string;
}

export interface AutonomousLog {
  id: string;
  agent_id: string;
  activity_type: 'learning' | 'reflection' | 'social' | 'proactive_message' | 'skill_execution' | 'error';
  summary: string | null;
  details: Record<string, unknown>;
  was_sandboxed: boolean;
  security_flags: string[] | null;
  created_at: string;
}

export interface PersonalityParams {
  warmth: number;
  logic: number;
  creativity: number;
  energy: number;
  humor: number;
}
