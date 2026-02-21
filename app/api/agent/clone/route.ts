import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromToken, getAgentForUser } from '@/lib/gyeol/auth-helper';
import { createGyeolServerClient } from '@/lib/gyeol/supabase-server';

export async function POST(req: NextRequest) {
  const userId = getUserIdFromToken(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { agentId, newName } = body as { agentId?: string; newName?: string };
  if (!agentId) return NextResponse.json({ error: 'agentId required' }, { status: 400 });

  const agent = await getAgentForUser(agentId, userId);
  if (!agent) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const supabase = createGyeolServerClient();
  if (!supabase) return NextResponse.json({ error: 'DB unavailable' }, { status: 503 });

  const { data: clone, error } = await supabase
    .from('gyeol_agents')
    .insert({
      user_id: userId,
      name: newName ?? `${agent.name} (복제)`,
      gen: 1,
      warmth: agent.warmth,
      logic: agent.logic,
      creativity: agent.creativity,
      energy: agent.energy,
      humor: agent.humor,
      visual_state: agent.visual_state,
      evolution_progress: 0,
      total_conversations: 0,
      intimacy: 0,
      mood: 'neutral',
      consecutive_days: 0,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(clone);
}
