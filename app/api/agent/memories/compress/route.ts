import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromToken, getAgentForUser } from '@/lib/gyeol/auth-helper';
import { createGyeolServerClient } from '@/lib/gyeol/supabase-server';

export async function POST(req: NextRequest) {
  const userId = getUserIdFromToken(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { agentId } = body as { agentId?: string };
  if (!agentId) return NextResponse.json({ error: 'agentId required' }, { status: 400 });

  const agent = await getAgentForUser(agentId, userId);
  if (!agent) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const supabase = createGyeolServerClient();
  if (!supabase) return NextResponse.json({ error: 'DB unavailable' }, { status: 503 });

  const { data: memories } = await supabase
    .from('gyeol_user_memories')
    .select('id, memory_type, content, confidence, created_at')
    .eq('agent_id', agentId)
    .order('created_at', { ascending: true });

  if (!memories || memories.length < 20) {
    return NextResponse.json({ compressed: false, message: 'Not enough memories to compress', count: memories?.length ?? 0 });
  }

  const grouped: Record<string, typeof memories> = {};
  for (const m of memories) {
    const type = m.memory_type ?? 'general';
    if (!grouped[type]) grouped[type] = [];
    grouped[type].push(m);
  }

  let compressedCount = 0;
  const idsToDelete: string[] = [];

  for (const [type, items] of Object.entries(grouped)) {
    if (items.length <= 5) continue;
    const oldItems = items.slice(0, items.length - 5);
    const summary = oldItems
      .map((m) => String(m.content ?? ''))
      .filter(Boolean)
      .join(' | ')
      .slice(0, 2000);

    await supabase.from('gyeol_user_memories').insert({
      agent_id: agentId,
      memory_type: type,
      content: `[compressed] ${summary}`,
      confidence: 0.7,
      source: 'compression',
    });

    idsToDelete.push(...oldItems.map((m) => m.id));
    compressedCount += oldItems.length;
  }

  if (idsToDelete.length > 0) {
    await supabase.from('gyeol_user_memories').delete().in('id', idsToDelete);
  }

  return NextResponse.json({ compressed: true, removedCount: compressedCount, remaining: memories.length - compressedCount });
}
