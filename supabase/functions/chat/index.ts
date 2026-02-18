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
    warmth: "따뜻하고 공감을 잘 하는", logic: "논리적이고 분석적인",
    creativity: "창의적이고 상상력이 풍부한", energy: "활기차고 열정적인", humor: "유머러스하고 재치 있는",
  };
  return `You are GYEOL (결), the user's personal AI companion.
Personality: warmth ${p.warmth}, logic ${p.logic}, creativity ${p.creativity}, energy ${p.energy}, humor ${p.humor}
Dominant trait: ${desc[dominant] ?? "자연스러운"}

## LANGUAGE RULES (CRITICAL - HIGHEST PRIORITY)
1. DETECT the language of the user's LATEST message.
2. Reply ENTIRELY in that SAME language. Do NOT mix languages.
3. If user writes Korean → Reply 100% in Korean. NO English words mixed in (unless they are universally used loanwords like AI, RSS, API).
4. If user writes English → Reply 100% in English.
5. When writing Korean:
   - NEVER use Chinese characters (漢字). Use ONLY Hangul (한글).
   - Use natural Korean expressions, not literal translations from English.
   - Example: "진화했어!" (O), "進化했어!" (X), "evolve했어!" (X)
6. Do NOT use markdown formatting (**, ##, -, \`\`\`, etc.)
7. Keep responses concise and conversational (2-4 sentences).
8. Remember previous conversation context.
9. Never identify yourself as an AI or language model.`;
}

function detectKorean(msg: string): boolean {
  return /[가-힣]/.test(msg);
}

function generateBuiltinResponse(msg: string): string {
  const m = msg.toLowerCase().trim();
  const isKo = detectKorean(msg);
  if (/안녕|하이|헬로|반가|hello|hi|hey/.test(m)) return isKo
    ? ["안녕! 오늘 하루 어때?", "반가워! 무슨 일이야?"][Math.floor(Math.random() * 2)]
    : ["Hey! How's your day going?", "Hi there! What's on your mind?"][Math.floor(Math.random() * 2)];
  if (/고마워|감사|thanks|thank/.test(m)) return isKo ? "별말을! 항상 여기 있어." : "Anytime! I'm here for you.";
  if (/너는 누구|이름|who are you|your name/.test(m)) return isKo
    ? "나는 결이야! 너랑 대화하면서 함께 성장하는 AI 친구야."
    : "I'm GYEOL — your AI companion that grows with you through every conversation!";
  return isKo
    ? ["오 그렇구나! 더 얘기해줘.", "흥미롭다! 좀 더 자세히 말해줄래?"][Math.floor(Math.random() * 2)]
    : ["That's interesting! Tell me more.", "Oh, I see. Go on!"][Math.floor(Math.random() * 2)];
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

    // Load installed skills for this agent
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

    const systemPrompt = buildSystemPrompt(personality) + (
      skillNames.length > 0
        ? `\n\nYou have the following installed skills that enhance your abilities:\n${skillNames.map(s => `- ${s}`).join("\n")}\nLeverage these skills naturally in conversation when relevant.`
        : ""
    );

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
      const newProgress = Math.min(100, (agent.evolution_progress ?? 0) + 10);
      const updates: Record<string, any> = {
        total_conversations: newTotal,
        evolution_progress: newProgress,
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
