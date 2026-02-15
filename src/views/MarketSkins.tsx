import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { supabase } from '@/src/lib/supabase';
import { BottomNav } from '../components/BottomNav';

interface SkinItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  preview_url: string | null;
  rating: number;
  downloads: number;
  category: string | null;
}

const SKIN_COLORS = ['from-indigo-500/30 to-purple-500/20', 'from-amber-500/30 to-orange-500/20', 'from-cyan-500/30 to-blue-500/20', 'from-rose-500/30 to-pink-500/20'];

export default function MarketSkinsPage() {
  const [skins, setSkins] = useState<SkinItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('gyeol_skins' as any)
        .select('id, name, description, price, preview_url, rating, downloads, category')
        .eq('is_approved', true)
        .order('downloads', { ascending: false })
        .limit(50);
      setSkins((data as any[]) ?? []);
      setLoading(false);
    })();
  }, []);

  return (
    <main className="min-h-screen bg-black text-white/90 pb-24">
      <div className="max-w-md mx-auto p-6 space-y-6">
        <header>
          <h1 className="text-2xl font-bold">마켓</h1>
          <p className="text-sm text-white/50 mt-1">AI를 확장하는 스킬과 스킨</p>
        </header>

        <div className="flex gap-2">
          <Link
            to="/market/skills"
            className="flex-1 py-2.5 rounded-xl text-center text-sm font-medium bg-white/5 text-white/40 border border-transparent transition"
          >
            스킬
          </Link>
          <Link
            to="/market/skins"
            className="flex-1 py-2.5 rounded-xl text-center text-sm font-medium bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 transition"
          >
            스킨
          </Link>
        </div>

        {loading ? (
          <div className="flex flex-col items-center gap-2 py-12">
            <div className="w-6 h-6 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {skins.map((s, i) => (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.06 }}
                className="rounded-2xl bg-white/[0.03] border border-white/5 overflow-hidden"
              >
                <div className={`aspect-square bg-gradient-to-br ${SKIN_COLORS[i % SKIN_COLORS.length]} flex items-center justify-center`}>
                  <motion.div
                    className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm"
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: i * 0.5 }}
                  />
                </div>
                <div className="p-3 space-y-1.5">
                  <p className="font-medium text-white text-sm truncate">{s.name}</p>
                  <p className="text-[10px] text-white/40 truncate">{s.description ?? '-'}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-indigo-400 text-xs font-medium">
                      {s.price === 0 ? '무료' : `${s.price}P`}
                    </span>
                    <span className="text-[10px] text-white/30">★ {s.rating}</span>
                  </div>
                  <button
                    type="button"
                    className="w-full py-2 rounded-xl bg-indigo-500/15 text-indigo-400 text-xs font-medium hover:bg-indigo-500/25 transition"
                  >
                    사용
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
      <BottomNav />
    </main>
  );
}
