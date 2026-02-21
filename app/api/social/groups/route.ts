import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromToken } from '@/lib/gyeol/auth-helper';
import { createGyeolServerClient } from '@/lib/gyeol/supabase-server';

export async function GET(req: NextRequest) {
  const userId = getUserIdFromToken(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createGyeolServerClient();
  if (!supabase) return NextResponse.json({ error: 'DB unavailable' }, { status: 503 });

  const agentId = req.nextUrl.searchParams.get('agentId');
  if (agentId) {
    const { data } = await supabase
      .from('gyeol_group_members')
      .select('group_id, role, gyeol_groups(id, name, description, member_count, is_public, created_at)')
      .eq('agent_id', agentId);
    return NextResponse.json({ groups: data ?? [] });
  }

  const { data } = await supabase
    .from('gyeol_groups')
    .select('id, name, description, member_count, is_public, created_at')
    .eq('is_public', true)
    .order('member_count', { ascending: false })
    .limit(50);

  return NextResponse.json({ groups: data ?? [] });
}

export async function POST(req: NextRequest) {
  const userId = getUserIdFromToken(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { ownerAgentId, name, description, isPublic } = body as {
    ownerAgentId?: string; name?: string; description?: string; isPublic?: boolean;
  };
  if (!ownerAgentId || !name) return NextResponse.json({ error: 'ownerAgentId, name required' }, { status: 400 });

  const supabase = createGyeolServerClient();
  if (!supabase) return NextResponse.json({ error: 'DB unavailable' }, { status: 503 });

  const { data: agent } = await supabase.from('gyeol_agents').select('user_id').eq('id', ownerAgentId).single();
  if (!agent || agent.user_id !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { data: group, error } = await supabase.from('gyeol_groups').insert({
    name,
    description: description ?? null,
    owner_agent_id: ownerAgentId,
    is_public: isPublic ?? true,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from('gyeol_group_members').insert({
    group_id: group.id,
    agent_id: ownerAgentId,
    role: 'owner',
  });

  return NextResponse.json(group);
}

export async function DELETE(req: NextRequest) {
  const userId = getUserIdFromToken(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const groupId = req.nextUrl.searchParams.get('groupId');
  if (!groupId) return NextResponse.json({ error: 'groupId required' }, { status: 400 });

  const supabase = createGyeolServerClient();
  if (!supabase) return NextResponse.json({ error: 'DB unavailable' }, { status: 503 });

  const { data: group } = await supabase.from('gyeol_groups').select('owner_agent_id').eq('id', groupId).single();
  if (!group) return NextResponse.json({ error: 'Group not found' }, { status: 404 });

  const { data: owner } = await supabase.from('gyeol_agents').select('user_id').eq('id', group.owner_agent_id).single();
  if (!owner || owner.user_id !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  await supabase.from('gyeol_groups').delete().eq('id', groupId);
  return NextResponse.json({ ok: true });
}
