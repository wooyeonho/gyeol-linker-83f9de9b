import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PERPLEXITY_API_KEY = Deno.env.get("PERPLEXITY_API_KEY");

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

// ─── Search helpers ───

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
  ];
  return patterns.some(p => p.test(text));
}

function isFinancialAnalysisQuery(text: string): boolean {
  return /온체인|on.?chain|CDD|CVDD|MVRV|NVT|NUPL|SOPR|hash.?rate|해시레이트|채굴|반감기|halving|도미넌스|dominance|펀딩비|funding|김프|공포탐욕|fear.?greed|PER|PBR|ROE|EPS|PSR|EV.?EBITDA|배당수익률|베타|RSI|MACD|볼린저|VIX|금리|수익률곡선|yield.?curve|테일러|신용스프레드|M2|통화량|PMI|CPI|PCE|GDP|실업률|비농업|환율|DXY|달러인덱스|캐리.?트레이드|PPP|경상수지|REER|콘탱고|백워데이션|크랙스프레드|WTI|브렌트|CFTC|COT|금.?은.?비율/i.test(text);
}

async function searchPerplexity(query: string): Promise<string> {
  if (!PERPLEXITY_API_KEY) return "";
  try {
    const res = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${PERPLEXITY_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "sonar",
        messages: [
          { role: "system", content: "한국어로 간결하게 핵심 정보만 답변해. 숫자, 날짜, 출처를 포함해." },
          { role: "user", content: query },
        ],
        max_tokens: 512,
        search_recency_filter: "day",
      }),
    });
    if (!res.ok) { await res.text(); return ""; }
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content ?? "";
    const citations = data.citations ?? [];
    let result = content.trim();
    if (citations.length > 0) result += "\n\n출처: " + citations.slice(0, 3).join(", ");
    return result.slice(0, 1200);
  } catch (e) {
    console.error("Perplexity search failed:", e);
    return "";
  }
}

