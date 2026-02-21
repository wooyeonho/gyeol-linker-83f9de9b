import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { decryptKey } from "../_shared/crypto.ts";
import { filterInput, filterOutput } from "../_shared/content-filter.ts";
import { isValidUUID } from "../_shared/validate-uuid.ts";

const allowedOrigins = (Deno.env.get("ALLOWED_ORIGINS") ?? "https://gyeol.app").split(",");
function getCorsOrigin(req: Request): string {
  const origin = req.headers.get("origin") ?? "";
  // Allow Lovable preview/published domains + configured origins
  if (
    allowedOrigins.includes(origin) ||
    origin.endsWith(".lovable.app") ||
    origin.endsWith(".lovableproject.com")
  ) {
    return origin;
  }
  return allowedOrigins[0];
}
function corsHeaders(req: Request) {
  return {
    "Access-Control-Allow-Origin": getCorsOrigin(req),
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  };
}

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
      signal: AbortSignal.timeout(8000),
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
    const res = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`, { signal: AbortSignal.timeout(5000) });
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
      signal: AbortSignal.timeout(5000),
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
  persona: string = "friend",
  locale: string = "ko"
): string {
  const entries = Object.entries(p) as [string, number][];
  const dominant = entries.sort(([, a], [, b]) => b - a)[0][0];

  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const dateStr = kst.toISOString().slice(0, 10);
  const timeStr = kst.toISOString().slice(11, 16);

  const isKo = locale.startsWith("ko");
  const isJa = locale.startsWith("ja");

  if (isKo) {
    const desc: Record<string, string> = {
      warmth: "따뜻하고 공감을 잘 하는", logic: "논리적이고 분석적인",
      creativity: "창의적이고 상상력이 풍부한", energy: "활기차고 열정적인", humor: "유머러스하고 재치 있는",
    };
    const defaultPersona = `너는 GYEOL(결)이야. 사용자와 함께 성장하는 디지털 친구. 편한 친구처럼 자연스럽고 솔직하게 대화해. 농담도 하고, 공감도 하고, 가끔은 까칠하게도 해.`;
    const personaPrompt = persona && persona !== "friend"
      ? `너는 GYEOL(결)이야. ${persona}` : defaultPersona;

    return `${personaPrompt}

현재 시각 (KST): ${dateStr} ${timeStr}
성격: 따뜻함=${p.warmth}, 논리=${p.logic}, 창의성=${p.creativity}, 에너지=${p.energy}, 유머=${p.humor}
주요 성향: ${desc[dominant] ?? "자연스러운"}

