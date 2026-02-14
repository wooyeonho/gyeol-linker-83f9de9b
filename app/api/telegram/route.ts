import { NextRequest, NextResponse } from 'next/server';
import { createGyeolServerClient } from '@/lib/gyeol/supabase-server';
import { callProvider, buildSystemPrompt, type ChatMessage } from '@/lib/gyeol/chat-ai';
import { decryptKey } from '@/lib/gyeol/byok';
import { DEMO_USER_ID } from '@/lib/gyeol/constants';

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? '';
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;

const BYOK_PROVIDERS = ['groq', 'openai', 'deepseek', 'anthropic', 'gemini'] as const;

async function sendTelegramMessage(chatId: number | string, text: string) {
  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
  });
}

async function resolveProvider(supabase: ReturnType<typeof createGyeolServerClient>, userId: string) {
  for (const provider of BYOK_PROVIDERS) {
    const { data: row } = await supabase
      .from('gyeol_user_api_keys')
      .select('encrypted_key')
      .eq('user_id', userId)
      .eq('provider', provider)
      .eq('is_valid', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (row?.encrypted_key) {
      try {
        const apiKey = await decryptKey(row.encrypted_key);
        return { provider, apiKey };
      } catch {
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

    if (userText === '/start') {
      await sendTelegramMessage(chatId, 'GYEOL이에요. 무엇이든 물어보세요.');
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

    await sendTelegramMessage(chatId, reply);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Telegram webhook error:', err);
    return NextResponse.json({ ok: true });
  }
}
