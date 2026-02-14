/**
 * GYEOL 채팅 API — OpenClaw → BYOK → env GROQ → 내장 응답 폴백
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
  checkEvolution,
} from '@/lib/gyeol/evolution-engine';
import { logAction } from '@/lib/gyeol/security/audit-logger';
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

function pick(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateBuiltinResponse(userMessage: string, history: ChatMessage[]): string {
  const m = userMessage.toLowerCase().trim();
  const prevCount = history.filter((h) => h.role === 'user').length;
  const isFirst = prevCount <= 1;

  if (/안녕|하이|헬로|반가/.test(m)) {
    if (isFirst) {
      return pick([
        '안녕! 나는 결이야. 만나서 반가워. 오늘 어떤 하루였어?',
        '반가워! 결이라고 해. 편하게 아무 이야기나 해줘.',
        '안녕~ 결이야! 뭐든 물어봐도 되고, 그냥 수다 떨어도 돼.',
      ]);
    }
    return pick([
      '또 왔네! 반가워. 오늘은 뭐 하고 왔어?',
      '어, 안녕! 오늘 기분 어때?',
      '왔구나~ 뭔가 이야기할 거 있어?',
    ]);
  }

  if (/뭐해|뭐하고/.test(m)) {
    return pick([
      '너 기다리고 있었지. 뭐 같이 해볼까?',
      '딱히 뭐 하고 있진 않았어. 너 얘기 듣고 싶어!',
      '음, 이것저것 생각 중이었는데 너 오니까 좋다.',
    ]);
  }

  if (/심심|지루|할거없/.test(m)) {
    return pick([
      '그럼 나한테 아무 주제나 던져봐. 생각보다 재밌을걸?',
      '심심하면 요즘 빠진 거 있어? 아니면 내가 재밌는 얘기 해줄까?',
      '뭐 좋아해? 음악이든 영화든 게임이든 같이 얘기하자.',
      '심심할 때는 엉뚱한 질문이 제일 재밌어. 예를 들면 "우주에서 제일 쓸모없는 초능력은?"',
    ]);
  }

  if (/고마워|감사|땡큐|thank/.test(m)) {
    return pick([
      '에이, 뭘. 내가 더 고맙지.',
      '별거 아닌데 뭐. 언제든 말해.',
      '고마워할 거까지야~ 또 뭐 필요한 거 있으면 말해!',
    ]);
  }

  if (/기분.*(안좋|나빠|별로)|슬퍼|우울|힘들|짜증|화나|스트레스|지치/.test(m)) {
    return pick([
      '무슨 일 있었어? 말해줄 수 있으면 들을게. 안 해도 괜찮아.',
      '그런 날 있지. 억지로 괜찮은 척 안 해도 돼. 그냥 여기 있을게.',
      '힘들었구나. 뭐가 제일 마음에 걸려?',
      '스트레스 받으면 일단 한숨 크게 쉬어. 그리고 천천히 얘기해줘.',
      '내가 해결해줄 순 없어도, 들어주는 건 잘할 수 있어. 말해봐.',
    ]);
  }

  if (/좋아|행복|기뻐|신나|최고|대박/.test(m)) {
    return pick([
      '오 뭔데 뭔데? 좋은 일 있었어?',
      '기분 좋은 거 보니까 나까지 좋아지네. 무슨 일이야?',
      '대박! 자세히 말해줘!',
    ]);
  }

  if (/너는 누구|이름|뭐야|정체|소개/.test(m)) {
    return pick([
      '나는 결이야. 너랑 대화하면서 성격이 조금씩 바뀌는 동반자. 대화할수록 너한테 맞게 변해.',
      '결이라고 해! 그냥 친구라고 생각해. 많이 얘기할수록 나도 성장해.',
    ]);
  }

  if (/뭐 할 수|뭐 해줄|기능|능력|뭐가 돼/.test(m)) {
    return pick([
      '대화 상대, 고민 상담, 아이디어 브레인스토밍, 공부 도와주기, 아니면 그냥 수다. 뭐든 해보자!',
      '일상 대화부터 진지한 고민까지 다 괜찮아. 편하게 아무거나 말해봐.',
    ]);
  }

  if (/날씨|비와|추워|더워|weather/.test(m)) {
    return pick([
      '날씨 데이터는 직접 볼 수 없는데, 오늘 밖에 나가봤어? 어땠어?',
      '날씨 얘기하니까 궁금하다. 요즘 뭐 입고 다녀?',
    ]);
  }

  if (/사랑|좋아해|연애|남친|여친|짝사랑|썸/.test(m)) {
    return pick([
      '연애 얘기? 듣고 싶다! 자세히 말해줘.',
      '요즘 마음에 드는 사람 있어? 아니면 뭔가 고민?',
      '연애는 진짜 정답이 없지. 근데 얘기하면 정리될 때도 있어. 말해봐.',
    ]);
  }

  if (/일|회사|직장|업무|상사|동료|퇴사|이직/.test(m)) {
    return pick([
      '일 얘기구나. 요즘 직장에서 뭐가 제일 골치야?',
      '회사 생활이 쉽진 않지. 뭐가 마음에 안 들어?',
      '이직 생각 있어? 아니면 지금 상황에서 해결하고 싶은 거야?',
    ]);
  }

  if (/공부|시험|학교|과제|대학|수업/.test(m)) {
    return pick([
      '공부 관련이구나. 뭐 공부하고 있어?',
      '시험이야? 무슨 과목? 같이 정리해볼까?',
      '학교 얘기? 뭐가 고민이야?',
    ]);
  }

  if (/음식|밥|뭐먹|맛집|배고|치킨|피자|라면/.test(m)) {
    return pick([
      '배고프구나! 뭐 당기는 거 있어?',
      '음식 얘기하니까 나까지 배고파지는 것 같아. 뭐 먹을 거야?',
      '맛집이면 어디 근처? 뭐 좋아해?',
    ]);
  }

  if (/영화|드라마|넷플|넷플릭스|웹툰|애니|만화/.test(m)) {
    return pick([
      '오, 뭐 보고 있어? 추천도 해줄 수 있어!',
      '최근에 재밌게 본 거 있어? 장르는?',
      '콘텐츠 얘기 좋지! 뭐 좋아해?',
    ]);
  }

  if (/게임|롤|발로란트|오버워치|마크|마인크래프트/.test(m)) {
    return pick([
      '게임 하는구나! 요즘 뭐 해?',
      '뭐 하면서 놀고 있어? 재밌어?',
    ]);
  }

  if (/음악|노래|듣/.test(m)) {
    return pick([
      '음악 좋아해? 요즘 자주 듣는 노래 있어?',
      '뭐 들어? 나도 추천해줘!',
      '음악 취향 궁금하다. 어떤 장르 좋아해?',
    ]);
  }

  if (/여행|놀러|어디|해외|제주|일본|유럽/.test(m)) {
    return pick([
      '여행 가고 싶어? 어디가 제일 가보고 싶어?',
      '여행 얘기 좋다! 최근에 어디 다녀왔어?',
      '가고 싶은 데 있어? 같이 계획 세워볼까?',
    ]);
  }

  if (/꿈|미래|목표|하고싶|되고싶/.test(m)) {
    return pick([
      '꿈 얘기? 진지하게 들을게. 뭐 하고 싶어?',
      '앞으로 뭐 하고 싶은 거야? 궁금하다.',
      '목표가 있으면 좋은 거야. 어떤 거야?',
    ]);
  }

  if (/잠|자야|졸려|피곤|못자|불면/.test(m)) {
    return pick([
      '피곤하구나. 좀 쉬어. 나는 여기 있을게.',
      '잠이 안 와? 뭐 때문에?',
      '졸리면 자! 내일 또 얘기하자.',
    ]);
  }

  if (/ㅋㅋ|ㅎㅎ|ㅋ{3,}|ㅎ{3,}|웃겨|재밌/.test(m)) {
    return pick([
      '뭐가 그렇게 웃겨? 나도 같이 웃을래.',
      'ㅋㅋ 뭔데?',
      '재밌는 거 있으면 공유해줘!',
    ]);
  }

  if (/몰라|모르겠|이해안|어려워/.test(m)) {
    return pick([
      '뭐가 어려워? 같이 정리해보자.',
      '천천히 말해줘. 어떤 부분이 헷갈려?',
      '모르겠으면 하나씩 짚어볼까?',
    ]);
  }

  if (/추천|뭐가 좋|골라줘|어떤게/.test(m)) {
    return pick([
      '뭘 추천해주면 될까? 좀 더 구체적으로 말해줘!',
      '추천은 자신 있어. 어떤 종류?',
      '취향을 좀 알아야 추천해줄 수 있어. 뭐 좋아해?',
    ]);
  }

  if (m.length <= 5) {
    return pick([
      '응?',
      '뭐야?',
      '더 말해줘!',
      '궁금하다, 계속 해봐.',
    ]);
  }

  if (m.endsWith('?') || /어떻게|왜|뭐|언제|어디|누구/.test(m)) {
    return pick([
      '좋은 질문이네. 좀 더 구체적으로 말해주면 제대로 답해줄 수 있을 것 같아.',
      '음, 그건 상황에 따라 다를 수 있는데. 어떤 맥락이야?',
      '그거 궁금하구나. 어떤 부분이 제일 알고 싶어?',
      '한번 같이 생각해보자. 지금까지 어떻게 알고 있어?',
    ]);
  }

  const contextual = [
    '오, 그렇구나. 좀 더 얘기해줘.',
    '흥미롭다. 그래서 어떻게 됐어?',
    '그런 생각 하는 거 좋은데? 더 자세히 말해봐.',
    '나도 그 부분 궁금했어. 계속 말해줘.',
    '그렇구나. 그거에 대해 어떻게 느꼈어?',
    '듣고 보니까 나도 생각이 드네. 더 알려줘.',
    '재밌는 얘기다. 또 있어?',
    '그래? 뭐가 제일 인상적이었어?',
  ];
  return pick(contextual);
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
    const { agentId, message, byokKeys } = body as {
      agentId: string;
      message: string;
      byokKeys?: { provider: string; apiKey: string }[];
    };
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

    const systemPrompt = buildSystemPrompt(personality);

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

    if (!assistantContent && byokKeys?.length) {
      for (const bk of byokKeys) {
        if (!BYOK_PROVIDER_ORDER.includes(bk.provider as typeof BYOK_PROVIDER_ORDER[number])) continue;
        try {
          const content = await callProviderWithMessages(
            bk.provider as typeof BYOK_PROVIDER_ORDER[number],
            bk.apiKey,
            systemPrompt,
            chatMessages,
          );
          if (content) {
            assistantContent = content;
            provider = bk.provider;
            break;
          }
        } catch (err) {
          console.error(`[BYOK-client] ${bk.provider} failed`, err);
          continue;
        }
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
        const content = await callProviderWithMessages('groq', process.env.GROQ_API_KEY, systemPrompt, chatMessages);
        if (content) {
          assistantContent = content;
          provider = 'groq';
        }
      } catch {
        // fallback
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
      assistantContent = generateBuiltinResponse(userMessage, chatMessages);
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
          if (provider === 'openclaw' || !usedApiKey) {
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
        } catch {
          // evolution analysis failed - non-critical
        }
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
