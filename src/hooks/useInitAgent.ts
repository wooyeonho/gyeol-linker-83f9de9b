/**
 * 모든 페이지에서 에이전트를 초기화하는 공유 훅
 */
import { useEffect, useState } from 'react';
import { useGyeolStore } from '@/store/gyeol-store';
import { supabase } from '@/src/lib/supabase';
import { DEMO_USER_ID } from '@/lib/gyeol/constants';

export function useInitAgent() {
  const { agent, setAgent, setMessages } = useGyeolStore();
  const [loading, setLoading] = useState(!agent);

  useEffect(() => {
    if (agent) { setLoading(false); return; }

    (async () => {
      try {
        const { data: existing } = await supabase
          .from('gyeol_agents' as any)
          .select('*')
          .eq('user_id', DEMO_USER_ID)
          .maybeSingle();

        if (existing) {
          setAgent(existing as any);
          const { data: convs } = await supabase
            .from('gyeol_conversations' as any)
            .select('*')
            .eq('agent_id', (existing as any).id)
            .order('created_at', { ascending: true })
            .limit(50);
          setMessages((convs as any[]) ?? []);
        } else {
          const { data: newAgent } = await supabase
            .from('gyeol_agents' as any)
            .insert({ user_id: DEMO_USER_ID, name: 'GYEOL' } as any)
            .select()
            .single();
          if (newAgent) setAgent(newAgent as any);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [agent, setAgent, setMessages]);

  return { agent, loading };
}
