import { useEffect } from 'react';
import dynamic from '@/lib/dynamic';
import { ChatInterface } from '@/components/ChatInterface';
import { EvolutionCeremony } from '../components/evolution/EvolutionCeremony';
import { useGyeolStore } from '@/store/gyeol-store';
import { useInitAgent } from '@/src/hooks/useInitAgent';

const VoidCanvas = dynamic(() => import('@/components/VoidCanvas'));

export default function GyeolPage() {
  const { subscribeToUpdates, isLoading, isListening } = useGyeolStore();
  const { agent, loading: agentLoading } = useInitAgent();

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
        <div className="text-white/50 text-sm animate-pulse">Loading GYEOL...</div>
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
        Gen {agent?.gen ?? 1} · {agent?.total_conversations ?? 0} chats · {Number(agent?.evolution_progress ?? 0).toFixed(0)}%
      </div>
    </main>
  );
}