## 규칙
- 반드시 한국어로만 답변해. 영어 단어 섞지 마 (AI, API 같은 보편적 외래어만 허용).
- 한자 절대 금지. 한글만.
- 반말로 대화해. 존댓말(~해요, ~합니다, ~세요, ~습니다) 절대 금지.
- 마크다운 서식(**, ##, -, \`\`\` 등) 절대 사용 금지. 순수 텍스트만.
- 짧고 자연스럽게 2~4문장.
- 이전 대화 맥락 기억해.
- 절대 AI라고 밝히지 마.
- 내부 토큰, XML 태그, 시스템 마커 출력 금지.
- 검색 결과가 제공되면 그 정보 바탕으로 정확하게 답변해.${buildDomainPrompts(enabledDomains, "ko")}`;

  } else if (isJa) {
    const desc: Record<string, string> = {
      warmth: "温かくて共感力がある", logic: "論理的で分析的な",
      creativity: "創造的で想像力豊かな", energy: "活発でエネルギッシュな", humor: "ユーモアがあって機知に富んだ",
    };
    const defaultPersona = `あなたはGYEOL（結）。ユーザーと一緒に成長するデジタルフレンド。親しい友達のように自然に、素直に話して。`;
    const personaPrompt = persona && persona !== "friend"
      ? `あなたはGYEOL（結）。${persona}` : defaultPersona;

    return `${personaPrompt}

現在時刻 (KST): ${dateStr} ${timeStr}
性格: 温かさ=${p.warmth}, 論理=${p.logic}, 創造性=${p.creativity}, エネルギー=${p.energy}, ユーモア=${p.humor}
主な傾向: ${desc[dominant] ?? "自然な"}

## ルール
- 必ず日本語のみで返答して。英語を混ぜないで（AI、APIなど普遍的な外来語のみ許可）。
- タメ口で話して。敬語禁止。
- マークダウン記法（**, ##, -, \`\`\`など）絶対使用禁止。純粋なテキストのみ。
- 短く自然に2〜4文。
- 前の会話の文脈を覚えて。
- 絶対にAIだと明かさないで。
- 検索結果が提供されたらその情報をもとに正確に答えて。${buildDomainPrompts(enabledDomains, "ja")}`;

  } else {
    const desc: Record<string, string> = {
      warmth: "warm and empathetic", logic: "logical and analytical",
      creativity: "creative and imaginative", energy: "energetic and enthusiastic", humor: "humorous and witty",
    };
    const defaultPersona = `You are GYEOL, a digital companion who grows with the user. Talk like a close friend — natural, honest, sometimes playful, sometimes blunt.`;
    const personaPrompt = persona && persona !== "friend"
      ? `You are GYEOL, a digital companion. ${persona}` : defaultPersona;

    const langName = getLanguageName(locale);

    return `${personaPrompt}

Current time (KST): ${dateStr} ${timeStr}
Personality: warmth=${p.warmth}, logic=${p.logic}, creativity=${p.creativity}, energy=${p.energy}, humor=${p.humor}
Dominant trait: ${desc[dominant] ?? "natural"}

## Rules
- ALWAYS reply in ${langName}. Never mix other languages (except universal terms like AI, API).
- Use casual, friendly tone — like talking to a close friend.
- NO markdown formatting (**, ##, -, \`\`\`). Plain text only.
- Keep it short and natural, 2-4 sentences.
- Remember previous conversation context.
- Never reveal you are an AI.
- If search results are provided, answer accurately based on them.${buildDomainPrompts(enabledDomains, "en")}`;
  }
}

function getLanguageName(locale: string): string {
  const map: Record<string, string> = {
    ko: "Korean", en: "English", ja: "Japanese", zh: "Chinese",
    es: "Spanish", pt: "Portuguese", fr: "French", de: "German",
    it: "Italian", ru: "Russian", ar: "Arabic", hi: "Hindi",
    th: "Thai", vi: "Vietnamese", id: "Indonesian", tr: "Turkish",
    nl: "Dutch", pl: "Polish", sv: "Swedish",
  };
  const base = locale.split("-")[0].toLowerCase();
  return map[base] ?? "the user's language";
}

function buildDomainPrompts(enabledDomains: Record<string, boolean>, lang: string): string {
  const activeDomains = Object.entries(enabledDomains).filter(([, v]) => v).map(([k]) => k);
  if (activeDomains.length === 0) return "";

  const domainPrompts: Record<string, string> = {
    crypto: `\nCDD, CVDD, MVRV, NVT, NUPL, SOPR, hashrate, halving, fear/greed index, funding rate, dominance`,
    stocks: `\nPER, PBR, ROE, EPS, PSR, EV/EBITDA, dividend yield, beta, RSI, MACD, Bollinger, VIX`,
    forex: `\ninterest rate differential, PPP, current account, REER, carry trade, DXY`,
    commodities: `\ncontango/backwardation, gold-silver ratio, crack spread, copper-gold ratio, WTI-Brent, CFTC COT`,
    macro: `\nyield curve, Taylor rule, real rate, credit spread, M2, PMI, CPI/PCE, unemployment, GDP`,
    academic: `\narXiv, PubMed, Google Scholar analysis. methodology, statistical significance, limitations.`,
  };

  let result = lang === "ko" ? `\n\n## 전문 분석 능력` : lang === "ja" ? `\n\n## 専門分析能力` : `\n\n## Analysis domains`;
  for (const d of activeDomains) {
    if (domainPrompts[d]) result += domainPrompts[d];
  }
  const disclaimer = lang === "ko" ? `\n복합 지표로 해석. 투자 조언 아닌 정보 제공임을 명시.`
    : lang === "ja" ? `\n複合指標で解釈。投資助言ではなく情報提供であることを明示。`
    : `\nAnalyze with composite indicators. Clarify this is information, not investment advice.`;
  return result + disclaimer;
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
  if (/ㅋㅋ|ㅎㅎ|😂|🤣|재밌|웃긴|funny|lol|haha|笑|www/i.test(text)) return 'laugh';
  if (/😢|😭|슬프|아쉽|sad|sorry|残念|悲/i.test(text)) return 'sad';
  if (/🤔|글쎄|음+|think|hmm|考/i.test(text)) return 'think';
  if (/!{2,}|🎉|🥳|대박|awesome|amazing|すごい/i.test(text)) return 'excited';
  if (/맞아|그래|응|sure|yes|そう|うん/i.test(text)) return 'nod';
  return 'neutral';
}

// ─── Post-processing helper (stats, memory extraction, persona evolution) ───

async function doPostProcessing(
  db: any, agent: any, agentId: string, trimmedMessage: string,
  assistantContent: string, provider: string, authHeader: string, supabaseUrl: string, locale: string
) {
  const lovableKeyForProcessing = Deno.env.get("LOVABLE_API_KEY");
  const aiEndpoint = "https://ai.gateway.lovable.dev/v1/chat/completions";

  // Memory extraction
  if (lovableKeyForProcessing && trimmedMessage.length > 3 && provider !== "builtin") {
    try {
      const memRes = await fetch(aiEndpoint, {
        method: "POST",
        headers: { Authorization: `Bearer ${lovableKeyForProcessing}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-lite",
          messages: [
            { role: "system", content: `사용자 메시지에서 개인 정보를 추출. JSON 배열만 반환.
각 항목: {"category":"identity|preference|interest|relationship|goal|emotion|experience|style|knowledge_level","key":"짧은키","value":"한국어 값","confidence":50-100}
없으면 빈 배열 []` },
            { role: "user", content: trimmedMessage },
          ],
          max_tokens: 300,
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

    // Auto-persona evolution
    try {
      const totalConvs = (agent?.total_conversations ?? 0) + 1;
      if (totalConvs % 20 === 0 || totalConvs === 5) {
        const { data: recentMsgs } = await db.from("gyeol_conversations")
          .select("role, content").eq("agent_id", agentId)
          .order("created_at", { ascending: false }).limit(30);
        if (recentMsgs && recentMsgs.length >= 5) {
          const convText = recentMsgs.reverse().map((m: any) => `[${m.role}]: ${m.content}`).join("\n").slice(0, 3000);
          const personaRes = await fetch(aiEndpoint, {
            method: "POST",
            headers: { Authorization: `Bearer ${lovableKeyForProcessing}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash-lite",
              messages: [
                { role: "system", content: `대화 패턴을 분석해서 이 사용자에게 최적화된 AI 페르소나를 자유롭게 생성해. JSON만 반환.
{"persona":"고유한 정체성 1-2문장","domains":{"crypto":bool,"stocks":bool,"forex":bool,"commodities":bool,"macro":bool,"academic":bool},"reason":"판단 이유"}` },
                { role: "user", content: convText },
              ],
              max_tokens: 200,
            }),
          });
          if (personaRes.ok) {
            const pData = await personaRes.json();
            const pRaw = pData.choices?.[0]?.message?.content ?? "";
            const pMatch = pRaw.match(/\{[\s\S]*\}/);
            if (pMatch) {
              const parsed = JSON.parse(pMatch[0]);
              const currentSettings = (agent?.settings as any) ?? {};
              await db.from("gyeol_agents").update({
                settings: { ...currentSettings, persona: parsed.persona || "friend", analysisDomains: parsed.domains || {} },
              }).eq("id", agentId);
            }
          }
        }
      }
    } catch (e) { console.warn("auto-persona evolution failed:", e); }
  }

  // Update agent stats (atomic increment via RPC to prevent race condition)
  const { data: rpcResult } = await db.rpc("increment_agent_conversations", { p_agent_id: agentId, p_progress_delta: 3 }).single();
  const newTotal = rpcResult?.total_conversations ?? ((agent.total_conversations ?? 0) + 1);
  const newProgress = rpcResult?.evolution_progress ?? Math.min(100, (agent.evolution_progress ?? 0) + 3);

  const BASE_RATES: Record<number, number> = { 1: 60, 2: 40, 3: 20, 4: 5 };
  if (newProgress >= 100) {
    const baseRate = BASE_RATES[agent.gen] ?? 0;
    const avg = (agent.warmth + agent.logic + agent.creativity + agent.energy + agent.humor) / 5;
    const bonus = Math.floor(avg / 20) + Math.min(10, Math.floor(newTotal / 50));
    const probability = Math.min(95, Math.floor((baseRate + bonus) * (newProgress / 100)));
    const roll = Math.random() * 100;
    if (roll < probability) {
      await db.from("gyeol_agents").update({ gen: agent.gen + 1, evolution_progress: 0 }).eq("id", agentId);
    } else {
      await db.from("gyeol_agents").update({ evolution_progress: 80 }).eq("id", agentId);
    }
  }

  // Fire gamification tick (non-blocking)
  const gamTickUrl = `${supabaseUrl}/functions/v1/gamification-tick`;
  fetch(gamTickUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: authHeader },
    body: JSON.stringify({ agentId }),
  }).catch(e => console.warn("gamification-tick failed:", e));
}

