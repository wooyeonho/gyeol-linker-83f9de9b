import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromToken } from '@/lib/gyeol/auth-helper';
import { createGyeolServerClient } from '@/lib/gyeol/supabase-server';

export async function GET(req: NextRequest) {
  const userId = getUserIdFromToken(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const agentId = req.nextUrl.searchParams.get('agentId');
  if (!agentId) return NextResponse.json({ error: 'agentId required' }, { status: 400 });

  const supabase = createGyeolServerClient();
  if (!supabase) return NextResponse.json({ error: 'DB unavailable' }, { status: 503 });

  const { data } = await supabase
    .from('gyeol_market_approvals')
    .select('id, item_type, item_id, status, reviewer_notes, submitted_at, reviewed_at')
    .eq('submitter_agent_id', agentId)
    .order('submitted_at', { ascending: false });

  return NextResponse.json({ approvals: data ?? [] });
}

export async function POST(req: NextRequest) {
  const userId = getUserIdFromToken(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { agentId, itemType, itemId } = body as { agentId?: string; itemType?: string; itemId?: string };
  if (!agentId || !itemType || !itemId) {
    return NextResponse.json({ error: 'agentId, itemType, itemId required' }, { status: 400 });
  }

  const supabase = createGyeolServerClient();
  if (!supabase) return NextResponse.json({ error: 'DB unavailable' }, { status: 503 });

  const { data: agent } = await supabase.from('gyeol_agents').select('user_id').eq('id', agentId).single();
  if (!agent || agent.user_id !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { data: existing } = await supabase
    .from('gyeol_market_approvals')
    .select('id, status')
    .eq('item_type', itemType)
    .eq('item_id', itemId)
    .eq('status', 'pending')
    .maybeSingle();

  if (existing) return NextResponse.json({ error: 'Already pending approval' }, { status: 409 });

  const { data, error } = await supabase.from('gyeol_market_approvals').insert({
    item_type: itemType,
    item_id: itemId,
    submitter_agent_id: agentId,
  }).select('id').single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, approvalId: data?.id });
}
