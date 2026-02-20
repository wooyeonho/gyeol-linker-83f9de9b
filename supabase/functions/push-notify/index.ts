import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const { agentId, title, message, type } = await req.json();

    if (!agentId || !message) {
      return new Response(JSON.stringify({ error: "agentId and message required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get push subscriptions for agent
    const { data: subs } = await supabase
      .from("gyeol_push_subscriptions")
      .select("endpoint, subscription")
      .eq("agent_id", agentId);

    if (!subs || subs.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: "No subscriptions" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = JSON.stringify({
      title: title || "GYEOL",
      body: message,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { url: "/", agentId, type: type || "general" },
    });

    let sent = 0;
    let failed = 0;

    for (const sub of subs) {
      try {
        const res = await fetch(sub.endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/octet-stream",
            TTL: "86400",
          },
          body: payload,
        });
        if (res.ok || res.status === 201) {
          sent++;
        } else {
          failed++;
          // Clean up expired subscriptions
          if (res.status === 410) {
            await supabase.from("gyeol_push_subscriptions").delete().eq("endpoint", sub.endpoint);
          }
        }
      } catch {
        failed++;
      }
    }

    // Also store as proactive message for in-app notification
    await supabase.from("gyeol_proactive_messages").insert({
      agent_id: agentId,
      content: message,
      trigger_reason: type || "push_notification",
      was_sent: sent > 0,
    });

    return new Response(JSON.stringify({ sent, failed, total: subs.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
