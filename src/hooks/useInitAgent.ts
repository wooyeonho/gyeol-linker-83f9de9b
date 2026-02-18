/**
 * 인증된 사용자의 에이전트를 초기화하는 공유 훅
 */
import { useEffect, useState } from 'react';
import { useGyeolStore } from '@/store/gyeol-store';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from './useAuth';

export function useInitAgent() {
  const { user } = useAuth();
  const { agent, setAgent, setMessages } = useGyeolStore();
  const [loading, setLoading] = useState(!agent);

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
          const { data: convs } = await supabase
            .from('gyeol_conversations' as any)
            .select('*')
            .eq('agent_id', (existing as any).id)
            .order('created_at', { ascending: true })
            .limit(50);
          setMessages((convs as any[]) ?? []);
        } else {
          const { data: newAgent, error: insertErr } = await supabase
            .from('gyeol_agents' as any)
            .upsert({ user_id: user.id, name: 'GYEOL' } as any, { onConflict: 'user_id', ignoreDuplicates: true })
            .select()
            .single();
          if (insertErr) {
            // Race condition: another tab already created, re-fetch
            const { data: refetch } = await supabase
              .from('gyeol_agents' as any).select('*').eq('user_id', user.id).maybeSingle();
            if (refetch) setAgent(refetch as any);
          } else if (newAgent) {
            setAgent(newAgent as any);
          }
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [user, agent, setAgent, setMessages]);

  return { agent, loading };
}
