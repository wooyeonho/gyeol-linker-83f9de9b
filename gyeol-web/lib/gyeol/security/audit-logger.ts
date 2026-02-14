import type { SupabaseClient } from '@supabase/supabase-js';

const TABLE = 'gyeol_autonomous_logs';

export interface LogActionParams {
  agentId: string;
  activityType: 'learning' | 'reflection' | 'social' | 'proactive_message' | 'skill_execution' | 'error';
  summary?: string;
  details?: Record<string, unknown>;
  wasSandboxed?: boolean;
  securityFlags?: string[];
}

export async function logAction(supabase: SupabaseClient, params: LogActionParams): Promise<void> {
  await supabase.from(TABLE).insert({
    agent_id: params.agentId,
    activity_type: params.activityType,
    summary: params.summary ?? null,
    details: params.details ?? {},
    was_sandboxed: params.wasSandboxed ?? true,
    security_flags: params.securityFlags ?? null,
  });
}
