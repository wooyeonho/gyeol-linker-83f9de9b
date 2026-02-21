/**
 * Personality 변화 히스토리 — 시간별 Personality 변화 추이 차트
 */
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/src/integrations/supabase/client';

interface DeltaEntry {
  id: string;
  created_at: string;
  personality_delta: Record<string, number>;
  emotion_arc: string;
}

const STAT_COLORS: Record<string, string> = {
  warmth: 'hsl(0 70% 60%)',
  logic: 'hsl(210 70% 60%)',
  creativity: 'hsl(280 70% 60%)',
  energy: 'hsl(40 80% 60%)',
  humor: 'hsl(330 70% 60%)',
};

const STAT_LABELS: Record<string, string> = {
  warmth: 'Warmth', logic: 'Logic', creativity: 'Creativity', energy: 'Energy', humor: 'Humor',
};

interface Props {
  agentId: string;
}

export function PersonalityHistory({ agentId }: Props) {
  const [entries, setEntries] = useState<DeltaEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('gyeol_conversation_insights')
        .select('id, created_at, personality_delta, emotion_arc')
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false })
        .limit(20);
      setEntries((data ?? []).map(d => ({ ...d, personality_delta: d.personality_delta as unknown as Record<string, number> })));
      setLoading(false);
    })();
  }, [agentId]);

  if (loading) return null;
  if (entries.length === 0) {
    return (
      <div className="glass-card rounded-2xl p-4 text-center">
        <span className="text-2xl">📊</span>
        <p className="text-[11px] text-muted-foreground mt-2">아직 Personality 변화 데이터가 없어요</p>
      </div>
    );
  }

  // Aggregate totals per stat
  const totals: Record<string, number> = { warmth: 0, logic: 0, creativity: 0, energy: 0, humor: 0 };
  entries.forEach(e => {
    const d = e.personality_delta;
    if (d && typeof d === 'object') {
      Object.keys(totals).forEach(k => {
        totals[k] += (d as any)[k] ?? 0;
      });
    }
  });

  return (
    <div className="glass-card rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-[11px] font-bold text-foreground/80 flex items-center gap-1.5">
          <span aria-hidden="true" className="material-icons-round text-primary text-sm">timeline</span>
          Personality 변화 히스토리
        </h3>
        <span className="text-[9px] text-muted-foreground">{entries.length}건</span>
      </div>

      {/* Stat change summary */}
      <div className="grid grid-cols-5 gap-1.5">
        {Object.entries(totals).map(([stat, total]) => (
          <div key={stat} className="text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className={`text-sm font-bold ${total > 0 ? 'text-[hsl(var(--success,142_71%_45%))]' : total < 0 ? 'text-destructive' : 'text-muted-foreground'}`}
            >
              {total > 0 ? '+' : ''}{total}
            </motion.div>
            <p className="text-[8px] text-muted-foreground">{STAT_LABELS[stat]}</p>
          </div>
        ))}
      </div>

      {/* Recent changes list */}
      <div className="space-y-1.5 max-h-32 overflow-y-auto gyeol-scrollbar-hide">
        {entries.slice(0, 8).map((e, i) => {
          const d = e.personality_delta;
          const changes = Object.entries(d ?? {}).filter(([, v]) => (v as number) !== 0);
          if (changes.length === 0) return null;
          return (
            <motion.div
              key={e.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              className="flex items-center gap-2 text-[9px]"
            >
              <span className="text-muted-foreground/50 w-14 shrink-0">
                {new Date(e.created_at).toLocaleDateString('ko', { month: 'short', day: 'numeric' })}
              </span>
              <div className="flex gap-1 flex-wrap">
                {changes.map(([stat, val]) => (
                  <span
                    key={stat}
                    className={`px-1.5 py-0.5 rounded-full ${(val as number) > 0 ? 'bg-[hsl(var(--success,142_71%_45%)/0.1)] text-[hsl(var(--success,142_71%_45%))]' : 'bg-destructive/10 text-destructive'}`}
                  >
                    {STAT_LABELS[stat]} {(val as number) > 0 ? '+' : ''}{val as number}
                  </span>
                ))}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
