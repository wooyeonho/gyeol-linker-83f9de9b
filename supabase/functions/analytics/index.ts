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

    const { agentId, period = "7d", metrics } = await req.json();
    if (!agentId) throw new Error("agentId required");

    const days = period === "30d" ? 30 : period === "90d" ? 90 : 7;
    const since = new Date(Date.now() - days * 86400000).toISOString();

    const [convRes, expRes, loginRes] = await Promise.all([
      supabase.from("gyeol_conversations").select("id, created_at, role, tokens_used", { count: "exact" })
        .eq("agent_id", agentId).gte("created_at", since),
      supabase.from("gyeol_coin_transactions").select("amount, tx_type, created_at")
        .eq("agent_id", agentId).gte("created_at", since),
      supabase.from("gyeol_login_history").select("created_at")
        .eq("user_id", agentId).gte("created_at", since),
    ]);

    const conversations = convRes.data ?? [];
    const transactions = expRes.data ?? [];

    const totalMessages = conversations.length;
    const userMessages = conversations.filter((c: any) => c.role === "user").length;
    const aiMessages = conversations.filter((c: any) => c.role === "assistant").length;
    const totalTokens = conversations.reduce((s: number, c: any) => s + (c.tokens_used ?? 0), 0);
    const avgTokensPerMsg = totalMessages > 0 ? Math.round(totalTokens / totalMessages) : 0;

    const dailyActivity: Record<string, number> = {};
    conversations.forEach((c: any) => {
      const day = c.created_at.slice(0, 10);
      dailyActivity[day] = (dailyActivity[day] ?? 0) + 1;
    });

    const totalEarned = transactions.filter((t: any) => t.amount > 0).reduce((s: number, t: any) => s + t.amount, 0);
    const totalSpent = transactions.filter((t: any) => t.amount < 0).reduce((s: number, t: any) => s + Math.abs(t.amount), 0);

    const activeDays = Object.keys(dailyActivity).length;
    const engagementRate = days > 0 ? Math.round((activeDays / days) * 100) : 0;

    const hourlyDistribution: number[] = new Array(24).fill(0);
    conversations.forEach((c: any) => {
      const hour = new Date(c.created_at).getHours();
      hourlyDistribution[hour]++;
    });
    const peakHour = hourlyDistribution.indexOf(Math.max(...hourlyDistribution));

    return new Response(JSON.stringify({
      period,
      totalMessages,
      userMessages,
      aiMessages,
      totalTokens,
      avgTokensPerMsg,
      dailyActivity,
      activeDays,
      engagementRate,
      peakHour,
      coinsEarned: totalEarned,
      coinsSpent: totalSpent,
      hourlyDistribution,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
