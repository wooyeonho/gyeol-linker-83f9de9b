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
    // Save to DB
    await supabase.from("gyeol_proactive_messages").insert({
      agent_id: agentId,
      content: msg,
      trigger_reason: `inactive_${Math.round(hoursSinceActive)}h`,
      was_sent: false,
    });

    // Auto-send via Telegram if linked
    const { data: link } = await supabase
      .from("gyeol_telegram_links")
      .select("telegram_chat_id")
      .eq("agent_id", agentId)
      .limit(1)
      .maybeSingle();

    if (link?.telegram_chat_id) {
      const sent = await sendTelegram(link.telegram_chat_id, `💬 ${agent.name}\n\n${msg}`);
      if (sent) {
        await supabase.from("gyeol_proactive_messages")
          .update({ was_sent: true })
          .eq("agent_id", agentId)
          .eq("was_sent", false)
          .order("created_at", { ascending: false })
          .limit(1);
      }
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
