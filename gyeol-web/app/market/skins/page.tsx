'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useGyeolStore } from '@/store/gyeol-store';

interface SkinItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  rating: number;
}

export default function SkinsPage() {
  const { agent } = useGyeolStore();
  const [skins, setSkins] = useState<SkinItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState<string | null>(null);

  const applySkin = async (skinId: string) => {
    if (!agent?.id) return;
    setApplying(skinId);
    try {
      const res = await fetch('/api/market/skins/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: agent.id, skinId }),
      });
      if (res.ok) setApplying(null);
    } finally {
      setApplying(null);
    }
  };

  useEffect(() => {
    fetch('/api/market/skins')
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setSkins(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="min-h-screen bg-black text-[#E5E5E5] p-6 pb-24">
      <div className="max-w-md mx-auto space-y-6">
        <header className="flex items-center gap-4">
          <Link href="/" className="text-white/60 hover:text-white text-sm">← GYEOL</Link>
          <h1 className="text-xl font-semibold">스킨 마켓</h1>
        </header>
        {loading ? <div className="text-center text-white/50 py-8">불러오는 중...</div> : (
          <div className="grid grid-cols-2 gap-4">
            {skins.map((s) => (
              <div key={s.id} className="rounded-2xl bg-[#0A0A1A] border border-white/10 overflow-hidden">
                <div className="aspect-square bg-indigo-500/20 flex items-center justify-center"><span className="text-4xl text-indigo-400">◆</span></div>
                <div className="p-3">
                  <p className="font-medium text-white truncate">{s.name}</p>
                  <p className="text-xs text-indigo-400">{s.price === 0 ? '무료' : `${s.price}P`}</p>
                  <button type="button" onClick={() => applySkin(s.id)} disabled={applying === s.id} className="w-full mt-2 py-2 rounded-xl bg-indigo-500/20 text-indigo-400 text-sm font-medium disabled:opacity-50">{applying === s.id ? '적용 중...' : '사용'}</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
