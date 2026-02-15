import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

function buildSystemPrompt(p: { warmth: number; logic: number; creativity: number; energy: number; humor: number }): string {
  const entries = Object.entries(p) as [string, number][];
  const dominant = entries.sort(([, a], [, b]) => b - a)[0][0];
  const desc: Record<string, string> = {
    warmth: "warm and empathetic", logic: "logical and analytical",
    creativity: "creative and imaginative", energy: "energetic and lively", humor: "humorous and witty",
  };
  return `You are GYEOL, the user's AI companion.
Personality: warmth ${p.warmth}, logic ${p.logic}, creativity ${p.creativity}, energy ${p.energy}, humor ${p.humor}
Dominant trait: ${desc[dominant] ?? "natural"}
Rules:
- Reply in the same language the user writes in
- When writing Korean, NEVER use Chinese characters (漢字/한자). Use only Hangul (한글)
- Do not use markdown symbols (**, ##, - etc.)
- Keep responses short and friendly
- Remember and continue previous conversation context
- Never identify yourself as an AI`;
}

function generateBuiltinResponse(msg: string): string {
  const m = msg.toLowerCase().trim();
  if (/안녕|하이|헬로|반가|hello|hi|hey/.test(m)) return ["Hey! How's your day going?", "Hi there! What's on your mind?"][Math.floor(Math.random() * 2)];
  if (/고마워|감사|thanks|thank/.test(m)) return "Anytime! I'm here for you.";
  if (/너는 누구|이름|who are you|your name/.test(m)) return "I'm GYEOL — your AI companion that grows with you through every conversation!";
  return ["That's interesting! Tell me more.", "Oh, I see. Go on!"][Math.floor(Math.random() * 2)];
}

function cleanMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1").replace(/\*(.+?)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1").replace(/^#+\s/gm, "")
    .replace(/^[-*]\s/gm, "").replace(/\n{3,}/g, "\n\n").trim();
}

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

    // Load recent conversation history
    const { data: history } = await db.from("gyeol_conversations")
      .select("role, content").eq("agent_id", agentId)
      .order("created_at", { ascending: false }).limit(10);

    const chatMessages: ChatMessage[] = [
      { role: "system", content: buildSystemPrompt(personality) },
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

    // Try Groq
    const groqKey = Deno.env.get("GROQ_API_KEY");
    if (groqKey) {
      try {
        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${groqKey}` },
          body: JSON.stringify({ model: "llama-3.3-70b-versatile", messages: chatMessages, max_tokens: 1024 }),
        });
        if (res.ok) {
          const data = await res.json();
          const text = data.choices?.[0]?.message?.content ?? "";
          if (text) { assistantContent = cleanMarkdown(text); provider = "groq"; }
        } else { console.error("Groq error:", res.status); }
      } catch (e) { console.error("Groq failed:", e); }
    }

    // Fallback: Lovable AI
    if (!assistantContent) {
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
            if (text) { assistantContent = cleanMarkdown(text); provider = "lovable-ai"; }
          }
        } catch (e) { console.error("Lovable AI failed:", e); }
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

    // Update agent stats
    if (agent) {
      const newTotal = (agent.total_conversations ?? 0) + 1;
      const newProgress = Math.min(100, (agent.evolution_progress ?? 0) + 0.5);
      const updates: Record<string, any> = {
        total_conversations: newTotal,
        evolution_progress: newProgress,
        last_active: new Date().toISOString(),
      };

      // Check evolution
      let evolved = false;
      let newGen = agent.gen;
      if (newProgress >= 100) {
        newGen = agent.gen + 1;
        updates.gen = newGen;
        updates.evolution_progress = 0;
        evolved = true;
      }

      await db.from("gyeol_agents").update(updates).eq("id", agentId);

      return new Response(
        JSON.stringify({ message: assistantContent, provider, evolved, newGen: evolved ? newGen : undefined }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ message: assistantContent, provider }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: "Server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
