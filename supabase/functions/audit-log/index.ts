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

    const body = await req.json();

    if (body.action === "log") {
      const { agentId, eventAction, resourceType, resourceId, details } = body;
      await supabase.from("gyeol_audit_logs").insert({
        user_id: user.id,
        agent_id: agentId,
        action: eventAction,
        resource_type: resourceType,
        resource_id: resourceId,
        ip_address: req.headers.get("x-forwarded-for") ?? req.headers.get("cf-connecting-ip"),
        user_agent: req.headers.get("user-agent"),
        details: details ?? {},
      });
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (body.action === "query") {
      const { agentId, limit = 50, offset = 0, eventFilter } = body;
      let query = supabase.from("gyeol_audit_logs").select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (agentId) query = query.eq("agent_id", agentId);
      if (eventFilter) query = query.eq("action", eventFilter);

      const { data, error } = await query;
      if (error) throw error;

      return new Response(JSON.stringify({ logs: data ?? [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Unknown action. Use 'log' or 'query'");
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
