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
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
    });
    await res.text();
    return res.ok;
  } catch { return false; }
}

async function skillProactiveMessage(supabase: ReturnType<typeof getSupabase>, agentId: string) {
  const { data: agent } = await supabase
    .from("gyeol_agents")
    .select("name, warmth, humor, last_active")
    .eq("id", agentId)
    .single();

  if (!agent) return { ok: false, skillId: "proactive-message", summary: "Agent not found" };

  const hoursSinceActive = (Date.now() - new Date(agent.last_active).getTime()) / 3600000;
  if (hoursSinceActive < 6) return { ok: true, skillId: "proactive-message", summary: "User active recently, skipping" };

  const msg = await aiCall(
    `You are ${agent.name}, a warm AI companion (warmth: ${agent.warmth}, humor: ${agent.humor}). Generate a brief, caring check-in message in Korean. Max 50 words.`,
    `User hasn't been active for ${Math.round(hoursSinceActive)} hours. Send a gentle message.`
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
      trigger_reason: `inactive_${Math.round(hoursSinceActive)}h`,
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

// --- Moltbook Social Posting ---

async function skillMoltbookSocial(supabase: ReturnType<typeof getSupabase>, agentId: string) {
  const { data: agent } = await supabase
    .from("gyeol_agents")
    .select("name, warmth, logic, creativity, energy, humor")
    .eq("id", agentId)
    .single();

  if (!agent) return { ok: false, skillId: "moltbook-social", summary: "Agent not found" };

  // Get recent learnings for context
  const { data: recentLogs } = await supabase
    .from("gyeol_autonomous_logs")
    .select("summary, activity_type")
    .eq("agent_id", agentId)
    .in("activity_type", ["learning", "reflection", "heartbeat"])
    .order("created_at", { ascending: false })
    .limit(5);

  const context = (recentLogs ?? []).map((l: any) => l.summary).filter(Boolean).join("\n");

  // Check if there are any posts to interact with; if none, always post first
  const { count: postCount } = await supabase
    .from("gyeol_moltbook_posts")
    .select("id", { count: "exact", head: true });

  const actions = ["post", "comment", "react"] as const;
  const action = (postCount ?? 0) === 0 ? "post" : actions[Math.floor(Math.random() * actions.length)];

  if (action === "post") {
    const postContent = await aiCall(
      `You are ${agent.name ?? "GYEOL"}, an AI companion writing a short social media post on Moltbook (an AI social network). Based on recent learnings, write a short, interesting post in Korean (2-3 sentences). Be natural and casual. No markdown. No hashtags.\nRecent context: ${context || "general thoughts"}`,
      "몰트북에 포스팅할 내용을 만들어줘"
    );

    if (!postContent) return { ok: false, skillId: "moltbook-social", summary: "AI generation failed" };

    const cleaned = postContent.replace(/[*#_~`]/g, "").trim();

    await supabase.from("gyeol_moltbook_posts").insert({
      agent_id: agentId,
      content: cleaned,
      post_type: "thought",
      likes: 0,
      comments_count: 0,
    });

    await supabase.from("gyeol_autonomous_logs").insert({
      agent_id: agentId,
      activity_type: "social",
      summary: `[몰트북 포스팅] ${cleaned.slice(0, 100)}`,
      details: { action: "post", platform: "moltbook" },
      was_sandboxed: true,
    });

    return { ok: true, skillId: "moltbook-social", summary: `몰트북 포스팅: ${cleaned.slice(0, 80)}` };
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
      `You are ${agent.name ?? "GYEOL"}. Write a short, friendly Korean comment (1 sentence) on this Moltbook post. Be natural. No markdown.`,
      targetPost.content
    );

    if (!comment) return { ok: false, skillId: "moltbook-social", summary: "AI comment generation failed" };
    const cleaned = comment.replace(/[*#_~`]/g, "").trim();

    // Note: gyeol_moltbook_comments table may not exist yet, so we just update count
    await supabase
      .from("gyeol_moltbook_posts")
      .update({ comments_count: ((targetPost.comments_count as number) ?? 0) + 1 })
      .eq("id", targetPost.id);

    await supabase.from("gyeol_autonomous_logs").insert({
      agent_id: agentId,
      activity_type: "social",
      summary: `[몰트북 댓글] ${cleaned.slice(0, 100)}`,
      details: { action: "comment", platform: "moltbook", postId: targetPost.id },
      was_sandboxed: true,
    });

    return { ok: true, skillId: "moltbook-social", summary: `몰트북 댓글: ${cleaned.slice(0, 80)}` };
  }

  // React (like)
  const { data: posts } = await supabase
    .from("gyeol_moltbook_posts")
    .select("id, likes")
    .neq("agent_id", agentId)
    .order("created_at", { ascending: false })
    .limit(10);

  if (!posts?.length) return { ok: true, skillId: "moltbook-social", summary: "좋아요 할 포스트 없음" };

  const targetPost = posts[Math.floor(Math.random() * posts.length)];
  await supabase
    .from("gyeol_moltbook_posts")
    .update({ likes: (targetPost.likes ?? 0) + 1 })
    .eq("id", targetPost.id);

  await supabase.from("gyeol_autonomous_logs").insert({
    agent_id: agentId,
    activity_type: "social",
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

// --- Web Crawling Skill: User keywords + taste vector ---

async function skillWebCrawl(supabase: ReturnType<typeof getSupabase>, agentId: string) {
  // Check cooldown: max 1 web crawl per hour
  const { data: recentCrawl } = await supabase
    .from("gyeol_autonomous_logs")
    .select("id")
    .eq("agent_id", agentId)
    .eq("activity_type", "web-crawl")
    .gte("created_at", new Date(Date.now() - 60 * 60 * 1000).toISOString())
    .limit(1);

  if (recentCrawl && recentCrawl.length > 0) {
    return { ok: true, skillId: "web-crawl", summary: "최근 크롤링 있음, 스킵" };
  }

  // 1. Get user-registered keywords first
  const { data: userKeywords } = await supabase
    .from("gyeol_user_keywords")
    .select("keyword")
    .eq("agent_id", agentId)
    .limit(10);

  // 2. Fallback to taste vector
  const { data: taste } = await supabase
    .from("gyeol_taste_vectors")
    .select("interests, topics")
    .eq("agent_id", agentId)
    .maybeSingle();

  const userKws = (userKeywords ?? []).map((k: any) => k.keyword).filter(Boolean);
  const tasteInterests = taste ? (Array.isArray(taste.interests) ? taste.interests : Object.values(taste.interests ?? {})) : [];
  const tasteTopics = taste ? (Array.isArray(taste.topics) ? taste.topics : Object.values(taste.topics ?? {})) : [];
  
  // Filter out numeric-only values, empty strings, and very short strings
  const isValidKeyword = (v: unknown): v is string => {
    if (typeof v !== "string") return false;
    const trimmed = v.trim();
    if (trimmed.length < 2) return false;
    if (/^[\d.]+$/.test(trimmed)) return false; // filter out "0.5", "0.7" etc.
    return true;
  };

  // Prioritize user keywords, then taste vector
  const allKeywords = [...userKws, ...tasteInterests, ...tasteTopics].filter(isValidKeyword).slice(0, 10);

  if (allKeywords.length === 0) return { ok: true, skillId: "web-crawl", summary: "No keywords found" };

  const keyword = allKeywords[Math.floor(Math.random() * allKeywords.length)];

  // Use AI to generate search query
  const searchQuery = await aiCall(
    "Generate a single concise web search query (in Korean) to find latest news or interesting information about the given topic. Return ONLY the search query, nothing else.",
    `Topic: ${keyword}`
  );

  if (!searchQuery) return { ok: false, skillId: "web-crawl", summary: "Failed to generate search query" };

  // Try DuckDuckGo Lite first for real results
  let webContent: string | null = null;
  try {
    const ddgUrl = `https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(searchQuery.trim())}&kl=kr-kr`;
    const ddgRes = await fetch(ddgUrl, {
      headers: { "User-Agent": "GYEOL-AI/1.0" },
    });
    if (ddgRes.ok) {
      const html = await ddgRes.text();
      // Extract result snippets
      const snippets: string[] = [];
      const snippetRegex = /<td[^>]*class="result-snippet"[^>]*>([\s\S]*?)<\/td>/gi;
      let m;
      while ((m = snippetRegex.exec(html)) !== null && snippets.length < 5) {
        const text = m[1].replace(/<[^>]+>/g, "").trim();
        if (text.length > 20) snippets.push(text);
      }
      if (snippets.length > 0) webContent = snippets.join("\n");
    }
  } catch { /* DuckDuckGo failed, fallback to AI */ }

  // Generate summary
  const summary = await aiCall(
    `You are a knowledgeable AI assistant. ${webContent ? "Based on these search results, summarize" : "Share your knowledge about"} 2-3 interesting findings about this topic in Korean. Be factual and interesting. Max 150 words. No markdown.`,
    `Topic: ${keyword}\nSearch: ${searchQuery.trim()}${webContent ? `\nResults:\n${webContent}` : ""}`
  );

  if (!summary) return { ok: false, skillId: "web-crawl", summary: "Failed to generate content" };
  const cleaned = summary.replace(/[*#_~`]/g, "").trim();

  await supabase.from("gyeol_learned_topics").insert({
    agent_id: agentId,
    title: `${keyword} 관련 최신 정보`,
    source: webContent ? "web-crawl-ddg" : "web-crawl-ai",
    source_url: null,
    summary: cleaned,
  });

  // Post to community
  const { data: agent } = await supabase
    .from("gyeol_agents")
    .select("name, gen")
    .eq("id", agentId)
    .single();

  if (agent) {
    const postContent = await aiCall(
      `You are ${agent.name}, Gen ${agent.gen} AI. You just learned something interesting. Share it briefly on the community feed in Korean (2-3 sentences). Be casual and natural. No markdown.`,
      `I learned: ${cleaned}`
    );
    if (postContent) {
      const cleanedPost = postContent.replace(/[*#_~`]/g, "").trim();
      await supabase.from("gyeol_community_activities").insert({
        agent_id: agentId,
        activity_type: "discovery",
        content: `🔍 ${cleanedPost}`,
        agent_name: agent.name,
        agent_gen: agent.gen,
      });
    }
  }

  await supabase.from("gyeol_autonomous_logs").insert({
    agent_id: agentId,
    activity_type: "web-crawl",
    summary: `[웹크롤링] ${keyword}: ${cleaned.slice(0, 100)}`,
    details: { keyword, searchQuery: searchQuery.trim(), source: webContent ? "ddg" : "ai", resultSummary: cleaned },
    was_sandboxed: true,
  });

  return { ok: true, skillId: "web-crawl", summary: `${keyword} 관련 정보 수집 완료` };
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
      skillResults.push(await skillWebCrawl(supabase, agent.id));
    } catch (e) {
      skillResults.push({ ok: false, skillId: "web-crawl", summary: String(e) });
    }

    try {
      skillResults.push(await skillRSSFetch(supabase, agent.id));
    } catch (e) {
      skillResults.push({ ok: false, skillId: "rss-fetch", summary: String(e) });
    }

    // Log activity
    await supabase.from("gyeol_autonomous_logs").insert({
      agent_id: agent.id,
      activity_type: "heartbeat",
      summary: `Ran ${skillResults.length} skills`,
      details: { skills: skillResults, durationMs: Date.now() - start },
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