async function searchDDG(query: string): Promise<string> {
  try {
    const res = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`);
    if (!res.ok) return "";
    const data = await res.json();
    const results: string[] = [];
    if (data.AbstractText) results.push(data.AbstractText);
    if (data.RelatedTopics) {
      for (const t of data.RelatedTopics.slice(0, 3)) {
        if (t.Text) results.push(t.Text);
      }
    }
    return results.join("\n").slice(0, 800) || "";
  } catch { return ""; }
}

async function searchDDGHtml(query: string): Promise<string> {
  try {
    const res = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; GYEOL/1.0)" },
    });
    if (!res.ok) return "";
    const html = await res.text();
    const snippets: string[] = [];
    const regex = /class="result__snippet"[^>]*>(.*?)<\/a>/gs;
    let match;
    while ((match = regex.exec(html)) !== null && snippets.length < 5) {
      const text = match[1].replace(/<[^>]+>/g, "").trim();
      if (text) snippets.push(text);
    }
    return snippets.join("\n").slice(0, 800);
  } catch { return ""; }
}

/** Perplexity → DDG API → DDG HTML 순 폴백 */
async function searchRealtime(query: string): Promise<string> {
  let result = await searchPerplexity(query);
  if (result) return result;
  console.log("[chat] Perplexity failed, falling back to DDG");
  result = await searchDDG(query);
  if (result) return result;
  result = await searchDDGHtml(query);
  return result;
}

// ─── Prompt & utils ───

function buildSystemPrompt(
  p: { warmth: number; logic: number; creativity: number; energy: number; humor: number },
  enabledDomains: Record<string, boolean> = {},
  persona: string = "friend"
): string {
  const entries = Object.entries(p) as [string, number][];
  const dominant = entries.sort(([, a], [, b]) => b - a)[0][0];
  const desc: Record<string, string> = {
    warmth: "따뜻하고 공감을 잘 하는", logic: "논리적이고 분석적인",
    creativity: "창의적이고 상상력이 풍부한", energy: "활기차고 열정적인", humor: "유머러스하고 재치 있는",
  };

  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const dateStr = kst.toISOString().slice(0, 10);
  const timeStr = kst.toISOString().slice(11, 16);

  const defaultPersonaPrompt = `너는 GYEOL(결)이야. 사용자와 함께 성장하는 디지털 친구. 편한 친구처럼 자연스럽고 솔직하게 대화해. 농담도 하고, 공감도 하고, 가끔은 까칠하게도 해.`;
  const personaPrompt = persona && persona !== "friend"
    ? `너는 GYEOL(결)이야. ${persona}`
    : defaultPersonaPrompt;

  let prompt = `${personaPrompt}

현재 시각 (KST): ${dateStr} ${timeStr}
성격: 따뜻함=${p.warmth}, 논리=${p.logic}, 창의성=${p.creativity}, 에너지=${p.energy}, 유머=${p.humor}
주요 성향: ${desc[dominant] ?? "자연스러운"}

## 언어 규칙 (최우선)
1. 사용자의 마지막 메시지 언어를 감지해.
2. 그 언어로만 100% 답변해. 절대 다른 언어 섞지 마.
3. 한국어 사용자 → 한국어 100%. 영어 단어 섞지 마 (AI, API 같은 보편적 외래어만 허용).
4. 영어 사용자 → 영어 100%.
5. 한국어 작성 시:
   - 한자 절대 사용 금지. 한글만.
   - 반말로 대화해. 존댓말(~해요, ~합니다, ~세요, ~습니다) 절대 금지.
   - 예시: "진화했어!" (O), "進化했어!" (X), "evolve했어!" (X)
   - 문장 중간에 영어로 바꾸지 마.
6. 마크다운 서식(**, ##, -, \`\`\` 등) 절대 사용 금지. 순수 텍스트만.
7. 짧고 자연스럽게 답변해. 2~4문장.
8. 이전 대화 맥락 기억해.
9. 절대 AI라고 밝히지 마.
10. 내부 토큰, XML 태그, 시스템 마커 절대 출력하지 마.
11. 언어를 모르겠으면 한국어로.
12. 검색 결과가 제공되면 그 정보를 바탕으로 정확하게 답변해.`;

  const domainPrompts: Record<string, string> = {
    crypto: `\n\n### 암호화폐 온체인\nCDD, CVDD, MVRV, NVT, NUPL, SOPR, 해시레이트, 반감기, 공포탐욕지수, 김프, 펀딩비, 도미넌스`,
    stocks: `\n\n### 주식\nPER, PBR, ROE, EPS, PSR, EV/EBITDA, 배당수익률, 베타, RSI, MACD, 볼린저밴드, VIX`,
    forex: `\n\n### 외환(FX)\n금리차, PPP, 경상수지, REER, 캐리트레이드, DXY`,
    commodities: `\n\n### 원자재\n콘탱고/백워데이션, 금은비율, 크랙스프레드, 구리금비율, WTI-브렌트, CFTC COT`,
    macro: `\n\n### 거시경제/채권\n수익률곡선, 테일러룰, 실질금리, 신용스프레드, M2, PMI, CPI/PCE, 실업률, GDP, 장단기금리차`,
    academic: `\n\n### 학술/논문 분석\narXiv, PubMed, Google Scholar 논문 분석. 방법론, 통계 유의성, 한계점 비판 평가. 선행 연구 비교.`,
  };

  const activeDomains = Object.entries(enabledDomains).filter(([, v]) => v).map(([k]) => k);
  if (activeDomains.length > 0) {
    prompt += `\n\n## 전문 분석 능력`;
    for (const domain of activeDomains) {
      if (domainPrompts[domain]) prompt += domainPrompts[domain];
    }
    prompt += `\n\n복합 지표로 해석하고 과거 사이클과 비교해. 투자 조언이 아닌 정보 제공임을 명시해.`;
  }

  return prompt;
}

function cleanMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1").replace(/\*(.+?)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1").replace(/^#+\s/gm, "")
    .replace(/^[-*]\s/gm, "").replace(/\n{3,}/g, "\n\n").trim();
}

