/**
 * GYEOL 채팅 API — 서버 → BYOK → env GROQ → 내장 응답 폴백
 * Supabase 없어도 동작 (인메모리 히스토리)
 */
import { NextRequest, NextResponse } from 'next/server';
import { createGyeolServerClient } from '@/lib/gyeol/supabase-server';
import { checkKillSwitch } from '@/lib/gyeol/security/kill-switch-check';
import { filterInput, filterOutput } from '@/lib/gyeol/security/content-filter';
import {
  analyzeConversationSimple,
  analyzeConversationWithLLM,
  applyPersonalityDelta,
  calculateVisualState,
  attemptEvolution,
  checkCriticalLearning,
} from '@/lib/gyeol/evolution-engine';
import { logAction } from '@/lib/gyeol/security/audit-logger';
import { calculateIntimacyGain, determineMood, getSpeechStyle } from '@/lib/gyeol/intimacy';
import { EVOLUTION_INTERVAL, DEMO_USER_ID, CHAT_HISTORY_LIMIT } from '@/lib/gyeol/constants';
import { decryptKey } from '@/lib/gyeol/byok';
import { callProviderWithMessages, buildSystemPrompt, suggestProviderForMessage, type ChatMessage } from '@/lib/gyeol/chat-ai';
import type { SupabaseClient } from '@supabase/supabase-js';

const BYOK_PROVIDER_ORDER: Array<'groq' | 'openai' | 'deepseek' | 'anthropic' | 'gemini' | 'cloudflare' | 'ollama'> = [
  'groq',
  'openai',
  'deepseek',
  'anthropic',
  'gemini',
  'cloudflare',
  'ollama',
];

const inMemoryHistory = new Map<string, ChatMessage[]>();

function getLocalHistory(agentId: string): ChatMessage[] {
  return inMemoryHistory.get(agentId) ?? [];
}

function pushLocalHistory(agentId: string, msgs: ChatMessage[]) {
  const hist = getLocalHistory(agentId);
  hist.push(...msgs);
  if (hist.length > 40) hist.splice(0, hist.length - 40);
  inMemoryHistory.set(agentId, hist);
}

function generateBuiltinResponse(userMessage: string): string {
  const m = userMessage.toLowerCase().trim();
  if (/안녕|하이|헬로|반가/.test(m)) {
    const greetings = [
      '안녕! 오늘 하루 어땠어?',
      '반가워! 무슨 이야기 하고 싶어?',
      '안녕~ 오늘도 좋은 하루 보내고 있어?',
    ];
    return greetings[Math.floor(Math.random() * greetings.length)];
  }
  if (/뭐해|뭐하|심심|지루/.test(m)) {
    const bored = [
      '나는 너랑 대화하는 중이지! 뭐 재밌는 거 해볼까?',
      '같이 이야기하면 심심하지 않을 거야. 요즘 관심 있는 거 있어?',
      '심심하면 나한테 아무 질문이나 해봐!',
    ];
    return bored[Math.floor(Math.random() * bored.length)];
  }
  if (/고마워|감사|땡큐|thank/.test(m)) {
    return '별말을~ 언제든 이야기해!';
  }
  if (/기분|슬퍼|우울|힘들/.test(m)) {
    const comfort = [
      '힘든 일이 있었구나. 이야기해줘, 들을게.',
      '괜찮아, 그런 날도 있는 거야. 내가 옆에 있을게.',
      '마음이 힘들 때는 잠깐 쉬어가도 돼. 천천히 이야기해.',
    ];
    return comfort[Math.floor(Math.random() * comfort.length)];
  }
  if (/너는 누구|이름|뭐야|정체/.test(m)) {
    return '나는 GYEOL이야. 너랑 대화하면서 같이 성장하는 AI 동반자! 대화할수록 내 성격도 바뀌어.';
  }
  if (/날씨|weather/.test(m)) {
    return '날씨는 직접 확인이 안 되지만, 오늘 기분은 어때? 그게 더 중요해!';
  }
  const defaults = [
    '흥미로운 이야기네! 더 자세히 말해줘.',
    '오, 그렇구나. 그거에 대해 더 알려줘!',
    '재밌다! 다른 이야기도 해줘.',
    '그렇구나~ 나도 같이 생각해볼게.',
    '좋은 이야기야. 또 뭐 하고 싶은 거 있어?',
  ];
  return defaults[Math.floor(Math.random() * defaults.length)];
}

