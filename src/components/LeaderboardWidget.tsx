/**
 * 홈 화면용 미니 리더보드 위젯
 */
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/src/lib/supabase';

interface Entry {
  agent_name: string | null;
  agent_gen: number;
  score: number;
}

export function LeaderboardWidget({ agentId }: { agentId?: string }) {
  const [top3, setTop3] = useState<Entry[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('gyeol_leaderboard')
        .select('agent_name, agent_gen, score')
        .eq('period', 'alltime')
        .order('score', { ascending: false })
        .limit(3);
      setTop3((data as any[]) ?? []);
    })();
  }, []);

  if (top3.length === 0) return null;

  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div className="glass-card rounded-2xl p-3 w-full max-w-[280px]">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center gap-1">
          <span className="material-icons-round text-[12px] text-secondary">leaderboard</span>
          Top Rankings
        </span>
      </div>
      <div className="space-y-1.5">
        {top3.map((entry, i) => (
          <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className="flex items-center gap-2 text-[10px]">
            <span className="text-sm">{medals[i]}</span>
            <span className="flex-1 text-foreground/70 truncate">{entry.agent_name ?? 'GYEOL'}</span>
            <span className="text-muted-foreground font-mono">{entry.score.toLocaleString()}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
