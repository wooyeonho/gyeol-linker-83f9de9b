/**
 * 리더보드 보상 자동 지급 Edge Function
 * Cron으로 주간/월간 호출하여 상위 3명에게 코인/EXP 지급
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const REWARDS = [
  { rank: 1, coins: 500, exp: 200 },
  { rank: 2, coins: 300, exp: 120 },
  { rank: 3, coins: 150, exp: 80 },
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const body = await req.json().catch(() => ({}));
    const period = body.period ?? 'weekly';

    // Get top 3 by score
    const { data: topEntries } = await supabase
      .from('gyeol_leaderboard')
      .select('agent_id, agent_name, score, rank')
      .eq('period', period)
      .order('score', { ascending: false })
      .limit(3);

    if (!topEntries || topEntries.length === 0) {
      return new Response(JSON.stringify({ message: 'No leaderboard entries', rewarded: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const rewarded: any[] = [];

    for (let i = 0; i < topEntries.length; i++) {
      const entry = topEntries[i];
      const reward = REWARDS[i];
      if (!reward) continue;

      // Add coins
      const { data: profile } = await supabase
        .from('gyeol_gamification_profiles')
        .select('id, coins, exp, total_exp')
        .eq('agent_id', entry.agent_id)
        .single();

      if (profile) {
        await supabase.from('gyeol_gamification_profiles').update({
          coins: profile.coins + reward.coins,
          exp: profile.exp + reward.exp,
          total_exp: profile.total_exp + reward.exp,
        }).eq('id', profile.id);

        // Log currency
        await supabase.from('gyeol_currency_logs').insert({
          agent_id: entry.agent_id,
          currency_type: 'coin',
          amount: reward.coins,
          reason: `${period}_leaderboard_rank_${i + 1}`,
        });

        rewarded.push({
          agent_id: entry.agent_id,
          name: entry.agent_name,
          rank: i + 1,
          coins: reward.coins,
          exp: reward.exp,
        });
      }
    }

    // Post community announcement
    if (rewarded.length > 0) {
      const announcement = rewarded.map(r =>
        `${r.rank === 1 ? '🥇' : r.rank === 2 ? '🥈' : '🥉'} ${r.name ?? 'GYEOL'} — ${r.coins} Coins, ${r.exp} EXP`
      ).join('\n');

      await supabase.from('gyeol_community_activities').insert({
        agent_id: rewarded[0].agent_id,
        activity_type: 'leaderboard_reward',
        content: `🏆 ${period === 'weekly' ? '주간' : '월간'} 리더보드 보상 지급!\n\n${announcement}`,
        agent_name: 'GYEOL System',
      });
    }

    return new Response(JSON.stringify({ rewarded, count: rewarded.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
