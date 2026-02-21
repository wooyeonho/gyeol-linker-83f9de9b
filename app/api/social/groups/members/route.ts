import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromToken } from '@/lib/gyeol/auth-helper';
import { createGyeolServerClient } from '@/lib/gyeol/supabase-server';

export async function POST(req: NextRequest) {
  const userId = getUserIdFromToken(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { groupId, agentId } = body as { groupId?: string; agentId?: string };
  if (!groupId || !agentId) return NextResponse.json({ error: 'groupId, agentId required' }, { status: 400 });

  const supabase = createGyeolServerClient();
  if (!supabase) return NextResponse.json({ error: 'DB unavailable' }, { status: 503 });

  const { data: agent } = await supabase.from('gyeol_agents').select('user_id').eq('id', agentId).single();
  if (!agent || agent.user_id !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { data: group } = await supabase.from('gyeol_groups').select('max_members, member_count').eq('id', groupId).single();
  if (!group) return NextResponse.json({ error: 'Group not found' }, { status: 404 });
  if ((group.member_count ?? 0) >= (group.max_members ?? 50)) {
    return NextResponse.json({ error: 'Group is full' }, { status: 400 });
  }

  const { error } = await supabase.from('gyeol_group_members').upsert(
    { group_id: groupId, agent_id: agentId, role: 'member' },
    { onConflict: 'group_id,agent_id' }
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from('gyeol_groups')
    .update({ member_count: (group.member_count ?? 0) + 1 })
    .eq('id', groupId);

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const userId = getUserIdFromToken(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const groupId = req.nextUrl.searchParams.get('groupId');
  const agentId = req.nextUrl.searchParams.get('agentId');
  if (!groupId || !agentId) return NextResponse.json({ error: 'groupId, agentId required' }, { status: 400 });

  const supabase = createGyeolServerClient();
  if (!supabase) return NextResponse.json({ error: 'DB unavailable' }, { status: 503 });

  const { data: agent } = await supabase.from('gyeol_agents').select('user_id').eq('id', agentId).single();
  if (!agent || agent.user_id !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  await supabase.from('gyeol_group_members').delete().eq('group_id', groupId).eq('agent_id', agentId);

  const { data: group } = await supabase.from('gyeol_groups').select('member_count').eq('id', groupId).single();
  if (group) {
    await supabase.from('gyeol_groups')
      .update({ member_count: Math.max(0, (group.member_count ?? 1) - 1) })
      .eq('id', groupId);
  }

  return NextResponse.json({ ok: true });
}
