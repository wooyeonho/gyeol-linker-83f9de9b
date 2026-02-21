import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Season Auto-End Edge Function
 * - Checks for expired active seasons and closes them
 * - Distributes final rewards to top participants
 * - Can be triggered by cron or manually
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const now = new Date().toISOString();

    // Find expired active seasons
    const { data: expiredSeasons } = await db.from("gyeol_seasons")
      .select("*")
      .eq("is_active", true)
      .lt("end_date", now);

    if (!expiredSeasons || expiredSeasons.length === 0) {
      return new Response(JSON.stringify({ message: "No expired seasons found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results = [];

    for (const season of expiredSeasons) {
      // Get top participants
      const { data: participants } = await db.from("gyeol_season_progress")
        .select("agent_id, season_exp, tier")
        .eq("season_id", season.id)
        .order("season_exp", { ascending: false })
        .limit(50);

      // Distribute rewards to top 3
      const RANK_REWARDS = [
        { coins: 1000, exp: 500, title: `${season.name} Champion` },
        { coins: 500, exp: 250, title: `${season.name} Runner-up` },
        { coins: 250, exp: 100, title: `${season.name} 3rd Place` },
      ];

      const rewarded = [];
      for (let i = 0; i < Math.min(3, (participants ?? []).length); i++) {
        const p = participants![i];
        const reward = RANK_REWARDS[i];

        // Add coins and exp
        const { data: profile } = await db.from("gyeol_gamification_profiles")
          .select("coins, exp, level, total_exp")
          .eq("agent_id", p.agent_id)
          .maybeSingle();

        if (profile) {
          let newExp = (profile.exp ?? 0) + reward.exp;
          let newLevel = profile.level ?? 1;
          const expForLevel = (lv: number) => Math.floor(100 * Math.pow(1.15, lv - 1));
          while (newExp >= expForLevel(newLevel)) {
            newExp -= expForLevel(newLevel);
            newLevel++;
          }

          await db.from("gyeol_gamification_profiles").update({
            coins: (profile.coins ?? 0) + reward.coins,
            exp: newExp,
            level: newLevel,
            total_exp: (profile.total_exp ?? 0) + reward.exp,
            title: reward.title,
            updated_at: now,
          }).eq("agent_id", p.agent_id);

          await db.from("gyeol_currency_logs").insert([
            { agent_id: p.agent_id, currency_type: "coins", amount: reward.coins, reason: `season_end:${season.name}:rank${i + 1}` },
            { agent_id: p.agent_id, currency_type: "exp", amount: reward.exp, reason: `season_end:${season.name}:rank${i + 1}` },
          ]);
        }

        rewarded.push({ agentId: p.agent_id, rank: i + 1, ...reward });
      }

      // Deactivate season
      await db.from("gyeol_seasons").update({ is_active: false }).eq("id", season.id);

      // Post community announcement
      if (rewarded.length > 0) {
        const { data: topAgent } = await db.from("gyeol_agents")
          .select("id, name, gen")
          .eq("id", rewarded[0].agentId)
          .single();

        await db.from("gyeol_community_activities").insert({
          agent_id: rewarded[0].agentId,
          activity_type: "season_end",
          content: `🏆 Season "${season.name}" has ended! Champion: ${topAgent?.name ?? 'Unknown'} with ${participants![0].season_exp} EXP!`,
          agent_name: topAgent?.name,
          agent_gen: topAgent?.gen,
        });
      }

      results.push({
        seasonId: season.id,
        seasonName: season.name,
        participantCount: (participants ?? []).length,
        rewarded,
      });
    }

    return new Response(JSON.stringify({ success: true, processed: results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("season-end error:", e);
    return new Response(JSON.stringify({ error: "Server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
