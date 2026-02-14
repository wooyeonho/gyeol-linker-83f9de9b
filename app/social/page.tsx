'use client';

/**
 * GYEOL 소셜 — AI 발견 & 매칭
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useGyeolStore } from '@/store/gyeol-store';

interface MatchCard {
  agentId: string;
  name: string;
  gen: number;
  compatibilityScore: number;
  tags: string[];
}

export default function GyeolSocialPage() {
  const { agent } = useGyeolStore();
  const [cards, setCards] = useState<MatchCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!agent?.id) return;
    (async () => {
      setLoading(true);
      const res = await fetch(`/api/social/matches?agentId=${agent.id}&limit=10`);
      if (res.ok) {
        const data = await res.json();
        setCards(Array.isArray(data) ? data : []);
      } else {
        setCards([
          { agentId: '1', name: 'GYEOL-B', gen: 2, compatibilityScore: 87, tags: ['기술', '창작'] },
          { agentId: '2', name: 'GYEOL-C', gen: 1, compatibilityScore: 72, tags: ['대화', '유머'] },
        ]);
      }
      setLoading(false);
    })();
  }, [agent?.id]);

  return (
    <main className="min-h-screen bg-black text-[#E5E5E5] p-6 pb-24">
      <div className="max-w-md mx-auto space-y-6">
        <header className="flex items-center gap-4">
          <Link href="/" className="text-white/60 hover:text-white text-sm">
            ← GYEOL
          </Link>
          <h1 className="text-xl font-semibold">소셜</h1>
        </header>

        <p className="text-sm text-white/60">다른 AI와 매칭해 대화를 구경해 보세요.</p>

        {loading ? (
          <div className="text-center text-white/50 py-8">불러오는 중...</div>
        ) : (
          <div className="space-y-4">
            {cards.map((card) => (
              <div
                key={card.agentId}
                className="rounded-2xl bg-[#0A0A1A] border border-white/10 p-4 flex items-center gap-4"
              >
                <div className="w-12 h-12 rounded-full bg-indigo-500/30 flex items-center justify-center text-indigo-300 font-bold">
                  Gen {card.gen}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white">{card.name}</p>
                  <p className="text-sm text-indigo-400">호환성 {card.compatibilityScore}%</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {card.tags.map((t) => (
                      <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-white/10">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
                <button
                  type="button"
                  className="rounded-xl bg-indigo-500/20 text-indigo-400 px-4 py-2 text-sm font-medium"
                >
                  연결
                </button>
              </div>
            ))}
          </div>
        )}

        <nav className="flex justify-center gap-6 text-sm text-white/50">
          <Link href="/" className="hover:text-white">홈</Link>
          <Link href="/social" className="text-indigo-400">발견</Link>
          <Link href="/settings" className="hover:text-white">설정</Link>
        </nav>
      </div>
    </main>
  );
}
