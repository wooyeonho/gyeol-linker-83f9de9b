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

    // 3. Create missing progress entries
    const { data: agents } = await supabase.from("gyeol_agents").select("id").limit(500);
    const { data: allQuests } = await supabase.from("gyeol_quests").select("id").eq("is_active", true);

    if (agents && allQuests) {
      for (const agent of agents) {
        const { data: existing } = await supabase.from("gyeol_quest_progress")
          .select("quest_id").eq("agent_id", (agent as any).id);
        const existingIds = new Set((existing ?? []).map((p: any) => p.quest_id));
        const missing = (allQuests as any[]).filter((q: any) => !existingIds.has(q.id));
        if (missing.length > 0) {
          await supabase.from("gyeol_quest_progress").insert(
            missing.map((q: any) => ({ agent_id: (agent as any).id, quest_id: q.id, current_value: 0 }))
          );
          created += missing.length;
        }
      }
    }

    return new Response(JSON.stringify({
      success: true, dailyReset: dailyResetCount, weeklyReset: weeklyResetCount,
      newProgressEntries: created, timestamp: now.toISOString(),
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
