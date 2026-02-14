/**
 * 스킨 적용 — 에이전트에 스킨 적용
 */
import { NextRequest, NextResponse } from 'next/server';
import { createGyeolServerClient } from '@/lib/gyeol/supabase-server';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { agentId, skinId } = body as { agentId?: string; skinId?: string };
  if (!agentId || !skinId) {
    return NextResponse.json({ error: 'agentId and skinId required' }, { status: 400 });
  }
  const supabase = createGyeolServerClient();
  const { error } = await supabase.from('gyeol_agents').update({ skin_id: skinId }).eq('id', agentId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
