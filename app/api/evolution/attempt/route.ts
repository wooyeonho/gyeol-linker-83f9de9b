import { NextRequest, NextResponse } from 'next/server';
import { createGyeolServerClient } from '@/lib/gyeol/supabase-server';
import { attemptEvolution } from '@/lib/gyeol/evolution-engine';
import { logAction } from '@/lib/gyeol/security/audit-logger';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { agentId } = body as { agentId?: string };
    if (!agentId) {
      return NextResponse.json({ error: 'agentId required' }, { status: 400 });
    }

    const supabase = createGyeolServerClient();
    const { data: agent } = await supabase
      .from('gyeol_agents')
      .select('gen, total_conversations, warmth, logic, creativity, energy, humor, evolution_progress')
      .eq('id', agentId)
      .single();

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    if (Number(agent.evolution_progress) < 100) {
      return NextResponse.json({
        evolved: false,
        message: `진화 준비 중... (${Math.floor(Number(agent.evolution_progress))}%)`,
        probability: 0,
      });
    }

    if (Number(agent.gen) >= 5) {
      return NextResponse.json({
        evolved: false,
        message: '이미 최고 단계에 도달했어요',
        probability: 0,
      });
    }

    const evoResult = attemptEvolution({
      gen: Number(agent.gen),
      total_conversations: Number(agent.total_conversations),
      warmth: Number(agent.warmth),
      logic: Number(agent.logic),
      creativity: Number(agent.creativity),
      energy: Number(agent.energy),
      humor: Number(agent.humor),
      evolution_progress: Number(agent.evolution_progress),
    });

    if (evoResult.success && evoResult.newGen) {
      const evoUpdate: Record<string, unknown> = {
        gen: evoResult.newGen,
        evolution_progress: 0,
      };
      if (evoResult.isMutation && evoResult.personalityBonus) {
        const b = evoResult.personalityBonus;
        if (b.warmth) evoUpdate.warmth = Math.min(100, Number(agent.warmth) + b.warmth);
        if (b.logic) evoUpdate.logic = Math.min(100, Number(agent.logic) + b.logic);
        if (b.creativity) evoUpdate.creativity = Math.min(100, Number(agent.creativity) + b.creativity);
        if (b.energy) evoUpdate.energy = Math.min(100, Number(agent.energy) + b.energy);
        if (b.humor) evoUpdate.humor = Math.min(100, Number(agent.humor) + b.humor);
      }
      await supabase.from('gyeol_agents').update(evoUpdate).eq('id', agentId);

      await logAction(supabase, {
        agentId,
        activityType: 'skill_execution',
        summary: evoResult.message,
        details: {
          newGen: evoResult.newGen,
          probability: evoResult.probability,
          isMutation: evoResult.isMutation,
          mutationType: evoResult.mutationType,
        },
      }).catch(() => {});

      return NextResponse.json({
        evolved: true,
        newGen: evoResult.newGen,
        message: evoResult.message,
        probability: evoResult.probability,
        isMutation: evoResult.isMutation,
        mutationType: evoResult.mutationType,
        mutationName: evoResult.mutationName,
      });
    }

    await supabase.from('gyeol_agents')
      .update({ evolution_progress: 80 })
      .eq('id', agentId);

    return NextResponse.json({
      evolved: false,
      message: evoResult.message,
      probability: evoResult.probability,
    });
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
