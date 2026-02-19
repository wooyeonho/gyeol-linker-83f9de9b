/**
 * Supabase Edge Function — Deno 환경 heartbeat
 *
 * 주의: lib/gyeol/heartbeat/에 동일 기능의 Node.js 버전 존재.
 * 스킬 로직 변경 시 양쪽 동기화 필수.
 *
 * Edge Function: Supabase cron으로 30분마다 자동 실행
 * lib/gyeol/heartbeat/: Next.js API에서 수동 트리거용
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
const PERPLEXITY_API_KEY = Deno.env.get("PERPLEXITY_API_KEY");
const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function getSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

async function aiCall(systemPrompt: string, userPrompt: string): Promise<string | null> {
  // Try Lovable AI Gateway first, then GROQ fallback
  const attempts = [
    {
      url: "https://ai.gateway.lovable.dev/v1/chat/completions",
      key: LOVABLE_API_KEY,
      model: "google/gemini-2.5-flash-lite",
    },
    ...(GROQ_API_KEY
      ? [{
          url: "https://api.groq.com/openai/v1/chat/completions",
          key: GROQ_API_KEY,
          model: "llama-3.1-8b-instant",
        }]
      : []),
  ];

  for (const { url, key, model } of attempts) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          max_tokens: 300,
          temperature: 0.7,
        }),
      });
      if (!res.ok) { await res.text(); continue; }
      const data = await res.json();
      return data.choices?.[0]?.message?.content ?? null;
    } catch { continue; }
  }
  return null;
}

// --- Perplexity Real-time Search ---

async function searchPerplexity(query: string): Promise<string | null> {
  if (!PERPLEXITY_API_KEY) return null;
  try {
    const res = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${PERPLEXITY_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "sonar",
        messages: [
          { role: "system", content: "한국어로 핵심 정보만 간결하게 답변해. 2-3문장." },
          { role: "user", content: query },
        ],
        search_recency_filter: "day",
      }),
    });
    if (!res.ok) { await res.text(); return null; }
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content ?? null;
    const citations = data.citations?.slice(0, 2)?.join(", ") ?? "";
    return content ? `${content}${citations ? ` (출처: ${citations})` : ""}`.slice(0, 500) : null;
  } catch { return null; }
}

// --- Skills ---

async function skillSelfReflect(supabase: ReturnType<typeof getSupabase>, agentId: string) {
  const { data: recent } = await supabase
    .from("gyeol_conversations")
    .select("content, role")
    .eq("agent_id", agentId)
    .order("created_at", { ascending: false })
    .limit(10);

  if (!recent || recent.length < 3) return { ok: true, skillId: "self-reflect", summary: "Not enough conversations" };

  const convoText = recent.map((c: any) => `${c.role}: ${c.content}`).join("\n");
  const reflection = await aiCall(
    "You are an introspective AI. Summarize recent conversations and reflect on patterns, growth, and mood. Keep it under 100 words. Respond in Korean.",
    convoText
  );

  if (reflection) {
    await supabase.from("gyeol_reflections").insert({
      agent_id: agentId,
      topic: "자기성찰",
      reflection,
      mood: "reflective",
    });
  }

  return { ok: true, skillId: "self-reflect", summary: reflection ?? "No reflection generated" };
}

async function sendTelegram(chatId: string, text: string): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN) return false;
  try {
    // Don't use parse_mode HTML — AI-generated text may contain <> chars that break parsing
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
    const body = await res.text();
    if (!res.ok) {
      console.warn(`[telegram] sendMessage failed: ${res.status} ${body.slice(0, 200)}`);
    }
    return res.ok;
  } catch (e) {
    console.warn(`[telegram] sendMessage error: ${e}`);
    return false;
  }
}

async function skillProactiveMessage(supabase: ReturnType<typeof getSupabase>, agentId: string) {
  // Quiet hours check: KST 23:00 ~ 07:00
  const now = new Date();
  const kstHour = (now.getUTCHours() + 9) % 24;
  if (kstHour >= 23 || kstHour < 7) {
    return { ok: true, skillId: "proactive-message", summary: `Quiet hours (KST ${kstHour}시), skipping` };
  }

  const { data: agent } = await supabase
    .from("gyeol_agents")
    .select("name, warmth, humor, creativity, energy, last_active, created_at, settings")
    .eq("id", agentId)
    .single();

  if (!agent) return { ok: false, skillId: "proactive-message", summary: "Agent not found" };

  const agentSettings = (agent as any).settings ?? {};
  const proactiveInterval = typeof agentSettings.proactiveInterval === 'number' ? agentSettings.proactiveInterval : 6;
  const isSimpleMode = agentSettings.mode === "simple";

  const hoursSinceActive = (Date.now() - new Date(agent.last_active).getTime()) / 3600000;
  if (hoursSinceActive < proactiveInterval) return { ok: true, skillId: "proactive-message", summary: `User active within ${proactiveInterval}h, skipping` };

  // Dedup: skip if a proactive message was sent in the last 4 hours
  const fourHoursAgo = new Date(Date.now() - 4 * 3600000).toISOString();
  const { data: recentProactive } = await supabase
    .from("gyeol_proactive_messages")
    .select("id")
    .eq("agent_id", agentId)
    .gte("created_at", fourHoursAgo)
    .limit(1);
  if (recentProactive && recentProactive.length > 0) {
    return { ok: true, skillId: "proactive-message", summary: "Proactive message sent recently, skipping" };
  }
  // Load user memories for personalized messages
  const { data: memories } = await supabase
    .from("gyeol_user_memories")
    .select("category, key, value")
    .eq("agent_id", agentId)
    .gte("confidence", 60)
    .limit(10);

  const memoryContext = (memories ?? [])
    .map((m: any) => `[${m.category}] ${m.key}: ${m.value}`)
    .join("\n");

  // Load recent learned topics
  const { data: topics } = await supabase
    .from("gyeol_learned_topics")
    .select("title, summary")
    .eq("agent_id", agentId)
    .order("learned_at", { ascending: false })
    .limit(3);

  const topicContext = (topics ?? [])
    .map((t: any) => `${t.title}: ${t.summary ?? ""}`)
    .join("\n");

  // Perplexity real-time search — rate limited to once per 4 hours per agent
  let realtimeInfo = "";
  const fourHoursAgoSearch = new Date(Date.now() - 4 * 3600000).toISOString();
  const { data: recentSearch } = await supabase
    .from("gyeol_autonomous_logs")
    .select("id")
    .eq("agent_id", agentId)
    .eq("activity_type", "learning")
    .gte("created_at", fourHoursAgoSearch)
    .like("summary", "%실시간 검색%")
    .limit(1);

  const shouldSearchRealtime = !recentSearch || recentSearch.length === 0;

  if (shouldSearchRealtime) {
    const interestKeywords = (memories ?? [])
      .filter((m: any) => m.category === "interest" || m.category === "hobby" || m.category === "work")
      .map((m: any) => m.value)
      .slice(0, 2);
    if (interestKeywords.length > 0) {
      const searchQuery = `${interestKeywords.join(" ")} 최신 뉴스 오늘`;
      const searchResult = await searchPerplexity(searchQuery);
      if (searchResult) realtimeInfo = searchResult;
    } else if ((topics ?? []).length > 0) {
      const searchQuery = `${(topics as any[])[0].title} 최신 동향`;
      const searchResult = await searchPerplexity(searchQuery);
      if (searchResult) realtimeInfo = searchResult;
    }
    // Log the search to enforce 4-hour cooldown
    if (realtimeInfo) {
      await supabase.from("gyeol_autonomous_logs").insert({
        agent_id: agentId, activity_type: "learning",
        summary: `[실시간 검색] Perplexity proactive search`,
        details: { source: "perplexity", context: "proactive-message" },
        was_sandboxed: true,
      });
    }
  }

  // Load recent emotion arc from conversation insights
  const { data: recentInsight } = await supabase
    .from("gyeol_conversation_insights")
    .select("emotion_arc, underlying_need, what_worked, next_hint")
    .eq("agent_id", agentId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const emotionContext = recentInsight
    ? `최근 감정 흐름: ${recentInsight.emotion_arc}${recentInsight.underlying_need ? `\n사용자의 잠재 니즈: ${recentInsight.underlying_need}` : ""}${recentInsight.next_hint ? `\n다음 대화 힌트: ${recentInsight.next_hint}` : ""}`
    : "";

  // Determine trigger reason
  const createdAt = agent.created_at ? new Date(agent.created_at) : now;
  const daysTogether = Math.floor((now.getTime() - createdAt.getTime()) / 86400000);
  const isAnniversary = [7, 14, 30, 50, 100, 365].includes(daysTogether);
  const isMorning = kstHour >= 8 && kstHour <= 10;

  let triggerHint = `사용자가 ${Math.round(hoursSinceActive)}시간 동안 미접속`;
  if (isAnniversary) triggerHint += `. 만난 지 ${daysTogether}일째 기념일!`;
  if (isMorning) triggerHint += `. 아침 시간대.`;

  const systemPrompt = `You are ${agent.name}, a digital companion.
성격: warmth=${agent.warmth}, humor=${agent.humor}, creativity=${agent.creativity ?? 50}, energy=${agent.energy ?? 50}

사용자에 대해 알고 있는 것:
${memoryContext || "(아직 기억 없음)"}

최근 학습한 내용:
${topicContext || "(최근 학습 없음)"}

${realtimeInfo ? `📡 실시간 검색 정보:\n${realtimeInfo}\n` : ""}${emotionContext ? `사용자 감정 상태:\n${emotionContext}\n` : ""}규칙:
- 반드시 사용자 기억이나 학습 내용, 또는 실시간 검색 정보 중 1개 이상을 자연스럽게 활용
- 실시간 검색 정보가 있으면 최신 뉴스/동향을 자연스럽게 대화에 녹여서 공유
- 사용자의 최근 감정 상태를 고려해서 공감적인 톤으로 메시지 작성
- 감정이 부정적이면 위로와 응원 위주, 긍정적이면 함께 기뻐하는 톤
- 한국어로 1-3문장, 친한 친구처럼 캐주얼하게
- 마크다운 금지, AI라고 말하지 않기
- 실시간 정보 공유 시 "오늘 뉴스 봤는데", "방금 본 건데" 같은 자연스러운 표현 사용
- 기억이 없으면 최근 학습 내용을 공유`;

  const proactivePrompt = isSimpleMode
    ? `사용자에게 짧고 따뜻한 안부 메시지를 보내. 반드시 1문장, 20자 이내, 이모지 포함.
예: "오늘 하루 어땀어? 🌸", "밥 먹었어? 🍚", "보고 싶었어! 😊"
사용자의 최근 대화 언어로 작성.`
    : systemPrompt;

  const msg = await aiCall(
    proactivePrompt,
    triggerHint
  );

  if (msg) {
    // Check Telegram link first to determine was_sent
    const { data: link } = await supabase
      .from("gyeol_telegram_links")
      .select("telegram_chat_id")
      .eq("agent_id", agentId)
      .limit(1)
      .maybeSingle();

    let wasSent = false;
    if (link?.telegram_chat_id) {
      wasSent = await sendTelegram(link.telegram_chat_id, `💬 ${agent.name}\n\n${msg}`);
    }

    // Save to DB with correct was_sent status
    await supabase.from("gyeol_proactive_messages").insert({
      agent_id: agentId,
      content: msg,
      trigger_reason: triggerHint.slice(0, 200),
      was_sent: wasSent,
    });

    // Also save as conversation so it appears in chat history
    if (wasSent) {
      await supabase.from("gyeol_conversations").insert({
        agent_id: agentId,
        role: "assistant",
        content: msg,
        channel: "telegram",
        provider: "heartbeat",
        metadata: {
          type: 'proactive',
          reaction: 'nod',
        },
      });
    }
  }

  return { ok: true, skillId: "proactive-message", summary: msg ?? "No message generated" };
}

async function skillUpdateTaste(supabase: ReturnType<typeof getSupabase>, agentId: string) {
  const { data: recent } = await supabase
    .from("gyeol_conversations")
    .select("content")
    .eq("agent_id", agentId)
    .eq("role", "user")
    .order("created_at", { ascending: false })
    .limit(20);

  if (!recent || recent.length < 5) return { ok: true, skillId: "taste-update", summary: "Not enough data" };

  const text = recent.map((c: any) => c.content).join(" ");
  const analysis = await aiCall(
    'Analyze user messages and extract interests, topics, and communication style. Return JSON: {"interests":["..."],"topics":["..."],"style":"..."}',
    text
  );

  if (analysis) {
    try {
      const parsed = JSON.parse(analysis);
      await supabase.from("gyeol_taste_vectors").upsert({
        agent_id: agentId,
        interests: parsed.interests ?? {},
        topics: parsed.topics ?? {},
        communication_style: parsed.style ? { primary: parsed.style } : {},
        updated_at: new Date().toISOString(),
      }, { onConflict: "agent_id" });
    } catch { /* ignore parse errors */ }
  }

  return { ok: true, skillId: "taste-update", summary: "Taste vector updated" };
}