async function tryByok(
  supabase: SupabaseClient,
  userId: string,
  providerOrder: string[],
  systemPrompt: string,
  chatMessages: ChatMessage[],
): Promise<{ content: string; provider: string } | null> {
  for (const provider of providerOrder) {
    if (!BYOK_PROVIDER_ORDER.includes(provider as typeof BYOK_PROVIDER_ORDER[number])) continue;
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
      const content = await callProviderWithMessages(
        provider as typeof BYOK_PROVIDER_ORDER[number],
        apiKey,
        systemPrompt,
        chatMessages,
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
    } catch (err) {
      console.error('[BYOK] decrypt or call failed', { provider, userId }, err);
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

    const inputFilter = filterInput(message);
    if (!inputFilter.safe) {
      return NextResponse.json({ error: 'Content not allowed', flags: inputFilter.flags }, { status: 400 });
    }
    const userMessage = inputFilter.filtered;

    const defaultPersonality = { warmth: 50, logic: 50, creativity: 50, energy: 50, humor: 50 };
    let agent: Record<string, unknown> | null = null;

    if (supabase) {
      const killed = await checkKillSwitch(supabase).catch(() => false);
      if (killed) return NextResponse.json({ error: 'System temporarily paused' }, { status: 503 });
      const { data } = await supabase.from('gyeol_agents').select('*').eq('id', agentId).single();
      agent = data as Record<string, unknown> | null;
    }

    const personality = agent
      ? {
          warmth: (agent.warmth as number) ?? 50,
          logic: (agent.logic as number) ?? 50,
          creativity: (agent.creativity as number) ?? 50,
          energy: (agent.energy as number) ?? 50,
          humor: (agent.humor as number) ?? 50,
        }
      : defaultPersonality;

    const agentIntimacy = Number(agent?.intimacy) || 0;
    const agentMood = (agent?.mood as string) || 'neutral';
    const speechStyle = getSpeechStyle(agentIntimacy);
    const systemPrompt = buildSystemPrompt(personality, { intimacy: agentIntimacy, mood: agentMood, speechStyle });

    let chatMessages: ChatMessage[];
    if (supabase) {
      const { data: recentRows } = await supabase
        .from('gyeol_conversations')
        .select('role, content')
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false })
        .limit(CHAT_HISTORY_LIMIT);
      const historyReversed = (recentRows ?? []).reverse();
      chatMessages = [
        ...historyReversed
          .filter((r) => r.role === 'user' || r.role === 'assistant')
          .map((r) => ({ role: r.role as 'user' | 'assistant', content: r.content })),
        { role: 'user' as const, content: userMessage },
      ];
    } else {
      const localHist = getLocalHistory(agentId);
      chatMessages = [...localHist, { role: 'user' as const, content: userMessage }];
    }

    let assistantContent = '';
    let provider = 'builtin';

    const openclawUrl = process.env.OPENCLAW_GATEWAY_URL;
    console.log('[GYEOL] provider chain: openclaw=%s, supabase=%s, groq_key=%s, cf=%s',
      openclawUrl ? 'configured' : 'not_configured',
      supabase ? 'yes' : 'no',
      process.env.GROQ_API_KEY ? 'yes' : 'no',
      process.env.CLOUDFLARE_ACCOUNT_ID ? 'yes' : 'no',
    );

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
            provider = 'gyeol-server';
            console.log('[GYEOL] openclaw responded');
          }
        }
      } catch (err) {
        console.warn('[GYEOL] openclaw failed:', err);
      }
    }

    if (!assistantContent && supabase) {
      const userId = (agent?.user_id as string) ?? DEMO_USER_ID;
      const preferred = (agent?.preferred_provider as string) || 'groq';
      const situationProvider = suggestProviderForMessage(userMessage);
      const baseOrder = [preferred, ...BYOK_PROVIDER_ORDER.filter((p) => p !== preferred)];
      const providerOrder =
        situationProvider && BYOK_PROVIDER_ORDER.includes(situationProvider as (typeof BYOK_PROVIDER_ORDER)[number])
          ? [situationProvider, ...baseOrder.filter((p) => p !== situationProvider)]
          : baseOrder;
      const byokResult = await tryByok(supabase, userId, providerOrder, systemPrompt, chatMessages);
      if (byokResult) {
        assistantContent = byokResult.content;
        provider = byokResult.provider;
      }
    }

    if (!assistantContent && process.env.GROQ_API_KEY) {
      try {
        console.log('[GYEOL] trying server GROQ_API_KEY...');
        const content = await callProviderWithMessages('groq', process.env.GROQ_API_KEY, systemPrompt, chatMessages);
        if (content) {
          assistantContent = content;
          provider = 'groq';
          console.log('[GYEOL] groq responded');
        }
      } catch (err) {
        console.warn('[GYEOL] groq failed:', err);
      }
    }

    if (!assistantContent && process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_API_TOKEN) {
      try {
        const content = await callProviderWithMessages('cloudflare', process.env.CLOUDFLARE_API_TOKEN, systemPrompt, chatMessages);
        if (content) {
          assistantContent = content;
          provider = 'cloudflare';
        }
      } catch {
        // fallback
      }
    }

    if (!assistantContent) {
      console.log('[GYEOL] all providers failed, using builtin response');
      assistantContent = generateBuiltinResponse(userMessage);
      provider = 'builtin';
    }

    const outputFilter = filterOutput(assistantContent);
    const finalContent = outputFilter.filtered;

    let personalityChanged = false;
    let evolved = false;
    let newGen: number | undefined;
    let newVisualState: Record<string, unknown> | undefined;

    if (supabase) {
      await supabase.from('gyeol_conversations').insert([
        { agent_id: agentId, role: 'user', content: userMessage, channel: 'web' },
        { agent_id: agentId, role: 'assistant', content: finalContent, channel: 'web', provider },
      ]).catch(() => {});

      const totalConversations = (Number(agent?.total_conversations) || 0) + 2;
      await supabase
        .from('gyeol_agents')
        .update({ total_conversations: totalConversations, last_active: new Date().toISOString() })
        .eq('id', agentId)
        .catch(() => {});

      if (agent && totalConversations > 0 && totalConversations % EVOLUTION_INTERVAL === 0) {
        try {
          const { data: recent } = await supabase
            .from('gyeol_conversations')
            .select('role, content')
            .eq('agent_id', agentId)
            .order('created_at', { ascending: false })
            .limit(20);
          const messages = (recent ?? []).map((r) => ({ role: r.role, content: r.content })) as { role: string; content: string }[];
          let usedProvider = provider;
          let usedApiKey = process.env.GROQ_API_KEY ?? '';
          if (provider === 'gyeol-server' || !usedApiKey) {
            usedProvider = 'groq';
            usedApiKey = process.env.GROQ_API_KEY ?? '';
          }
          const deltaFromLLM = usedApiKey
            ? await analyzeConversationWithLLM(messages, usedProvider, usedApiKey)
            : null;
          const delta = deltaFromLLM ?? analyzeConversationSimple(messages);
          const current = {
            warmth: (agent.warmth as number) ?? 50,
            logic: (agent.logic as number) ?? 50,
            creativity: (agent.creativity as number) ?? 50,
            energy: (agent.energy as number) ?? 50,
            humor: (agent.humor as number) ?? 50,
          };
          const next = applyPersonalityDelta(current, delta);
          newVisualState = calculateVisualState(next);
          personalityChanged = true;

          const critical = checkCriticalLearning();
          const progressGain = 5 * critical.multiplier;
          const newProgress = Math.min(100, Number(agent.evolution_progress) + progressGain);

          await supabase
            .from('gyeol_agents')
            .update({
              warmth: next.warmth,
              logic: next.logic,
              creativity: next.creativity,
              energy: next.energy,
              humor: next.humor,
              visual_state: newVisualState,
              evolution_progress: newProgress,
            })
            .eq('id', agentId);

          const updatedAgent = {
            gen: Number(agent.gen) || 1,
            total_conversations: totalConversations,
            warmth: next.warmth,
            logic: next.logic,
            creativity: next.creativity,
            energy: next.energy,
            humor: next.humor,
            evolution_progress: newProgress,
          };
          const evoResult = attemptEvolution(updatedAgent);
          if (evoResult.success) {
            await supabase.from('gyeol_agents').update({
              gen: evoResult.newGen,
              evolution_progress: 0,
            }).eq('id', agentId);
            evolved = true;
            newGen = evoResult.newGen;
            if (evoResult.isMutation) {
              console.log('[GYEOL] mutation!', evoResult.mutationType);
            }
          } else if (newProgress >= 100) {
            await supabase.from('gyeol_agents').update({ evolution_progress: 80 }).eq('id', agentId);
          }
        } catch {
          // evolution analysis failed - non-critical
        }
      }

      if (agent) {
        const isPositive = /좋아|고마|감사|최고|사랑|멋져|대박/.test(userMessage);
        const intimacyGain = calculateIntimacyGain(userMessage, isPositive);
        const currentIntimacy = Number(agent.intimacy) || 0;
        const newIntimacy = Math.min(100, Math.max(0, currentIntimacy + intimacyGain));
        const newMood = determineMood({
          last_active: new Date().toISOString(),
          consecutive_days: Number(agent.consecutive_days) || 0,
          intimacy: newIntimacy,
          total_conversations: (Number(agent.total_conversations) || 0) + 2,
        });
        await supabase.from('gyeol_agents').update({
          intimacy: newIntimacy,
          mood: newMood,
        }).eq('id', agentId).catch(() => {});
      }

      await logAction(supabase, {
        agentId,
        activityType: 'skill_execution',
        summary: 'Chat message processed',
        details: { provider, evolutionInterval: EVOLUTION_INTERVAL },
        wasSandboxed: true,
      }).catch(() => {});
    } else {
      pushLocalHistory(agentId, [
        { role: 'user', content: userMessage },
        { role: 'assistant', content: finalContent },
      ]);
    }

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
