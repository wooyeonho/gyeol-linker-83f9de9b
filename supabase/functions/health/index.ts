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

    const start = Date.now();
    const { count: agentCount } = await supabase.from("gyeol_agents").select("id", { count: "exact", head: true });
    const dbLatency = Date.now() - start;

    const { data: killSwitch } = await supabase.from("gyeol_system_state").select("kill_switch").eq("id", "global").maybeSingle();

    const { count: errorCount } = await supabase.from("gyeol_audit_logs")
      .select("id", { count: "exact", head: true })
      .eq("action", "error")
      .gte("created_at", new Date(Date.now() - 300000).toISOString());

    const status = (killSwitch as any)?.kill_switch ? "degraded" : dbLatency > 5000 ? "slow" : "healthy";

    return new Response(JSON.stringify({
      status,
      timestamp: new Date().toISOString(),
      db: { connected: true, latencyMs: dbLatency, agents: agentCount ?? 0 },
      killSwitch: (killSwitch as any)?.kill_switch ?? false,
      recentErrors: errorCount ?? 0,
      uptime: Deno.env.get("DENO_DEPLOYMENT_ID") ?? "local",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({
      status: "unhealthy",
      error: String(err),
      timestamp: new Date().toISOString(),
    }), {
      status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
