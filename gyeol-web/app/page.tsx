'use client';

import { useEffect, useCallback, useState } from 'react';
import { ChatInterface } from '@/components/ChatInterface';
import { EvolutionCeremony } from '@/components/EvolutionCeremony';
import { useGyeolStore } from '@/store/gyeol-store';
import { DEMO_USER_ID } from '@/lib/gyeol/constants';

export default function Page() {
  const { agent, setAgent, setMessages, subscribeToUpdates } = useGyeolStore();
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

  if (agentLoading) {
    return (
      <main className="relative w-full h-[100dvh] overflow-hidden flex items-center justify-center">
        <div className="text-white/50 text-sm">GYEOL을 불러오는 중...</div>
      </main>
    );
  }

  return (
    <main className="relative w-full h-[100dvh] overflow-hidden">
      <ChatInterface />
      <EvolutionCeremony />
      <div className="absolute top-4 right-4 text-[10px] text-white/40 pointer-events-none z-20">
        Gen {agent?.gen ?? 1} · {agent?.total_conversations ?? 0} 대화 · {Number(agent?.evolution_progress ?? 0).toFixed(0)}%
      </div>
      <nav className="absolute top-4 left-4 flex items-center gap-3 text-sm z-20">
        <a href="/settings" className="text-white/50 hover:text-white/80">설정</a>
        <a href="/activity" className="text-white/50 hover:text-white/80">활동</a>
        <a href="/social" className="text-white/50 hover:text-white/80">소셜</a>
        <a href="/market/skins" className="text-white/50 hover:text-white/80">스킨</a>
        <a href="/market/skills" className="text-white/50 hover:text-white/80">스킬</a>
      </nav>
    </main>
  );
}
