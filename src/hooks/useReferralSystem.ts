import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/src/lib/supabase';
import { useInitAgent } from '@/src/hooks/useInitAgent';

function generateCode(agentId: string): string {
  const base = agentId.slice(0, 6).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 5).toUpperCase();
  return "GYEOL-" + base + "-" + rand;
}

export function useReferralSystem() {
  const { agent } = useInitAgent();
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referralCount, setReferralCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const loadOrCreateCode = useCallback(async () => {
    if (!agent?.id) return;
    const settings = agent?.settings ?? {};
    if (settings.referral_code) {
      setReferralCode(settings.referral_code);
    } else {
      const code = generateCode(agent.id);
      await supabase.from("gyeol_agents" as any).update({
        settings: { ...settings, referral_code: code },
      } as any).eq("id", agent.id);
      setReferralCode(code);
    }
  }, [agent]);

  const loadReferralCount = useCallback(async () => {
    if (!agent?.id) return;
    const { count } = await supabase.from("gyeol_referrals" as any)
      .select("id", { count: "exact", head: true })
      .eq("referrer_agent_id", agent.id);
    setReferralCount(count ?? 0);
  }, [agent?.id]);

  const applyReferralCode = useCallback(async (code: string) => {
    if (!agent?.id) return { success: false, message: "Agent not found" };
    setLoading(true);
    const { data: existing } = await supabase.from("gyeol_referrals" as any)
      .select("id").eq("referee_agent_id", agent.id).maybeSingle();
    if (existing) { setLoading(false); return { success: false, message: "Already used a referral code" }; }
    const { data: agents } = await supabase.from("gyeol_agents" as any)
      .select("id, settings").neq("id", agent.id);
    const referrer = (agents as any[])?.find(a => a.settings?.referral_code === code);
    if (!referrer) { setLoading(false); return { success: false, message: "Invalid referral code" }; }
    await supabase.from("gyeol_referrals" as any).insert({
      referrer_agent_id: referrer.id, referee_agent_id: agent.id,
      referral_code: code, referrer_reward: 100, referee_reward: 50,
    });
    await supabase.rpc("increment_coins" as any, { agent_id_input: referrer.id, amount_input: 100 });
    await supabase.rpc("increment_coins" as any, { agent_id_input: agent.id, amount_input: 50 });
    setLoading(false);
    return { success: true, message: "Referral applied! +50 coins" };
  }, [agent?.id]);

  useEffect(() => { loadOrCreateCode(); loadReferralCount(); }, [loadOrCreateCode, loadReferralCount]);

  return { referralCode, referralCount, loadOrCreateCode, applyReferralCode, loading };
}
