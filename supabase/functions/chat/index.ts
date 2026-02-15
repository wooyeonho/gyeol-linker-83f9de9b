import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

const MODELS: Record<string, string> = {
  groq: "llama-3.3-70b-versatile",
};

function buildSystemPrompt(personality: {
  warmth: number;
  logic: number;
  creativity: number;
  energy: number;
  humor: number;
}): string {
  const { warmth, logic, creativity, energy, humor } = personality;
  const entries = Object.entries(personality) as [string, number][];
  const dominant = entries.sort(([, a], [, b]) => b - a)[0][0];
  const traitDesc: Record<string, string> = {
    warmth: "따뜻하고 공감적인",
    logic: "논리적이고 분석적인",
    creativity: "창의적이고 상상력 풍부한",
    energy: "활발하고 에너지 넘치는",
    humor: "유머러스하고 재치있는",
  };
  const style = traitDesc[dominant] ?? "자연스러운";

  return `너는 GYEOL이야. 사용자의 AI 동반자.
성격: 따뜻함 ${warmth}, 논리 ${logic}, 창의 ${creativity}, 에너지 ${energy}, 유머 ${humor}
주 성향: ${style}
규칙:
- 한국어로 자연스럽게 대화해
- 마크다운 기호(**, ##, - 등) 사용하지 마
- 짧고 친근하게 답해
- 이전 대화 맥락을 기억하고 이어가
- AI라고 스스로 말하지 마`;
}

function generateBuiltinResponse(userMessage: string): string {
  const m = userMessage.toLowerCase().trim();
  if (/안녕|하이|헬로|반가/.test(m)) {
    const g = ["안녕! 오늘 하루 어땠어?", "반가워! 무슨 이야기 하고 싶어?", "안녕~ 오늘도 좋은 하루 보내고 있어?"];
    return g[Math.floor(Math.random() * g.length)];
  }
  if (/고마워|감사|땡큐|thank/.test(m)) return "별말을~ 언제든 이야기해!";
  if (/너는 누구|이름|뭐야|정체/.test(m)) return "나는 GYEOL이야. 너랑 대화하면서 같이 성장하는 AI 동반자!";
  const defaults = ["흥미로운 이야기네! 더 자세히 말해줘.", "오, 그렇구나. 더 알려줘!", "재밌다! 다른 이야기도 해줘."];
  return defaults[Math.floor(Math.random() * defaults.length)];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { agentId, message } = await req.json();
    if (!agentId || typeof message !== "string") {
      return new Response(JSON.stringify({ error: "agentId and message required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const personality = { warmth: 50, logic: 50, creativity: 50, energy: 50, humor: 50 };
    const systemPrompt = buildSystemPrompt(personality);

    const chatMessages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: message },
    ];

    let assistantContent = "";
    let provider = "builtin";

    // Try Groq first
    const groqKey = Deno.env.get("GROQ_API_KEY");
    if (groqKey) {
      try {
        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${groqKey}`,
          },
          body: JSON.stringify({
            model: MODELS.groq,
            messages: chatMessages,
            max_tokens: 1024,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          const text = data.choices?.[0]?.message?.content ?? "";
          if (text) {
            assistantContent = text
              .replace(/\*\*(.+?)\*\*/g, "$1")
              .replace(/\*(.+?)\*/g, "$1")
              .replace(/`([^`]+)`/g, "$1")
              .replace(/^#+\s/gm, "")
              .replace(/^[-*]\s/gm, "")
              .replace(/\n{3,}/g, "\n\n")
              .trim();
            provider = "groq";
          }
        } else {
          console.error("Groq error:", res.status, await res.text());
        }
      } catch (e) {
        console.error("Groq call failed:", e);
      }
    }

    // Fallback: Lovable AI Gateway
    if (!assistantContent) {
      const lovableKey = Deno.env.get("LOVABLE_API_KEY");
      if (lovableKey) {
        try {
          const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${lovableKey}`,
            },
            body: JSON.stringify({
              model: "google/gemini-3-flash-preview",
              messages: chatMessages,
              max_tokens: 1024,
            }),
          });
          if (res.ok) {
            const data = await res.json();
            const text = data.choices?.[0]?.message?.content ?? "";
            if (text) {
              assistantContent = text.replace(/\*\*(.+?)\*\*/g, "$1").replace(/^#+\s/gm, "").trim();
              provider = "lovable-ai";
            }
          } else {
            console.error("Lovable AI error:", res.status, await res.text());
          }
        } catch (e) {
          console.error("Lovable AI call failed:", e);
        }
      }
    }

    // Final fallback: builtin
    if (!assistantContent) {
      assistantContent = generateBuiltinResponse(message);
      provider = "builtin";
    }

    return new Response(
      JSON.stringify({ message: assistantContent, provider }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("chat error:", e);
    return new Response(
      JSON.stringify({ error: "Server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
