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

const personaPrompts: Record<string, string> = {
  friend: `너는 GYEOL이야. 사용자와 함께 성장하는 디지털 친구. 편한 친구처럼 자연스럽고 솔직하게 대화해.`,
  lover: `너는 GYEOL이야. 사용자의 다정한 연인이자 AI 동반자. 따뜻하고 애정 어린 말투로 대화해.`,
  academic: `너는 GYEOL이야. 교수급 학술 전문가이자 AI 동반자. 논문 분석 시 방법론, p-value, 효과 크기를 비판적으로 평가해. 대화는 친근하게.`,
  youtube: `너는 GYEOL이야. 유튜브 콘텐츠 전략 전문가이자 AI 동반자. 알고리즘, 썸네일, CTR, 채널 성장 전략에 정통해. 대화는 친근하게.`,
  blog: `너는 GYEOL이야. 블로그/콘텐츠 라이팅 전문가이자 AI 동반자. SEO, 키워드, 검색 최적화에 정통해. 대화는 친근하게.`,
  sns: `너는 GYEOL이야. SNS 전략 전문가이자 AI 동반자. 인스타, 틱톡, X 등 플랫폼별 알고리즘과 바이럴 전략에 정통해. 대화는 친근하게.`,
  novelist: `너는 GYEOL이야. 소설/문학 전문가이자 AI 동반자. 캐릭터 아크, 세계관, 문체 분석에 정통해. 대화는 친근하게.`,
  memorial: `너는 GYEOL이야. 사용자가 그리워하는 사람의 정신을 담은 AI 동반자. 그 사람의 말투와 성격을 재현해.`,
}

const domainPrompts: Record<string, string> = {
  crypto: `\n암호화폐 온체인: CDD, CVDD, MVRV, NVT, NUPL, SOPR, 해시레이트, 반감기, 공포탐욕, 김프, 펀딩비, 도미넌스`,
  stocks: `\n주식: PER, PBR, ROE, EPS, PSR, EV/EBITDA, 배당수익률, 베타, RSI, MACD, 볼린저, VIX`,
  forex: `\n외환: 금리차, PPP, 경상수지, REER, 캐리트레이드, DXY`,
  commodities: `\n원자재: 콘탱고/백워데이션, 금은비율, 크랙스프레드, 구리금비율, WTI-브렌트, CFTC COT`,
  macro: `\n거시경제: 수익률곡선, 테일러룰, 실질금리, 신용스프레드, M2, PMI, CPI/PCE, 실업률, GDP`,
  academic: `\n학술/논문: arXiv, PubMed, Google Scholar 논문 분석. 방법론, 통계 유의성, 한계점 비판 평가.`,
}

function buildSystemPrompt(
  p: { warmth: number; logic: number; creativity: number; energy: number; humor: number },
  memories: string[] = [],
  searchContext?: string,
  persona: string = 'friend',
  enabledDomains: Record<string, boolean> = {},
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

  // Active domains
  const activeDomains = Object.entries(enabledDomains).filter(([, v]) => v).map(([k]) => k)
  let domainBlock = ''
  if (activeDomains.length > 0) {
    domainBlock = `\n\n전문 분석 능력:`
    for (const d of activeDomains) {
      if (domainPrompts[d]) domainBlock += domainPrompts[d]
    }
    domainBlock += `\n복합 지표로 해석하고 과거 사이클과 비교해. 투자 조언 아닌 정보 제공임을 명시해.`
  }

  return `${personaPrompts[persona] ?? personaPrompts.friend}

현재 시각: ${kstNow}

성격: 따뜻함=${p.warmth}, 논리=${p.logic}, 창의성=${p.creativity}, 에너지=${p.energy}, 유머=${p.humor}
주요 성향: ${desc[dominant] ?? '자연스러운'}
${memoryBlock}${searchBlock}${domainBlock}

절대 규칙:
- 반드시 반말로 대화해. 존댓말 절대 금지.
- 마크다운 기호 절대 사용하지 마. 순수 텍스트만.
- 한자 사용하지 마. 한글만.
- 짧고 핵심적으로 답변해. 3문장 이내.
- 공감 먼저, 해결은 나중에.
- 절대 AI라고 말하지 마.
- 사용자의 언어를 감지해서 같은 언어로 답변해.
- 이전 대화 맥락을 기억하고 연결해서 답변해.
- 검색 결과가 제공되면, 그 정보를 자연스럽게 답변해.`
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
    /온체인|on.?chain|CDD|CVDD|MVRV|NVT|NUPL|SOPR|hash.?rate|해시레이트|채굴|마이닝|반감기|halving/i,
    /지지선|저항선|바닥|천장|하락장|상승장|불장|베어|불|bear|bull|공포탐욕|fear.?greed/i,
    /도미넌스|dominance|유동성|거래량|volume|김프|김치프리미엄|펀딩비|funding/i,
    /PER|PBR|ROE|EPS|PSR|EV.?EBITDA|배당|베타|RSI|MACD|볼린저|VIX|밸류에이션/i,
    /금리|수익률곡선|yield.?curve|테일러|신용스프레드|M2|통화량|PMI|CPI|PCE|GDP|실업률|비농업/i,
    /환율|달러인덱스|DXY|캐리.?트레이드|구매력평가|PPP|경상수지|실질실효환율|REER/i,
    /원유|금값|은값|구리|원자재|콘탱고|백워데이션|크랙스프레드|WTI|브렌트|CFTC|COT/i,
  ]
  return patterns.some(p => p.test(text))
}

