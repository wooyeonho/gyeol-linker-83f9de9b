/**
 * 활동 통계 — 일별/주별 활동 차트 및 요약
 */
import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/src/integrations/supabase/client';

interface Props {
  agentId: string;
}

interface DayStats {
  date: string;
  count: number;
  types: Record<string, number>;
}

export function ActivityStats({ agentId }: Props) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const since = new Date();
      since.setDate(since.getDate() - 14);
      const { data } = await supabase
        .from('gyeol_autonomous_logs')
        .select('id, activity_type, created_at')
        .eq('agent_id', agentId)
        .gte('created_at', since.toISOString())
        .order('created_at', { ascending: true });
      setLogs((data ?? []) ?? []);
      setLoading(false);
    })();
  }, [agentId]);

  const dayStats = useMemo(() => {
    const map = new Map<string, DayStats>();
    logs.forEach(l => {
      const d = new Date(l.created_at).toLocaleDateString('ko', { month: 'numeric', day: 'numeric' });
      if (!map.has(d)) map.set(d, { date: d, count: 0, types: {} });
      const stat = map.get(d)!;
      stat.count++;
      stat.types[l.activity_type] = (stat.types[l.activity_type] ?? 0) + 1;
    });
    return Array.from(map.values()).slice(-7);
  }, [logs]);

  const maxCount = Math.max(1, ...dayStats.map(d => d.count));

  if (loading) return null;

  return (
    <div className="glass-card rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-[11px] font-bold text-foreground/80 flex items-center gap-1.5">
          <span aria-hidden="true" className="material-icons-round text-primary text-sm">bar_chart</span>
          주간 활동
        </h3>
        <span className="text-[9px] text-muted-foreground">최근 7일</span>
      </div>

      {dayStats.length === 0 ? (
        <p className="text-[10px] text-muted-foreground text-center py-4">활동 데이터가 없어요</p>
      ) : (
        <>
          {/* Bar chart */}
          <div className="flex items-end gap-1.5 h-20">
            {dayStats.map((day, i) => (
              <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                <motion.div
                  className="w-full rounded-t-sm bg-gradient-to-t from-primary to-primary/40"
                  initial={{ height: 0 }}
                  animate={{ height: `${(day.count / maxCount) * 100}%` }}
                  transition={{ duration: 0.4, delay: i * 0.05 }}
                  style={{ minHeight: day.count > 0 ? 4 : 0 }}
                />
                <span className="text-[7px] text-muted-foreground">{day.date}</span>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="flex items-center justify-between text-[9px] text-muted-foreground pt-1 border-t border-border/10">
            <span>총 {logs.length}건의 활동</span>
            <span>일 평균 {Math.round(logs.length / 7)}건</span>
          </div>
        </>
      )}
    </div>
  );
}
