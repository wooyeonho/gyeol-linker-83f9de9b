/**
 * 데이터 시각화 차트 컴포넌트 — 대화 통계, 성격 변화 추이
 */
import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/src/integrations/supabase/client';

interface Props {
  agentId: string;
}

interface DayData {
  date: string;
  conversations: number;
  intimacy: number;
}

export function DataVisualization({ agentId }: Props) {
  const [data, setData] = useState<DayData[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'conversations' | 'personality'>('conversations');

  useEffect(() => {
    (async () => {
      const since = new Date();
      since.setDate(since.getDate() - 14);
      const { data: convs } = await supabase
        .from('gyeol_conversations')
        .select('created_at')
        .eq('agent_id', agentId)
        .eq('role', 'user')
        .gte('created_at', since.toISOString())
        .order('created_at', { ascending: true });

      const map = new Map<string, number>();
      (convs ?? []).forEach((c: any) => {
        const d = new Date(c.created_at).toLocaleDateString('ko', { month: 'numeric', day: 'numeric' });
        map.set(d, (map.get(d) ?? 0) + 1);
      });

      const days: DayData[] = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const label = date.toLocaleDateString('ko', { month: 'numeric', day: 'numeric' });
        days.push({ date: label, conversations: map.get(label) ?? 0, intimacy: 0 });
      }
      setData(days);
      setLoading(false);
    })();
  }, [agentId]);

  const maxConv = Math.max(1, ...data.map(d => d.conversations));
  const totalConv = data.reduce((s, d) => s + d.conversations, 0);
  const avgConv = data.length > 0 ? Math.round(totalConv / data.length) : 0;
  const maxDay = data.reduce((max, d) => d.conversations > max.conversations ? d : max, data[0] ?? { date: '-', conversations: 0 });

  if (loading) return null;

  return (
    <div className="glass-card rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-[11px] font-bold text-foreground/80 flex items-center gap-1.5">
          <span aria-hidden="true" className="material-icons-round text-primary text-sm">insights</span>
          대화 인사이트
        </h3>
        <div className="flex gap-1">
          {(['conversations', 'personality'] as const).map(v => (
            <button key={v} onClick={() => setView(v)}
              className={`px-2 py-0.5 rounded-md text-[8px] font-medium transition ${
                view === v ? 'bg-primary/20 text-primary' : 'text-muted-foreground'
              }`}>
              {v === 'conversations' ? '대화량' : '성격 변화'}
            </button>
          ))}
        </div>
      </div>

      {view === 'conversations' && (
        <>
          {/* Stats summary */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: '총 대화', value: totalConv, icon: 'chat' },
              { label: '일평균', value: avgConv, icon: 'show_chart' },
              { label: '최다', value: `${maxDay?.date ?? '-'}`, icon: 'star' },
            ].map(s => (
              <div key={s.label} className="text-center p-2 rounded-lg bg-muted/10">
                <span aria-hidden="true" className="material-icons-round text-primary/60 text-xs">{s.icon}</span>
                <p className="text-sm font-bold text-foreground mt-0.5">{s.value}</p>
                <p className="text-[7px] text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Bar chart */}
          <div className="flex items-end gap-1.5 h-16">
            {data.map((day, i) => (
              <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                <motion.div
                  className="w-full rounded-t-sm bg-gradient-to-t from-primary to-primary/40"
                  initial={{ height: 0 }}
                  animate={{ height: `${(day.conversations / maxConv) * 100}%` }}
                  transition={{ duration: 0.4, delay: i * 0.05 }}
                  style={{ minHeight: day.conversations > 0 ? 4 : 0 }}
                />
                <span className="text-[6px] text-muted-foreground">{day.date}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {view === 'personality' && (
        <div className="text-center py-4">
          <span aria-hidden="true" className="material-icons-round text-2xl text-muted-foreground/20">psychology</span>
          <p className="text-[10px] text-muted-foreground mt-2">대화가 쌓이면 성격 변화 추이가 표시됩니다</p>
        </div>
      )}
    </div>
  );
}
