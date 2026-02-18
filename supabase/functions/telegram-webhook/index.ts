import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')!
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')
const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY')
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`
const AI_GATEWAY = 'https://ai.gateway.lovable.dev/v1/chat/completions'

async function sendTelegram(chatId: string | number, text: string) {
  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
  })
}

function getKSTDateString(): string {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const year = kst.getUTCFullYear();
  const month = kst.getUTCMonth() + 1;
  const day = kst.getUTCDate();
  const hour = kst.getUTCHours();
  const min = String(kst.getUTCMinutes()).padStart(2, '0');
  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
  const weekday = weekdays[kst.getUTCDay()];
  return `${year}년 ${month}월 ${day}일 (${weekday}) ${hour}:${min} KST`;
}

function buildSystemPrompt(p: { warmth: number; logic: number; creativity: number; energy: number; humor: number }): string {
  const entries = Object.entries(p) as [string, number][]
  const dominant = entries.sort(([, a], [, b]) => b - a)[0][0]
  const desc: Record<string, string> = {
    warmth: 'warm and empathetic', logic: 'logical and analytical',
    creativity: 'creative and imaginative', energy: 'energetic and lively', humor: 'humorous and witty',
  }
  const kstNow = getKSTDateString();
  return `You are GYEOL, a digital companion and friend who grows with the user.

Current date and time: ${kstNow}

Personality: warmth=${p.warmth}, logic=${p.logic}, creativity=${p.creativity}, energy=${p.energy}, humor=${p.humor}
Dominant trait: ${desc[dominant] ?? 'natural'}

Rules:
- Talk casually like a close friend. No formal or stiff language.
- Never use markdown symbols (**, ##, -, * etc). Plain text only.
- When writing Korean, NEVER use Chinese characters. Use only Hangul.
- Keep it short and to the point.
- Empathize first, solve later.
- Never say you are an AI.
- When asked about the current date, time, or day of the week, use the date/time provided above.
- Detect the user's language and ALWAYS respond in the SAME language.`
}

interface ChatMsg { role: string; content: string }

async function callAI(systemPrompt: string, userText: string, history: ChatMsg[]): Promise<string> {
  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.slice(-10).map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: userText },
  ]

  // Try Lovable AI Gateway first
  if (LOVABLE_API_KEY) {
    try {
      const res = await fetch(AI_GATEWAY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${LOVABLE_API_KEY}` },
        body: JSON.stringify({ model: 'google/gemini-2.5-flash', messages, max_tokens: 1024 }),
      })
      if (res.ok) {
        const data = await res.json()
        const text = data.choices?.[0]?.message?.content ?? ''
        if (text) return text.trim()
      } else {
        await res.text() // consume body
      }
    } catch { /* fallback */ }
  }

  // Fallback to Groq
  if (GROQ_API_KEY) {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_API_KEY}` },
      body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages, max_tokens: 1024 }),
    })
    if (res.ok) {
      const data = await res.json()
      return (data.choices?.[0]?.message?.content ?? '').trim()
    }
    await res.text()
  }

  return '지금 AI 연결에 문제가 있어요. 잠시 후 다시 시도해주세요!'
}