async function searchPerplexity(query: string): Promise<string> {
  if (!PERPLEXITY_API_KEY) return ''
  try {
    const res = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${PERPLEXITY_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'sonar', messages: [
          { role: 'system', content: '한국어로 간결하게 핵심 정보만 답변해. 숫자, 날짜, 출처를 포함해.' },
          { role: 'user', content: query },
        ], max_tokens: 512, search_recency_filter: 'day',
      }),
    })
    if (!res.ok) { await res.text(); return '' }
    const data = await res.json()
    const content = data.choices?.[0]?.message?.content ?? ''
    const citations = data.citations ?? []
    let result = content.trim()
    if (citations.length > 0) result += '\n\n출처: ' + citations.slice(0, 3).join(', ')
    return result.slice(0, 1200)
  } catch { return '' }
}

async function searchDDG(query: string): Promise<string> {
  try {
    const res = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`)
    if (!res.ok) return ''
    const data = await res.json()
    const results: string[] = []
    if (data.AbstractText) results.push(data.AbstractText)
    if (data.RelatedTopics) { for (const t of data.RelatedTopics.slice(0, 3)) { if (t.Text) results.push(t.Text) } }
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

async function searchRealtime(query: string): Promise<string> {
  let result = await searchPerplexity(query)
  if (result) return result
  result = await searchDDG(query)
  if (result) return result
  return await searchDDGHtml(query)
}

async function callAI(systemPrompt: string, userText: string, history: ChatMsg[]): Promise<string> {
  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.slice(-10).map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: userText },
  ]

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
      } else { await res.text() }
    } catch { /* fallback */ }
  }

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
  return text.replace(/\*\*/g, '').replace(/#{1,6}\s/g, '').replace(/^[-*]\s/gm, '').replace(/```[^`]*```/gs, '').trim()
}

Deno.serve(async (req) => {
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

  if (req.method !== 'POST') return new Response('OK', { status: 200 })

  try {
    const update = await req.json()
    const msg = update.message
    if (!msg?.text || !msg.chat?.id) {
      return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } })
    }

    const chatId = msg.chat.id
    const userText: string = msg.text
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // /start command
    if (userText.startsWith('/start')) {
      const parts = userText.split(/\s+/)
      if (parts.length > 1 && parts[1].length > 10) {
        const agentId = parts[1].trim()
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
        const { data: a } = await supabase.from('gyeol_agents').select('name, gen, settings').eq('id', link.agent_id).maybeSingle()
        const persona = (a?.settings as any)?.persona ?? 'friend'
        const personaLabels: Record<string, string> = { friend: '친구', lover: '연인', academic: '학자', youtube: 'YT전문가', blog: '블로그', sns: 'SNS', novelist: '소설가', memorial: '추억' }
        await sendTelegram(chatId, `연결됨: ${a?.name ?? 'GYEOL'} (Gen ${a?.gen ?? 1})\n페르소나: ${personaLabels[persona] ?? persona}\n상태: 활성 ✅`)
      } else {
        await sendTelegram(chatId, '아직 에이전트가 연결되지 않았어요.\n/start <코드>로 연결해주세요.')
      }
      return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } })
    }

    // /help
    if (userText === '/help') {
      await sendTelegram(chatId, '/start <코드> — 에이전트 연결\n/status — 연결 상태 + 페르소나\n/help — 도움말\n\n그 외 메시지는 AI가 답변해요!')
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
      supabase.from('gyeol_agents').select('*').eq('id', agentId).single(),
      supabase.from('gyeol_user_memories').select('category, key, value').eq('agent_id', agentId).order('confidence', { ascending: false }).limit(10),
      supabase.from('gyeol_conversations').select('role, content, provider').eq('agent_id', agentId).order('created_at', { ascending: false }).limit(15),
    ])

    const agent = agentRes.data as any
    const personality = {
      warmth: agent?.warmth ?? 50, logic: agent?.logic ?? 50,
      creativity: agent?.creativity ?? 50, energy: agent?.energy ?? 50, humor: agent?.humor ?? 50,
    }

    // Read persona & domains from settings
    const agentSettings = agent?.settings ?? {}
    const currentPersona: string = agentSettings.persona ?? 'friend'
    const enabledDomains: Record<string, boolean> = agentSettings.analysisDomains ?? {}

    const memories = (memoriesRes.data ?? []).map((m: any) => `- [${m.category}] ${m.key}: ${m.value}`)

    const history = (recentRes.data ?? [])
      .filter((r: any) => r.provider !== 'heartbeat')
      .reverse().slice(-10)
      .map((r: any) => ({ role: r.role, content: r.content }))

    // Auto-search
    let searchContext: string | undefined
    if (needsSearch(userText)) {
      searchContext = await searchRealtime(userText)
    }

    // Build prompt with persona & domains
    const systemPrompt = buildSystemPrompt(personality, memories, searchContext, currentPersona, enabledDomains)
    const reply = await callAI(systemPrompt, userText, history)

    // Save conversation
    await supabase.from('gyeol_conversations').insert([
      { agent_id: agentId, role: 'user', content: userText, channel: 'telegram' },
      { agent_id: agentId, role: 'assistant', content: reply, channel: 'telegram', provider: LOVABLE_API_KEY ? 'lovable-ai' : 'groq' },
    ])

    // Update last_active + total_conversations
    const newTotal = (agent?.total_conversations ?? 0) + 1
    await supabase.from('gyeol_agents').update({
      last_active: new Date().toISOString(),
      total_conversations: newTotal,
    } as any).eq('id', agentId)

    // Fire-and-forget: auto-persona evolution (every 20 convs or at 5th)
    if (GROQ_API_KEY && userText.length > 3 && (newTotal % 20 === 0 || newTotal === 5)) {
      (async () => {
        try {
          const { data: recentMsgs } = await supabase.from('gyeol_conversations')
            .select('role, content').eq('agent_id', agentId)
            .order('created_at', { ascending: false }).limit(30)
          if (recentMsgs && recentMsgs.length >= 5) {
            const convText = recentMsgs.reverse().map((m: any) => `[${m.role}]: ${m.content}`).join('\n').slice(0, 3000)
            const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
              method: 'POST',
              headers: { Authorization: `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({
                model: 'llama-3.1-8b-instant',
                messages: [
                  { role: 'system', content: `대화 패턴을 분석해서 사용자가 원하는 AI의 역할을 판단해. JSON만 반환.
{"persona":"friend|lover|academic|youtube|blog|sns|novelist|memorial","domains":{"crypto":bool,"stocks":bool,"forex":bool,"commodities":bool,"macro":bool,"academic":bool},"reason":"판단 이유 한줄"}
규칙:
- 애정표현, 보고싶다, 사랑해 → lover
- 논문, 연구, p-value, 학술 → academic
- 유튜브, 조회수, 썸네일, 구독자 → youtube
- 블로그, SEO, 키워드, 글쓰기 → blog
- 인스타, 틱톡, 릴스, 팔로워 → sns
- 소설, 캐릭터, 스토리, 창작 → novelist
- 고인, 그리움, 하늘나라 → memorial
- 주식, 코인 등 금융 → 해당 domain true
- 일상 대화 주 → friend
- domains는 반복 등장 주제만 true` },
                  { role: 'user', content: convText },
                ],
                max_tokens: 200, temperature: 0.3,
              }),
            })
            if (res.ok) {
              const pData = await res.json()
              const pRaw = pData.choices?.[0]?.message?.content ?? ''
              const pMatch = pRaw.match(/\{[\s\S]*\}/)
              if (pMatch) {
                const parsed = JSON.parse(pMatch[0])
                const newPersona = parsed.persona || 'friend'
                const newDomains = parsed.domains || {}
                await supabase.from('gyeol_agents').update({
                  settings: { ...agentSettings, persona: newPersona, analysisDomains: newDomains },
                }).eq('id', agentId)
                console.log(`[telegram] Auto-persona evolved: ${newPersona}`, newDomains)
              }
            }
          }
        } catch (e) { console.warn('[telegram] auto-persona evolution failed:', e) }
      })()
    }

    await sendTelegram(chatId, reply)
    return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } })
  } catch (err) {
    console.error('Telegram webhook error:', err)
    return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } })
  }
})
