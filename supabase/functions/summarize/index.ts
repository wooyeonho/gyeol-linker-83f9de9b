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

    const { agentId, limit } = await req.json();
    if (!agentId || !isValidUUID(agentId)) {
      return new Response(JSON.stringify({ error: "Valid agentId required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Verify ownership
    const { data: agent } = await db.from("gyeol_agents").select("user_id, name").eq("id", agentId).single();
    if (!agent || agent.user_id !== userId) {
      return new Response(JSON.stringify({ error: "Access denied" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch recent conversations
    const msgLimit = Math.min(limit ?? 50, 100);
    const { data: messages } = await db.from("gyeol_conversations")
      .select("role, content, created_at")
      .eq("agent_id", agentId)
      .order("created_at", { ascending: false })
      .limit(msgLimit);

    if (!messages || messages.length === 0) {
      return new Response(JSON.stringify({ summary: "No conversations to summarize." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Reverse to chronological order
    const chronological = messages.reverse();
    const transcript = chronological.map((m: any) =>
      `${m.role === 'user' ? 'User' : agent.name}: ${m.content.slice(0, 200)}`
    ).join('\n');

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      // Fallback: simple extractive summary
      const userMsgs = chronological.filter((m: any) => m.role === 'user').map((m: any) => m.content);
      const topics = userMsgs.slice(0, 5).map((c: string) => c.slice(0, 50)).join(', ');
      return new Response(JSON.stringify({
        summary: `${messages.length} messages exchanged. Topics: ${topics}`,
        messageCount: messages.length,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

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
            content: "You are a conversation summarizer. Summarize the following chat transcript concisely in 3-5 bullet points. Include key topics, emotional tone, and any decisions made. Respond in the same language as the conversation. Keep it under 200 words."
          },
          { role: "user", content: `Summarize this conversation:\n\n${transcript.slice(0, 4000)}` },
        ],
      }),
    });

    if (!aiRes.ok) {
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, try again later" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const userMsgs = chronological.filter((m: any) => m.role === 'user').map((m: any) => m.content);
      const topics = userMsgs.slice(0, 5).map((c: string) => c.slice(0, 50)).join(', ');
      return new Response(JSON.stringify({
        summary: `${messages.length} messages. Topics: ${topics}`,
        messageCount: messages.length,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const aiData = await aiRes.json();
    const summary = aiData.choices?.[0]?.message?.content ?? "Summary unavailable.";

    return new Response(JSON.stringify({
      summary,
      messageCount: messages.length,
      timeRange: {
        from: chronological[0].created_at,
        to: chronological[chronological.length - 1].created_at,
      },
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("summarize error:", e);
    return new Response(JSON.stringify({ error: "Server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