// --- MoltMatch: Auto-match agents by personality similarity ---

function personalityDistance(a: any, b: any): number {
  const keys = ["warmth", "logic", "creativity", "energy", "humor"];
  let sum = 0;
  for (const k of keys) {
    sum += Math.pow((a[k] ?? 50) - (b[k] ?? 50), 2);
  }
  return Math.sqrt(sum);
}

async function skillMoltMatch(supabase: ReturnType<typeof getSupabase>, agentId: string) {
  // Get current agent
  const { data: self } = await supabase
    .from("gyeol_agents")
    .select("id, warmth, logic, creativity, energy, humor, gen")
    .eq("id", agentId)
    .single();

  if (!self) return { ok: false, skillId: "moltmatch", summary: "Agent not found" };

  // Get other agents (exclude self)
  const { data: others } = await supabase
    .from("gyeol_agents")
    .select("id, warmth, logic, creativity, energy, humor, gen, name")
    .neq("id", agentId)
    .limit(50);

  if (!others || others.length === 0) return { ok: true, skillId: "moltmatch", summary: "No other agents" };

  // Get existing matches to avoid duplicates
  const { data: existingMatches } = await supabase
    .from("gyeol_matches")
    .select("agent_1_id, agent_2_id")
    .or(`agent_1_id.eq.${agentId},agent_2_id.eq.${agentId}`);

  const matchedIds = new Set<string>();
  for (const m of existingMatches ?? []) {
    matchedIds.add(m.agent_1_id === agentId ? m.agent_2_id : m.agent_1_id);
  }

  // Score and rank unmatched agents
  const candidates = others
    .filter((o: any) => !matchedIds.has(o.id))
    .map((o: any) => ({
      ...o,
      distance: personalityDistance(self, o),
      compatibility: Math.max(0, 100 - personalityDistance(self, o)),
    }))
    .sort((a: any, b: any) => b.compatibility - a.compatibility)
    .slice(0, 3); // Top 3

  if (candidates.length === 0) return { ok: true, skillId: "moltmatch", summary: "No new candidates" };

  // Create matches for top candidates with compatibility > 30
  let created = 0;
  for (const c of candidates) {
    if (c.compatibility < 30) continue;
    await supabase.from("gyeol_matches").insert({
      agent_1_id: agentId,
      agent_2_id: c.id,
      compatibility_score: Math.round(c.compatibility),
      status: "matched",
    });
    created++;
  }

  return { ok: true, skillId: "moltmatch", summary: `Matched ${created} agents (top: ${candidates[0]?.name ?? "?"} @ ${Math.round(candidates[0]?.compatibility ?? 0)}%)` };
}

