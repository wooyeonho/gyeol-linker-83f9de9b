import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const authHeader = req.headers.get("authorization");
    if (!authHeader) throw new Error("Unauthorized");
    const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!user) throw new Error("Unauthorized");

    const { agentId, importData, mergeStrategy = "append" } = await req.json();
    if (!agentId || !importData) throw new Error("agentId and importData required");

    const results: Record<string, { imported: number; skipped: number }> = {};

    if (importData.conversations && Array.isArray(importData.conversations)) {
      let imported = 0;
      let skipped = 0;
      for (const conv of importData.conversations) {
        const { error } = await supabase.from("gyeol_conversations").insert({
          agent_id: agentId,
          role: conv.role ?? "user",
          content: conv.content,
          created_at: conv.created_at ?? new Date().toISOString(),
        });
        if (error) skipped++;
        else imported++;
      }
      results.conversations = { imported, skipped };
    }

    if (importData.memories && Array.isArray(importData.memories)) {
      let imported = 0;
      let skipped = 0;
      for (const mem of importData.memories) {
        const { error } = await supabase.from("gyeol_memories").insert({
          agent_id: agentId,
          memory_type: mem.memory_type ?? "fact",
          content: mem.content,
          importance: mem.importance ?? 5,
          created_at: mem.created_at ?? new Date().toISOString(),
        });
        if (error) skipped++;
        else imported++;
      }
      results.memories = { imported, skipped };
    }

    await supabase.from("gyeol_audit_logs").insert({
      user_id: user.id, agent_id: agentId, action: "data_import",
      resource_type: "agent", resource_id: agentId,
      details: { mergeStrategy, results },
    });

    return new Response(JSON.stringify({ ok: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
