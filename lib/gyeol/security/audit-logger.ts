/**
 * GYEOL 감사 로그 — 모든 자율 행동 기록
 */

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

export interface AnomalyResult {
  isAnomaly: boolean;
  reason?: string;
}

export async function detectAnomaly(
  supabase: SupabaseClient,
  agentId: string,
  windowHours = 1
): Promise<AnomalyResult> {
  const since = new Date(Date.now() - windowHours * 60 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from(TABLE)
    .select('id, activity_type, details')
    .eq('agent_id', agentId)
    .gte('created_at', since);

  if (!data || data.length === 0) return { isAnomaly: false };

  const externalCount = data.filter(
    (r) => (r.details as Record<string, unknown>)?.external_request === true
  ).length;
  if (externalCount > 50) return { isAnomaly: true, reason: 'too_many_external_requests' };

  const sameUrl = (data as { details?: { url?: string } }[]).map((r) => r.details?.url).filter(Boolean);
  const uniqueUrls = new Set(sameUrl);
  if (sameUrl.length >= 20 && uniqueUrls.size <= 2)
    return { isAnomaly: true, reason: 'repeated_url_access' };

  return { isAnomaly: false };
}

export async function getAuditTrail(
  supabase: SupabaseClient,
  agentId: string,
  from: string,
  to: string
) {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('agent_id', agentId)
    .gte('created_at', from)
    .lte('created_at', to)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}
