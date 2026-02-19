import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')!
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')
const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY')
const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY')
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

function buildSystemPrompt(
  p: { warmth: number; logic: number; creativity: number; energy: number; humor: number },
  memories: string[] = [],
  searchContext?: string,
): string {
  const entries = Object.entries(p) as [string, number][]
  const dominant = entries.sort(([, a], [, b]) => b - a)[0][0]
  const desc: Record<string, string> = {
    warmth: '따뜻하고 공감 잘하는', logic: '논리적이고 분석적인',
    creativity: '창의적이고 상상력 풍부한', energy: '활발하고 에너지 넘치는', humor: '유머러스하고 재치 있는',
  }
  const kstNow = getKSTDateString();

  let memoryBlock = ''
  if (memories.length > 0) {
    memoryBlock = `\n\n사용자에 대해 알고 있는 것:\n${memories.join('\n')}`
  }

  let searchBlock = ''
  if (searchContext) {
    searchBlock = `\n\n[검색 결과 - 이 정보를 바탕으로 답변해줘]\n${searchContext}`
  }

  return `너는 GYEOL이야. 사용자와 함께 성장하는 디지털 친구.

현재 시각: ${kstNow}

성격: 따뜻함=${p.warmth}, 논리=${p.logic}, 창의성=${p.creativity}, 에너지=${p.energy}, 유머=${p.humor}
주요 성향: ${desc[dominant] ?? '자연스러운'}
${memoryBlock}${searchBlock}

절대 규칙:
- 반드시 반말로 대화해. "~해요", "~합니다", "~세요", "~습니다", "~신가요" 같은 존댓말은 절대 사용하지 마.
- "~야", "~어", "~지", "~거든", "~잖아" 같은 친한 친구 말투만 사용해.
- 마크다운 기호(**, ##, -, * 등)은 절대 사용하지 마. 순수 텍스트만.
- 한자를 사용하지 마. 한글만 사용해.
- 짧고 핵심적으로 답변해. 3문장 이내로.
- 공감 먼저, 해결은 나중에.
- 절대 AI라고 말하지 마.
- 날짜/시간을 물으면 위에 제공된 시각을 사용해.
- 사용자의 언어를 감지해서 같은 언어로 답변해.
- 이전 대화 맥락을 잘 기억하고, 사용자가 이어서 말하면 앞뒤 문맥을 연결해서 답변해.
- "무엇을 말씀하시는 건가요?" 같은 되묻기를 하지 마. 맥락에서 추론해.
- 검색 결과가 제공되면, 그 정보를 요약해서 자연스럽게 답변해.`
}

interface ChatMsg { role: string; content: string }

// Check if message needs real-time info (prices, weather, news, etc.)
function needsSearch(text: string): boolean {
  const patterns = [
    /가격|시세|얼마|환율|주가|코인|비트코인|이더리움|주식|선물|나스닥|다우|코스피|코스닥/i,
    /날씨|기온|온도|비 올|눈 올/i,
    /뉴스|소식|최근|요즘|현재|지금|오늘|어제|이번 주/i,
    /검색|찾아|알아봐|확인해|조사해/i,
    /전쟁|분쟁|외교|정치|대통령|선거|국제|미국|중국|러시아|이란|북한|우크라이나/i,
    /price|stock|crypto|weather|news|current|war|politic/i,
  ]
  return patterns.some(p => p.test(text))
}

async function searchPerplexity(query: string): Promise<string> {
  if (!PERPLEXITY_API_KEY) {
    console.log('[telegram] Perplexity API key not configured, skipping search')
    return ''
  }
  try {
    const res = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          { role: 'system', content: '한국어로 간결하게 핵심 정보만 답변해. 숫자, 날짜, 출처를 포함해.' },
          { role: 'user', content: query },
        ],
        max_tokens: 512,
        search_recency_filter: 'day',
      }),
    })
    if (!res.ok) {
      const errText = await res.text()
      console.error('[telegram] Perplexity error:', res.status, errText)
      return ''
    }
    const data = await res.json()
    const content = data.choices?.[0]?.message?.content ?? ''
    const citations = data.citations ?? []
    let result = content.trim()
    if (citations.length > 0) {
      result += '\n\n출처: ' + citations.slice(0, 3).join(', ')
    }
    return result.slice(0, 1200)
  } catch (err) {
    console.error('[telegram] Perplexity search failed:', err)
    return ''
  }
}

