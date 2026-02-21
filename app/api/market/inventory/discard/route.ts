import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromToken } from '@/lib/gyeol/auth-helper';
import { createGyeolServerClient } from '@/lib/gyeol/supabase-server';

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

  const { data: agent } = await supabase
    .from('gyeol_agents')
    .select('user_id')
    .eq('id', agentId)
    .single();
  if (!agent || agent.user_id !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  if (itemType === 'skin') {
    const { error } = await supabase
      .from('gyeol_agent_skins')
      .delete()
      .eq('agent_id', agentId)
      .eq('skin_id', itemId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    return NextResponse.json({ error: 'Unsupported item type' }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
