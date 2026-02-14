/**
 * GYEOL 채팅 API — OpenClaw → BYOK(사용자 키) 우선 → env GROQ 폴백
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
import { EVOLUTION_INTERVAL, DEMO_USER_ID } from '@/lib/gyeol/constants';
import { decryptKey } from '@/lib/gyeol/byok';
import { callProvider, buildSystemPrompt, type ChatMessage } from '@/lib/gyeol/chat-ai';
import type { SupabaseClient } from '@supabase/supabase-js';

const BYOK_PROVIDER_ORDER: Array<'groq' | 'openai' | 'deepseek' | 'anthropic' | 'gemini'> = ['groq', 'openai', 'deepseek', 'anthropic', 'gemini'];

async function tryByok(
  supabase: SupabaseClient,
  userId: string,
  providerOrder: string[],
  systemPrompt: string,
  userMessage: string,
  history?: ChatMessage[],
): Promise<{ content: string; provider: string } | null> {
  for (const provider of providerOrder) {
    if (!BYOK_PROVIDER_ORDER.includes(provider as (typeof BYOK_PROVIDER_ORDER)[number])) continue;
    const { data: row } = await supabase
      .from('gyeol_user_api_keys')
      .select('id, encrypted_key')
      .eq('user_id', userId)
      .eq('provider', provider)
      .eq('is_valid', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!row?.encrypted_key) continue;
    try {
      const apiKey = await decryptKey(row.encrypted_key);
      const content = await callProvider(
        provider as 'openai' | 'groq' | 'deepseek' | 'anthropic' | 'gemini',
        apiKey,
        systemPrompt,
        userMessage,
        history,
      );
      if (content) {
        if (row.id) {
          await supabase
            .from('gyeol_user_api_keys')
            .update({ last_used: new Date().toISOString() })
            .eq('id', row.id);
        }
        return { content, provider };
      }
    } catch {
      continue;
    }
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { agentId, message } = body as { agentId: string; message: string };
    if (!agentId || typeof message !== 'string') {
      return NextResponse.json({ error: 'agentId and message required' }, { status: 400 });
    }

    const supabase = createGyeolServerClient();
    const killed = await checkKillSwitch(supabase);
    if (killed) return NextResponse.json({ error: 'System temporarily paused' }, { status: 503 });

    const inputFilter = filterInput(message);
    if (!inputFilter.safe) {
      return NextResponse.json({ error: 'Content not allowed', flags: inputFilter.flags }, { status: 400 });
    }

    const { data: agent } = await supabase.from('gyeol_agents').select('*').eq('id', agentId).single();
    if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 });

    const openclawUrl = process.env.OPENCLAW_GATEWAY_URL;
    let assistantContent = '';
    let provider = 'groq';
    const systemPrompt = buildSystemPrompt({
      warmth: agent.warmth ?? 50,
      logic: agent.logic ?? 50,
      creativity: agent.creativity ?? 50,
      energy: agent.energy ?? 50,
      humor: agent.humor ?? 50,
    });
    const userMessage = inputFilter.filtered;

    const { data: recentHistory } = await supabase
      .from('gyeol_conversations')
      .select('role, content')
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false })
      .limit(20);
    const history: ChatMessage[] = (recentHistory ?? [])
      .reverse()
      .map((r) => ({ role: r.role as 'user' | 'assistant', content: r.content }));

    if (openclawUrl) {
      try {
        const gwRes = await fetch(`${openclawUrl.replace(/\/$/, '')}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ agentId, message: userMessage }),
        });
        if (gwRes.ok) {
          const gwData = await gwRes.json();
          if (typeof gwData.message === 'string') {
            assistantContent = gwData.message;
            provider = 'openclaw';
          }
        }
      } catch {
        // fallback
      }
    }

    if (!assistantContent) {
      const userId = agent.user_id ?? DEMO_USER_ID;
      const preferred = (agent.preferred_provider as string) || 'groq';
      const providerOrder = [preferred, ...BYOK_PROVIDER_ORDER.filter((p) => p !== preferred)];
      const byokResult = await tryByok(supabase, userId, providerOrder, systemPrompt, userMessage, history);
      if (byokResult) {
        assistantContent = byokResult.content;
        provider = byokResult.provider;
      }
    }

    if (!assistantContent && process.env.GROQ_API_KEY) {
      try {
        const content = await callProvider('groq', process.env.GROQ_API_KEY, systemPrompt, userMessage, history);
        if (content) {
          assistantContent = content;
          provider = 'groq';
        }
      } catch {
        // fallback message below
      }
    }

    if (!assistantContent) {
      assistantContent =
        'GYEOL이에요. (설정에서 BYOK API 키를 등록하거나, 서버에 GROQ_API_KEY를 설정하면 대화가 가능해요.)';
    }

    const outputFilter = filterOutput(assistantContent);
    const finalContent = outputFilter.filtered;

    await supabase.from('gyeol_conversations').insert([
      { agent_id: agentId, role: 'user', content: inputFilter.filtered, channel: 'web' },
      { agent_id: agentId, role: 'assistant', content: finalContent, channel: 'web', provider },
    ]);

    const totalConversations = (Number(agent.total_conversations) || 0) + 2;
    await supabase
      .from('gyeol_agents')
      .update({ total_conversations: totalConversations, last_active: new Date().toISOString() })
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
      const delta = analyzeConversationSimple(messages as { role: string; content: string }[]);
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
