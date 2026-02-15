import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { supabase } from '@/src/lib/supabase';
import { BottomNav } from '../components/BottomNav';
import { TopNav } from '../components/TopNav';

interface SkinItem {
  id: string; name: string; description: string | null; price: number;
  preview_url: string | null; rating: number; downloads: number; category: string | null;
}

const SKIN_COLORS = ['from-blue-500/30 to-indigo-500/20', 'from-amber-500/30 to-orange-500/20', 'from-cyan-500/30 to-teal-500/20', 'from-rose-500/30 to-pink-500/20'];

export default function MarketSkinsPage() {
  const [skins, setSkins] = useState<SkinItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase.from('gyeol_skins' as any)
        .select('id, name, description, price, preview_url, rating, downloads, category')
        .eq('is_approved', true).order('downloads', { ascending: false }).limit(50);
      setSkins((data as any[]) ?? []);
      setLoading(false);
    })();
  }, []);

  return (
    <main className="min-h-screen bg-background font-display pb-24">
      <TopNav />
      <div className="max-w-md mx-auto p-6 pt-24 space-y-6">
        <header>
          <h1 className="text-2xl font-bold text-foreground">Market</h1>
          <p className="text-sm text-muted-foreground mt-1">Expand your AI with skills and skins</p>
        </header>

        <div className="flex gap-2 section-card !p-1 !rounded-xl">
          <Link to="/market/skills"
            className="flex-1 py-2.5 rounded-lg text-center text-sm font-medium text-muted-foreground transition">
            Skills
          </Link>
          <Link to="/market/skins"
            className="flex-1 py-2.5 rounded-lg text-center text-sm font-medium bg-primary text-primary-foreground shadow-sm transition">
            Skins
          </Link>
        </div>

        {loading ? (
          <div className="flex flex-col items-center gap-2 py-12">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {skins.map((s, i) => (
              <motion.div key={s.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.06 }}
                className="section-card overflow-hidden !p-0">
                <div className={`aspect-square bg-gradient-to-br ${SKIN_COLORS[i % SKIN_COLORS.length]} flex items-center justify-center`}>
                  <motion.div className="w-12 h-12 rounded-full pearl-sphere"
                    animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: i * 0.5 }} />
                </div>
                <div className="p-3 space-y-1.5">
                  <p className="font-medium text-foreground text-sm truncate">{s.name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{s.description ?? '-'}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-primary text-xs font-medium">{s.price === 0 ? 'Free' : `${s.price}P`}</span>
                    <span className="text-[10px] text-muted-foreground">★ {s.rating}</span>
                  </div>
                  <button type="button" className="w-full py-2 rounded-xl bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition shadow-sm">
                    Apply
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
