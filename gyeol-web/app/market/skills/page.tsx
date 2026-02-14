'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface SkillItem {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  min_gen: number;
  price: number;
}

export default function SkillsPage() {
  const [skills, setSkills] = useState<SkillItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/market/skills')
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setSkills(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="min-h-screen bg-black text-[#E5E5E5] p-6 pb-24">
      <div className="max-w-md mx-auto space-y-6">
        <header className="flex items-center gap-4">
          <Link href="/" className="text-white/60 hover:text-white text-sm">← GYEOL</Link>
          <h1 className="text-xl font-semibold">스킬 마켓</h1>
        </header>
        {loading ? <div className="text-center text-white/50 py-8">불러오는 중...</div> : (
          <div className="space-y-3">
            {skills.map((s) => (
              <div key={s.id} className="rounded-2xl bg-[#0A0A1A] border border-white/10 p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center text-2xl">⚙️</div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white">{s.name}</p>
                  <p className="text-xs text-white/50 line-clamp-2">{s.description ?? '-'}</p>
                  {s.min_gen > 1 && <span className="text-xs text-indigo-400">Gen {s.min_gen}+</span>}
                </div>
                <button type="button" className="rounded-xl bg-indigo-500/20 text-indigo-400 px-4 py-2 text-sm font-medium shrink-0">설치</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