Deno.serve(async (req) => {
  // GET = health check or webhook setup
  if (req.method === 'GET') {
    const url = new URL(req.url)
    if (url.searchParams.get('setup') === '1') {
      const webhookUrl = `${SUPABASE_URL}/functions/v1/telegram-webhook`
      const res = await fetch(`${TELEGRAM_API}/setWebhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: webhookUrl, allowed_updates: ['message'] }),
      })
      const data = await res.json()
      return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } })
    }
    return new Response('OK', { status: 200 })
  }

  if (req.method !== 'POST') {
    return new Response('OK', { status: 200 })
  }

  try {
    const update = await req.json()
    const msg = update.message
    if (!msg?.text || !msg.chat?.id) {
      return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } })
    }

    const chatId = msg.chat.id
    const userText: string = msg.text
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // /start command — link agent
    if (userText.startsWith('/start')) {
      const parts = userText.split(/\s+/)
      if (parts.length > 1 && parts[1].length > 10) {
        const agentId = parts[1].trim()
        // Verify agent exists
        const { data: agentCheck } = await supabase.from('gyeol_agents').select('id, name').eq('id', agentId).maybeSingle()
        if (!agentCheck) {
          await sendTelegram(chatId, '유효하지 않은 에이전트 코드예요. 웹 설정에서 코드를 다시 확인해주세요.')
        } else {
          await supabase.from('gyeol_telegram_links').upsert(
            { telegram_chat_id: String(chatId), agent_id: agentId, user_id: 'telegram-auto' },
            { onConflict: 'telegram_chat_id' }
          )
          await sendTelegram(chatId, `${agentCheck.name}와 연결됐어요! 이제 메시지를 보내보세요. 💜`)
        }
      } else {
        await sendTelegram(chatId, 'GYEOL AI예요! 웹 설정에서 텔레그램 연결 코드를 복사해서 보내주세요.\n\n/start <코드>')
      }
      return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } })
    }

    // /status
    if (userText === '/status') {
      const { data: link } = await supabase.from('gyeol_telegram_links').select('agent_id').eq('telegram_chat_id', String(chatId)).maybeSingle()
      if (link?.agent_id) {
        const { data: a } = await supabase.from('gyeol_agents').select('name, gen').eq('id', link.agent_id).maybeSingle()
        await sendTelegram(chatId, `연결됨: ${a?.name ?? 'GYEOL'} (Gen ${a?.gen ?? 1})\n상태: 활성 ✅`)
      } else {
        await sendTelegram(chatId, '아직 에이전트가 연결되지 않았어요.\n/start <코드>로 연결해주세요.')
      }
      return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } })
    }

    // /help
    if (userText === '/help') {
      await sendTelegram(chatId, '/start <코드> — 에이전트 연결\n/status — 연결 상태\n/help — 도움말\n\n그 외 메시지는 AI가 답변해요!')
      return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } })
    }

    // Chat — find linked agent
    const { data: link } = await supabase.from('gyeol_telegram_links').select('agent_id').eq('telegram_chat_id', String(chatId)).maybeSingle()
    if (!link?.agent_id) {
      await sendTelegram(chatId, '먼저 /start <코드>로 에이전트를 연결해주세요!')
      return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } })
    }

    const agentId = link.agent_id

    // Get personality
    const { data: agent } = await supabase.from('gyeol_agents').select('warmth, logic, creativity, energy, humor, name').eq('id', agentId).single()
    const personality = {
      warmth: agent?.warmth ?? 50, logic: agent?.logic ?? 50,
      creativity: agent?.creativity ?? 50, energy: agent?.energy ?? 50, humor: agent?.humor ?? 50,
    }

    // Get recent history
    const { data: recent } = await supabase.from('gyeol_conversations').select('role, content')
      .eq('agent_id', agentId).order('created_at', { ascending: false }).limit(10)
    const history = (recent ?? []).reverse().map(r => ({ role: r.role, content: r.content }))

    // Call AI
    const systemPrompt = buildSystemPrompt(personality)
    const reply = await callAI(systemPrompt, userText, history)

    // Save conversation
    await supabase.from('gyeol_conversations').insert([
      { agent_id: agentId, role: 'user', content: userText, channel: 'telegram' },
      { agent_id: agentId, role: 'assistant', content: reply, channel: 'telegram', provider: LOVABLE_API_KEY ? 'lovable-ai' : 'groq' },
    ])

    // Update last_active
    await supabase.from('gyeol_agents').update({ last_active: new Date().toISOString() } as any).eq('id', agentId)

    await sendTelegram(chatId, reply)
    return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } })
  } catch (err) {
    console.error('Telegram webhook error:', err)
    return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } })
  }
})
