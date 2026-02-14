/**
 * GYEOL (결) — OpenClaw 기반 자율 AI 플랫폼 타입 정의
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

export interface TasteVector {
  agent_id: string;
  interests: Record<string, number>;
  topics: Record<string, number>;
  communication_style: Record<string, number>;
  updated_at: string;
}

export interface AIMatch {
  id: string;
  agent_1_id: string;
  agent_2_id: string;
  compatibility_score: number;
  status: 'pending' | 'matched' | 'chatting' | 'ended';
  created_at: string;
}

export interface Skin {
  id: string;
  name: string;
  description: string | null;
  creator_id: string | null;
  price: number;
  preview_url: string | null;
  skin_data: Record<string, unknown> | null;
  category: string | null;
  tags: string[];
  downloads: number;
  rating: number;
  is_approved: boolean;
  created_at: string;
}

export interface Skill {
  id: string;
  name: string;
  description: string | null;
  creator_id: string | null;
  price: number;
  skill_code: string | null;
  category: string | null;
  min_gen: number;
  downloads: number;
  rating: number;
  is_approved: boolean;
  created_at: string;
}

export interface PersonalityParams {
  warmth: number;
  logic: number;
  creativity: number;
  energy: number;
  humor: number;
}
