'use client';

/**
 * GYEOL 스킨 마켓
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface SkinItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  preview_url: string | null;
  rating: number;
  downloads: number;
}

export default function GyeolSkinsPage() {
  const [skins, setSkins] = useState<SkinItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const res = await fetch('/api/gyeol/market/skins');
      if (res.ok) {
        const data = await res.json();
        setSkins(Array.isArray(data) ? data : []);
      } else {
        setSkins([
          { id: '1', name: 'Cosmic Blue', description: '우주 느낌의 블루 글로우', price: 0, preview_url: null, rating: 4.5, downloads: 120 },
          { id: '2', name: 'Amber Warm', description: '따뜻한 앰버 톤', price: 500, preview_url: null, rating: 4.8, downloads: 89 },
        ]);
      }
      setLoading(false);
    })();
  }, []);

  return (
    <main className="min-h-screen bg-black text-[#E5E5E5] p-6 pb-24">
      <div className="max-w-md mx-auto space-y-6">
        <header className="flex items-center gap-4">
          <Link href="/gyeol" className="text-white/60 hover:text-white text-sm">
            ← GYEOL
          </Link>
          <h1 className="text-xl font-semibold">스킨 마켓</h1>
        </header>

        {loading ? (
          <div className="text-center text-white/50 py-8">불러오는 중...</div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {skins.map((s) => (
              <div
                key={s.id}
                className="rounded-2xl bg-[#0A0A1A] border border-white/10 overflow-hidden"
              >
                <div className="aspect-square bg-indigo-500/20 flex items-center justify-center">
                  <span className="text-4xl text-indigo-400">◆</span>
                </div>
                <div className="p-3">
                  <p className="font-medium text-white truncate">{s.name}</p>
                  <p className="text-xs text-white/50 truncate">{s.description ?? '-'}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-indigo-400 text-sm">
                      {s.price === 0 ? '무료' : `${s.price}P`}
                    </span>
                    <span className="text-xs text-white/50">★ {s.rating}</span>
                  </div>
                  <button
                    type="button"
                    className="w-full mt-2 py-2 rounded-xl bg-indigo-500/20 text-indigo-400 text-sm font-medium"
                  >
                    사용
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
