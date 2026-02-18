'use client';

/**
 * GYEOL 메인 — Void + 채팅 + 진화 연출
 */

import { useEffect, useCallback, useState } from 'react';
import dynamic from 'next/dynamic';
import { ChatInterface } from '@/components/ChatInterface';
import { EvolutionCeremony } from '@/components/EvolutionCeremony';
import { useGyeolStore } from '@/store/gyeol-store';

const VoidCanvas = dynamic(() => import('@/components/VoidCanvas'), { ssr: false });

import { DEMO_USER_ID } from '@/lib/gyeol/constants';

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
  const [skinColors, setSkinColors] = useState<{ primary: string; secondary: string; glowIntensity: number } | null>(null);
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

  useEffect(() => {
    if (!agent?.skin_id) { setSkinColors(null); return; }
    (async () => {
      const res = await fetch(`/api/market/skins?skinId=${agent.skin_id}`);
      if (res.ok) {
        const skins = await res.json();
        const skin = Array.isArray(skins) ? skins[0] : skins;
        if (skin?.skin_data) {
          const sd = typeof skin.skin_data === 'string' ? JSON.parse(skin.skin_data) : skin.skin_data;
          setSkinColors({
            primary: sd.color_primary ?? '#7C3AED',
            secondary: sd.color_secondary ?? '#A78BFA',
            glowIntensity: sd.glow_intensity ?? 0.5,
          });
        }
      }
    })();
  }, [agent?.skin_id]);

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
        skinColors={skinColors}
      />
      <ChatInterface />
      <EvolutionCeremony />
      <div className="absolute top-4 right-4 text-[10px] text-white/40 pointer-events-none">
        Gen {agent?.gen ?? 1} · {agent?.total_conversations ?? 0} 대화 · {Number(agent?.evolution_progress ?? 0).toFixed(0)}%
      </div>
      <a
        href="/settings"
        className="absolute top-4 left-4 text-white/50 hover:text-white/80 text-sm"
      >
        설정
      </a>
      <a
        href="/activity"
        className="absolute top-4 left-16 text-white/50 hover:text-white/80 text-sm"
      >
        활동
      </a>
    </main>
  );
}
