import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { supabase } from '@/src/lib/supabase';
import { BottomNav } from '../components/BottomNav';
import { TopNav } from '../components/TopNav';

interface SkillItem {
  id: string; name: string; description: string | null; category: string | null;
  min_gen: number; price: number; rating: number; downloads: number;
}

export default function MarketSkillsPage() {
  const [skills, setSkills] = useState<SkillItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'skills' | 'skins'>('skills');

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
    <main className="min-h-screen bg-background font-display pb-24">
      <TopNav />
      <div className="max-w-md mx-auto p-6 pt-24 space-y-6">
        <header>
          <h1 className="text-2xl font-bold text-foreground">Market</h1>
          <p className="text-sm text-muted-foreground mt-1">Expand your AI with skills and skins</p>
        </header>

        <div className="flex gap-2 section-card !p-1 !rounded-xl">
          <Link to="/market/skills" onClick={() => setTab('skills')}
            className={`flex-1 py-2.5 rounded-lg text-center text-sm font-medium transition ${tab === 'skills' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground'}`}>
            Skills
          </Link>
          <Link to="/market/skins" onClick={() => setTab('skins')}
            className={`flex-1 py-2.5 rounded-lg text-center text-sm font-medium transition ${tab === 'skins' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground'}`}>
            Skins
          </Link>
        </div>

        {loading ? (
          <div className="flex flex-col items-center gap-2 py-12">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-3">
            {skills.map((s, i) => (
              <motion.div key={s.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="section-card flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 flex items-center justify-center">
                  <span className="material-icons-round text-xl">extension</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-foreground">{s.name}</p>
                    {s.min_gen > 1 && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">Gen {s.min_gen}+</span>}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{s.description ?? '-'}</p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">{s.category ?? 'Other'}</span>
                    <span className="text-[10px] text-muted-foreground">★ {s.rating} · {s.downloads}x</span>
                  </div>
                </div>
                <button type="button" className="rounded-xl bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition shrink-0 shadow-sm">
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
