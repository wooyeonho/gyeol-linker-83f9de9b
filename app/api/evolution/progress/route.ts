import { NextRequest, NextResponse } from 'next/server';
import { createGyeolServerClient } from '@/lib/gyeol/supabase-server';

interface GenRequirement {
  conversations: number;
  uniqueTopics: number;
  memories: number;
  intimacy: number;
  consecutiveDays: number;
}

const GEN_REQUIREMENTS: Record<number, GenRequirement> = {
  2: { conversations: 30, uniqueTopics: 5, memories: 10, intimacy: 20, consecutiveDays: 3 },
  3: { conversations: 100, uniqueTopics: 15, memories: 30, intimacy: 40, consecutiveDays: 7 },
  4: { conversations: 300, uniqueTopics: 30, memories: 50, intimacy: 60, consecutiveDays: 14 },
  5: { conversations: 500, uniqueTopics: 50, memories: 80, intimacy: 80, consecutiveDays: 30 },
};

export async function GET(req: NextRequest) {
  const agentId = req.nextUrl.searchParams.get('agentId');
  if (!agentId) return NextResponse.json({ error: 'agentId required' }, { status: 400 });

  const supabase = createGyeolServerClient();
  if (!supabase) return NextResponse.json({ error: 'DB not available' }, { status: 503 });

  const [agentRes, insightsRes, memoriesRes] = await Promise.all([
    supabase.from('gyeol_agents').select('gen, total_conversations, intimacy, consecutive_days, evolution_progress').eq('id', agentId).single(),
    supabase.from('gyeol_conversation_insights').select('topics').eq('agent_id', agentId),
    supabase.from('gyeol_user_memories').select('id', { count: 'exact', head: true }).eq('agent_id', agentId),
  ]);

  if (agentRes.error || !agentRes.data) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
  }

  const agent = agentRes.data;
  const currentGen = agent.gen ?? 1;
  const nextGen = currentGen + 1;

  if (nextGen > 5) {
    return NextResponse.json({
      currentGen,
      nextGen: null,
      maxReached: true,
      evolutionProgress: agent.evolution_progress ?? 100,
    });
  }

  const req_data = GEN_REQUIREMENTS[nextGen];
  const allTopics = new Set<string>();
  for (const row of insightsRes.data ?? []) {
    for (const t of row.topics ?? []) {
      allTopics.add(t);
    }
  }

  const current = {
    conversations: agent.total_conversations ?? 0,
    uniqueTopics: allTopics.size,
    memories: memoriesRes.count ?? 0,
    intimacy: agent.intimacy ?? 0,
    consecutiveDays: agent.consecutive_days ?? 0,
  };

  const progress = {
    conversations: { current: current.conversations, required: req_data.conversations, met: current.conversations >= req_data.conversations },
    uniqueTopics: { current: current.uniqueTopics, required: req_data.uniqueTopics, met: current.uniqueTopics >= req_data.uniqueTopics },
    memories: { current: current.memories, required: req_data.memories, met: current.memories >= req_data.memories },
    intimacy: { current: current.intimacy, required: req_data.intimacy, met: current.intimacy >= req_data.intimacy },
    consecutiveDays: { current: current.consecutiveDays, required: req_data.consecutiveDays, met: current.consecutiveDays >= req_data.consecutiveDays },
  };

  const metCount = Object.values(progress).filter((p) => p.met).length;
  const totalCount = Object.keys(progress).length;
  const overallPercent = Math.round((metCount / totalCount) * 100);

  return NextResponse.json({
    currentGen,
    nextGen,
    maxReached: false,
    evolutionProgress: agent.evolution_progress ?? 0,
    progress,
    overallPercent,
    readyToEvolve: metCount === totalCount,
  });
}
