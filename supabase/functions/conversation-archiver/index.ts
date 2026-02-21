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

    const body = await req.json();
    const { action = "archive", daysOld = 30 } = body;

    if (action === "archive") {
      const cutoff = new Date(Date.now() - daysOld * 86400000).toISOString();
      const { data: old, error } = await supabase
        .from("gyeol_conversations")
        .select("*")
        .lt("created_at", cutoff)
        .limit(500);

      if (error) throw error;
      if (!old || old.length === 0) {
        return new Response(JSON.stringify({ archived: 0, message: "No old conversations to archive" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const archiveRows = old.map((c: any) => ({
        id: c.id,
        agent_id: c.agent_id,
        role: c.role,
        content: c.content,
        metadata: c.metadata || {},
        original_created_at: c.created_at,
      }));

      const { error: insertErr } = await supabase
        .from("gyeol_conversation_archive")
        .upsert(archiveRows, { onConflict: "id" });
      if (insertErr) throw insertErr;

      const ids = old.map((c: any) => c.id);
      const { error: deleteErr } = await supabase
        .from("gyeol_conversations")
        .delete()
        .in("id", ids);
      if (deleteErr) throw deleteErr;

      return new Response(JSON.stringify({ archived: old.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Unknown action");
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
