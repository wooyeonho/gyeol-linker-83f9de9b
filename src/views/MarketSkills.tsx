import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { supabase } from '@/src/lib/supabase';
import { BottomNav } from '../components/BottomNav';

interface SkillItem {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  min_gen: number;
  price: number;
  rating: number;
  downloads: number;
}

export default function MarketSkillsPage() {
  const [skills, setSkills] = useState<SkillItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'skills' | 'skins'>('skills');

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('gyeol_skills' as any)
        .select('id, name, description, category, min_gen, price, rating, downloads')
        .eq('is_approved', true)
        .order('downloads', { ascending: false })
        .limit(50);
      setSkills((data as any[]) ?? []);
      setLoading(false);
    })();
  }, []);

  return (
    <main className="min-h-screen bg-black text-white/90 pb-24">
      <div className="max-w-md mx-auto p-6 space-y-6">
        <header>
          <h1 className="text-2xl font-bold">Market</h1>
          <p className="text-sm text-white/50 mt-1">Expand your AI with skills and skins</p>
        </header>

        <div className="flex gap-2">
          <Link
            to="/market/skills"
            className={`flex-1 py-2.5 rounded-xl text-center text-sm font-medium transition ${
              tab === 'skills' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/20' : 'bg-white/5 text-white/40 border border-transparent'
            }`}
            onClick={() => setTab('skills')}
          >
            Skills
          </Link>
          <Link
            to="/market/skins"
            className={`flex-1 py-2.5 rounded-xl text-center text-sm font-medium transition ${
              tab === 'skins' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/20' : 'bg-white/5 text-white/40 border border-transparent'
            }`}
            onClick={() => setTab('skins')}
          >
            Skins
          </Link>
        </div>

        {loading ? (
          <div className="flex flex-col items-center gap-2 py-12">
            <div className="w-6 h-6 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-3">
            {skills.map((s, i) => (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-2xl bg-white/[0.03] border border-white/5 p-4 flex items-center gap-4"
              >
                <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-xl">
                  ⚙️
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-white">{s.name}</p>
                    {s.min_gen > 1 && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400">
                        Gen {s.min_gen}+
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-white/40 line-clamp-1 mt-0.5">{s.description ?? '-'}</p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-white/40">{s.category ?? 'Other'}</span>
                    <span className="text-[10px] text-white/30">★ {s.rating} · {s.downloads}x</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="rounded-xl bg-indigo-500/15 text-indigo-400 px-4 py-2 text-sm font-medium hover:bg-indigo-500/25 transition shrink-0"
                >
                  {s.price === 0 ? 'Install' : `${s.price}P`}
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </div>
      <BottomNav />
    </main>
  );
}
