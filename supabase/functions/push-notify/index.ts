import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { isValidUUID } from "../_shared/validate-uuid.ts";

const _origins = (Deno.env.get("ALLOWED_ORIGINS") ?? "https://gyeol.app").split(",");
function corsHeaders(req: Request) {
  const o = req.headers.get("origin") ?? "";
  if (
    _origins.includes(o) ||
    o.endsWith(".lovable.app") ||
    o.endsWith(".lovableproject.com")
  ) {
    return {
      "Access-Control-Allow-Origin": o,
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    };
  }
  return {
    "Access-Control-Allow-Origin": _origins[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders(req) });

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const ch = corsHeaders(req);

  try {
    const authHeader = req.headers.get("Authorization");
    const isServiceCall = req.headers.get("x-internal-secret") === Deno.env.get("INTERNAL_FUNCTION_SECRET");

    let agentId: string;
    let title: string | undefined;
    let message: string;
    let type: string | undefined;

    if (isServiceCall) {
      const body = await req.json();
      agentId = body.agentId;
      title = body.title;
      message = body.message;
      type = body.type;
    } else {
      if (!authHeader?.startsWith("Bearer ")) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...ch, "Content-Type": "application/json" },
        });
      }
      let userId: string;
      try {
        const payload = JSON.parse(atob(authHeader.replace("Bearer ", "").split(".")[1]));
        userId = payload.sub;
        if (!userId) throw new Error("No sub");
      } catch {
        return new Response(JSON.stringify({ error: "Invalid token" }), {
          status: 401, headers: { ...ch, "Content-Type": "application/json" },
        });
      }

      const body = await req.json();
      agentId = body.agentId;
      title = body.title;
      message = body.message;
      type = body.type;

      if (!agentId || !isValidUUID(agentId)) {
        return new Response(JSON.stringify({ error: "Valid agentId required" }), {
          status: 400, headers: { ...ch, "Content-Type": "application/json" },
        });
      }

      const { data: check } = await supabase.from("gyeol_agents").select("user_id").eq("id", agentId).single();
      if (!check || check.user_id !== userId) {
        return new Response(JSON.stringify({ error: "Access denied" }), {
          status: 403, headers: { ...ch, "Content-Type": "application/json" },
        });
      }
    }

    if (!agentId || !message) {
      return new Response(JSON.stringify({ error: "agentId and message required" }), {
        status: 400, headers: { ...ch, "Content-Type": "application/json" },
      });
    }

    const { data: subs } = await supabase
      .from("gyeol_push_subscriptions")
      .select("endpoint, subscription")
      .eq("agent_id", agentId);

    if (!subs || subs.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: "No subscriptions" }), {
        headers: { ...ch, "Content-Type": "application/json" },
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
          if (res.status === 410) {
            await supabase.from("gyeol_push_subscriptions").delete().eq("endpoint", sub.endpoint);
          }
        }
      } catch {
        failed++;
      }
    }

    await supabase.from("gyeol_proactive_messages").insert({
      agent_id: agentId,
      content: message,
      trigger_reason: type || "push_notification",
      was_sent: sent > 0,
    });

    return new Response(JSON.stringify({ sent, failed, total: subs.length }), {
      headers: { ...ch, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("push-notify error:", e);
    return new Response(JSON.stringify({ error: "Server error" }), {
      status: 500, headers: { ...ch, "Content-Type": "application/json" },
    });
  }
});
