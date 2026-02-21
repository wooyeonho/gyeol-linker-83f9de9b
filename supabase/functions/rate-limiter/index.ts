import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LIMITS: Record<string, { perMinute: number; perHour: number; perDay: number }> = {
  chat: { perMinute: 20, perHour: 200, perDay: 1000 },
  api: { perMinute: 60, perHour: 600, perDay: 5000 },
  social_write: { perMinute: 5, perHour: 50, perDay: 200 },
  signup: { perMinute: 2, perHour: 5, perDay: 20 },
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const { action = "check", userId, endpoint = "api", identifier } = body;
    const effectiveId = userId || identifier || "anonymous";
    const limits = LIMITS[endpoint] ?? LIMITS.api;
    const now = new Date();

    if (action === "check") {
      const minuteAgo = new Date(now.getTime() - 60000).toISOString();
      const hourAgo = new Date(now.getTime() - 3600000).toISOString();
      const dayAgo = new Date(now.getTime() - 86400000).toISOString();

      const [minRes, hourRes, dayRes] = await Promise.all([
        supabase.from("gyeol_rate_limits").select("count", { count: "exact", head: true }).eq("user_id", effectiveId).eq("endpoint", endpoint).gte("window_start", minuteAgo),
        supabase.from("gyeol_rate_limits").select("count", { count: "exact", head: true }).eq("user_id", effectiveId).eq("endpoint", endpoint).gte("window_start", hourAgo),
        supabase.from("gyeol_rate_limits").select("count", { count: "exact", head: true }).eq("user_id", effectiveId).eq("endpoint", endpoint).gte("window_start", dayAgo),
      ]);

      const minCount = minRes.count ?? 0;
      const hourCount = hourRes.count ?? 0;
      const dayCount = dayRes.count ?? 0;

      let blocked = false;
      let resetSeconds = 60;
      let reason = "";

      if (minCount >= limits.perMinute) { blocked = true; reason = "per_minute"; resetSeconds = 60; }
      else if (hourCount >= limits.perHour) { blocked = true; reason = "per_hour"; resetSeconds = 3600; }
      else if (dayCount >= limits.perDay) { blocked = true; reason = "per_day"; resetSeconds = 86400; }

      if (blocked) {
        return new Response(JSON.stringify({
          allowed: false,
          reason,
          resetSeconds,
          message: `잠시 후 다시 시도해주세요 (${resetSeconds}초 후 초기화)`,
        }), {
          status: 429,
          headers: {
            ...corsHeaders, "Content-Type": "application/json",
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(Math.floor(now.getTime() / 1000) + resetSeconds),
          },
        });
      }

      await supabase.from("gyeol_rate_limits").insert({
        user_id: effectiveId,
        endpoint,
        window_start: now.toISOString(),
        count: 1,
      });

      const remaining = limits.perMinute - minCount - 1;
      return new Response(JSON.stringify({ allowed: true, remaining }), {
        headers: {
          ...corsHeaders, "Content-Type": "application/json",
          "X-RateLimit-Remaining": String(Math.max(0, remaining)),
          "X-RateLimit-Reset": String(Math.floor(now.getTime() / 1000) + 60),
        },
      });
    }

    if (action === "cleanup") {
      const weekAgo = new Date(now.getTime() - 7 * 86400000).toISOString();
      await supabase.from("gyeol_rate_limits").delete().lt("window_start", weekAgo);
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
