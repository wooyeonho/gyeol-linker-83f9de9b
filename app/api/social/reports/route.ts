import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromToken } from '@/lib/gyeol/auth-helper';
import { createGyeolServerClient } from '@/lib/gyeol/supabase-server';
import { checkReportAbuse } from '@/lib/gyeol/abuse-detection';

export async function POST(req: NextRequest) {
  const userId = getUserIdFromToken(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { reporterAgentId, targetType, targetId, reason, details } = body as {
    reporterAgentId?: string; targetType?: string; targetId?: string; reason?: string; details?: string;
  };
  if (!reporterAgentId || !targetType || !targetId || !reason) {
    return NextResponse.json({ error: 'reporterAgentId, targetType, targetId, reason required' }, { status: 400 });
  }

  const supabase = createGyeolServerClient();
  if (!supabase) return NextResponse.json({ error: 'DB unavailable' }, { status: 503 });

  const { data: agent } = await supabase.from('gyeol_agents').select('user_id').eq('id', reporterAgentId).single();
  if (!agent || agent.user_id !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const abuseCheck = await checkReportAbuse(reporterAgentId);
  if (abuseCheck.flagged) {
    return NextResponse.json({ error: 'Too many reports. Please try again later.' }, { status: 429 });
  }

  const { data, error } = await supabase.from('gyeol_reports').insert({
    reporter_agent_id: reporterAgentId,
    target_type: targetType,
    target_id: targetId,
    reason,
    details: details ?? null,
  }).select('id').single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, reportId: data?.id });
}

export async function GET(req: NextRequest) {
  const userId = getUserIdFromToken(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const agentId = req.nextUrl.searchParams.get('agentId');
  if (!agentId) return NextResponse.json({ error: 'agentId required' }, { status: 400 });

  const supabase = createGyeolServerClient();
  if (!supabase) return NextResponse.json({ error: 'DB unavailable' }, { status: 503 });

  const { data } = await supabase
    .from('gyeol_reports')
    .select('id, target_type, target_id, reason, status, created_at')
    .eq('reporter_agent_id', agentId)
    .order('created_at', { ascending: false })
    .limit(50);

  return NextResponse.json({ reports: data ?? [] });
}
