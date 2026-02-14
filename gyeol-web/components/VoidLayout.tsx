'use client';

import { useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useGyeolStore } from '@/store/gyeol-store';
import { DEMO_USER_ID } from '@/lib/gyeol/constants';

const VoidCanvas = dynamic(() => import('@/components/VoidCanvas'), { ssr: false });

export function VoidLayout({ children }: { children: React.ReactNode }) {
  const { agent, setAgent, isLoading, isListening, lastMessagePulseAt } = useGyeolStore();

  useEffect(() => {
    if (agent?.id) return;
    let cancelled = false;
    (async () => {
      let res = await fetch(`/api/agent?userId=${encodeURIComponent(DEMO_USER_ID)}`);
      if (res.status === 404) {
        res = await fetch('/api/agent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: DEMO_USER_ID, name: 'GYEOL' }),
        });
      }
      if (cancelled || !res.ok) return;
      const data = await res.json();
      setAgent(data);
    })();
    return () => { cancelled = true; };
  }, [agent?.id, setAgent]);

  const personality = agent
    ? { warmth: agent.warmth, logic: agent.logic, creativity: agent.creativity, energy: agent.energy, humor: agent.humor }
    : { warmth: 50, logic: 50, creativity: 50, energy: 50, humor: 50 };

  return (
    <div className="relative min-h-[100dvh] bg-black">
      <div className="fixed inset-0 z-0">
        <VoidCanvas
          gen={agent?.gen ?? 1}
          personality={personality}
          visualState={agent?.visual_state}
          isThinking={isLoading}
          isListening={isListening}
          pulseTrigger={lastMessagePulseAt}
        />
      </div>
      <div className="relative z-10 min-h-[100dvh]">
        {children}
      </div>
    </div>
  );
}
