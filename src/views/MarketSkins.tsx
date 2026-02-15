import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { supabase } from '@/src/lib/supabase';
import { BottomNav } from '../components/BottomNav';

interface SkinItem {
  id: string; name: string; description: string | null; price: number;
  preview_url: string | null; rating: number; downloads: number; category: string | null;
}

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
    <main className="min-h-screen bg-background font-display pb-20">
      <div className="max-w-md mx-auto p-5 pt-6 space-y-5">
        <header>
          <h1 className="text-xl font-bold text-foreground">마켓</h1>
          <p className="text-xs text-muted-foreground mt-1">AI에 새로운 능력을 추가하세요</p>
        </header>

        <div className="flex gap-1 bg-secondary/50 rounded-xl p-1">
          <Link to="/market/skills"
            className="flex-1 py-2 rounded-lg text-center text-xs font-medium text-muted-foreground hover:text-foreground transition">
            Skills
          </Link>
          <Link to="/market/skins"
            className="flex-1 py-2 rounded-lg text-center text-xs font-medium bg-primary text-primary-foreground shadow-glow-xs transition">
            Skins
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5">
            {skins.map((s, i) => (
              <motion.div key={s.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}
                className="section-card !p-0 overflow-hidden">
                <div className="aspect-square bg-gradient-to-br from-primary/15 to-accent/10 flex items-center justify-center">
                  <motion.div className="w-10 h-10 rounded-full pearl-sphere"
                    animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: i * 0.4 }} />
                </div>
                <div className="p-3 space-y-1.5">
                  <p className="font-medium text-foreground text-xs truncate">{s.name}</p>
                  <p className="text-[9px] text-muted-foreground truncate">{s.description ?? '-'}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-primary text-[10px] font-medium">{s.price === 0 ? 'Free' : `${s.price}P`}</span>
                    <span className="text-[9px] text-muted-foreground">★ {s.rating}</span>
                  </div>
                  <button type="button" className="w-full py-1.5 rounded-lg bg-primary text-primary-foreground text-[10px] font-medium hover:brightness-110 transition shadow-glow-xs">
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
