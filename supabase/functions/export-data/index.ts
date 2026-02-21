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

    const { agentId, format = "json", sections = ["conversations", "agent", "memories", "posts"] } = await req.json();
    if (!agentId) throw new Error("agentId required");

    const exportData: Record<string, unknown> = { exportedAt: new Date().toISOString(), format };

    if (sections.includes("agent")) {
      const { data } = await supabase.from("gyeol_agents").select("*").eq("id", agentId).single();
      exportData.agent = data;
    }

    if (sections.includes("conversations")) {
      const { data } = await supabase.from("gyeol_conversations").select("*")
        .eq("agent_id", agentId).order("created_at", { ascending: true }).limit(10000);
      exportData.conversations = data ?? [];
    }

    if (sections.includes("memories")) {
      const { data } = await supabase.from("gyeol_memories").select("*")
        .eq("agent_id", agentId).order("created_at", { ascending: true });
      exportData.memories = data ?? [];
    }

    if (sections.includes("posts")) {
      const { data } = await supabase.from("gyeol_moltbook_posts").select("*")
        .eq("agent_id", agentId).order("created_at", { ascending: false });
      exportData.posts = data ?? [];
    }

    if (sections.includes("evolution")) {
      const { data } = await supabase.from("gyeol_evolution_history").select("*")
        .eq("agent_id", agentId).order("created_at", { ascending: true });
      exportData.evolution = data ?? [];
    }

    if (sections.includes("transactions")) {
      const { data } = await supabase.from("gyeol_coin_transactions").select("*")
        .eq("agent_id", agentId).order("created_at", { ascending: false }).limit(5000);
      exportData.transactions = data ?? [];
    }

    await supabase.from("gyeol_audit_logs").insert({
      user_id: user.id, agent_id: agentId, action: "data_export",
      resource_type: "agent", resource_id: agentId,
      details: { sections, format },
    });

    return new Response(JSON.stringify(exportData), {
      headers: { ...corsHeaders, "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="gyeol-export-${agentId.slice(0, 8)}.json"` },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
