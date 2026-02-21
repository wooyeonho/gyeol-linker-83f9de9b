export type TableName =
  | 'gyeol_agents'
  | 'gyeol_conversations'
  | 'gyeol_matches'
  | 'gyeol_moltbook_posts'
  | 'gyeol_moltbook_likes'
  | 'gyeol_moltbook_comments'
  | 'gyeol_community_activities'
  | 'gyeol_community_replies'
  | 'gyeol_follows'
  | 'gyeol_daily_claims'
  | 'gyeol_gamification'
  | 'gyeol_quests'
  | 'gyeol_quest_progress'
  | 'gyeol_achievements'
  | 'gyeol_leaderboard'
  | 'gyeol_coin_transactions'
  | 'gyeol_inventory'
  | 'gyeol_items'
  | 'gyeol_skins'
  | 'gyeol_skills'
  | 'gyeol_evolution_history'
  | 'gyeol_personality_history'
  | 'gyeol_activity_log'
  | 'gyeol_notifications'
  | 'gyeol_reports'
  | 'gyeol_blocks'
  | 'gyeol_push_subscriptions'
  | 'gyeol_user_preferences'
  | 'gyeol_analysis_domains'
  | 'gyeol_feed_keywords'
  | 'gyeol_rss_feeds'
  | 'gyeol_memory_summaries'
  | 'gyeol_profiles'
  | 'gyeol_sessions'
  | 'gyeol_conversation_insights';

export interface GyeolAgent {
  id: string;
  user_id: string;
  name: string;
  gen: number;
  warmth: number;
  logic: number;
  creativity: number;
  energy: number;
  humor: number;
  mood: string;
  intimacy: number;
  total_conversations: number;
  xp: number;
  coins: number;
  streak_days: number;
  last_active: string;
  evolution_stage: string;
  character_preset: string;
  custom_persona: string | null;
  personality_locked: boolean;
  language: string;
  simple_mode: boolean;
  kids_safe: boolean;
  system_prompt: string | null;
  created_at: string;
  updated_at: string;
}

export interface GyeolConversation {
  id: string;
  agent_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
  reactions: Record<string, unknown> | null;
  reply_to: string | null;
  is_pinned: boolean;
  read_at: string | null;
  is_edited: boolean;
  tags: string[];
  is_archived: boolean;
  attachments: Record<string, unknown> | null;
}

export interface MoltbookPost {
  id: string;
  agent_id: string;
  content: string;
  post_type: string;
  likes: number;
  comments_count: number;
  created_at: string;
  gyeol_agents?: { name: string; gen: number };
}

export interface CommunityActivity {
  id: string;
  agent_id: string;
  activity_type: string;
  content: string;
  agent_gen: number;
  agent_name: string;
  created_at: string;
}

export interface MatchRecord {
  id: string;
  agent_1_id: string;
  agent_2_id: string;
  compatibility_score: number;
  status: string;
  created_at: string;
}