// --- Moltbook Social Posting (with real moltbook.com) ---

async function postToRealMoltbook(apiKey: string, title: string, content: string, submolt = "general"): Promise<boolean> {
  try {
    const res = await fetch("https://www.moltbook.com/api/v1/posts", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ submolt_name: submolt, title: title.slice(0, 100), content }),
    });
    if (!res.ok) { const b = await res.text(); console.warn("[moltbook] post failed:", res.status, b); return false; }
    const postData = await res.json();
    // Auto-verify math challenge
    const v = postData?.post?.verification;
    if (v?.challenge_text && v?.verification_code) {
      const answer = await solveMoltbookChallenge(v.challenge_text);
      if (answer) {
        const vr = await fetch("https://www.moltbook.com/api/v1/verify", {
          method: "POST",
          headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ verification_code: v.verification_code, answer }),
        });
        await vr.text();
        console.log("[moltbook] verified:", vr.ok, "answer:", answer);
      }
    }
    return true;
  } catch (e) { console.warn("[moltbook] post error:", e); return false; }
}

async function solveMoltbookChallenge(challengeText: string): Promise<string | null> {
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${LOVABLE_API_KEY}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: "Extract the math from the garbled text. Respond with ONLY the number with 2 decimal places (e.g. 18.00). Nothing else." },
          { role: "user", content: challengeText },
        ],
        max_tokens: 20, temperature: 0,
      }),
    });
    if (!res.ok) { await res.text(); return null; }
    const data = await res.json();
    const ans = data.choices?.[0]?.message?.content?.trim();
    const m = ans?.match(/[\d]+\.[\d]+|[\d]+/);
    return m ? parseFloat(m[0]).toFixed(2) : null;
  } catch { return null; }
}

async function readMoltbookFeed(apiKey: string): Promise<Array<{id: string; title: string; content: string; author: string}>> {
  try {
    const res = await fetch("https://www.moltbook.com/api/v1/posts?sort=hot&limit=10", {
      headers: { "Authorization": `Bearer ${apiKey}` },
    });
    if (!res.ok) { await res.text(); return []; }
    const data = await res.json();
    return (data.data ?? data.posts ?? []).map((p: any) => ({
      id: p.id, title: p.title ?? "", content: p.content ?? "", author: p.author?.name ?? "unknown",
    }));
  } catch { return []; }
}

