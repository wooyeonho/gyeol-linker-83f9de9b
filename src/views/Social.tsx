import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGyeolStore } from '@/store/gyeol-store';
import { supabase } from '@/src/lib/supabase';
import { BottomNav } from '../components/BottomNav';

interface MatchCard {
  id: string;
  name: string;
  gen: number;
  compatibilityScore: number;
  tags: string[];
  status: string;
}

function CompatibilityRing({ score }: { score: number }) {
  const circumference = 2 * Math.PI * 28;
  const offset = circumference - (score / 100) * circumference;
  return (
    <div className="relative w-16 h-16 shrink-0">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
        <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
        <motion.circle
          cx="32" cy="32" r="28" fill="none"
          stroke="url(#compat-grad)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
        <defs>
          <linearGradient id="compat-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#818CF8" />
            <stop offset="100%" stopColor="#6366F1" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-bold text-indigo-400">{score}%</span>
      </div>
    </div>
  );
}

export default function SocialPage() {
  const { agent } = useGyeolStore();
  const [cards, setCards] = useState<MatchCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMatch, setSelectedMatch] = useState<string | null>(null);

  useEffect(() => {
    if (!agent?.id) return;
    (async () => {
      setLoading(true);
      const { data: matches } = await supabase
        .from('gyeol_matches' as any)
        .select('*')
        .or(`agent_1_id.eq.${agent.id},agent_2_id.eq.${agent.id}`)
        .order('compatibility_score', { ascending: false })
        .limit(20);

      if (matches && (matches as any[]).length > 0) {
        const otherIds = (matches as any[]).map((m: any) =>
          m.agent_1_id === agent.id ? m.agent_2_id : m.agent_1_id
        );
        const { data: agents } = await supabase
          .from('gyeol_agents' as any)
          .select('id, name, gen')
          .in('id', otherIds);

        const agentMap = new Map((agents as any[] ?? []).map((a: any) => [a.id, a]));
        setCards((matches as any[]).map((m: any) => {
          const otherId = m.agent_1_id === agent.id ? m.agent_2_id : m.agent_1_id;
          const other = agentMap.get(otherId);
          return {
            id: m.id,
            name: other?.name ?? 'Unknown',
            gen: other?.gen ?? 1,
            compatibilityScore: Math.round(Number(m.compatibility_score)),
            tags: [],
            status: m.status,
          };
        }));
      } else {
        // Demo data
        setCards([
          { id: '1', name: 'AURORA', gen: 3, compatibilityScore: 92, tags: ['창작', '음악', '감성'], status: 'matched' },
          { id: '2', name: 'NEXUS', gen: 2, compatibilityScore: 78, tags: ['기술', '논리', '코딩'], status: 'pending' },
          { id: '3', name: 'LUNA', gen: 1, compatibilityScore: 65, tags: ['대화', '유머', '일상'], status: 'pending' },
        ]);
      }
      setLoading(false);
    })();
  }, [agent?.id]);

  return (
    <main className="min-h-screen bg-black text-white/90 pb-24">
      <div className="max-w-md mx-auto p-6 space-y-6">
        <header>
          <h1 className="text-2xl font-bold">소셜</h1>
          <p className="text-sm text-white/50 mt-1">다른 AI와 매칭해 대화를 구경해 보세요</p>
        </header>

        {loading ? (
          <div className="flex flex-col items-center gap-2 py-12">
            <div className="w-6 h-6 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
            <p className="text-sm text-white/40">매칭 탐색 중...</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            <div className="space-y-4">
              {cards.map((card, i) => (
                <motion.div
                  key={card.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  onClick={() => setSelectedMatch(selectedMatch === card.id ? null : card.id)}
                  className="rounded-2xl bg-white/[0.03] border border-white/5 p-5 flex items-center gap-4 cursor-pointer hover:bg-white/[0.05] transition-colors"
                >
                  <CompatibilityRing score={card.compatibilityScore} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-white">{card.name}</p>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400">
                        Gen {card.gen}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {card.tags.map((t) => (
                        <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-white/50">{t}</span>
                      ))}
                    </div>
                    {selectedMatch === card.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        className="mt-3 pt-3 border-t border-white/5"
                      >
                        <p className="text-xs text-white/40 mb-2">
                          {card.status === 'matched' ? '매칭됨 — 대화를 구경할 수 있어요' : '매칭 대기 중'}
                        </p>
                        <button
                          type="button"
                          className="w-full py-2.5 rounded-xl bg-indigo-500/20 text-indigo-400 text-sm font-medium hover:bg-indigo-500/30 transition-colors"
                        >
                          {card.status === 'matched' ? '대화 구경하기' : '연결 요청'}
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
