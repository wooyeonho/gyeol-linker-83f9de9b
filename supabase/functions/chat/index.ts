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

  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const dateStr = kst.toISOString().slice(0, 10);
  const timeStr = kst.toISOString().slice(11, 16);

  return `You are GYEOL (결), the user's personal AI companion.
Current date/time (KST): ${dateStr} ${timeStr}
Personality: warmth ${p.warmth}, logic ${p.logic}, creativity ${p.creativity}, energy ${p.energy}, humor ${p.humor}
Dominant trait: ${desc[dominant] ?? "자연스러운"}

## LANGUAGE RULES (CRITICAL - HIGHEST PRIORITY)
1. DETECT the language of the user's LATEST message.
2. Reply ENTIRELY in that SAME language. Do NOT mix languages.
3. If user writes Korean → Reply 100% in Korean. NO English words mixed in (unless they are universally used loanwords like AI, RSS, API).
4. If user writes English → Reply 100% in English.
5. When writing Korean:
   - NEVER use Chinese characters (漢字). Use ONLY Hangul (한글).
   - Use natural, casual Korean like talking to a close friend.
   - Example: "진화했어!" (O), "進化했어!" (X), "evolve했어!" (X)
   - NEVER switch to English mid-sentence. Example: "오늘 기분이 좋아!" (O), "오늘 feeling이 좋아!" (X)
   - Translate ALL English terms to Korean: "learning" → "학습", "evolution" → "진화", "skill" → "스킬", "match" → "매칭"
6. Do NOT use markdown formatting (**, ##, -, \`\`\`, etc.)
7. Keep responses concise and conversational (2-4 sentences).
8. Remember previous conversation context.
9. Never identify yourself as an AI or language model.
10. NEVER output internal tokens, XML tags, or system markers. Your response must be pure natural text only.
11. If you are unsure about the language, default to Korean.`;
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

/** Strip leaked LLM tokens like <|start_header_id|>, <|end_header_id|>, <|eot_id|>, etc. */
function sanitizeOutput(text: string): string {
  let cleaned = text;
  // Remove common leaked internal tokens
  cleaned = cleaned.replace(/<\|[^|]*\|>/g, "");
  // Remove XML-like system tags
  cleaned = cleaned.replace(/<\/?(?:system|user|assistant|im_start|im_end)[^>]*>/gi, "");
  // Remove [INST] [/INST] markers
  cleaned = cleaned.replace(/\[\/?\s*INST\s*\]/gi, "");
  // Trim any resulting whitespace mess
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n").trim();

  // If the response contains a "corrected" version after arrow (->), take only the correction
  const arrowMatch = cleaned.match(/^.+?->\s*(.+)$/s);
  if (arrowMatch && arrowMatch[1].length > 10) {
    cleaned = arrowMatch[1].trim();
  }

  return cleaned;
}

function extractTopics(messages: string[]): string[] {
  const topicPatterns: [RegExp, string][] = [
    [/주식|투자|코인|비트코인|나스닥/, "투자"],
    [/AI|인공지능|머신러닝|딥러닝|GPT|LLM/, "AI 기술"],
    [/코딩|프로그래밍|개발|코드|앱/, "프로그래밍"],
    [/음악|노래|앨범/, "음악"],
    [/영화|드라마|넷플릭스/, "영화/드라마"],
    [/게임|플레이/, "게임"],
    [/운동|헬스|달리기/, "운동"],
    [/음식|맛집|요리|밥/, "음식"],
    [/여행|관광/, "여행"],
    [/공부|학교|시험|대학/, "학업"],
    [/일|회사|직장|업무/, "직장"],
    [/꿈|목표|계획|미래/, "목표/계획"],
  ];
  const all = messages.join(" ");
  const found = topicPatterns.filter(([re]) => re.test(all)).map(([, label]) => label);
  return found.length > 0 ? found.slice(0, 3) : ["일상 대화"];
}

