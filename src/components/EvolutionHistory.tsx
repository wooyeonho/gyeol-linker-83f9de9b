/**
 * 진화 히스토리 — 진화 시도 기록 및 성공/실패 표시
 */
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/src/integrations/supabase/client';

interface EvolutionLog {
  id: string;
  created_at: string;
  activity_type: string;
  summary: string | null;
  details: any;
}

interface Props {
  agentId: string;
}

export function EvolutionHistory({ agentId }: Props) {
  const [logs, setLogs] = useState<EvolutionLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('gyeol_autonomous_logs')
        .select('id, created_at, activity_type, summary, details')
        .eq('agent_id', agentId)
        .in('activity_type', ['evolution', 'evolution_attempt', 'evolution_success', 'evolution_fail'])
        .order('created_at', { ascending: false })
        .limit(20);
      setLogs((data as any[]) ?? []);
      setLoading(false);
    })();
  }, [agentId]);

  if (loading) return null;

  return (
    <div className="glass-card rounded-2xl p-4 space-y-3">
      <h3 className="text-[11px] font-bold text-foreground/80 flex items-center gap-1.5">
        <span className="material-icons-round text-secondary text-sm">history</span>
        진화 기록
      </h3>

      {logs.length === 0 ? (
        <p className="text-[10px] text-muted-foreground text-center py-4">아직 진화 기록이 없어요</p>
      ) : (
        <div className="space-y-2 max-h-40 overflow-y-auto gyeol-scrollbar-hide">
          {logs.map((log, i) => {
            const success = log.activity_type.includes('success') || (log.details as any)?.success;
            return (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className="flex items-center gap-2.5"
              >
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                  success ? 'bg-[hsl(var(--success,142_71%_45%)/0.1)]' : 'bg-red-500/10'
                }`}>
                  <span className={`material-icons-round text-xs ${
                    success ? 'text-[hsl(var(--success,142_71%_45%))]' : 'text-red-400'
                  }`}>
                    {success ? 'arrow_upward' : 'close'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-foreground font-medium truncate">
                    {log.summary ?? (success ? '진화 성공!' : '진화 실패')}
                  </p>
                  <p className="text-[8px] text-muted-foreground">
                    {new Date(log.created_at).toLocaleDateString('ko', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                {(log.details as any)?.newGen && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
                    Gen {(log.details as any).newGen}
                  </span>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
