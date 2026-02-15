import { useEffect, useCallback, useState } from 'react';
import dynamic from '@/lib/dynamic';
import { ChatInterface } from '@/components/ChatInterface';
import { EvolutionCeremony } from '../components/evolution/EvolutionCeremony';
import { useGyeolStore } from '@/store/gyeol-store';
import { DEMO_USER_ID } from '@/lib/gyeol/constants';
import { supabase } from '@/src/lib/supabase';

const VoidCanvas = dynamic(() => import('@/components/VoidCanvas'));

export default function GyeolPage() {
  const { agent, setAgent, setMessages, subscribeToUpdates, isLoading, isListening } = useGyeolStore();
  const [agentLoading, setAgentLoading] = useState(true);

  const initAgent = useCallback(async () => {
    setAgentLoading(true);
    try {
      // Try to find existing agent
      const { data: existing } = await supabase
        .from('gyeol_agents' as any)
        .select('*')
        .eq('user_id', DEMO_USER_ID)
        .maybeSingle();

      if (existing) {
        setAgent(existing as any);
        // Load conversations
        const { data: convs } = await supabase
          .from('gyeol_conversations' as any)
          .select('*')
          .eq('agent_id', (existing as any).id)
          .order('created_at', { ascending: true })
          .limit(50);
        setMessages((convs as any[]) ?? []);
      } else {
        // Create new agent
        const { data: newAgent } = await supabase
          .from('gyeol_agents' as any)
          .insert({ user_id: DEMO_USER_ID, name: 'GYEOL' } as any)
          .select()
          .single();
        if (newAgent) setAgent(newAgent as any);
      }
    } finally {
      setAgentLoading(false);
    }
  }, [setAgent, setMessages]);

  useEffect(() => { initAgent(); }, [initAgent]);

  useEffect(() => {
    if (!agent?.id) return;
    const unsub = subscribeToUpdates(agent.id);
    return () => { if (typeof unsub === 'function') unsub(); };
  }, [agent?.id, subscribeToUpdates]);

  const personality = agent
    ? { warmth: agent.warmth, logic: agent.logic, creativity: agent.creativity, energy: agent.energy, humor: agent.humor }
    : { warmth: 50, logic: 50, creativity: 50, energy: 50, humor: 50 };

  if (agentLoading) {
    return (
      <main className="relative w-full h-[100dvh] overflow-hidden bg-black flex items-center justify-center">
        <div className="text-white/50 text-sm animate-pulse">GYEOL을 불러오는 중...</div>
      </main>
    );
  }

  return (
    <main className="relative w-full h-[100dvh] overflow-hidden bg-black">
      <VoidCanvas
        gen={agent?.gen ?? 1}
        personality={personality}
        visualState={agent?.visual_state}
        isThinking={isLoading}
        isListening={isListening}
      />
      <ChatInterface />
      <EvolutionCeremony />
      <div className="absolute top-4 right-4 text-[10px] text-white/40 pointer-events-none select-none">
        Gen {agent?.gen ?? 1} · {agent?.total_conversations ?? 0} 대화 · {Number(agent?.evolution_progress ?? 0).toFixed(0)}%
      </div>
    </main>
  );
}
