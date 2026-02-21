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

    const { action = "overview" } = await req.json();

    if (action === "overview") {
      const [agentsRes, convsRes, postsRes, reportsRes, skinsRes] = await Promise.all([
        supabase.from("gyeol_agents").select("id", { count: "exact" }),
        supabase.from("gyeol_conversations").select("id", { count: "exact" }),
        supabase.from("gyeol_moltbook_posts").select("id", { count: "exact" }),
        supabase.from("gyeol_reports").select("id, status", { count: "exact" }).eq("status", "pending"),
        supabase.from("gyeol_market_skins").select("id", { count: "exact" }),
      ]);

      return new Response(JSON.stringify({
        totalAgents: agentsRes.count ?? 0,
        totalConversations: convsRes.count ?? 0,
        totalPosts: postsRes.count ?? 0,
        pendingReports: reportsRes.count ?? 0,
        totalSkins: skinsRes.count ?? 0,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "pending-reports") {
      const { data } = await supabase.from("gyeol_reports")
        .select("*").eq("status", "pending").order("created_at", { ascending: false }).limit(50);
      return new Response(JSON.stringify({ reports: data ?? [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "pending-approvals") {
      const { data } = await supabase.from("gyeol_market_approvals")
        .select("*").eq("status", "pending").order("submitted_at", { ascending: false }).limit(50);
      return new Response(JSON.stringify({ approvals: data ?? [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "resolve-report") {
      const { reportId, resolution } = await req.json();
      await supabase.from("gyeol_reports").update({
        status: resolution, reviewed_by: user.id, resolved_at: new Date().toISOString(),
      }).eq("id", reportId);
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
