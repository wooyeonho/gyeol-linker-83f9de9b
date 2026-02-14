import { useEffect, useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import dynamic from '@/lib/dynamic';
import { ChatInterface } from '@/components/ChatInterface';
import { EvolutionCeremony } from '@/components/EvolutionCeremony';
import { useGyeolStore } from '@/store/gyeol-store';
import { DEMO_USER_ID } from '@/lib/gyeol/constants';

const VoidCanvas = dynamic(() => import('@/components/VoidCanvas'));

export default function GyeolPage() {
  const {
    agent,
    setAgent,
    setMessages,
    subscribeToUpdates,
    isLoading,
    isListening,
  } = useGyeolStore();

  const [agentLoading, setAgentLoading] = useState(true);
  const initAgent = useCallback(async () => {
    setAgentLoading(true);
    try {
      let res = await fetch(`/api/agent?userId=${encodeURIComponent(DEMO_USER_ID)}`);
      if (res.status === 404) {
        res = await fetch('/api/agent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: DEMO_USER_ID, name: 'GYEOL' }),
        });
      }
      if (res.ok) {
        const data = await res.json();
        setAgent(data);
        const convRes = await fetch(`/api/conversations?agentId=${data.id}&limit=50`);
        if (convRes.ok) {
          const list = await convRes.json();
          setMessages(Array.isArray(list) ? list.reverse() : []);
        }
      }
    } finally {
      setAgentLoading(false);
    }
  }, [setAgent, setMessages]);

  useEffect(() => {
    initAgent();
  }, [initAgent]);

  useEffect(() => {
    if (!agent?.id) return;
    subscribeToUpdates(agent.id);
  }, [agent?.id, subscribeToUpdates]);

  const personality = agent
    ? {
        warmth: agent.warmth,
        logic: agent.logic,
        creativity: agent.creativity,
        energy: agent.energy,
        humor: agent.humor,
      }
    : { warmth: 50, logic: 50, creativity: 50, energy: 50, humor: 50 };

  if (agentLoading) {
    return (
      <main className="relative w-full h-[100dvh] overflow-hidden bg-black flex items-center justify-center">
        <div className="text-white/50 text-sm">GYEOL을 불러오는 중...</div>
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
      <div className="absolute top-4 right-4 text-[10px] text-white/40 pointer-events-none">
        Gen {agent?.gen ?? 1} · {agent?.total_conversations ?? 0} 대화 · {Number(agent?.evolution_progress ?? 0).toFixed(0)}%
      </div>
      <Link
        to="/settings"
        className="absolute top-4 left-4 text-white/50 hover:text-white/80 text-sm"
      >
        설정
      </Link>
      <Link
        to="/activity"
        className="absolute top-4 left-16 text-white/50 hover:text-white/80 text-sm"
      >
        활동
      </Link>
    </main>
  );
}
