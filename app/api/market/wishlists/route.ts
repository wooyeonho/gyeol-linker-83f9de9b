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
    .from('gyeol_wishlists')
    .select('id, item_type, item_id, created_at')
    .eq('agent_id', agentId)
    .order('created_at', { ascending: false });

  return NextResponse.json({ wishlists: data ?? [] });
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

  const { error } = await supabase.from('gyeol_wishlists').upsert(
    { agent_id: agentId, item_type: itemType, item_id: itemId },
    { onConflict: 'agent_id,item_type,item_id' }
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const userId = getUserIdFromToken(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const agentId = req.nextUrl.searchParams.get('agentId');
  const itemType = req.nextUrl.searchParams.get('itemType');
  const itemId = req.nextUrl.searchParams.get('itemId');
  if (!agentId || !itemType || !itemId) {
    return NextResponse.json({ error: 'agentId, itemType, itemId required' }, { status: 400 });
  }

  const supabase = createGyeolServerClient();
  if (!supabase) return NextResponse.json({ error: 'DB unavailable' }, { status: 503 });

  const { data: agent } = await supabase.from('gyeol_agents').select('user_id').eq('id', agentId).single();
  if (!agent || agent.user_id !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  await supabase.from('gyeol_wishlists')
    .delete()
    .eq('agent_id', agentId)
    .eq('item_type', itemType)
    .eq('item_id', itemId);

  return NextResponse.json({ ok: true });
}
