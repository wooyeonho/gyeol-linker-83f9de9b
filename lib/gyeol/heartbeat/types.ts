import type { SupabaseClient } from '@supabase/supabase-js';

export type SkillId = 'learn-rss' | 'self-reflect' | 'proactive-message';

export interface SkillContext {
  supabase: SupabaseClient;
  agentId: string;
  autonomyLevel: number;
  provider?: string;
  apiKey?: string;
}

export interface SkillResult {
  ok: boolean;
  skillId: SkillId;
  summary: string;
  details?: Record<string, unknown>;
}

export interface HeartbeatJob {
  id: string;
  agentId: string;
  skillId: SkillId;
  enabled: boolean;
  intervalMs: number;
  lastRunAt: string | null;
  nextRunAt: string | null;
  lastStatus: 'ok' | 'error' | 'skipped' | null;
  lastError: string | null;
  consecutiveErrors: number;
}

export interface HeartbeatResult {
  agentId: string;
  skillsRun: SkillResult[];
  skipped: string[];
  durationMs: number;
}
