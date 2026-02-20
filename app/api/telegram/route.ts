import { NextRequest, NextResponse } from 'next/server';
import { createGyeolServerClient } from '@/lib/gyeol/supabase-server';
import { callProvider, buildSystemPrompt, type ChatMessage } from '@/lib/gyeol/chat-ai';
import { decryptKey } from '@/lib/gyeol/byok';
import { DEMO_USER_ID } from '@/lib/gyeol/constants';

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? '';
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;

const BYOK_PROVIDERS = ['groq', 'openai', 'deepseek', 'anthropic', 'gemini'] as const;

async function sendTelegramMessage(chatId: number | string, text: string, replyMarkup?: object) {
  const body: Record<string, unknown> = { chat_id: chatId, text };
  if (replyMarkup) body.reply_markup = replyMarkup;
  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function resolveProvider(supabase: ReturnType<typeof createGyeolServerClient>, userId: string) {
  for (const provider of BYOK_PROVIDERS) {
    const { data: row } = await supabase
      .from('gyeol_byok_keys')
      .select('encrypted_key')
      .eq('user_id', userId)
      .eq('provider', provider)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (row?.encrypted_key) {
      try {
        const apiKey = await decryptKey(row.encrypted_key);
        return { provider, apiKey };
      } catch (err) {
        console.error('[telegram] decrypt failed:', provider, err);
        continue;
      }
    }
  }
  if (process.env.GROQ_API_KEY) {
    return { provider: 'groq' as const, apiKey: process.env.GROQ_API_KEY };
  }
  return null;
}

export async function POST(req: NextRequest) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (secret) {
    const headerSecret = req.headers.get('x-telegram-bot-api-secret-token');
    if (headerSecret !== secret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const update = await req.json();
    const msg = update.message;
    if (!msg?.text || !msg.chat?.id) {
      return NextResponse.json({ ok: true });
    }

    const chatId = msg.chat.id;
    const userText = msg.text;

    if (userText.startsWith('/start')) {
      const parts = userText.split(/\s+/);
      if (parts.length > 1 && parts[1].length > 10) {
        const linkAgentId = parts[1].trim();
        const supabaseEarly = createGyeolServerClient();
        await supabaseEarly.from('gyeol_telegram_links').upsert(
          { telegram_chat_id: String(chatId), agent_id: linkAgentId, user_id: 'telegram-auto' },
          { onConflict: 'telegram_chat_id' },
        );
        await sendTelegramMessage(chatId, 'GYEOL과 연결됐어요! 이제 메시지를 보내보세요.');
      } else {
        await sendTelegramMessage(chatId, 'GYEOL AI예요. 웹 설정에서 텔레그램 연결 버튼을 눌러 연결해주세요!');
      }
      return NextResponse.json({ ok: true });
    }

    if (userText === '/status') {
      const supabaseStatus = createGyeolServerClient();
      const { data: statusLink } = await supabaseStatus
        .from('gyeol_telegram_links')
        .select('agent_id')
        .eq('telegram_chat_id', String(chatId))
        .maybeSingle();
      if (statusLink?.agent_id) {
        await sendTelegramMessage(chatId, `연결된 에이전트: ${statusLink.agent_id}\n상태: 활성`);
      } else {
        await sendTelegramMessage(chatId, '아직 에이전트가 연결되지 않았어요. /start <코드>로 연결해주세요.');
      }
      return NextResponse.json({ ok: true });
    }

    if (userText === '/help') {
      await sendTelegramMessage(chatId, '🤖 GYEOL 명령어\n\n/start <코드> - 에이전트 연결\n/status - 연결 상태 확인\n/stats - 대화 통계\n/mood - 현재 기분 확인\n/export - 최근 대화 내보내기\n/help - 도움말\n\n그 외 메시지는 AI가 답변해요!');
      return NextResponse.json({ ok: true });
    }

    if (userText === '/stats') {
      const supabaseStats = createGyeolServerClient();
      const { data: statsLink } = await supabaseStats
        .from('gyeol_telegram_links')
        .select('agent_id')
        .eq('telegram_chat_id', String(chatId))
        .maybeSingle();
      if (statsLink?.agent_id) {
        const { data: agentStats } = await supabaseStats
          .from('gyeol_agents')
          .select('name, gen, total_conversations, intimacy, evolution_progress, mood')
          .eq('id', statsLink.agent_id)
          .single();
        if (agentStats) {
          await sendTelegramMessage(chatId,
            `📊 ${agentStats.name} 통계\n\n` +
            `🧬 세대: Gen ${agentStats.gen}\n` +
            `💬 총 대화: ${agentStats.total_conversations}회\n` +
            `💕 친밀도: ${agentStats.intimacy}\n` +
            `📈 진화: ${Number(agentStats.evolution_progress).toFixed(1)}%\n` +
            `😊 기분: ${agentStats.mood}`
          );
        }
      } else {
        await sendTelegramMessage(chatId, '에이전트가 연결되지 않았어요.');
      }
      return NextResponse.json({ ok: true });
    }

    if (userText === '/mood') {
      const supabaseMood = createGyeolServerClient();
      const { data: moodLink } = await supabaseMood
        .from('gyeol_telegram_links')
        .select('agent_id')
        .eq('telegram_chat_id', String(chatId))
        .maybeSingle();
      if (moodLink?.agent_id) {
        const { data: ag } = await supabaseMood
          .from('gyeol_agents')
          .select('mood, warmth, energy, humor')
          .eq('id', moodLink.agent_id)
          .single();
        if (ag) {
          const moodEmoji: Record<string, string> = { happy: '😊', sad: '😢', excited: '🤩', calm: '😌', neutral: '😐', curious: '🧐', tired: '😴' };
          await sendTelegramMessage(chatId,
            `${moodEmoji[ag.mood] ?? '😐'} 현재 기분: ${ag.mood}\n\n` +
            `따뜻함: ${'█'.repeat(Math.round(ag.warmth / 10))}${'░'.repeat(10 - Math.round(ag.warmth / 10))} ${ag.warmth}\n` +
            `에너지: ${'█'.repeat(Math.round(ag.energy / 10))}${'░'.repeat(10 - Math.round(ag.energy / 10))} ${ag.energy}\n` +
            `유머: ${'█'.repeat(Math.round(ag.humor / 10))}${'░'.repeat(10 - Math.round(ag.humor / 10))} ${ag.humor}`
          );
        }
      } else {
        await sendTelegramMessage(chatId, '에이전트가 연결되지 않았어요.');
      }
      return NextResponse.json({ ok: true });
    }

    if (userText === '/export') {
      const supabaseExport = createGyeolServerClient();
      const { data: exportLink } = await supabaseExport
        .from('gyeol_telegram_links')
        .select('agent_id')
        .eq('telegram_chat_id', String(chatId))
        .maybeSingle();
      if (exportLink?.agent_id) {
        const { data: recentExport } = await supabaseExport
          .from('gyeol_conversations')
          .select('role, content, created_at')
          .eq('agent_id', exportLink.agent_id)
          .order('created_at', { ascending: false })
          .limit(20);
        if (recentExport && recentExport.length > 0) {
          const lines = recentExport.reverse().map((m) => {
            const t = new Date(m.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
            return `[${t}] ${m.role === 'user' ? 'You' : 'AI'}: ${m.content}`;
          });
          const exportText = `📝 최근 ${recentExport.length}개 대화\n${'─'.repeat(20)}\n\n${lines.join('\n\n')}`;
          // Telegram has a 4096 char limit
          await sendTelegramMessage(chatId, exportText.slice(0, 4090));
        } else {
          await sendTelegramMessage(chatId, '대화 기록이 없어요.');
        }
      } else {
        await sendTelegramMessage(chatId, '에이전트가 연결되지 않았어요.');
      }
      return NextResponse.json({ ok: true });
    }

    const supabase = createGyeolServerClient();

    const { data: link } = await supabase
      .from('gyeol_telegram_links')
      .select('agent_id, user_id')
      .eq('telegram_chat_id', String(chatId))
      .maybeSingle();

    const agentId = link?.agent_id;
    const userId = link?.user_id ?? DEMO_USER_ID;

    let personality = { warmth: 50, logic: 50, creativity: 50, energy: 50, humor: 50 };
    if (agentId) {
      const { data: agent } = await supabase
        .from('gyeol_agents')
        .select('warmth, logic, creativity, energy, humor')
        .eq('id', agentId)
        .single();
      if (agent) {
        personality = {
          warmth: agent.warmth ?? 50,
          logic: agent.logic ?? 50,
          creativity: agent.creativity ?? 50,
          energy: agent.energy ?? 50,
          humor: agent.humor ?? 50,
        };
      }
    }

    const systemPrompt = buildSystemPrompt(personality);
    const resolved = await resolveProvider(supabase, userId);

    if (!resolved) {
      await sendTelegramMessage(chatId, 'API 키가 설정되지 않았어요. GYEOL 설정에서 BYOK 키를 등록해주세요.');
      return NextResponse.json({ ok: true });
    }

    let history: ChatMessage[] = [];
    if (agentId) {
      const { data: recent } = await supabase
        .from('gyeol_conversations')
        .select('role, content')
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false })
        .limit(10);
      history = (recent ?? [])
        .reverse()
        .map((r) => ({ role: r.role as 'user' | 'assistant', content: r.content }));
    }

    const reply = await callProvider(
      resolved.provider as 'openai' | 'groq' | 'deepseek' | 'anthropic' | 'gemini',
      resolved.apiKey,
      systemPrompt,
      userText,
      history,
    );

    if (agentId) {
      await supabase.from('gyeol_conversations').insert([
        { agent_id: agentId, role: 'user', content: userText, channel: 'telegram' },
        { agent_id: agentId, role: 'assistant', content: reply, channel: 'telegram', provider: resolved.provider },
      ]);
    }

    // Send with inline keyboard for quick actions
    await sendTelegramMessage(chatId, reply, {
      inline_keyboard: [
        [
          { text: '📊 Stats', callback_data: '/stats' },
          { text: '😊 Mood', callback_data: '/mood' },
          { text: '📝 Export', callback_data: '/export' },
        ],
      ],
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Telegram webhook error:', err);
    return NextResponse.json({ ok: true });
  }
}