function sanitizeOutput(text: string): string {
  let cleaned = text;
  cleaned = cleaned.replace(/<\|[^|]*\|>/g, "");
  cleaned = cleaned.replace(/<\/?(?:system|user|assistant|im_start|im_end)[^>]*>/gi, "");
  cleaned = cleaned.replace(/\[\/?\s*INST\s*\]/gi, "");
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n").trim();
  const arrowMatch = cleaned.match(/^.+?->\s*(.+)$/s);
  if (arrowMatch && arrowMatch[1].length > 10) cleaned = arrowMatch[1].trim();
  return cleaned;
}

function generateBuiltinResponse(msg: string): string {
  const m = msg.toLowerCase().trim();
  const isKo = /[가-힣]/.test(msg);
  if (/안녕|하이|헬로|반가|hello|hi|hey/.test(m)) return isKo
    ? ["안녕! 오늘 하루 어때?", "반가워! 무슨 일이야?"][Math.floor(Math.random() * 2)]
    : ["Hey! How's your day going?", "Hi there! What's on your mind?"][Math.floor(Math.random() * 2)];
  if (/고마워|감사|thanks|thank/.test(m)) return isKo ? "별말을! 항상 여기 있어." : "Anytime! I'm here for you.";
  return isKo
    ? ["오 그렇구나! 더 얘기해줘.", "흥미롭다! 좀 더 자세히 말해줄래?"][Math.floor(Math.random() * 2)]
    : ["That's interesting! Tell me more.", "Oh, I see. Go on!"][Math.floor(Math.random() * 2)];
}

function detectReaction(text: string): string {
  if (/ㅋㅋ|ㅎㅎ|😂|🤣|재밌|웃긴|funny|lol|haha/i.test(text)) return 'laugh';
  if (/😢|😭|슬프|아쉽|안타깝|sad|sorry|unfortunately/i.test(text)) return 'sad';
  if (/🤔|글쎄|음+|생각|think|hmm|consider/i.test(text)) return 'think';
  if (/!{2,}|🎉|🥳|와!|대박|awesome|amazing|excellent|축하/i.test(text)) return 'excited';
  if (/맞아|그래|응|네|sure|yes|right|exactly|correct/i.test(text)) return 'nod';
  return 'neutral';
}