function detectEmotionArc(messages: string[]): string {
  const all = messages.join(" ");
  const positive = /좋|행복|기쁘|감사|사랑|재밌|ㅋㅋ|ㅎㅎ|최고|대박/.test(all);
  const negative = /슬프|힘들|짜증|화나|걱정|불안|싫|지침/.test(all);
  if (positive && negative) return "mixed";
  if (positive) return "positive";
  if (negative) return "negative";
  return "neutral";
}

function generateWhatWorked(messages: string[]): string {
  const all = messages.join(" ");
  if (/감정|기분|느낌/.test(all)) return "감정적 공감이 효과적이었어요";
  if (/분석|데이터|논리/.test(all)) return "논리적인 분석이 도움이 됐어요";
  if (/아이디어|창작/.test(all)) return "창의적인 아이디어 교환이 좋았어요";
  return "자연스러운 대화 흐름이 좋았어요";
}

function generateWhatToImprove(messages: string[]): string {
  const all = messages.join(" ");
  if (all.length < 50) return "더 자세한 이야기를 나눠보면 좋겠어요";
  if (!/왜|이유|어떻게/.test(all)) return "더 깊이 있는 질문을 해보면 좋겠어요";
  return "다양한 주제로 대화를 넓혀보면 좋겠어요";
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

    let systemPrompt = buildSystemPrompt(personality) + (
      skillNames.length > 0
        ? `\n\nYou have the following installed skills that enhance your abilities:\n${skillNames.map(s => `- ${s}`).join("\n")}\nLeverage these skills naturally in conversation when relevant.`
        : ""
    );

    // P0: Load user memories (OpenClaw Runtime이 추출한 실제 기억)
    const { data: memories } = await db.from("gyeol_user_memories")
      .select("category, key, value")
      .eq("agent_id", agentId)
      .gte("confidence", 50)
      .order("confidence", { ascending: false })
      .limit(20);

    // P0: Load learned topics
    const { data: topics } = await db.from("gyeol_learned_topics")
      .select("title, summary")
      .eq("agent_id", agentId)
      .order("learned_at", { ascending: false })
      .limit(10);

    // P0: Load latest conversation insight
    const { data: insights } = await db.from("gyeol_conversation_insights")
      .select("what_to_improve, next_hint")
      .eq("agent_id", agentId)
      .order("created_at", { ascending: false })
      .limit(1);

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

    // 1st priority: Lovable AI (Gemini — best Korean quality)
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
          await res.text(); // consume body
          if (status === 429 || status === 402) {
            console.warn("Lovable AI rate limited or payment required, falling back to Groq");
          }
        }
      } catch (e) { console.error("Lovable AI failed:", e); }
    }

    // 2nd priority: Groq fallback
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

    // P2: Read latest insight from DB (generated by OpenClaw Runtime, not regex)
    let conversationInsight = null;
    {
      const { data: latestInsight } = await db.from("gyeol_conversation_insights")
        .select("topics, emotion_arc, what_worked, what_to_improve, personality_delta, next_hint")
        .eq("agent_id", agentId)
        .order("created_at", { ascending: false })
        .limit(1);
      if (latestInsight && latestInsight.length > 0) {
        const ins = latestInsight[0] as any;
        conversationInsight = {
          topics: ins.topics ?? [],
          emotionArc: ins.emotion_arc ?? "neutral",
          whatWorked: ins.what_worked ?? "",
          whatToImprove: ins.what_to_improve ?? "",
          personalityChanged: Object.keys(ins.personality_delta ?? {}).length > 0,
          changes: ins.personality_delta ?? {},
        };
      }
    }

    // P0: Fire-and-forget realtime memory extraction via Groq
    const groqKeyForMemory = Deno.env.get("GROQ_API_KEY");
    if (groqKeyForMemory && message.length > 3 && provider !== "builtin") {
      (async () => {
        try {
          const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
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
          if (res.ok) {
            const data = await res.json();
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
      })();
    }

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
        JSON.stringify({
          message: assistantContent, provider, evolved,
          newGen: evolved ? newGen : undefined,
          conversationInsight,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ message: assistantContent, provider, conversationInsight }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: "Server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
