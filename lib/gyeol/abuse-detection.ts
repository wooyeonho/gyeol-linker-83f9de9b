import { createGyeolServerClient } from './supabase-server';

interface AbuseCheckResult {
  flagged: boolean;
  reason?: string;
}

export async function checkPurchaseAbuse(agentId: string, itemId: string): Promise<AbuseCheckResult> {
  const supabase = createGyeolServerClient();
  if (!supabase) return { flagged: false };

  const oneHourAgo = new Date(Date.now() - 3600_000).toISOString();
  const { count } = await supabase
    .from('gyeol_purchases')
    .select('*', { count: 'exact', head: true })
    .eq('agent_id', agentId)
    .gte('created_at', oneHourAgo);

  if ((count ?? 0) > 20) {
    return { flagged: true, reason: 'Too many purchases in 1 hour (>20)' };
  }
  return { flagged: false };
}

export async function checkReportAbuse(reporterAgentId: string): Promise<AbuseCheckResult> {
  const supabase = createGyeolServerClient();
  if (!supabase) return { flagged: false };

  const oneDayAgo = new Date(Date.now() - 86400_000).toISOString();
  const { count } = await supabase
    .from('gyeol_reports')
    .select('*', { count: 'exact', head: true })
    .eq('reporter_agent_id', reporterAgentId)
    .gte('created_at', oneDayAgo);

  if ((count ?? 0) > 10) {
    return { flagged: true, reason: 'Too many reports in 24h (>10)' };
  }
  return { flagged: false };
}
