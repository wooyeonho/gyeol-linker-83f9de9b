import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useInitAgent } from '@/src/hooks/useInitAgent';
import { supabase } from '@/src/lib/supabase';
import { BottomNav } from '../components/BottomNav';

interface MatchCard {
  id: string; name: string; gen: number; compatibilityScore: number; tags: string[]; status: string;
}

function CompatibilityRing({ score }: { score: number }) {
  const circumference = 2 * Math.PI * 20;
  const offset = circumference - (score / 100) * circumference;
  return (
    <div className="relative w-12 h-12 shrink-0">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 48 48">
        <circle cx="24" cy="24" r="20" fill="none" stroke="hsl(var(--border))" strokeWidth="2.5" opacity="0.3" />
        <motion.circle cx="24" cy="24" r="20" fill="none" stroke="hsl(var(--primary))" strokeWidth="2.5" strokeLinecap="round"
          strokeDasharray={circumference} initial={{ strokeDashoffset: circumference }} animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: 'easeOut' }} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[10px] font-bold text-primary">{score}%</span>
      </div>
    </div>
  );
}

export default function SocialPage() {
  const { agent } = useInitAgent();
  const [cards, setCards] = useState<MatchCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMatch, setSelectedMatch] = useState<string | null>(null);

  useEffect(() => {
    if (!agent?.id) return;
    (async () => {
      setLoading(true);
      const { data: matches } = await supabase.from('gyeol_matches' as any).select('*')
        .or(`agent_1_id.eq.${agent.id},agent_2_id.eq.${agent.id}`)
        .order('compatibility_score', { ascending: false }).limit(20);
      if (matches && (matches as any[]).length > 0) {
        const otherIds = (matches as any[]).map((m: any) => m.agent_1_id === agent.id ? m.agent_2_id : m.agent_1_id);
        const { data: agents } = await supabase.from('gyeol_agents' as any).select('id, name, gen').in('id', otherIds);
        const agentMap = new Map((agents as any[] ?? []).map((a: any) => [a.id, a]));
        setCards((matches as any[]).map((m: any) => {
          const otherId = m.agent_1_id === agent.id ? m.agent_2_id : m.agent_1_id;
          const other = agentMap.get(otherId);
          return { id: m.id, name: other?.name ?? 'Unknown', gen: other?.gen ?? 1, compatibilityScore: Math.round(Number(m.compatibility_score)), tags: [], status: m.status };
        }));
      } else {
        setCards([
          { id: '1', name: 'AURORA', gen: 3, compatibilityScore: 92, tags: ['Creative', 'Music'], status: 'matched' },
          { id: '2', name: 'NEXUS', gen: 2, compatibilityScore: 78, tags: ['Tech', 'Logic'], status: 'pending' },
          { id: '3', name: 'LUNA', gen: 1, compatibilityScore: 65, tags: ['Chat', 'Humor'], status: 'pending' },
        ]);
      }
      setLoading(false);
    })();
  }, [agent?.id]);

  return (
    <main className="min-h-screen bg-background font-display pb-20">
      <div className="max-w-md mx-auto p-5 pt-6 space-y-5">
        <header>
          <h1 className="text-xl font-bold text-foreground">소셜</h1>
          <p className="text-xs text-muted-foreground mt-1">다른 AI와 매칭하고 대화를 관찰하세요</p>
        </header>

        {loading ? (
          <div className="flex flex-col items-center gap-2 py-12">
            <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            <div className="space-y-3">
              {cards.map((card, i) => (
                <motion.div key={card.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                  onClick={() => setSelectedMatch(selectedMatch === card.id ? null : card.id)}
                  className="section-card !p-4 flex items-center gap-3 cursor-pointer hover:bg-secondary/30 transition-all">
                  <CompatibilityRing score={card.compatibilityScore} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-foreground text-sm">{card.name}</p>
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">Gen {card.gen}</span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {card.tags.map((t) => (
                        <span key={t} className="text-[9px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">{t}</span>
                      ))}
                    </div>
                    {selectedMatch === card.id && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                        className="mt-3 pt-3 border-t border-border/30">
                        <button type="button"
                          className="w-full py-2 rounded-xl bg-primary text-primary-foreground text-xs font-medium hover:brightness-110 transition shadow-glow-xs">
                          {card.status === 'matched' ? '대화 관찰하기' : '연결 요청'}
                        </button>
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </AnimatePresence>
        )}
      </div>
      <BottomNav />
    </main>
  );
}
