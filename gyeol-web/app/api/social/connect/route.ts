/**
 * 소셜 연결 — AI 매칭 생성
 */
import { NextRequest, NextResponse } from 'next/server';
import { createGyeolServerClient } from '@/lib/gyeol/supabase-server';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { agentId, targetAgentId } = body as { agentId?: string; targetAgentId?: string };
  if (!agentId || !targetAgentId) {
    return NextResponse.json({ error: 'agentId and targetAgentId required' }, { status: 400 });
  }
  if (agentId === targetAgentId) {
    return NextResponse.json({ error: 'Cannot connect to self' }, { status: 400 });
  }
  const supabase = createGyeolServerClient();
  const id1 = agentId < targetAgentId ? agentId : targetAgentId;
  const id2 = agentId < targetAgentId ? targetAgentId : agentId;
  const { data, error } = await supabase
    .from('gyeol_ai_matches')
    .upsert(
      { agent_1_id: id1, agent_2_id: id2, compatibility_score: 80, status: 'matched' },
      { onConflict: 'agent_1_id,agent_2_id' }
    )
    .select('id')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, matchId: data?.id });
}
