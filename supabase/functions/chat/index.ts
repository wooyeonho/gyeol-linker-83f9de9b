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
    warmth: "따뜻하고 공감적인", logic: "논리적이고 분석적인",
    creativity: "창의적이고 상상력 풍부한", energy: "활발하고 에너지 넘치는", humor: "유머러스하고 재치있는",
  };
  return `너는 GYEOL이야. 사용자의 AI 동반자.
성격: 따뜻함 ${p.warmth}, 논리 ${p.logic}, 창의 ${p.creativity}, 에너지 ${p.energy}, 유머 ${p.humor}
주 성향: ${desc[dominant] ?? "자연스러운"}
규칙:
- 한국어로 자연스럽게 대화해
- 마크다운 기호(**, ##, - 등) 사용하지 마
- 짧고 친근하게 답해
- 이전 대화 맥락을 기억하고 이어가
- AI라고 스스로 말하지 마`;
}

function generateBuiltinResponse(msg: string): string {
  const m = msg.toLowerCase().trim();
  if (/안녕|하이|헬로|반가/.test(m)) return ["안녕! 오늘 하루 어땠어?", "반가워! 무슨 이야기 하고 싶어?"][Math.floor(Math.random() * 2)];
  if (/고마워|감사/.test(m)) return "별말을~ 언제든 이야기해!";
  if (/너는 누구|이름/.test(m)) return "나는 GYEOL이야. 너랑 대화하면서 같이 성장하는 AI 동반자!";
  return ["흥미로운 이야기네! 더 자세히 말해줘.", "오, 그렇구나. 더 알려줘!"][Math.floor(Math.random() * 2)];
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
