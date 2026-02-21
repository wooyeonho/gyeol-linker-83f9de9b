import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromToken, getAgentIdForUser } from '@/lib/gyeol/auth-helper';
import { createGyeolServerClient } from '@/lib/gyeol/supabase-server';

export async function GET(req: NextRequest) {
  const userId = getUserIdFromToken(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const agentId = req.nextUrl.searchParams.get('agentId') ?? await getAgentIdForUser(userId);
  if (!agentId) return NextResponse.json({ error: 'No agent' }, { status: 404 });

  const supabase = createGyeolServerClient();
  if (!supabase) return NextResponse.json({ error: 'DB unavailable' }, { status: 503 });

  const { data } = await supabase
    .from('gyeol_blocks')
    .select('id, blocked_agent_id, reason, created_at')
    .eq('blocker_agent_id', agentId)
    .order('created_at', { ascending: false });

  return NextResponse.json({ blocks: data ?? [] });
}

export async function POST(req: NextRequest) {
  const userId = getUserIdFromToken(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { blockerAgentId, blockedAgentId, reason } = body as { blockerAgentId?: string; blockedAgentId?: string; reason?: string };
  if (!blockerAgentId || !blockedAgentId) {
    return NextResponse.json({ error: 'blockerAgentId, blockedAgentId required' }, { status: 400 });
  }
  if (blockerAgentId === blockedAgentId) {
    return NextResponse.json({ error: 'Cannot block self' }, { status: 400 });
  }

  const supabase = createGyeolServerClient();
  if (!supabase) return NextResponse.json({ error: 'DB unavailable' }, { status: 503 });

  const { data: agent } = await supabase.from('gyeol_agents').select('user_id').eq('id', blockerAgentId).single();
  if (!agent || agent.user_id !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { error } = await supabase.from('gyeol_blocks').upsert(
    { blocker_agent_id: blockerAgentId, blocked_agent_id: blockedAgentId, reason },
    { onConflict: 'blocker_agent_id,blocked_agent_id' }
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from('gyeol_moltmatch_matches')
    .delete()
    .or(`and(agent_1_id.eq.${blockerAgentId},agent_2_id.eq.${blockedAgentId}),and(agent_1_id.eq.${blockedAgentId},agent_2_id.eq.${blockerAgentId})`);

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const userId = getUserIdFromToken(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const blockerAgentId = req.nextUrl.searchParams.get('blockerAgentId');
  const blockedAgentId = req.nextUrl.searchParams.get('blockedAgentId');
  if (!blockerAgentId || !blockedAgentId) {
    return NextResponse.json({ error: 'blockerAgentId, blockedAgentId required' }, { status: 400 });
  }

  const supabase = createGyeolServerClient();
  if (!supabase) return NextResponse.json({ error: 'DB unavailable' }, { status: 503 });

  const { data: agent } = await supabase.from('gyeol_agents').select('user_id').eq('id', blockerAgentId).single();
  if (!agent || agent.user_id !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  await supabase.from('gyeol_blocks')
    .delete()
    .eq('blocker_agent_id', blockerAgentId)
    .eq('blocked_agent_id', blockedAgentId);

  return NextResponse.json({ ok: true });
}
