import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * 게이미피케이션 틱 — 대화 후 호출
 * 1. 프로필 확인/생성
 * 2. 출석 스트릭 계산
 * 3. 퀘스트 자동 진행
 * 4. 업적 자동 달성 체크
 * 5. 리더보드 갱신
 * 6. EXP/코인 보상 지급
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let userId: string;
    try {
      const payload = JSON.parse(atob(authHeader.replace("Bearer ", "").split(".")[1]));
      userId = payload.sub;
      if (!userId) throw new Error("No sub");
    } catch {
      return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { agentId } = await req.json();
    if (!agentId) {
      return new Response(JSON.stringify({ error: "agentId required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Verify ownership
    const { data: agent } = await db.from("gyeol_agents").select("*").eq("id", agentId).single();
    if (!agent || agent.user_id !== userId) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── 1. Ensure gamification profile ──
    let { data: profile } = await db.from("gyeol_gamification_profiles").select("*").eq("agent_id", agentId).maybeSingle();
    if (!profile) {
      const { data: created } = await db.from("gyeol_gamification_profiles").insert({ agent_id: agentId }).select().single();
      profile = created;
    }
    if (!profile) {
      return new Response(JSON.stringify({ error: "Profile creation failed" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const rewards: { type: string; amount: number; reason: string }[] = [];
    const unlockedAchievements: string[] = [];
    let streakUpdated = false;

    // ── 2. 출석 스트릭 계산 ──
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const lastClaim = profile.last_daily_claim ? new Date(profile.last_daily_claim).toISOString().slice(0, 10) : null;

    if (lastClaim !== todayStr) {
      // New day!
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().slice(0, 10);

      let newStreak = lastClaim === yesterdayStr ? (profile.streak_days ?? 0) + 1 : 1;
      const newLongest = Math.max(newStreak, profile.longest_streak ?? 0);

      // 출석 보상: base 5 coins + streak bonus
      const streakBonus = Math.min(newStreak, 7) * 2; // max 14 bonus
      const dailyCoins = 5 + streakBonus;
      const dailyExp = 10 + Math.min(newStreak, 7) * 3;

      await db.from("gyeol_gamification_profiles").update({
        streak_days: newStreak,
        longest_streak: newLongest,
        last_daily_claim: now.toISOString(),
        coins: (profile.coins ?? 0) + dailyCoins,
        exp: (profile.exp ?? 0) + dailyExp,
        total_exp: (profile.total_exp ?? 0) + dailyExp,
        updated_at: now.toISOString(),
      }).eq("agent_id", agentId);

      // Update agent consecutive_days too
      await db.from("gyeol_agents").update({ consecutive_days: newStreak }).eq("id", agentId);

      rewards.push({ type: "coins", amount: dailyCoins, reason: `daily_login_streak_${newStreak}` });
      rewards.push({ type: "exp", amount: dailyExp, reason: `daily_login_streak_${newStreak}` });
      streakUpdated = true;

      // Refresh profile
      const { data: refreshed } = await db.from("gyeol_gamification_profiles").select("*").eq("agent_id", agentId).single();
      if (refreshed) profile = refreshed;
    }

    // ── 3. 퀘스트 자동 진행 ──
    const { data: quests } = await db.from("gyeol_quests").select("*").eq("is_active", true);
    if (quests && quests.length > 0) {
      // Get current progress
      const { data: allProgress } = await db.from("gyeol_quest_progress").select("*").eq("agent_id", agentId);
      const progressMap = new Map((allProgress ?? []).map((p: any) => [p.quest_id, p]));

      for (const quest of quests) {
        // Check min requirements
        if (agent.gen < (quest.min_gen ?? 1)) continue;
        if ((profile.level ?? 1) < (quest.min_level ?? 1)) continue;

        let currentValue = 0;
        const reqType = quest.requirement_type;

        // Calculate current value based on requirement type
        switch (reqType) {
          case "chat_count":
            currentValue = agent.total_conversations ?? 0;
            break;
          case "daily_chat":
            // Count today's messages
            const { count: todayChats } = await db.from("gyeol_conversations")
              .select("*", { count: "exact", head: true })
              .eq("agent_id", agentId).eq("role", "user")
              .gte("created_at", todayStr + "T00:00:00Z");
            currentValue = todayChats ?? 0;
            break;
          case "streak_days":
            currentValue = profile.streak_days ?? 0;
            break;
          case "evolution_gen":
            currentValue = agent.gen ?? 1;
            break;
          case "level_reach":
            currentValue = profile.level ?? 1;
            break;
          case "total_exp":
            currentValue = profile.total_exp ?? 0;
            break;
          case "coins_earned":
            currentValue = profile.coins ?? 0;
            break;
          case "intimacy_reach":
            currentValue = agent.intimacy ?? 0;
            break;
          case "memory_count": {
            const { count: memCount } = await db.from("gyeol_user_memories")
              .select("*", { count: "exact", head: true }).eq("agent_id", agentId);
            currentValue = memCount ?? 0;
            break;
          }
          case "skin_equipped": {
            const { count: skinCount } = await db.from("gyeol_agent_skins")
              .select("*", { count: "exact", head: true }).eq("agent_id", agentId);
            currentValue = skinCount ?? 0;
            break;
          }
          case "skill_installed": {
            const { count: skillCount } = await db.from("gyeol_agent_skills")
              .select("*", { count: "exact", head: true }).eq("agent_id", agentId);
            currentValue = skillCount ?? 0;
            break;
          }
          default:
            continue;
        }

        const isCompleted = currentValue >= (quest.requirement_value ?? 1);
        const existing = progressMap.get(quest.id);

        if (existing) {
          // Update progress if changed
          if (existing.current_value !== currentValue || (isCompleted && !existing.is_completed)) {
            await db.from("gyeol_quest_progress").update({
              current_value: currentValue,
              is_completed: isCompleted,
              completed_at: isCompleted && !existing.is_completed ? now.toISOString() : existing.completed_at,
            }).eq("id", existing.id);
          }
        } else {
          // Create new progress entry
          await db.from("gyeol_quest_progress").insert({
            agent_id: agentId,
            quest_id: quest.id,
            current_value: currentValue,
            is_completed: isCompleted,
            completed_at: isCompleted ? now.toISOString() : null,
          });
        }
      }
    }

    // ── 4. 업적 자동 달성 체크 ──
    const { data: achievements } = await db.from("gyeol_achievements").select("*");
    const { data: existingUnlocks } = await db.from("gyeol_achievement_unlocks").select("achievement_id").eq("agent_id", agentId);
    const unlockedSet = new Set((existingUnlocks ?? []).map((u: any) => u.achievement_id));

    if (achievements) {
      for (const ach of achievements) {
        if (unlockedSet.has(ach.id)) continue;

        let currentValue = 0;
        const reqType = ach.requirement_type;

        switch (reqType) {
          case "chat_count": currentValue = agent.total_conversations ?? 0; break;
          case "streak_days": currentValue = profile.streak_days ?? 0; break;
          case "longest_streak": currentValue = profile.longest_streak ?? 0; break;
          case "evolution_gen": currentValue = agent.gen ?? 1; break;
          case "level_reach": currentValue = profile.level ?? 1; break;
          case "total_exp": currentValue = profile.total_exp ?? 0; break;
          case "coins_total": currentValue = profile.coins ?? 0; break;
          case "intimacy_reach": currentValue = agent.intimacy ?? 0; break;
          case "daily_chat": {
            const { count } = await db.from("gyeol_conversations")
              .select("*", { count: "exact", head: true })
              .eq("agent_id", agentId).eq("role", "user")
              .gte("created_at", todayStr + "T00:00:00Z");
            currentValue = count ?? 0;
            break;
          }
          case "memory_count": {
            const { count } = await db.from("gyeol_user_memories")
              .select("*", { count: "exact", head: true }).eq("agent_id", agentId);
            currentValue = count ?? 0;
            break;
          }
          case "skin_count": {
            const { count } = await db.from("gyeol_agent_skins")
              .select("*", { count: "exact", head: true }).eq("agent_id", agentId);
            currentValue = count ?? 0;
            break;
          }
          case "skill_count": {
            const { count } = await db.from("gyeol_agent_skills")
              .select("*", { count: "exact", head: true }).eq("agent_id", agentId);
            currentValue = count ?? 0;
            break;
          }
          case "breeding_count": {
            const { count } = await db.from("gyeol_breeding_logs")
              .select("*", { count: "exact", head: true })
              .or(`parent_1_id.eq.${agentId},parent_2_id.eq.${agentId}`);
            currentValue = count ?? 0;
            break;
          }
          case "moltbook_posts": {
            const { count } = await db.from("gyeol_moltbook_posts")
              .select("*", { count: "exact", head: true }).eq("agent_id", agentId);
            currentValue = count ?? 0;
            break;
          }
          default: continue;
        }

        if (currentValue >= (ach.requirement_value ?? 1)) {
          // Unlock!
          await db.from("gyeol_achievement_unlocks").insert({
            agent_id: agentId, achievement_id: ach.id, is_new: true,
          });
          unlockedAchievements.push(ach.name);

          // Grant rewards
          if (ach.reward_exp > 0) {
            rewards.push({ type: "exp", amount: ach.reward_exp, reason: `achievement:${ach.name}` });
          }
          if (ach.reward_coins > 0) {
            rewards.push({ type: "coins", amount: ach.reward_coins, reason: `achievement:${ach.name}` });
          }
          if (ach.reward_title) {
            await db.from("gyeol_gamification_profiles").update({ title: ach.reward_title }).eq("agent_id", agentId);
          }
        }
      }
    }

    // ── 5. 대화 기본 보상 (매 대화 +2 EXP, +1 coin) ──
    rewards.push({ type: "exp", amount: 2, reason: "chat_message" });
    rewards.push({ type: "coins", amount: 1, reason: "chat_message" });

    // ── 6. 보상 적용 ──
    let totalExpGain = 0;
    let totalCoinGain = 0;
    const logEntries: any[] = [];

    for (const r of rewards) {
      if (r.type === "exp") totalExpGain += r.amount;
      if (r.type === "coins") totalCoinGain += r.amount;
      logEntries.push({ agent_id: agentId, currency_type: r.type, amount: r.amount, reason: r.reason });
    }

    // Batch insert currency logs (skip streak ones already applied)
    const nonStreakLogs = logEntries.filter(l => !l.reason.startsWith("daily_login"));
    if (nonStreakLogs.length > 0) {
      await db.from("gyeol_currency_logs").insert(nonStreakLogs);
    }

    // Update profile with non-streak rewards
    const nonStreakExp = rewards.filter(r => r.type === "exp" && !r.reason.startsWith("daily_login")).reduce((s, r) => s + r.amount, 0);
    const nonStreakCoins = rewards.filter(r => r.type === "coins" && !r.reason.startsWith("daily_login")).reduce((s, r) => s + r.amount, 0);

    if (nonStreakExp > 0 || nonStreakCoins > 0) {
      // Refresh profile
      const { data: latestProfile } = await db.from("gyeol_gamification_profiles").select("*").eq("agent_id", agentId).single();
      if (latestProfile) {
        let newExp = (latestProfile.exp ?? 0) + nonStreakExp;
        let newLevel = latestProfile.level ?? 1;
        const newCoins = (latestProfile.coins ?? 0) + nonStreakCoins;
        const newTotalExp = (latestProfile.total_exp ?? 0) + nonStreakExp;

        // Level up check
        const expForLevel = (lv: number) => Math.floor(100 * Math.pow(1.15, lv - 1));
        let leveledUp = false;
        while (newExp >= expForLevel(newLevel)) {
          newExp -= expForLevel(newLevel);
          newLevel++;
          leveledUp = true;
        }

        // Title by level
        const titles: Record<number, string> = {
          1: "초보 동반자", 5: "성장하는 결", 10: "숙련된 대화자",
          15: "깊은 유대", 20: "영혼의 파트너", 30: "전설의 결",
          50: "초월자",
        };
        const newTitle = Object.entries(titles).reverse().find(([lv]) => newLevel >= Number(lv))?.[1] ?? latestProfile.title;

        await db.from("gyeol_gamification_profiles").update({
          exp: newExp, level: newLevel, coins: newCoins, total_exp: newTotalExp,
          title: newTitle, updated_at: now.toISOString(),
        }).eq("agent_id", agentId);
      }
    }

    // ── 7. 리더보드 갱신 ──
    const { data: finalProfile } = await db.from("gyeol_gamification_profiles").select("*").eq("agent_id", agentId).single();
    if (finalProfile) {
      const periodStart = "2025-01-01T00:00:00Z"; // alltime
      await db.from("gyeol_leaderboard").upsert({
        agent_id: agentId,
        agent_name: agent.name,
        agent_gen: agent.gen,
        period: "alltime",
        period_start: periodStart,
        score: finalProfile.total_exp ?? 0,
        updated_at: now.toISOString(),
      }, { onConflict: "agent_id,period,period_start" });

      // Weekly
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      weekStart.setHours(0, 0, 0, 0);
      await db.from("gyeol_leaderboard").upsert({
        agent_id: agentId,
        agent_name: agent.name,
        agent_gen: agent.gen,
        period: "weekly",
        period_start: weekStart.toISOString(),
        score: finalProfile.total_exp ?? 0,
        updated_at: now.toISOString(),
      }, { onConflict: "agent_id,period,period_start" });
    }

    return new Response(JSON.stringify({
      ok: true,
      rewards,
      unlockedAchievements,
      streakUpdated,
      level: finalProfile?.level,
      exp: finalProfile?.exp,
      coins: finalProfile?.coins,
      totalExp: finalProfile?.total_exp,
      streakDays: finalProfile?.streak_days,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e) {
    console.error("gamification-tick error:", e);
    return new Response(JSON.stringify({ error: "Server error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
