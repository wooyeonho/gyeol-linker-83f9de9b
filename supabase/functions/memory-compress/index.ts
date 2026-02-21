import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { isValidUUID } from "../_shared/validate-uuid.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    let userId: string;
    try {
      const payload = JSON.parse(atob(authHeader.replace("Bearer ", "").split(".")[1]));
      userId = payload.sub;
      if (!userId) throw new Error("No sub");
    } catch {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { agentId, windowSize = 100, keepRecent = 20 } = await req.json();
    if (!agentId || !isValidUUID(agentId)) {
      return new Response(JSON.stringify({ error: "Valid agentId required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: agent } = await db.from("gyeol_agents").select("user_id, name").eq("id", agentId).single();
    if (!agent || agent.user_id !== userId) {
      return new Response(JSON.stringify({ error: "Access denied" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: messages } = await db.from("gyeol_conversations")
      .select("id, role, content, created_at")
      .eq("agent_id", agentId)
      .order("created_at", { ascending: false })
      .limit(windowSize);

    if (!messages || messages.length <= keepRecent) {
      return new Response(JSON.stringify({ compressed: false, reason: "Not enough messages to compress" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const olderMessages = messages.slice(keepRecent).reverse();
    const transcript = olderMessages.map((m: any) =>
      `${m.role === 'user' ? 'User' : agent.name}: ${m.content.slice(0, 150)}`
    ).join('\n');

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    let summary: string;

    if (LOVABLE_API_KEY) {
      const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-lite",
          messages: [
            {
              role: "system",
              content: `You are a memory compressor for an AI companion named ${agent.name}. Compress the following conversation into a concise memory summary that preserves:
1. Key facts about the user (name, preferences, interests)
2. Important decisions or agreements made
3. Emotional context and relationship dynamics
4. Topics discussed and conclusions reached
Keep it under 300 words. Write in the same language as the conversation. Use bullet points for clarity.`
            },
            { role: "user", content: `Compress this conversation into memory:\n\n${transcript.slice(0, 6000)}` },
          ],
        }),
      });

      if (aiRes.ok) {
        const aiData = await aiRes.json();
        summary = aiData.choices?.[0]?.message?.content ?? "";
      } else {
        const userMsgs = olderMessages.filter((m: any) => m.role === 'user');
        const topics = userMsgs.slice(0, 5).map((m: any) => m.content.slice(0, 40)).join('; ');
        summary = `${olderMessages.length} messages compressed. Topics: ${topics}`;
      }
    } else {
      const userMsgs = olderMessages.filter((m: any) => m.role === 'user');
      const topics = userMsgs.slice(0, 5).map((m: any) => m.content.slice(0, 40)).join('; ');
      summary = `${olderMessages.length} messages compressed. Topics: ${topics}`;
    }

    await db.from("gyeol_memories").insert({
      agent_id: agentId,
      user_id: userId,
      memory_type: "conversation_summary",
      content: summary,
      metadata: {
        compressed_count: olderMessages.length,
        time_range: {
          from: olderMessages[0].created_at,
          to: olderMessages[olderMessages.length - 1].created_at,
        },
      },
      confidence: 0.9,
    }).then(() => {});

    const idsToArchive = olderMessages.map((m: any) => m.id);
    await db.from("gyeol_conversations")
      .update({ is_archived: true })
      .in("id", idsToArchive);

    return new Response(JSON.stringify({
      compressed: true,
      messagesCompressed: olderMessages.length,
      messagesKept: keepRecent,
      summaryLength: summary.length,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("memory-compress error:", e);
    return new Response(JSON.stringify({ error: "Server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