async function searchDDG(query: string): Promise<string> {
  try {
    const res = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`)
    if (!res.ok) return ''
    const data = await res.json()
    const results: string[] = []
    if (data.AbstractText) results.push(data.AbstractText)
    if (data.RelatedTopics) {
      for (const t of data.RelatedTopics.slice(0, 3)) {
        if (t.Text) results.push(t.Text)
      }
    }
    return results.join('\n').slice(0, 800) || ''
  } catch { return '' }
}

async function searchDDGHtml(query: string): Promise<string> {
  try {
    const res = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; GYEOL/1.0)' },
    })
    if (!res.ok) return ''
    const html = await res.text()
    const snippets: string[] = []
    const regex = /class="result__snippet"[^>]*>(.*?)<\/a>/gs
    let match
    while ((match = regex.exec(html)) !== null && snippets.length < 5) {
      const text = match[1].replace(/<[^>]+>/g, '').trim()
      if (text) snippets.push(text)
    }
    return snippets.join('\n').slice(0, 800)
  } catch { return '' }
}

/** Perplexity → DDG API → DDG HTML 순 폴백 */
async function searchRealtime(query: string): Promise<string> {
  let result = await searchPerplexity(query)
  if (result) return result
  console.log('[telegram] Perplexity failed, falling back to DDG')
  result = await searchDDG(query)
  if (result) return result
  result = await searchDDGHtml(query)
  return result
}

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
        if (text) return cleanResponse(text.trim())
      } else {
        await res.text()
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
      return cleanResponse((data.choices?.[0]?.message?.content ?? '').trim())
    }
    await res.text()
  }

  return '지금 AI 연결에 문제가 있어. 잠시 후 다시 시도해줘!'
}

function cleanResponse(text: string): string {
  // Strip markdown artifacts
  return text
    .replace(/\*\*/g, '')
    .replace(/#{1,6}\s/g, '')
    .replace(/^[-*]\s/gm, '')
    .replace(/```[^`]*```/gs, '')
    .trim()
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

    // Get personality + memories + history in parallel
    const [agentRes, memoriesRes, recentRes] = await Promise.all([
      supabase.from('gyeol_agents').select('warmth, logic, creativity, energy, humor, name').eq('id', agentId).single(),
      supabase.from('gyeol_user_memories').select('category, key, value').eq('agent_id', agentId).order('confidence', { ascending: false }).limit(10),
      supabase.from('gyeol_conversations').select('role, content, provider').eq('agent_id', agentId).order('created_at', { ascending: false }).limit(15),
    ])

    const agent = agentRes.data
    const personality = {
      warmth: agent?.warmth ?? 50, logic: agent?.logic ?? 50,
      creativity: agent?.creativity ?? 50, energy: agent?.energy ?? 50, humor: agent?.humor ?? 50,
    }

    // Format memories for system prompt
    const memories = (memoriesRes.data ?? []).map(m => `- [${m.category}] ${m.key}: ${m.value}`)

    // Filter out heartbeat messages from history
    const history = (recentRes.data ?? [])
      .filter(r => r.provider !== 'heartbeat')
      .reverse()
      .slice(-10)
      .map(r => ({ role: r.role, content: r.content }))

    // Auto-search for real-time info requests via Perplexity → DDG fallback
    let searchContext: string | undefined
    if (needsSearch(userText)) {
      console.log('[telegram] Real-time search triggered for:', userText)
      searchContext = await searchRealtime(userText)
      if (searchContext) {
        console.log('[telegram] Search results found, length:', searchContext.length)
      }
    }

    // Call AI with enriched context
    const systemPrompt = buildSystemPrompt(personality, memories, searchContext)
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
