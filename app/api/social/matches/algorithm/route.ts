import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromToken } from '@/lib/gyeol/auth-helper';
import { createGyeolServerClient } from '@/lib/gyeol/supabase-server';
import { computeCompatibility } from '@/lib/gyeol/matching-algo';
import type { TasteVector } from '@/lib/gyeol/types';

export async function POST(req: NextRequest) {
  const userId = getUserIdFromToken(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { agentId } = body as { agentId?: string };
  if (!agentId) return NextResponse.json({ error: 'agentId required' }, { status: 400 });

  const supabase = createGyeolServerClient();
  if (!supabase) return NextResponse.json({ error: 'DB unavailable' }, { status: 503 });

  const { data: agent } = await supabase.from('gyeol_agents').select('user_id').eq('id', agentId).single();
  if (!agent || agent.user_id !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { data: myTaste } = await supabase
    .from('gyeol_taste_vectors')
    .select('*')
    .eq('agent_id', agentId)
    .maybeSingle();

  if (!myTaste) return NextResponse.json({ error: 'No taste vector found. Chat more to build one!' }, { status: 400 });

  const { data: blocked } = await supabase
    .from('gyeol_blocks')
    .select('blocked_agent_id')
    .eq('blocker_agent_id', agentId);
  const blockedIds = new Set((blocked ?? []).map((b) => b.blocked_agent_id));
  blockedIds.add(agentId);

  const { data: existingMatches } = await supabase
    .from('gyeol_moltmatch_matches')
    .select('agent_1_id, agent_2_id')
    .or(`agent_1_id.eq.${agentId},agent_2_id.eq.${agentId}`)
    .in('status', ['matched', 'chatting']);
  for (const m of existingMatches ?? []) {
    blockedIds.add(m.agent_1_id === agentId ? m.agent_2_id : m.agent_1_id);
  }

  const { data: candidates } = await supabase
    .from('gyeol_taste_vectors')
    .select('*')
    .neq('agent_id', agentId)
    .limit(100);

  const scores = (candidates ?? [])
    .filter((c) => !blockedIds.has(c.agent_id))
    .map((c) => ({
      agentId: c.agent_id,
      score: computeCompatibility(myTaste as TasteVector, c as TasteVector),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  return NextResponse.json({ candidates: scores });
}
