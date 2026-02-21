import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { isValidUUID } from "../_shared/validate-uuid.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * 서버사이드 구매 Edge Function
 * - 스킨 구매, 상점 아이템 구매, 일일 보상 수령
 * - 코인 조작 방지: 모든 코인 변동은 여기서만 처리
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Auth
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

    const body = await req.json();
    const { action, agentId, itemId, skinId } = body as {
      action: "buy_skin" | "buy_item" | "claim_daily";
      agentId?: string;
      itemId?: string;
      skinId?: string;
    };

    if (!action || !agentId || !isValidUUID(agentId)) {
      return new Response(JSON.stringify({ error: "action and valid agentId required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Verify ownership
    const { data: agent } = await db.from("gyeol_agents").select("id, user_id, skin_id").eq("id", agentId).single();
    if (!agent || agent.user_id !== userId) {
      return new Response(JSON.stringify({ error: "Agent not found or access denied" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Load profile
    let { data: profile } = await db.from("gyeol_gamification_profiles").select("*").eq("agent_id", agentId).maybeSingle();
    if (!profile) {
      const { data: created } = await db.from("gyeol_gamification_profiles").insert({ agent_id: agentId }).select().single();
      profile = created;
    }
    if (!profile) {
      return new Response(JSON.stringify({ error: "Profile not found" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── BUY SKIN ──
    if (action === "buy_skin") {
      if (!skinId || !isValidUUID(skinId)) {
        return new Response(JSON.stringify({ error: "Valid skinId required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const { data: skin } = await db.from("gyeol_skins").select("*").eq("id", skinId).single();
      if (!skin) {
        return new Response(JSON.stringify({ error: "Skin not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (skin.price > 0 && profile.coins < skin.price) {
        return new Response(JSON.stringify({ error: "Insufficient coins", needed: skin.price, current: profile.coins }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Deduct coins
      if (skin.price > 0) {
        await db.from("gyeol_gamification_profiles").update({
          coins: profile.coins - skin.price,
          updated_at: new Date().toISOString(),
        }).eq("agent_id", agentId);
        await db.from("gyeol_currency_logs").insert({
          agent_id: agentId, currency_type: "coins", amount: -skin.price, reason: `skin:${skin.name}`,
        });
      }

      // Apply skin
      await db.from("gyeol_agents").update({ skin_id: skinId }).eq("id", agentId);
      await db.from("gyeol_agent_skins").upsert(
        { agent_id: agentId, skin_id: skinId, is_equipped: true },
        { onConflict: "agent_id,skin_id" }
      );
      await db.from("gyeol_skins").update({ downloads: (skin.downloads ?? 0) + 1 }).eq("id", skinId);

      return new Response(JSON.stringify({ ok: true, action: "buy_skin", deducted: skin.price }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── BUY ITEM ──
    if (action === "buy_item") {
      if (!itemId || !isValidUUID(itemId)) {
        return new Response(JSON.stringify({ error: "Valid itemId required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const { data: item } = await db.from("gyeol_shop_items").select("*").eq("id", itemId).eq("is_active", true).single();
      if (!item) {
        return new Response(JSON.stringify({ error: "Item not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (profile.coins < item.price_coins) {
        return new Response(JSON.stringify({ error: "Insufficient coins" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (profile.level < item.min_level) {
        return new Response(JSON.stringify({ error: `Level ${item.min_level} required` }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (item.is_limited && item.stock !== null && item.stock <= 0) {
        return new Response(JSON.stringify({ error: "Out of stock" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Check existing inventory
      const { data: existing } = await db.from("gyeol_inventory").select("id, quantity").eq("agent_id", agentId).eq("item_id", itemId).maybeSingle();
      if (existing) {
        await db.from("gyeol_inventory").update({ quantity: existing.quantity + 1 }).eq("id", existing.id);
      } else {
        await db.from("gyeol_inventory").insert({ agent_id: agentId, item_id: itemId });
      }

      // Deduct coins
      await db.from("gyeol_gamification_profiles").update({
        coins: profile.coins - item.price_coins,
        updated_at: new Date().toISOString(),
      }).eq("agent_id", agentId);

      await db.from("gyeol_currency_logs").insert({
        agent_id: agentId, currency_type: "coins", amount: -item.price_coins, reason: `shop:${item.name}`,
      });

      // Decrement stock if limited
      if (item.is_limited && item.stock !== null) {
        await db.from("gyeol_shop_items").update({ stock: item.stock - 1 }).eq("id", itemId);
      }

      return new Response(JSON.stringify({ ok: true, action: "buy_item", deducted: item.price_coins }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── CLAIM DAILY ──
    if (action === "claim_daily") {
      const now = new Date();
      const todayStr = now.toISOString().slice(0, 10);
      const lastClaim = profile.last_daily_claim ? new Date(profile.last_daily_claim).toISOString().slice(0, 10) : null;

      if (lastClaim === todayStr) {
        return new Response(JSON.stringify({ error: "Already claimed today", alreadyClaimed: true }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().slice(0, 10);
      const newStreak = lastClaim === yesterdayStr ? (profile.streak_days ?? 0) + 1 : 1;
      const newLongest = Math.max(newStreak, profile.longest_streak ?? 0);

      // Calculate rewards based on streak
      const DAILY_REWARDS = [5, 10, 15, 20, 30, 40, 100];
      const currentDay = ((newStreak - 1) % 7);
      const baseCoins = DAILY_REWARDS[currentDay] ?? 5;
      const baseExp = 10 + currentDay * 5;

      // Streak bonus multiplier
      let multiplier = 1;
      if (newStreak >= 30) multiplier = 3;
      else if (newStreak >= 14) multiplier = 2;
      else if (newStreak >= 7) multiplier = 1.5;

      const finalCoins = Math.floor(baseCoins * multiplier);
      const finalExp = Math.floor(baseExp * multiplier);

      // Level up check
      let newExp = (profile.exp ?? 0) + finalExp;
      let newLevel = profile.level ?? 1;
      const expForLevel = (lv: number) => Math.floor(100 * Math.pow(1.15, lv - 1));
      while (newExp >= expForLevel(newLevel)) {
        newExp -= expForLevel(newLevel);
        newLevel++;
      }

      await db.from("gyeol_gamification_profiles").update({
        streak_days: newStreak,
        longest_streak: newLongest,
        last_daily_claim: now.toISOString(),
        coins: (profile.coins ?? 0) + finalCoins,
        exp: newExp,
        level: newLevel,
        total_exp: (profile.total_exp ?? 0) + finalExp,
        updated_at: now.toISOString(),
      }).eq("agent_id", agentId);

      await db.from("gyeol_agents").update({ consecutive_days: newStreak }).eq("id", agentId);

      await db.from("gyeol_currency_logs").insert([
        { agent_id: agentId, currency_type: "coins", amount: finalCoins, reason: `daily_reward_day${currentDay + 1}` },
        { agent_id: agentId, currency_type: "exp", amount: finalExp, reason: `daily_reward_day${currentDay + 1}` },
      ]);

      return new Response(JSON.stringify({
        ok: true, action: "claim_daily",
        coins: finalCoins, exp: finalExp, streakDays: newStreak, multiplier,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("market-purchase error:", e);
    return new Response(JSON.stringify({ error: "Server error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
