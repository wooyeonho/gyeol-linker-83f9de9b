/**
 * 인증된 사용자의 에Previous트를 초기화하는 Share 훅
 */
import { useEffect, useState } from 'react';
import { useGyeolStore } from '@/store/gyeol-store';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from './useAuth';

export function useInitAgent() {
  const { user } = useAuth();
  const { agent, setAgent, setMessages } = useGyeolStore();
  const [loading, setLoading] = useState(!agent);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    if (agent && agent.user_id === user.id) { setLoading(false); return; }

    (async () => {
      try {
        const { data: existing } = await supabase
          .from('gyeol_agents' as any)
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (existing) {
          setAgent(existing as any);
          setNeedsOnboarding(false);
          const { data: convs } = await supabase
            .from('gyeol_conversations' as any)
            .select('*')
            .eq('agent_id', (existing as any).id)
            .order('created_at', { ascending: true })
            .limit(50);
          setMessages((convs as any[]) ?? []);
        } else {
          // No agent yet — show onboarding
          setNeedsOnboarding(true);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [user, agent, setAgent, setMessages]);

  const completeOnboarding = () => {
    setNeedsOnboarding(false);
  };

  return { agent, loading, needsOnboarding, completeOnboarding };
}