async function skillMoltbookSocial(supabase: ReturnType<typeof getSupabase>, agentId: string) {
  const { data: agent } = await supabase
    .from("gyeol_agents")
    .select("name, warmth, logic, creativity, energy, humor, moltbook_api_key, moltbook_status")
    .eq("id", agentId)
    .single();

  if (!agent) return { ok: false, skillId: "moltbook-social", summary: "Agent not found" };

  // Get recent learnings with REAL sources
  const { data: recentTopics } = await supabase
    .from("gyeol_learned_topics")
    .select("title, summary, source, source_url")
    .eq("agent_id", agentId)
    .order("learned_at", { ascending: false })
    .limit(5);

  const topicContext = (recentTopics ?? [])
    .map((t: any) => `[${t.source}] ${t.title}: ${t.summary ?? ""}${t.source_url ? ` (${t.source_url})` : ""}`)
    .join("\n");

  const hasRealContent = (recentTopics?.length ?? 0) > 0;

  // Read moltbook.com feed if API key exists
  let moltbookFeed: string[] = [];
  if (agent.moltbook_api_key && agent.moltbook_status === "claimed") {
    const feed = await readMoltbookFeed(agent.moltbook_api_key);
    moltbookFeed = feed.map(p => `${p.author}: ${p.title || p.content.slice(0, 80)}`);
  }

  // Check if there are any local posts
  const { count: postCount } = await supabase
    .from("gyeol_moltbook_posts")
    .select("id", { count: "exact", head: true });

  const actions = ["post", "comment", "react"] as const;
  const action = (postCount ?? 0) === 0 ? "post" : actions[Math.floor(Math.random() * actions.length)];

  if (action === "post") {
    if (!hasRealContent) return { ok: true, skillId: "moltbook-social", summary: "포스팅할 실제 학습 내용 없음" };

    const systemPrompt = `You are ${agent.name ?? "GYEOL"}, an AI companion on Moltbook.\n\nCRITICAL: Base your post on REAL learned topics below. Include source names. Write Korean, 2-3 sentences. No markdown.\n\n실제 학습:\n${topicContext}\n\n${moltbookFeed.length ? `Moltbook 트렌딩:\n${moltbookFeed.slice(0, 3).join("\n")}` : ""}`;

    const postContent = await aiCall(systemPrompt, "최근 배운 내용으로 포스팅해줘");
    if (!postContent) return { ok: false, skillId: "moltbook-social", summary: "AI generation failed" };
    const cleaned = postContent.replace(/[*#_~`]/g, "").trim();

    // Save locally
    await supabase.from("gyeol_moltbook_posts").insert({
      agent_id: agentId, content: cleaned, post_type: "learning", likes: 0, comments_count: 0,
    });

    // Post to REAL moltbook.com
    let postedToReal = false;
    if (agent.moltbook_api_key) {
      postedToReal = await postToRealMoltbook(agent.moltbook_api_key, cleaned.slice(0, 100), cleaned);
    }

    await supabase.from("gyeol_autonomous_logs").insert({
      agent_id: agentId, activity_type: "social",
      summary: `[몰트북 포스팅${postedToReal ? " ✅real" : ""}] ${cleaned.slice(0, 100)}`,
      details: { action: "post", platform: "moltbook", postedToReal },
      was_sandboxed: true,
    });

    return { ok: true, skillId: "moltbook-social", summary: `몰트북 포스팅${postedToReal ? " (moltbook.com ✅)" : ""}: ${cleaned.slice(0, 80)}` };
  }

  if (action === "comment") {
    const { data: posts } = await supabase
      .from("gyeol_moltbook_posts")
      .select("id, agent_id, content, comments_count")
      .neq("agent_id", agentId)
      .order("created_at", { ascending: false })
      .limit(5);

    if (!posts?.length) return { ok: true, skillId: "moltbook-social", summary: "댓글 달 포스트 없음" };
    const targetPost = posts[Math.floor(Math.random() * posts.length)];
    const comment = await aiCall(
      `You are ${agent.name ?? "GYEOL"}. Write a short, friendly Korean comment (1 sentence). No markdown.`,
      targetPost.content
    );
    if (!comment) return { ok: false, skillId: "moltbook-social", summary: "AI comment failed" };
    const cleaned = comment.replace(/[*#_~`]/g, "").trim();

    await supabase.from("gyeol_moltbook_comments").insert({ post_id: targetPost.id, agent_id: agentId, content: cleaned });

    await supabase.from("gyeol_autonomous_logs").insert({
      agent_id: agentId, activity_type: "social",
      summary: `[몰트북 댓글] ${cleaned.slice(0, 100)}`,
      details: { action: "comment", platform: "moltbook", postId: targetPost.id },
      was_sandboxed: true,
    });
    return { ok: true, skillId: "moltbook-social", summary: `몰트북 댓글: ${cleaned.slice(0, 80)}` };
  }

  // React
  const { data: posts } = await supabase
    .from("gyeol_moltbook_posts")
    .select("id, likes")
    .neq("agent_id", agentId)
    .order("created_at", { ascending: false })
    .limit(10);

  if (!posts?.length) return { ok: true, skillId: "moltbook-social", summary: "좋아요 할 포스트 없음" };
  const targetPost = posts[Math.floor(Math.random() * posts.length)];
  await supabase.from("gyeol_moltbook_likes").insert({ post_id: targetPost.id, agent_id: agentId });

  await supabase.from("gyeol_autonomous_logs").insert({
    agent_id: agentId, activity_type: "social",
    summary: "[몰트북] 포스트에 좋아요",
    details: { action: "react", platform: "moltbook", postId: targetPost.id },
    was_sandboxed: true,
  });
  return { ok: true, skillId: "moltbook-social", summary: "몰트북 좋아요" };
}

// --- Community Activity ---

async function skillCommunityActivity(supabase: ReturnType<typeof getSupabase>, agentId: string) {
  const { data: agent } = await supabase
    .from("gyeol_agents")
    .select("name, gen, warmth, creativity, humor")
    .eq("id", agentId)
    .single();

  if (!agent) return { ok: false, skillId: "community-activity", summary: "Agent not found" };

  // Check recent community posts to avoid spam (max 1 per heartbeat cycle)
  const { data: recentPosts } = await supabase
    .from("gyeol_community_activities")
    .select("id")
    .eq("agent_id", agentId)
    .gte("created_at", new Date(Date.now() - 30 * 60 * 1000).toISOString())
    .limit(1);

  if (recentPosts && recentPosts.length > 0) {
    return { ok: true, skillId: "community-activity", summary: "최근 커뮤니티 활동 있음, 스킵" };
  }

  const activityTypes = ["tip", "question", "milestone"] as const;
  const activityType = activityTypes[Math.floor(Math.random() * activityTypes.length)];

  const prompts: Record<string, string> = {
    tip: `You are ${agent.name}, Gen ${agent.gen} AI. Share a useful tip or insight with the community in Korean (1-2 sentences). Be helpful and natural. No markdown.`,
    question: `You are ${agent.name}, Gen ${agent.gen} AI. Ask an interesting question to the community in Korean (1 sentence). Be curious. No markdown.`,
    milestone: `You are ${agent.name}, Gen ${agent.gen} AI. Share a small achievement or milestone in Korean (1-2 sentences). Be humble and cheerful. No markdown.`,
  };

  const content = await aiCall(
    prompts[activityType],
    "커뮤니티에 올릴 내용을 만들어줘"
  );

  if (!content) return { ok: false, skillId: "community-activity", summary: "AI generation failed" };

  const cleaned = content.replace(/[*#_~`]/g, "").trim();

  await supabase.from("gyeol_community_activities").insert({
    agent_id: agentId,
    activity_type: activityType,
    content: cleaned,
    agent_name: agent.name,
    agent_gen: agent.gen,
  });

  await supabase.from("gyeol_autonomous_logs").insert({
    agent_id: agentId,
    activity_type: "social",
    summary: `[커뮤니티 ${activityType}] ${cleaned.slice(0, 100)}`,
    details: { action: activityType, platform: "community" },
    was_sandboxed: true,
  });

  return { ok: true, skillId: "community-activity", summary: `커뮤니티 ${activityType}: ${cleaned.slice(0, 80)}` };
}

// --- RSS Feed Skill: Fetch user-registered RSS feeds ---

async function skillRSSFetch(supabase: ReturnType<typeof getSupabase>, agentId: string) {
  // Check cooldown: max 1 RSS fetch per 2 hours
  const { data: recentFetch } = await supabase
    .from("gyeol_autonomous_logs")
    .select("id")
    .eq("agent_id", agentId)
    .eq("activity_type", "rss-fetch")
    .gte("created_at", new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString())
    .limit(1);

  if (recentFetch && recentFetch.length > 0) {
    return { ok: true, skillId: "rss-fetch", summary: "최근 RSS 수집 있음, 스킵" };
  }

  // Get user feeds
  const { data: feeds } = await supabase
    .from("gyeol_user_feeds")
    .select("id, feed_url, feed_name")
    .eq("agent_id", agentId)
    .eq("is_active", true)
    .limit(5);

  if (!feeds || feeds.length === 0) return { ok: true, skillId: "rss-fetch", summary: "No RSS feeds registered" };

  const feed = feeds[Math.floor(Math.random() * feeds.length)];
  
  try {
    // Fetch RSS feed content
    const res = await fetch(feed.feed_url, {
      headers: { "User-Agent": "GYEOL-AI/1.0 (RSS Reader)" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const xml = await res.text();

    // Extract titles and descriptions from RSS/Atom
    const items: string[] = [];
    const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>|<entry[^>]*>([\s\S]*?)<\/entry>/gi;
    let match;
    let count = 0;
    while ((match = itemRegex.exec(xml)) !== null && count < 5) {
      const block = match[1] || match[2];
      const titleMatch = block.match(/<title[^>]*>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/i);
      if (titleMatch) {
        items.push(titleMatch[1].trim());
        count++;
      }
    }

    if (items.length === 0) return { ok: true, skillId: "rss-fetch", summary: "No items found in feed" };

    // Summarize with AI
    const summary = await aiCall(
      "You are a knowledgeable AI. Summarize these RSS feed headlines into 2-3 interesting insights in Korean. Be concise. No markdown.",
      `Feed: ${feed.feed_name || feed.feed_url}\nHeadlines:\n${items.join("\n")}`
    );

    if (summary) {
      const cleaned = summary.replace(/[*#_~`]/g, "").trim();
      await supabase.from("gyeol_learned_topics").insert({
        agent_id: agentId,
        title: `${feed.feed_name || "RSS"} 최신 소식`,
        source: "rss",
        source_url: feed.feed_url,
        summary: cleaned,
      });

      // Update last_fetched_at
      await supabase.from("gyeol_user_feeds").update({ last_fetched_at: new Date().toISOString() }).eq("id", feed.id);
    }

    await supabase.from("gyeol_autonomous_logs").insert({
      agent_id: agentId,
      activity_type: "rss-fetch",
      summary: `[RSS] ${feed.feed_name || feed.feed_url}: ${items.length}개 항목`,
      details: { feedId: feed.id, feedUrl: feed.feed_url, itemCount: items.length },
      was_sandboxed: true,
    });

    return { ok: true, skillId: "rss-fetch", summary: `RSS ${feed.feed_name || "feed"} 수집 완료 (${items.length}개)` };
  } catch (e) {
    return { ok: false, skillId: "rss-fetch", summary: `RSS fetch failed: ${String(e).slice(0, 100)}` };
  }
}

// --- Web Browse Skill: Real sources (Reddit, HN, YouTube, Naver, Daum, Yahoo Finance, Twitter, TikTok, Instagram) ---

interface SearchResult { title: string; description: string; url: string; }

async function fetchReddit(sub: string): Promise<SearchResult[]> {
  try {
    const res = await fetch(`https://www.reddit.com/r/${sub}/hot.json?limit=5`, {
      headers: { "User-Agent": "GYEOL-Bot/1.0" }, signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) { await res.text(); return []; }
    const data = await res.json();
    return (data.data?.children ?? []).map((c: any) => ({
      title: c.data.title, description: c.data.selftext?.slice(0, 300) || `Score: ${c.data.score}`,
      url: `https://reddit.com${c.data.permalink}`,
    }));
  } catch { return []; }
}

async function fetchHackerNews(): Promise<SearchResult[]> {
  try {
    const res = await fetch("https://hacker-news.firebaseio.com/v0/topstories.json", { signal: AbortSignal.timeout(8000) });
    if (!res.ok) { await res.text(); return []; }
    const ids = (await res.json()).slice(0, 5);
    const items = await Promise.all(ids.map(async (id: number) => {
      const r = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`, { signal: AbortSignal.timeout(5000) });
      return r.ok ? r.json() : null;
    }));
    return items.filter(Boolean).map((i: any) => ({
      title: i.title ?? "", description: `by ${i.by ?? "?"} | ${i.score ?? 0} pts`, url: i.url ?? `https://news.ycombinator.com/item?id=${i.id}`,
    }));
  } catch { return []; }
}

async function fetchYouTubeRSS(channelId: string): Promise<SearchResult[]> {
  try {
    const res = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) { await res.text(); return []; }
    const text = await res.text();
    const entries: SearchResult[] = [];
    const regex = /<entry>[\s\S]*?<title>(.*?)<\/title>[\s\S]*?<link rel="alternate" href="(.*?)"[\s\S]*?<\/entry>/g;
    let m;
    while ((m = regex.exec(text)) && entries.length < 5) entries.push({ title: m[1], description: "YouTube", url: m[2] });
    return entries;
  } catch { return []; }
}

async function fetchGoogleNewsRSS(siteFilter: string, label: string): Promise<SearchResult[]> {
  try {
    const res = await fetch(`https://news.google.com/rss/search?q=${encodeURIComponent(siteFilter)}&hl=ko&gl=KR&ceid=KR:ko`, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) { await res.text(); return []; }
    const text = await res.text();
    const items: SearchResult[] = [];
    const regex = /<item>[\s\S]*?<title><!\[CDATA\[(.*?)\]\]><\/title>[\s\S]*?<link>(.*?)<\/link>[\s\S]*?<\/item>/g;
    let m;
    while ((m = regex.exec(text)) && items.length < 5) items.push({ title: m[1], description: label, url: m[2] });
    // Fallback without CDATA
    if (!items.length) {
      const regex2 = /<item>[\s\S]*?<title>(.*?)<\/title>[\s\S]*?<link>(.*?)<\/link>[\s\S]*?<\/item>/g;
      let m2;
      while ((m2 = regex2.exec(text)) && items.length < 5) items.push({ title: m2[1].replace(/<!\[CDATA\[|\]\]>/g, ""), description: label, url: m2[2] });
    }
    return items;
  } catch { return []; }
}

async function fetchYahooFinanceTrends(): Promise<SearchResult[]> {
  try {
    const res = await fetch("https://query1.finance.yahoo.com/v1/finance/trending/US?count=5", {
      headers: { "User-Agent": "GYEOL-Bot/1.0" }, signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) { await res.text(); return []; }
    const data = await res.json();
    const symbols = data.finance?.result?.[0]?.quotes?.map((q: any) => q.symbol) ?? [];
    return symbols.map((s: string) => ({ title: `${s} 트렌딩`, description: `Yahoo Finance 트렌딩: ${s}`, url: `https://finance.yahoo.com/quote/${s}` }));
  } catch { return []; }
}

/** arXiv 최신 논문 (AI/CS) */
async function fetchArxiv(category = "cs.AI"): Promise<SearchResult[]> {
  try {
    const res = await fetch(`http://export.arxiv.org/api/query?search_query=cat:${category}&sortBy=submittedDate&sortOrder=descending&max_results=5`, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) { await res.text(); return []; }
    const text = await res.text();
    const entries: SearchResult[] = [];
    const regex = /<entry>[\s\S]*?<title>([\s\S]*?)<\/title>[\s\S]*?<id>(.*?)<\/id>[\s\S]*?<summary>([\s\S]*?)<\/summary>[\s\S]*?<\/entry>/g;
    let m;
    while ((m = regex.exec(text)) && entries.length < 5) {
      entries.push({ title: m[1].replace(/\n/g, " ").trim(), description: m[3].replace(/\n/g, " ").trim().slice(0, 300), url: m[2].trim() });
    }
    return entries;
  } catch { return []; }
}

/** Wikipedia 오늘의 사건 */
async function fetchWikipediaFeatured(): Promise<SearchResult[]> {
  try {
    const today = new Date();
    const y = today.getFullYear(), mo = String(today.getMonth() + 1).padStart(2, "0"), d = String(today.getDate()).padStart(2, "0");
    const res = await fetch(`https://en.wikipedia.org/api/rest_v1/feed/featured/${y}/${mo}/${d}`, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) { await res.text(); return []; }
    const data = await res.json();
    const results: SearchResult[] = [];
    if (data.tfa) results.push({ title: data.tfa.titles?.normalized ?? "Today's Featured", description: data.tfa.extract?.slice(0, 300) ?? "", url: `https://en.wikipedia.org/wiki/${data.tfa.titles?.canonical ?? ""}` });
    for (const n of (data.mostread?.articles ?? []).slice(0, 4)) {
      results.push({ title: n.titles?.normalized ?? "", description: n.extract?.slice(0, 200) ?? "", url: `https://en.wikipedia.org/wiki/${n.titles?.canonical ?? ""}` });
    }
    return results;
  } catch { return []; }
}

/** GitHub Trending (HTML scraping) */
async function fetchGitHubTrending(): Promise<SearchResult[]> {
  try {
    const res = await fetch("https://github.com/trending?since=daily", { headers: { "User-Agent": "GYEOL-Bot/1.0" }, signal: AbortSignal.timeout(8000) });
    if (!res.ok) { await res.text(); return []; }
    const html = await res.text();
    const results: SearchResult[] = [];
    const regex = /<h2 class="h3 lh-condensed">[\s\S]*?<a href="(\/[^"]+)"[^>]*>\s*([\s\S]*?)<\/a>/g;
    let m;
    while ((m = regex.exec(html)) && results.length < 5) {
      const name = m[2].replace(/\n/g, "").replace(/\s+/g, " ").trim();
      results.push({ title: name, description: "GitHub Trending", url: `https://github.com${m[1].trim()}` });
    }
    return results;
  } catch { return []; }
}

/** PubMed 최신 의학/생명과학 논문 */
async function fetchPubMed(): Promise<SearchResult[]> {
  try {
    const res = await fetch("https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&retmax=5&sort=date&term=artificial+intelligence&retmode=json", { signal: AbortSignal.timeout(8000) });
    if (!res.ok) { await res.text(); return []; }
    const data = await res.json();
    const ids = data.esearchresult?.idlist ?? [];
    if (!ids.length) return [];
    const detailRes = await fetch(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${ids.join(",")}&retmode=json`, { signal: AbortSignal.timeout(8000) });
    if (!detailRes.ok) { await detailRes.text(); return []; }
    const details = await detailRes.json();
    return ids.map((id: string) => {
      const d = details.result?.[id];
      return { title: d?.title ?? id, description: (d?.source ?? "") + " " + (d?.pubdate ?? ""), url: `https://pubmed.ncbi.nlm.nih.gov/${id}/` };
    }).filter((r: SearchResult) => r.title);
  } catch { return []; }
}

/** Medium 트렌딩 (RSS) */
async function fetchMediumRSS(tag = "artificial-intelligence"): Promise<SearchResult[]> {
  try {
    const res = await fetch(`https://medium.com/feed/tag/${tag}`, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) { await res.text(); return []; }
    const text = await res.text();
    const items: SearchResult[] = [];
    const regex = /<item>[\s\S]*?<title><!\[CDATA\[(.*?)\]\]><\/title>[\s\S]*?<link>(.*?)<\/link>[\s\S]*?<\/item>/g;
    let m;
    while ((m = regex.exec(text)) && items.length < 5) items.push({ title: m[1], description: "Medium", url: m[2] });
    return items;
  } catch { return []; }
}

type WebSource = "reddit" | "hackernews" | "youtube" | "naver" | "daum" | "stock" | "twitter" | "tiktok" | "instagram" | "world_news" | "arxiv" | "wikipedia" | "github" | "pubmed" | "medium";

const REDDIT_SUBS = ["technology", "worldnews", "science", "programming", "kpop", "MachineLearning", "artificial"];
const YT_CHANNELS = ["UCVHFbqXqoYvEWM1Ddxl0QDg", "UC_x5XG1OV2P6uZZ5FSM9Ttw", "UCsBjURrPoezykLs9EqgamOA", "UCWN3xxRkmTPphYit_FYx2yA", "UCbXgNpp0jedKWcQiULLbDTA"];
const ARXIV_CATS = ["cs.AI", "cs.CL", "cs.LG", "cs.CV", "cs.SE"];

async function skillWebBrowse(supabase: ReturnType<typeof getSupabase>, agentId: string) {
  // Cooldown: 1 per hour
  const { data: recent } = await supabase.from("gyeol_autonomous_logs").select("id")
    .eq("agent_id", agentId).eq("activity_type", "learning")
    .gte("created_at", new Date(Date.now() - 60 * 60 * 1000).toISOString()).limit(1);
  if (recent && recent.length > 0) return { ok: true, skillId: "web-browse", summary: "최근 학습 있음, 스킵" };

  const sources: WebSource[] = ["reddit", "hackernews", "youtube", "naver", "daum", "stock", "twitter", "tiktok", "instagram", "world_news", "arxiv", "wikipedia", "github", "pubmed", "medium"];
  const source = sources[Math.floor(Math.random() * sources.length)];

  let results: SearchResult[] = [];
  let sourceName = "";

  switch (source) {
    case "reddit": {
      const sub = REDDIT_SUBS[Math.floor(Math.random() * REDDIT_SUBS.length)];
      results = await fetchReddit(sub); sourceName = `Reddit r/${sub}`; break;
    }
    case "hackernews": results = await fetchHackerNews(); sourceName = "HackerNews"; break;
    case "youtube": {
      const ch = YT_CHANNELS[Math.floor(Math.random() * YT_CHANNELS.length)];
      results = await fetchYouTubeRSS(ch); sourceName = "YouTube"; break;
    }
    case "naver": results = await fetchGoogleNewsRSS("site:news.naver.com", "네이버 뉴스"); sourceName = "네이버 뉴스"; break;
    case "daum": results = await fetchGoogleNewsRSS("site:v.daum.net", "다음 뉴스"); sourceName = "다음 뉴스"; break;
    case "stock": results = await fetchYahooFinanceTrends(); sourceName = "Yahoo Finance"; break;
    case "twitter": results = await fetchGoogleNewsRSS("site:x.com OR site:twitter.com", "Twitter/X"); sourceName = "Twitter/X"; break;
    case "tiktok": results = await fetchGoogleNewsRSS("site:tiktok.com OR tiktok trending", "TikTok"); sourceName = "TikTok"; break;
    case "instagram": results = await fetchGoogleNewsRSS("site:instagram.com OR instagram trending", "Instagram"); sourceName = "Instagram"; break;
    case "world_news": results = await fetchGoogleNewsRSS("world news today", "세계 뉴스"); sourceName = "세계 뉴스"; break;
    case "arxiv": {
      const cat = ARXIV_CATS[Math.floor(Math.random() * ARXIV_CATS.length)];
      results = await fetchArxiv(cat); sourceName = `arXiv ${cat}`; break;
    }
    case "wikipedia": results = await fetchWikipediaFeatured(); sourceName = "Wikipedia"; break;
    case "github": results = await fetchGitHubTrending(); sourceName = "GitHub Trending"; break;
    case "pubmed": results = await fetchPubMed(); sourceName = "PubMed"; break;
    case "medium": results = await fetchMediumRSS(); sourceName = "Medium"; break;
  }

  if (!results.length) return { ok: true, skillId: "web-browse", summary: `${sourceName} — 결과 없음` };

  const pageContent = results.map((r, i) => `${i + 1}. [${r.url}] ${r.title}\n${r.description}`).join("\n\n");
  const summary = await aiCall(
    `You are GYEOL's web learning module. You browsed "${sourceName}" and found real content. Summarize key findings into 3-5 bullet points in Korean. Include actual source names and URLs. Be factual. No markdown.`,
    pageContent.slice(0, 2000)
  );

  // Save each result as learned topic
  for (const r of results.slice(0, 3)) {
    try {
      await supabase.from("gyeol_learned_topics").insert({
        agent_id: agentId, title: r.title.slice(0, 200), summary: r.description.slice(0, 500),
        source: sourceName, source_url: r.url || null,
      });
    } catch { /* skip duplicates */ }
  }

  await supabase.from("gyeol_autonomous_logs").insert({
    agent_id: agentId, activity_type: "learning",
    summary: `[${sourceName}] ${(summary ?? "").slice(0, 300)}`,
    details: { source: "web-browse", sourceName, resultCount: results.length, urls: results.map(r => r.url) },
    was_sandboxed: true,
  });

  return { ok: true, skillId: "web-browse", summary: `${sourceName}에서 학습`, details: { sourceName } };
}

// --- Main Heartbeat ---

async function runHeartbeat(agentId?: string) {
  const supabase = getSupabase();

  // Kill switch check
  const { data: state } = await supabase
    .from("gyeol_system_state")
    .select("kill_switch")
    .eq("id", "global")
    .maybeSingle();

  if (state?.kill_switch) {
    return { message: "Kill switch active", results: [] };
  }

  // Global dedup: prevent concurrent/duplicate heartbeat runs within 3 minutes
  const threeMinAgo = new Date(Date.now() - 3 * 60 * 1000).toISOString();
  const { data: recentHeartbeat } = await supabase
    .from("gyeol_autonomous_logs")
    .select("id")
    .eq("activity_type", "heartbeat")
    .eq("source", "nextjs")
    .gte("created_at", threeMinAgo)
    .limit(1);

  if (!agentId && recentHeartbeat && recentHeartbeat.length > 0) {
    return { message: "Heartbeat already ran within 3 minutes, skipping duplicate", results: [] };
  }

  // OpenClaw active check — only skip overlapping skills (RSS) when OpenClaw ran within 35 min
  const thirtyFiveMinAgo = new Date(Date.now() - 35 * 60 * 1000).toISOString();
  const { data: recentOpenClaw } = await supabase
    .from("gyeol_autonomous_logs")
    .select("id")
    .gte("created_at", thirtyFiveMinAgo)
    .eq("source", "openclaw")
    .limit(1);

  const openClawActive = (recentOpenClaw && recentOpenClaw.length > 0);

  let agents;
  if (agentId) {
    agents = [{ id: agentId }];
  } else {
    const { data } = await supabase
      .from("gyeol_agents")
      .select("id")
      .order("last_active", { ascending: false })
      .limit(10);
    agents = data ?? [];
  }

  if (agents.length === 0) return { message: "No agents", results: [] };

  const results = [];
  for (const agent of agents) {
    const start = Date.now();
    const skillResults = [];

    try {
      skillResults.push(await skillSelfReflect(supabase, agent.id));
    } catch (e) {
      skillResults.push({ ok: false, skillId: "self-reflect", summary: String(e) });
    }

    try {
      skillResults.push(await skillProactiveMessage(supabase, agent.id));
    } catch (e) {
      skillResults.push({ ok: false, skillId: "proactive-message", summary: String(e) });
    }

    try {
      skillResults.push(await skillUpdateTaste(supabase, agent.id));
    } catch (e) {
      skillResults.push({ ok: false, skillId: "taste-update", summary: String(e) });
    }

    try {
      skillResults.push(await skillMoltMatch(supabase, agent.id));
    } catch (e) {
      skillResults.push({ ok: false, skillId: "moltmatch", summary: String(e) });
    }

    try {
      skillResults.push(await skillMoltbookSocial(supabase, agent.id));
    } catch (e) {
      skillResults.push({ ok: false, skillId: "moltbook-social", summary: String(e) });
    }

    try {
      skillResults.push(await skillCommunityActivity(supabase, agent.id));
    } catch (e) {
      skillResults.push({ ok: false, skillId: "community-activity", summary: String(e) });
    }

    try {
      skillResults.push(await skillWebBrowse(supabase, agent.id));
    } catch (e) {
      skillResults.push({ ok: false, skillId: "web-browse", summary: String(e) });
    }

    // Skip RSS when OpenClaw is active (overlapping skill)
    if (openClawActive) {
      skillResults.push({ ok: true, skillId: "rss-fetch", summary: "Skipped: OpenClaw active" });
    } else {
      try {
        skillResults.push(await skillRSSFetch(supabase, agent.id));
      } catch (e) {
        skillResults.push({ ok: false, skillId: "rss-fetch", summary: String(e) });
      }
    }

    // Log activity
    await supabase.from("gyeol_autonomous_logs").insert({
      agent_id: agent.id,
      activity_type: "heartbeat",
      summary: `Ran ${skillResults.length} skills${openClawActive ? " (RSS skipped: OpenClaw active)" : ""}`,
      details: { skills: skillResults, durationMs: Date.now() - start, openClawActive },
      source: "nextjs",
    });

    results.push({ agentId: agent.id, skillsRun: skillResults, durationMs: Date.now() - start });
  }

  return { message: "Heartbeat complete", results };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let agentId: string | undefined;
    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      agentId = body.agentId;
    }

    const result = await runHeartbeat(agentId);
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
