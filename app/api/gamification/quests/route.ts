import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromToken, getAgentIdForUser } from '@/lib/gyeol/auth-helper';
import { createGyeolServerClient } from '@/lib/gyeol/supabase-server';

export async function GET(req: NextRequest) {
  const userId = getUserIdFromToken(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const agentId = req.nextUrl.searchParams.get('agentId') ?? await getAgentIdForUser(userId);
  if (!agentId) return NextResponse.json({ error: 'No agent' }, { status: 404 });

  const supabase = createGyeolServerClient();
  if (!supabase) return NextResponse.json({ error: 'DB unavailable' }, { status: 503 });

  const { data: definitions } = await supabase
    .from('gyeol_quest_definitions')
    .select('*')
    .eq('is_active', true)
    .order('difficulty');

  const { data: progress } = await supabase
    .from('gyeol_quest_progress')
    .select('*')
    .eq('agent_id', agentId);

  const progressMap = new Map((progress ?? []).map((p) => [p.quest_id, p]));
  const quests = (definitions ?? []).map((d) => {
    const p = progressMap.get(d.id);
    return {
      ...d,
      progress: p?.progress ?? 0,
      is_completed: p?.is_completed ?? false,
      claimed: p?.claimed ?? false,
    };
  });

  return NextResponse.json({ quests });
}

export async function POST(req: NextRequest) {
  const userId = getUserIdFromToken(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { agentId, questId } = body as { agentId?: string; questId?: string };
  if (!agentId || !questId) return NextResponse.json({ error: 'agentId, questId required' }, { status: 400 });

  const supabase = createGyeolServerClient();
  if (!supabase) return NextResponse.json({ error: 'DB unavailable' }, { status: 503 });

  const { data: agent } = await supabase.from('gyeol_agents').select('user_id').eq('id', agentId).single();
  if (!agent || agent.user_id !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { data: progress } = await supabase
    .from('gyeol_quest_progress')
    .select('*')
    .eq('agent_id', agentId)
    .eq('quest_id', questId)
    .maybeSingle();

  if (!progress?.is_completed || progress?.claimed) {
    return NextResponse.json({ error: 'Quest not completed or already claimed' }, { status: 400 });
  }

  const { data: quest } = await supabase
    .from('gyeol_quest_definitions')
    .select('reward_type, reward_amount')
    .eq('id', questId)
    .single();

  if (!quest) return NextResponse.json({ error: 'Quest not found' }, { status: 404 });

  await supabase.from('gyeol_quest_progress')
    .update({ claimed: true })
    .eq('agent_id', agentId)
    .eq('quest_id', questId);

  if (quest.reward_type === 'coins' || quest.reward_type === 'exp') {
    const field = quest.reward_type === 'coins' ? 'coins' : 'exp';
    const { data: profile } = await supabase
      .from('gyeol_gamification_profiles')
      .select(field)
      .eq('agent_id', agentId)
      .maybeSingle();

    const current = (profile as Record<string, number> | null)?.[field] ?? 0;
    await supabase.from('gyeol_gamification_profiles')
      .upsert({ agent_id: agentId, [field]: current + quest.reward_amount }, { onConflict: 'agent_id' });
  }

  return NextResponse.json({ ok: true, reward_type: quest.reward_type, reward_amount: quest.reward_amount });
}
