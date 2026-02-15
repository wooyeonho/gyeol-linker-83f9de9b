import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { supabase } from '@/src/lib/supabase';
import { BottomNav } from '../components/BottomNav';

interface SkillItem {
  id: string; name: string; description: string | null; category: string | null;
  min_gen: number; price: number; rating: number; downloads: number;
}

export default function MarketSkillsPage() {
  const [skills, setSkills] = useState<SkillItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase.from('gyeol_skills' as any)
        .select('id, name, description, category, min_gen, price, rating, downloads')
        .eq('is_approved', true).order('downloads', { ascending: false }).limit(50);
      setSkills((data as any[]) ?? []);
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

        {/* Tab */}
        <div className="flex gap-1 bg-secondary/50 rounded-xl p-1">
          <Link to="/market/skills"
            className="flex-1 py-2 rounded-lg text-center text-xs font-medium bg-primary text-primary-foreground shadow-glow-xs transition">
            Skills
          </Link>
          <Link to="/market/skins"
            className="flex-1 py-2 rounded-lg text-center text-xs font-medium text-muted-foreground hover:text-foreground transition">
            Skins
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-2">
            {skills.map((s, i) => (
              <motion.div key={s.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                className="section-card !p-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="material-icons-round text-primary text-lg">extension</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="font-medium text-foreground text-sm">{s.name}</p>
                    {s.min_gen > 1 && <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">Gen {s.min_gen}+</span>}
                  </div>
                  <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">{s.description ?? '-'}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground">{s.category ?? 'Other'}</span>
                    <span className="text-[9px] text-muted-foreground">★ {s.rating} · {s.downloads}x</span>
                  </div>
                </div>
                <button type="button" className="rounded-lg bg-primary text-primary-foreground px-3 py-1.5 text-xs font-medium hover:brightness-110 transition shrink-0 shadow-glow-xs">
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