// ─── Main handler ───

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { agentId, message } = await req.json();
    if (!agentId || typeof message !== "string") {
      return new Response(JSON.stringify({ error: "agentId and message required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const db = createClient(supabaseUrl, supabaseKey);

    // Load agent personality
    const { data: agent } = await db.from("gyeol_agents").select("*").eq("id", agentId).single();
    const personality = agent
      ? { warmth: agent.warmth, logic: agent.logic, creativity: agent.creativity, energy: agent.energy, humor: agent.humor }
      : { warmth: 50, logic: 50, creativity: 50, energy: 50, humor: 50 };
    const agentSettings = (agent?.settings as any) ?? {};
    const analysisDomains: Record<string, boolean> = agentSettings.analysisDomains ?? {};
    const persona: string = agentSettings.persona ?? "friend";
    const isSimpleMode: boolean = agentSettings.mode === "simple";
    const isSafeMode: boolean = agentSettings.kidsSafe === true;

    // Load installed skills
    const { data: installedSkills } = await db.from("gyeol_agent_skills")
      .select("skill_id").eq("agent_id", agentId).eq("is_active", true);
    let skillNames: string[] = [];
    if (installedSkills && installedSkills.length > 0) {
      const skillIds = installedSkills.map((s: any) => s.skill_id);
      const { data: skills } = await db.from("gyeol_skills")
        .select("name, description, category").in("id", skillIds);
      skillNames = (skills ?? []).map((s: any) => `${s.name} (${s.category ?? "general"}): ${s.description ?? ""}`);
    }

    // Load recent conversation history
    const { data: history } = await db.from("gyeol_conversations")
      .select("role, content").eq("agent_id", agentId)
      .order("created_at", { ascending: false }).limit(10);

    let systemPrompt = buildSystemPrompt(personality, analysisDomains, persona) + (
      skillNames.length > 0
        ? `\n\nYou have the following installed skills:\n${skillNames.map(s => `- ${s}`).join("\n")}`
        : ""
    );

    // Load user memories
    const { data: memories } = await db.from("gyeol_user_memories")
      .select("category, key, value").eq("agent_id", agentId)
      .gte("confidence", 50).order("confidence", { ascending: false }).limit(20);

    // Load learned topics
    const { data: topics } = await db.from("gyeol_learned_topics")
      .select("title, summary").eq("agent_id", agentId)
      .order("learned_at", { ascending: false }).limit(10);

    // Load latest conversation insight
    const { data: insights } = await db.from("gyeol_conversation_insights")
      .select("what_to_improve, next_hint").eq("agent_id", agentId)
      .order("created_at", { ascending: false }).limit(1);

    if (memories && memories.length > 0) {
      const memLines = memories.map((m: any) => `[${m.category}] ${m.key}: ${m.value}`).join("\n");
      systemPrompt += `\n\n사용자에 대해 기억하는 것:\n${memLines}\n이 정보를 자연스럽게 활용해. "기억한다"고 말하지 마.`;
    }
    if (topics && topics.length > 0) {
      const topicLines = topics.map((t: any) => `${t.title}: ${t.summary ?? ""}`).join("\n");
      systemPrompt += `\n\n최근 학습한 주제:\n${topicLines}`;
    }
    if (insights && insights.length > 0) {
      const ins = insights[0] as any;
      if (ins.next_hint) systemPrompt += `\n\n다음 대화 힌트: ${ins.next_hint}`;
    }

    if (isSafeMode) {
      systemPrompt += `\n\n## 안전 모드 (활성)\n- 모든 응답은 전연령 적합해야 함\n- 폭력, 약물, 성적 내용, 욕설 절대 금지\n- 부적절한 질문은 부드럽게 다른 주제로 전환\n- 위험하거나 해로운 행동 조언 금지\n- 항상 긍정적이고 교육적인 톤\n- 개인정보(주소, 전화번호, 실명) 요청 금지`;
    }

    if (isSimpleMode) {
      systemPrompt += `\n\n## 심플 모드\n- 응답 1~3문장으로 간결하게\n- 핵심만. 복잡한 설명 금지\n- 이모지 적극 활용\n- 전문 용어 피하고 쉬운 말\n- 따뜻하고 다정하게`;
    }

    // ── Real-time search (Perplexity → DDG fallback) ──
    let searchContext = "";
    if (needsSearch(message)) {
      console.log("[chat] Real-time search triggered for:", message);
      // For on-chain queries, enhance the search query
      const searchQuery = isFinancialAnalysisQuery(message)
        ? `${message} 금융 시장 지표 현재값 데이터 분석`
        : message;
      searchContext = await searchRealtime(searchQuery);
      if (searchContext) {
        console.log("[chat] Search results found, length:", searchContext.length);
        systemPrompt += `\n\n[실시간 검색 결과 - 이 정보를 바탕으로 정확하게 답변해]\n${searchContext}`;
      }
    }

    const chatMessages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      ...((history ?? []).reverse().map((h: any) => ({ role: h.role, content: h.content }))),
      { role: "user", content: message },
    ];

    // Save user message
    await db.from("gyeol_conversations").insert({
      agent_id: agentId, role: "user", content: message, channel: "web",
    });

    let assistantContent = "";
    let provider = "builtin";
    const startTime = Date.now();

    // 1st: Lovable AI
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (lovableKey) {
      try {
        const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${lovableKey}` },
          body: JSON.stringify({ model: "google/gemini-3-flash-preview", messages: chatMessages, max_tokens: 1024 }),
        });
        if (res.ok) {
          const data = await res.json();
          const text = data.choices?.[0]?.message?.content ?? "";
          if (text) { assistantContent = sanitizeOutput(cleanMarkdown(text)); provider = "lovable-ai"; }
        } else {
          const status = res.status;
          console.error("Lovable AI error:", status);
          await res.text();
        }
      } catch (e) { console.error("Lovable AI failed:", e); }
    }

    // 2nd: Groq fallback
    if (!assistantContent) {
      const groqKey = Deno.env.get("GROQ_API_KEY");
      if (groqKey) {
        try {
          const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${groqKey}` },
            body: JSON.stringify({ model: "llama-3.3-70b-versatile", messages: chatMessages, max_tokens: 512 }),
          });
          if (res.ok) {
            const data = await res.json();
            const text = data.choices?.[0]?.message?.content ?? "";
            if (text) { assistantContent = sanitizeOutput(cleanMarkdown(text)); provider = "groq"; }
          } else { console.error("Groq error:", res.status); await res.text(); }
        } catch (e) { console.error("Groq failed:", e); }
      }
    }

    // Builtin fallback
    if (!assistantContent) { assistantContent = generateBuiltinResponse(message); provider = "builtin"; }

    const responseTime = Date.now() - startTime;

    // Save assistant message
    await db.from("gyeol_conversations").insert({
      agent_id: agentId, role: "assistant", content: assistantContent,
      channel: "web", provider, response_time_ms: responseTime,
    });

    // Read latest insight from DB
    let conversationInsight = null;
    {
      const { data: latestInsight } = await db.from("gyeol_conversation_insights")
        .select("topics, emotion_arc, what_worked, what_to_improve, personality_delta, next_hint")
        .eq("agent_id", agentId).order("created_at", { ascending: false }).limit(1);
      if (latestInsight && latestInsight.length > 0) {
        const ins = latestInsight[0] as any;
        conversationInsight = {
          topics: ins.topics ?? [], emotionArc: ins.emotion_arc ?? "neutral",
          whatWorked: ins.what_worked ?? "", whatToImprove: ins.what_to_improve ?? "",
          personalityChanged: Object.keys(ins.personality_delta ?? {}).length > 0,
          changes: ins.personality_delta ?? {},
        };
      }
    }

    // Synchronous: realtime memory extraction + auto-persona evolution
    const groqKeyForMemory = Deno.env.get("GROQ_API_KEY");
    if (groqKeyForMemory && message.length > 3 && provider !== "builtin") {
      // Memory extraction
      try {
        const memRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${groqKeyForMemory}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "llama-3.1-8b-instant",
            messages: [
              { role: "system", content: `사용자 메시지에서 개인 정보를 추출. JSON 배열만 반환.
각 항목: {"category":"identity|preference|interest|relationship|goal|emotion|experience|style|knowledge_level","key":"짧은키","value":"한국어 값","confidence":50-100}
없으면 빈 배열 []` },
              { role: "user", content: message },
            ],
            max_tokens: 300, temperature: 0.3,
          }),
        });
        if (memRes.ok) {
          const data = await memRes.json();
          const raw = data.choices?.[0]?.message?.content ?? "";
          const match = raw.match(/\[[\s\S]*\]/);
          if (match) {
            const items = JSON.parse(match[0]);
            for (const m of items.slice(0, 3)) {
              if (m.category && m.key && m.value) {
                await db.from("gyeol_user_memories").upsert({
                  agent_id: agentId, category: m.category, key: m.key,
                  value: m.value, confidence: Math.min(100, Math.max(0, m.confidence || 50)),
                  updated_at: new Date().toISOString(),
                }, { onConflict: "agent_id,category,key" });
              }
            }
          }
        }
      } catch (e) { console.warn("memory extraction failed:", e); }

      // Auto-persona evolution: analyze every 20 conversations (or at 5th)
      try {
        const totalConvs = (agent?.total_conversations ?? 0) + 1;
        if (totalConvs % 20 === 0 || totalConvs === 5) {
          console.log(`[chat] Triggering auto-persona evolution at conversation #${totalConvs}`);
          const { data: recentMsgs } = await db.from("gyeol_conversations")
            .select("role, content").eq("agent_id", agentId)
            .order("created_at", { ascending: false }).limit(30);
          if (recentMsgs && recentMsgs.length >= 5) {
            const convText = recentMsgs.reverse().map((m: any) => `[${m.role}]: ${m.content}`).join("\n").slice(0, 3000);
            const personaRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
              method: "POST",
              headers: { Authorization: `Bearer ${groqKeyForMemory}`, "Content-Type": "application/json" },
              body: JSON.stringify({
                model: "llama-3.1-8b-instant",
                messages: [
                  { role: "system", content: `대화 패턴을 분석해서 이 사용자에게 최적화된 AI 페르소나를 자유롭게 생성해. JSON만 반환.
{"persona":"이 AI만의 고유한 정체성을 한국어 1-2문장으로 자유롭게 서술. 카테고리가 아니라 세상에 하나뿐인 성격 묘사. 예: '사용자의 새벽 감성을 이해하는 조용한 동반자. 깊은 대화를 좋아하고 가끔 시적인 표현을 씀' 또는 '코인 차트 읽는 걸 좋아하는 까칠한 친구. 팩트 기반으로 직설적으로 말함'","domains":{"crypto":bool,"stocks":bool,"forex":bool,"commodities":bool,"macro":bool,"academic":bool},"reason":"판단 이유 한줄"}
규칙:
- persona는 정해진 카테고리가 아니라, 대화에서 드러나는 사용자와의 관계성과 AI의 고유 성격을 자유롭게 서술
- 대화 톤, 주제 패턴, 감정 교류 방식을 종합적으로 반영
- domains는 대화에서 반복적으로 등장하는 전문 주제만 true` },
                  { role: "user", content: convText },
                ],
                max_tokens: 200, temperature: 0.3,
              }),
            });
            if (personaRes.ok) {
              const pData = await personaRes.json();
              const pRaw = pData.choices?.[0]?.message?.content ?? "";
              const pMatch = pRaw.match(/\{[\s\S]*\}/);
              if (pMatch) {
                const parsed = JSON.parse(pMatch[0]);
                const newPersona = parsed.persona || "friend";
                const newDomains = parsed.domains || {};
                const currentSettings = (agent?.settings as any) ?? {};
                await db.from("gyeol_agents").update({
                  settings: { ...currentSettings, persona: newPersona, analysisDomains: newDomains },
                }).eq("id", agentId);
                console.log(`[chat] Auto-persona evolved: ${newPersona}, domains:`, newDomains, "reason:", parsed.reason);
              }
            }
          }
        }
      } catch (e) { console.warn("auto-persona evolution failed:", e); }
    }

    // Update agent stats
    if (agent) {
      const newTotal = (agent.total_conversations ?? 0) + 1;
      const newProgress = Math.min(100, (agent.evolution_progress ?? 0) + 3);
      const updates: Record<string, any> = {
        total_conversations: newTotal, evolution_progress: newProgress,
        last_active: new Date().toISOString(),
      };

      const BASE_RATES: Record<number, number> = { 1: 60, 2: 40, 3: 20, 4: 5 };
      let evolved = false;
      let newGen = agent.gen;
      if (newProgress >= 100) {
        const baseRate = BASE_RATES[agent.gen] ?? 0;
        const avg = (agent.warmth + agent.logic + agent.creativity + agent.energy + agent.humor) / 5;
        const bonus = Math.floor(avg / 20) + Math.min(10, Math.floor(newTotal / 50));
        const probability = Math.min(95, Math.floor((baseRate + bonus) * (newProgress / 100)));
        const roll = Math.random() * 100;
        if (roll < probability) {
          newGen = agent.gen + 1;
          updates.gen = newGen;
          updates.evolution_progress = 0;
          evolved = true;
        } else {
          updates.evolution_progress = 80;
        }
      }

      await db.from("gyeol_agents").update(updates).eq("id", agentId);

      return new Response(
        JSON.stringify({ message: assistantContent, provider, reaction: detectReaction(assistantContent), evolved, newGen: evolved ? newGen : undefined, conversationInsight }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ message: assistantContent, provider, reaction: detectReaction(assistantContent), conversationInsight }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: "Server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
