import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

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
    // #4: Cron secret validation
    const url = new URL(req.url);
    const secret = url.searchParams.get("secret") || req.headers.get("x-cron-secret");
    if (secret !== Deno.env.get("CRON_SECRET")) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...ch, "Content-Type": "application/json" },
      });
    }

    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const weekStart = new Date(todayStart);
    const day = weekStart.getDay();
    const diff = day === 0 ? 6 : day - 1;
    weekStart.setDate(weekStart.getDate() - diff);

    let dailyResetCount = 0;
    let weeklyResetCount = 0;
    let created = 0;

    // 1. Reset expired daily quest progress
    const { data: dailyQuests } = await supabase.from("gyeol_quests")
      .select("id").eq("quest_type", "daily").eq("is_active", true);
    const dailyIds = (dailyQuests ?? []).map((q: any) => q.id);

    if (dailyIds.length > 0) {
      const { data: expiredDaily } = await supabase.from("gyeol_quest_progress")
        .select("id").in("quest_id", dailyIds)
        .lt("started_at", todayStart.toISOString()).eq("is_claimed", true);

      if (expiredDaily && expiredDaily.length > 0) {
        await supabase.from("gyeol_quest_progress")
          .update({ current_value: 0, is_completed: false, is_claimed: false, completed_at: null, claimed_at: null, started_at: now.toISOString() })
          .in("id", expiredDaily.map((p: any) => p.id));
        dailyResetCount = expiredDaily.length;
      }
    }

    // 2. Reset expired weekly quest progress
    const { data: weeklyQuests } = await supabase.from("gyeol_quests")
      .select("id").eq("quest_type", "weekly").eq("is_active", true);
    const weeklyIds = (weeklyQuests ?? []).map((q: any) => q.id);

    if (weeklyIds.length > 0) {
      const { data: expiredWeekly } = await supabase.from("gyeol_quest_progress")
        .select("id").in("quest_id", weeklyIds)
        .lt("started_at", weekStart.toISOString()).eq("is_claimed", true);

      if (expiredWeekly && expiredWeekly.length > 0) {
        await supabase.from("gyeol_quest_progress")
          .update({ current_value: 0, is_completed: false, is_claimed: false, completed_at: null, claimed_at: null, started_at: now.toISOString() })
          .in("id", expiredWeekly.map((p: any) => p.id));
        weeklyResetCount = expiredWeekly.length;
      }
    }

    // 3. Bulk create missing progress entries (N+1 fix)
    const { data: agents } = await supabase.from("gyeol_agents").select("id").limit(500);
    const { data: allQuests } = await supabase.from("gyeol_quests").select("id").eq("is_active", true);
    const { data: existingProgress } = await supabase.from("gyeol_quest_progress").select("agent_id, quest_id");

    if (agents && allQuests && existingProgress) {
      const existingSet = new Set(existingProgress.map((p: any) => `${p.agent_id}:${p.quest_id}`));
      const toInsert: any[] = [];
      for (const agent of agents) {
        for (const quest of allQuests) {
          if (!existingSet.has(`${(agent as any).id}:${(quest as any).id}`)) {
            toInsert.push({ agent_id: (agent as any).id, quest_id: (quest as any).id, current_value: 0 });
          }
        }
      }
      if (toInsert.length > 0) {
        for (let i = 0; i < toInsert.length; i += 1000) {
          await supabase.from("gyeol_quest_progress").insert(toInsert.slice(i, i + 1000));
        }
        created = toInsert.length;
      }
    }

    return new Response(JSON.stringify({
      success: true, dailyReset: dailyResetCount, weeklyReset: weeklyResetCount,
      newProgressEntries: created, timestamp: now.toISOString(),
    }), { headers: { ...ch, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("quest-renew error:", e);
    return new Response(JSON.stringify({ error: "Server error" }), {
      status: 500, headers: { ...ch, "Content-Type": "application/json" },
    });
  }
});
