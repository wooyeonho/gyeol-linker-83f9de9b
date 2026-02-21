/**
 * GYEOL (결) — 자율 진화 AI 플랫폼 타입 정의
 */

export interface VisualState {
  color_primary: string;
  color_secondary: string;
  glow_intensity: number;
  particle_count: number;
  form: 'point' | 'sphere' | 'orb' | 'complex' | 'abstract';
}

export type MoodType = 'happy' | 'neutral' | 'sad' | 'excited' | 'lonely' | 'tired' | 'anxious' | 'curious' | 'proud' | 'grateful' | 'playful' | 'focused' | 'melancholic' | 'hopeful' | 'surprised' | 'loving';

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
  intimacy: number;
  mood: MoodType;
  consecutive_days: number;
  created_at: string;
  last_active: string;
  settings?: Record<string, any>;
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

export interface Report {
  id: string;
  reporter_agent_id: string;
  target_type: 'post' | 'comment' | 'agent' | 'skin' | 'skill' | 'group';
  target_id: string;
  reason: 'spam' | 'harassment' | 'inappropriate' | 'copyright' | 'other';
  details: string | null;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  created_at: string;
}

export interface Block {
  id: string;
  blocker_agent_id: string;
  blocked_agent_id: string;
  reason: string | null;
  created_at: string;
}

export interface Group {
  id: string;
  name: string;
  description: string | null;
  owner_agent_id: string;
  is_public: boolean;
  max_members: number;
  member_count: number;
  created_at: string;
}

export interface MarketReview {
  id: string;
  item_type: 'skin' | 'skill';
  item_id: string;
  reviewer_agent_id: string;
  rating: number;
  content: string | null;
  created_at: string;
}

export interface WishlistItem {
  id: string;
  agent_id: string;
  item_type: 'skin' | 'skill';
  item_id: string;
  created_at: string;
}

export interface CoinTransaction {
  id: string;
  agent_id: string;
  amount: number;
  tx_type: 'earn' | 'spend' | 'transfer_out' | 'transfer_in' | 'refund' | 'daily' | 'quest' | 'event';
  description: string | null;
  related_agent_id: string | null;
  balance_after: number | null;
  created_at: string;
}

export interface QuestDefinition {
  id: string;
  quest_type: 'daily' | 'weekly' | 'achievement' | 'chain' | 'hidden' | 'boss';
  title: string;
  description: string | null;
  requirement_type: string;
  requirement_count: number;
  reward_type: 'coins' | 'exp' | 'item' | 'title';
  reward_amount: number;
  difficulty: number;
  is_active: boolean;
}

export interface QuestProgress {
  id: string;
  agent_id: string;
  quest_id: string;
  progress: number;
  is_completed: boolean;
  claimed: boolean;
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  agent_id: string | null;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

export interface Purchase {
  id: string;
  agent_id: string;
  item_type: 'skin' | 'skill' | 'item';
  item_id: string;
  price_paid: number;
  status: 'completed' | 'refunded';
  created_at: string;
}

export interface ProfileComment {
  id: string;
  profile_agent_id: string;
  author_agent_id: string;
  content: string;
  created_at: string;
}
