import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromToken } from '@/lib/gyeol/auth-helper';
import { createGyeolServerClient } from '@/lib/gyeol/supabase-server';

export async function DELETE(req: NextRequest) {
  const userId = getUserIdFromToken(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const matchId = req.nextUrl.searchParams.get('matchId');
  const agentId = req.nextUrl.searchParams.get('agentId');
  if (!matchId || !agentId) return NextResponse.json({ error: 'matchId, agentId required' }, { status: 400 });

  const supabase = createGyeolServerClient();
  if (!supabase) return NextResponse.json({ error: 'DB unavailable' }, { status: 503 });

  const { data: agent } = await supabase.from('gyeol_agents').select('user_id').eq('id', agentId).single();
  if (!agent || agent.user_id !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { data: match } = await supabase
    .from('gyeol_moltmatch_matches')
    .select('agent_1_id, agent_2_id')
    .eq('id', matchId)
    .single();

  if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 });
  if (match.agent_1_id !== agentId && match.agent_2_id !== agentId) {
    return NextResponse.json({ error: 'Not your match' }, { status: 403 });
  }

  await supabase.from('gyeol_moltmatch_matches')
    .update({ status: 'ended' })
    .eq('id', matchId);

  return NextResponse.json({ ok: true });
}
