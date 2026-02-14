/**
 * 에이전트별 설정 조회/저장 (자율성, 콘텐츠 필터, 알림)
 */
import { NextRequest, NextResponse } from 'next/server';
import { createGyeolServerClient } from '@/lib/gyeol/supabase-server';

export async function GET(req: NextRequest) {
  const agentId = req.nextUrl.searchParams.get('agentId');
  if (!agentId) return NextResponse.json({ error: 'agentId required' }, { status: 400 });
  const supabase = createGyeolServerClient();
  const { data, error } = await supabase
    .from('gyeol_agents')
    .select('content_filter_on, notifications_on, autonomy_level')
    .eq('id', agentId)
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({
    contentFilterOn: data?.content_filter_on ?? true,
    notificationsOn: data?.notifications_on ?? true,
    autonomyLevel: data?.autonomy_level ?? 50,
  });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { agentId, contentFilterOn, notificationsOn, autonomyLevel } = body as {
    agentId?: string;
    contentFilterOn?: boolean;
    notificationsOn?: boolean;
    autonomyLevel?: number;
  };
  if (!agentId) return NextResponse.json({ error: 'agentId required' }, { status: 400 });
  const updates: Record<string, unknown> = {};
  if (typeof contentFilterOn === 'boolean') updates.content_filter_on = contentFilterOn;
  if (typeof notificationsOn === 'boolean') updates.notifications_on = notificationsOn;
  if (typeof autonomyLevel === 'number' && autonomyLevel >= 0 && autonomyLevel <= 100) updates.autonomy_level = autonomyLevel;
  if (Object.keys(updates).length === 0) return NextResponse.json({ ok: true });
  const supabase = createGyeolServerClient();
  const { error } = await supabase.from('gyeol_agents').update(updates).eq('id', agentId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
