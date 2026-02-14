/**
 * GYEOL 채팅 API — OpenClaw Gateway 또는 직접 AI 라우터로 전달
 */

import { NextRequest, NextResponse } from 'next/server';
import { createGyeolServerClient } from '@/lib/gyeol/supabase-server';
import { checkKillSwitch } from '@/lib/gyeol/security/kill-switch-check';
import { filterInput, filterOutput } from '@/lib/gyeol/security/content-filter';
import {
  analyzeConversationSimple,
  applyPersonalityDelta,
  calculateVisualState,
  checkEvolution,
} from '@/lib/gyeol/evolution-engine';
import { logAction } from '@/lib/gyeol/security/audit-logger';

const EVOLUTION_INTERVAL = 10;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { agentId, message } = body as { agentId: string; message: string };
    if (!agentId || typeof message !== 'string') {
      return NextResponse.json({ error: 'agentId and message required' }, { status: 400 });
    }

    const supabase = createGyeolServerClient();
    const killed = await checkKillSwitch(supabase);
    if (killed) {
      return NextResponse.json({ error: 'System temporarily paused' }, { status: 503 });
    }

    const inputFilter = filterInput(message);
    if (!inputFilter.safe) {
      return NextResponse.json({ error: 'Content not allowed', flags: inputFilter.flags }, { status: 400 });
    }

    const { data: agent } = await supabase.from('gyeol_agents').select('*').eq('id', agentId).single();
    if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 });

    const openclawUrl = process.env.OPENCLAW_GATEWAY_URL;
    let assistantContent = '';
    let provider = 'groq';

    if (openclawUrl) {
      try {
        const gwRes = await fetch(`${openclawUrl.replace(/\/$/, '')}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ agentId, message: inputFilter.filtered }),
        });
        if (gwRes.ok) {
          const gwData = await gwRes.json();
          if (typeof gwData.message === 'string') {
            assistantContent = gwData.message;
            provider = 'openclaw';
          }
        }
      } catch {
        // fallback to Groq
      }
    }

    if (!assistantContent && process.env.GROQ_API_KEY) {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            {
              role: 'system',
              content: `You are GYEOL. Respond in Korean. Personality: warmth=${agent.warmth}, logic=${agent.logic}, creativity=${agent.creativity}, energy=${agent.energy}, humor=${agent.humor}. Be natural and helpful.`,
            },
            { role: 'user', content: inputFilter.filtered },
          ],
          max_tokens: 1024,
        }),
      });
      const data = await res.json();
      assistantContent = data.choices?.[0]?.message?.content ?? '';
    }
    if (!assistantContent) {
      assistantContent = 'GYEOL이에요. (OPENCLAW_GATEWAY_URL 또는 GROQ_API_KEY를 설정하면 대화가 가능해요.)';
    }

    const outputFilter = filterOutput(assistantContent);
    const finalContent = outputFilter.filtered;

    await supabase.from('gyeol_conversations').insert([
      { agent_id: agentId, role: 'user', content: inputFilter.filtered, channel: 'web' },
      {
        agent_id: agentId,
        role: 'assistant',
        content: finalContent,
        channel: 'web',
        provider: provider,
      },
    ]);

    const totalConversations = (Number(agent.total_conversations) || 0) + 2;
    await supabase
      .from('gyeol_agents')
      .update({
        total_conversations: totalConversations,
        last_active: new Date().toISOString(),
      })
      .eq('id', agentId);

    let personalityChanged = false;
    let evolved = false;
    let newVisualState = (agent.visual_state as Record<string, unknown>) ?? {};
    let newGen = agent.gen;

    if (totalConversations > 0 && totalConversations % EVOLUTION_INTERVAL === 0) {
      const { data: recent } = await supabase
        .from('gyeol_conversations')
        .select('role, content')
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false })
        .limit(20);
      const messages = (recent ?? []).map((r) => ({ role: r.role, content: r.content }));
      const delta = analyzeConversationSimple(
        messages as { role: string; content: string }[]
      );
      const current = {
        warmth: agent.warmth,
        logic: agent.logic,
        creativity: agent.creativity,
        energy: agent.energy,
        humor: agent.humor,
      };
      const next = applyPersonalityDelta(current, delta);
      newVisualState = calculateVisualState(next);
      await supabase
        .from('gyeol_agents')
        .update({
          warmth: next.warmth,
          logic: next.logic,
          creativity: next.creativity,
          energy: next.energy,
          humor: next.humor,
          visual_state: newVisualState,
          evolution_progress: Math.min(100, Number(agent.evolution_progress) + 5),
        })
        .eq('id', agentId);
      personalityChanged = true;

      const updatedAgent = {
        ...agent,
        total_conversations: totalConversations,
        warmth: next.warmth,
        logic: next.logic,
        creativity: next.creativity,
        energy: next.energy,
        humor: next.humor,
        evolution_progress: Math.min(100, Number(agent.evolution_progress) + 5),
      };
      const evo = checkEvolution(updatedAgent as { gen: number; total_conversations: number; evolution_progress: number });
      if (evo.evolved && evo.newGen) {
        await supabase.from('gyeol_agents').update({ gen: evo.newGen }).eq('id', agentId);
        evolved = true;
        newGen = evo.newGen;
      }
    }

    await logAction(supabase, {
      agentId,
      activityType: 'skill_execution',
      summary: 'Chat message processed',
      details: { provider, evolutionInterval: EVOLUTION_INTERVAL },
      wasSandboxed: true,
    });

    return NextResponse.json({
      message: finalContent,
      personalityChanged,
      evolved,
      newGen: evolved ? newGen : undefined,
      newVisualState: personalityChanged ? newVisualState : undefined,
    });
  } catch (e) {
    console.error('gyeol chat error', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