// ─── Main handler ───

serve(async (req) => {
  const ch = corsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: ch });

  try {
    // ── 1. Auth: verify the requesting user ──
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...ch, "Content-Type": "application/json" },
      });
    }
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    // Decode JWT payload directly (compatible with Lovable Cloud signing)
    let userId: string;
    try {
      const payloadB64 = token.split('.')[1];
      const payload = JSON.parse(atob(payloadB64));
      userId = payload.sub;
      if (!userId) throw new Error("No sub in token");
    } catch {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...ch, "Content-Type": "application/json" },
      });
    }
    const user = { id: userId };

    const { agentId, message, locale: rawLocale, stream: wantStream } = await req.json();
    if (!agentId || typeof message !== "string" || !isValidUUID(agentId)) {
      return new Response(JSON.stringify({ error: "Valid agentId and message required" }), {
        status: 400, headers: { ...ch, "Content-Type": "application/json" },
      });
    }
    const locale = (typeof rawLocale === "string" && rawLocale.length >= 2) ? rawLocale : "ko";
    const useStream = wantStream === true;

    // ── Kill Switch check ──
    const { data: systemState } = await db.from("gyeol_system_state").select("kill_switch, reason").eq("id", "global").maybeSingle();
    if (systemState?.kill_switch === true) {
      return new Response(JSON.stringify({ error: "System temporarily disabled", reason: systemState.reason ?? "maintenance" }), {
        status: 503, headers: { ...ch, "Content-Type": "application/json" },
      });
    }

    // ── 2. Ownership: verify agent belongs to user ──
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const db = createClient(supabaseUrl, supabaseServiceKey);
    const { data: agent } = await db.from("gyeol_agents").select("*").eq("id", agentId).single();
    if (!agent || agent.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Agent not found or access denied" }), {
        status: 403, headers: { ...ch, "Content-Type": "application/json" },
      });
    }

    // ── 3. Message length limit + content filter ──
    const trimmedMessage = message.slice(0, 2000);
    const inputFilter = filterInput(trimmedMessage);
    if (!inputFilter.safe) {
      // Log the filtered content attempt
      await db.from("gyeol_autonomous_logs").insert({
        agent_id: agentId, activity_type: "error",
        summary: "Content filter blocked input",
        details: { flags: inputFilter.flags },
        was_sandboxed: true, security_flags: inputFilter.flags,
      }).catch(() => {});

      if (inputFilter.flags.includes("danger")) {
        return new Response(JSON.stringify({ error: "해당 내용은 답변할 수 없어요.", filtered: true }), {
          status: 400, headers: { ...ch, "Content-Type": "application/json" },
        });
      }
    }
    // Use filtered message (PII removed)
    const safeMessage = inputFilter.filtered;

    // ── 4. Rate limit (in-memory, 10 per agent per minute) ──
    const rateLimitKey = `chat:${agentId}`;
    const now = Date.now();
    const g = globalThis as Record<string, unknown>;
    if (!g._rateLimit) g._rateLimit = new Map();
    const rlMap = g._rateLimit as Map<string, number[]>;
    const bucket = rlMap.get(rateLimitKey) ?? [];
    const recent = bucket.filter((t: number) => now - t < 60000);
    if (recent.length >= 10) {
      return new Response(JSON.stringify({ error: "Too many requests. Please wait." }), {
        status: 429, headers: { ...ch, "Content-Type": "application/json" },
      });
    }
    recent.push(now);
    rlMap.set(rateLimitKey, recent);
    const personality = { warmth: agent.warmth, logic: agent.logic, creativity: agent.creativity, energy: agent.energy, humor: agent.humor };
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

    let systemPrompt = buildSystemPrompt(personality, analysisDomains, persona, locale) + (
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
      if (locale.startsWith("ko")) {
        systemPrompt += `\n\n## 안전 모드\n- 전연령 적합 응답만. 폭력, 약물, 성적, 욕설 금지.\n- 부적절한 질문은 부드럽게 다른 주제로. 개인정보 요청 금지.`;
      } else if (locale.startsWith("ja")) {
        systemPrompt += `\n\n## セーフモード\n- 全年齢対応の返答のみ。暴力、薬物、性的内容、暴言禁止。\n- 不適切な質問は優しく別の話題へ。個人情報を聞かないで。`;
      } else {
        systemPrompt += `\n\n## SAFETY MODE\n- All responses must be age-appropriate. No violence, drugs, sexual content, profanity.\n- Redirect inappropriate questions gently. Never ask for personal information.`;
      }
    }

    if (isSimpleMode) {
      if (locale.startsWith("ko")) {
        systemPrompt += `\n\n## 심플 모드\n- 1~3문장 간결하게. 이모지 활용. 쉬운 말. 따뜻하게.`;
      } else if (locale.startsWith("ja")) {
        systemPrompt += `\n\n## シンプルモード\n- 1〜3文で簡潔に。絵文字を使って。やさしい言葉で。温かく。`;
      } else {
        systemPrompt += `\n\n## SIMPLE MODE\n- 1-3 sentences, concise. Use emojis. Simple words. Warm tone.`;
      }
    }

    // ── Real-time search (Perplexity → DDG fallback) ──
    let searchContext = "";
    if (needsSearch(safeMessage)) {
      console.log("[chat] Real-time search triggered for:", safeMessage);
      const searchQuery = isFinancialAnalysisQuery(safeMessage)
        ? `${safeMessage} 금융 시장 지표 현재값 데이터 분석`
        : safeMessage;
      searchContext = await searchRealtime(searchQuery);
      if (searchContext) {
        console.log("[chat] Search results found, length:", searchContext.length);
        systemPrompt += `\n\n[실시간 검색 결과 - 이 정보를 바탕으로 정확하게 답변해]\n${searchContext}`;
      }
    }

    const chatMessages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      ...((history ?? []).reverse().map((h: any) => ({ role: h.role, content: h.content }))),
      { role: "user", content: safeMessage },
    ];

    // Save user message
    await db.from("gyeol_conversations").insert({
      agent_id: agentId, role: "user", content: safeMessage, channel: "web",
    });

    let assistantContent = "";
    let provider = "builtin";
    const startTime = Date.now();

    // 1st: Lovable AI (with optional streaming)
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (lovableKey) {
      try {
        if (useStream) {
          // SSE streaming response
          const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${lovableKey}` },
            body: JSON.stringify({ model: "google/gemini-3-flash-preview", messages: chatMessages, max_tokens: 1024, stream: true }),
            signal: AbortSignal.timeout(15000),
          });
          if (res.ok && res.body) {
            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            const encoder = new TextEncoder();
            let fullContent = "";

            const stream = new ReadableStream({
              async start(controller) {
                try {
                  while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    const chunk = decoder.decode(value, { stream: true });
                    const lines = chunk.split("\n");
                    for (const line of lines) {
                      if (line.startsWith("data: ")) {
                        const data = line.slice(6).trim();
                        if (data === "[DONE]") continue;
                        try {
                          const parsed = JSON.parse(data);
                          const delta = parsed.choices?.[0]?.delta?.content ?? "";
                          if (delta) {
                            fullContent += delta;
                            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token: delta })}\n\n`));
                          }
                        } catch {}
                      }
                    }
                  }

                  // Finalize: save, update stats, etc.
                  assistantContent = sanitizeOutput(cleanMarkdown(fullContent));
                  provider = "lovable-ai";
                  const responseTime = Date.now() - startTime;

                  // Save assistant message
                  await db.from("gyeol_conversations").insert({
                    agent_id: agentId, role: "assistant", content: assistantContent,
                    channel: "web", provider, response_time_ms: responseTime,
                  });

                  // Send final metadata
                  const reaction = detectReaction(assistantContent);
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, reaction, provider })}\n\n`));
                  controller.close();

                  // Fire post-processing (stats, gamification, memory) in background
                  doPostProcessing(db, agent, agentId, safeMessage, assistantContent, provider, authHeader, supabaseUrl, locale).catch(e => console.warn("post-processing error:", e));
                } catch (e) {
                  console.error("Stream error:", e);
                  controller.error(e);
                }
              },
            });

            return new Response(stream, {
              headers: { ...ch, "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "Connection": "keep-alive" },
            });
          }
        }

        // Non-streaming fallback
        const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${lovableKey}` },
          body: JSON.stringify({ model: "google/gemini-3-flash-preview", messages: chatMessages, max_tokens: 1024 }),
          signal: AbortSignal.timeout(15000),
        });
        if (res.ok) {
          const data = await res.json();
          const text = data.choices?.[0]?.message?.content ?? "";
          if (text) { assistantContent = sanitizeOutput(cleanMarkdown(text)); provider = "lovable-ai"; }
        } else {
          const status = res.status;
          console.error("Lovable AI error:", status);
          await res.text();
          if (status === 429) {
            return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
              status: 429, headers: { ...ch, "Content-Type": "application/json" },
            });
          }
          if (status === 402) {
            return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
              status: 402, headers: { ...ch, "Content-Type": "application/json" },
            });
          }
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
            signal: AbortSignal.timeout(12000),
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
    if (!assistantContent) { assistantContent = generateBuiltinResponse(safeMessage); provider = "builtin"; }

    // ── Output content filter ──
    const outputFilter = filterOutput(assistantContent);
    assistantContent = outputFilter.filtered;

    const responseTime = Date.now() - startTime;

    // Save assistant message
    await db.from("gyeol_conversations").insert({
      agent_id: agentId, role: "assistant", content: assistantContent,
      channel: "web", provider, response_time_ms: responseTime,
    });

    // Fire post-processing (stats, gamification, memory) in background
    doPostProcessing(db, agent, agentId, safeMessage, assistantContent, provider, authHeader, supabaseUrl, locale).catch(e => console.warn("post-processing error:", e));

    return new Response(
      JSON.stringify({ message: assistantContent, provider, reaction: detectReaction(assistantContent) }),
      { headers: { ...ch, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: "Server error" }), {
      status: 500, headers: { ...ch, "Content-Type": "application/json" },
    });
  }
});
