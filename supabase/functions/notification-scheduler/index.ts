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
    const action = body.action ?? "process";

    if (action === "process") {
      const now = new Date().toISOString();
      const { data: pending } = await supabase
        .from("gyeol_scheduled_notifications")
        .select("*")
        .lte("scheduled_at", now)
        .eq("sent", false)
        .limit(100);

      if (!pending || pending.length === 0) {
        return new Response(JSON.stringify({ processed: 0 }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let sent = 0;
      for (const notif of pending) {
        try {
          const { data: subs } = await supabase
            .from("gyeol_push_subscriptions")
            .select("subscription")
            .eq("user_id", notif.user_id);

          if (subs && subs.length > 0) {
            for (const sub of subs) {
              const subscription = sub.subscription;
              if (subscription?.endpoint) {
                await fetch(subscription.endpoint, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    title: notif.title,
                    body: notif.body,
                    icon: notif.icon ?? "/icon-192.png",
                    data: notif.data ?? {},
                  }),
                }).catch(() => {});
              }
            }
          }

          await supabase
            .from("gyeol_scheduled_notifications")
            .update({ sent: true, sent_at: now })
            .eq("id", notif.id);
          sent++;
        } catch {
          continue;
        }
      }

      return new Response(JSON.stringify({ processed: sent, total: pending.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "schedule") {
      const authHeader = req.headers.get("authorization");
      if (!authHeader) throw new Error("Unauthorized");
      const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
      if (!user) throw new Error("Unauthorized");

      const { title, bodyText, scheduledAt, notifType = "reminder", data: notifData } = body;

      const { error } = await supabase.from("gyeol_scheduled_notifications").insert({
        user_id: user.id,
        title,
        body: bodyText,
        scheduled_at: scheduledAt,
        notification_type: notifType,
        data: notifData ?? {},
      });

      if (error) throw error;

      return new Response(JSON.stringify({ ok: true }), {
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
