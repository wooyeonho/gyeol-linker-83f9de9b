'use client';

/**
 * GYEOL 설정 — My AI, AI Brain(BYOK), Safety
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useGyeolStore } from '@/store/gyeol-store';

import { DEMO_USER_ID } from '@/lib/gyeol/constants';
const BYOK_PROVIDERS = ['openai', 'anthropic', 'deepseek', 'groq', 'gemini', 'custom'] as const;

export default function GyeolSettingsPage() {
  const { agent } = useGyeolStore();
  const [autonomyLevel, setAutonomyLevel] = useState(50);
  const [contentFilterOn, setContentFilterOn] = useState(true);
  const [notificationsOn, setNotificationsOn] = useState(true);
  const [byokList, setByokList] = useState<{ id: string; provider: string; masked: string }[]>([]);
  const [byokOpen, setByokOpen] = useState<string | null>(null);
  const [byokKey, setByokKey] = useState('');
  const [byokSaving, setByokSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/gyeol/byok?userId=${encodeURIComponent(DEMO_USER_ID)}`)
      .then((r) => r.ok ? r.json() : [])
      .then((list: { provider: string; masked?: string }[]) => setByokList(list.map((x) => ({ ...x, id: x.provider, masked: x.masked ?? '****' }))))
      .catch(() => {});
  }, []);

  const saveByok = async (provider: string) => {
    if (!byokKey.trim()) return;
    setByokSaving(true);
    try {
      const res = await fetch('/api/gyeol/byok', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: DEMO_USER_ID, provider, apiKey: byokKey.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setByokList((prev) => [...prev.filter((x) => x.provider !== provider), { id: data.id ?? provider, provider, masked: data.masked ?? '****' }]);
        setByokOpen(null);
        setByokKey('');
      }
    } finally {
      setByokSaving(false);
    }
  };

  const personality = agent
    ? [agent.warmth, agent.logic, agent.creativity, agent.energy, agent.humor]
    : [50, 50, 50, 50, 50];
  const labels = ['따뜻함', '논리', '창의', '에너지', '유머'];

  return (
    <main className="min-h-screen bg-black text-[#E5E5E5] p-6 pb-24">
      <div className="max-w-md mx-auto space-y-8">
        <header className="flex items-center gap-4">
          <Link href="/gyeol" className="text-white/60 hover:text-white text-sm">
            ← GYEOL
          </Link>
          <h1 className="text-xl font-semibold">설정</h1>
        </header>

        <section className="rounded-2xl bg-[#0A0A1A] border border-white/10 p-5 space-y-4">
          <h2 className="text-sm font-medium text-white/80">My AI</h2>
          <div>
            <p className="text-xs text-white/50 mb-1">에이전트 이름</p>
            <p className="text-white">{agent?.name ?? 'GYEOL'}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/50">Gen {agent?.gen ?? 1}</span>
            <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full"
                style={{ width: `${Number(agent?.evolution_progress ?? 0)}%` }}
              />
            </div>
            <span className="text-xs text-white/50">{Number(agent?.evolution_progress ?? 0).toFixed(0)}%</span>
          </div>
          <div className="grid grid-cols-5 gap-1 text-center">
            {labels.map((label, i) => (
              <div key={label}>
                <p className="text-[10px] text-white/50">{label}</p>
                <p className="text-xs text-indigo-400">{personality[i]}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl bg-[#0A0A1A] border border-white/10 p-5 space-y-4">
          <h2 className="text-sm font-medium text-white/80">AI Brain</h2>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-sm">Groq Free (서버 키)</span>
          </div>
          <p className="text-xs text-white/50">내 API 키 추가 (BYOK) — 암호화 저장</p>
          <div className="grid grid-cols-2 gap-2">
            {BYOK_PROVIDERS.map((provider) => (
              <div key={provider} className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => setByokOpen(byokOpen === provider ? null : provider)}
                  className="rounded-xl border border-white/10 py-2 text-sm text-white/70 hover:bg-white/5 capitalize"
                >
                  {provider}
                </button>
                {byokOpen === provider && (
                  <div className="flex gap-1">
                    <input
                      type="password"
                      placeholder="API Key"
                      value={byokKey}
                      onChange={(e) => setByokKey(e.target.value)}
                      className="flex-1 rounded-lg bg-black/50 border border-white/10 px-2 py-1 text-sm text-white placeholder:text-white/40"
                    />
                    <button
                      type="button"
                      disabled={byokSaving || !byokKey.trim()}
                      onClick={() => saveByok(provider)}
                      className="rounded-lg bg-indigo-500/30 text-indigo-300 px-2 py-1 text-sm disabled:opacity-50"
                    >
                      저장
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
          {byokList.length > 0 && (
            <p className="text-xs text-white/50">등록된 키: {byokList.map((x) => x.provider).join(', ')}</p>
          )}
        </section>

        <section className="rounded-2xl bg-[#0A0A1A] border border-white/10 p-5 space-y-4">
          <h2 className="text-sm font-medium text-white/80">Safety</h2>
          <div className="flex justify-between items-center">
            <span className="text-sm">자율 수준</span>
            <input
              type="range"
              min={0}
              max={100}
              value={autonomyLevel}
              onChange={(e) => setAutonomyLevel(Number(e.target.value))}
              className="w-24 accent-indigo-500"
            />
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm">콘텐츠 필터</span>
            <button
              type="button"
              onClick={() => setContentFilterOn((v) => !v)}
              className={`w-10 h-6 rounded-full transition ${contentFilterOn ? 'bg-indigo-500' : 'bg-white/20'}`}
            >
              <span
                className={`block w-4 h-4 rounded-full bg-white mt-1 transition ${contentFilterOn ? 'ml-5' : 'ml-1'}`}
              />
            </button>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm">활동 알림</span>
            <button
              type="button"
              onClick={() => setNotificationsOn((v) => !v)}
              className={`w-10 h-6 rounded-full transition ${notificationsOn ? 'bg-indigo-500' : 'bg-white/20'}`}
            >
              <span
                className={`block w-4 h-4 rounded-full bg-white mt-1 transition ${notificationsOn ? 'ml-5' : 'ml-1'}`}
              />
            </button>
          </div>
          <button
            type="button"
            className="w-full py-3 rounded-xl bg-red-500/20 text-red-400 font-medium border border-red-500/30"
          >
            비상 정지 (Kill Switch)
          </button>
        </section>
      </div>
    </main>
  );
}
