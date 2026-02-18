import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
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
    await supabase.from("gyeol_proactive_messages").insert({
      agent_id: agentId,
      content: msg,
      trigger_reason: `inactive_${Math.round(hoursSinceActive)}h`,
      was_sent: false,
    });
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
