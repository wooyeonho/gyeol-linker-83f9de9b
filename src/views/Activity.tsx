import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useInitAgent } from '@/src/hooks/useInitAgent';
import { supabase } from '@/src/lib/supabase';
import { BottomNav } from '../components/BottomNav';
import { format, isToday, isYesterday } from 'date-fns';
import type { AutonomousLog } from '@/lib/gyeol/types';

const TYPE_ICON: Record<string, string> = {
  learning: 'school', reflection: 'psychology', social: 'group',
  proactive_message: 'mail', skill_execution: 'build', error: 'shield',
};
const TYPE_LABEL: Record<string, string> = {
  learning: '학습', reflection: '성찰', social: '소셜',
  proactive_message: '자율 메시지', skill_execution: '스킬', error: '보안',
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  if (isToday(d)) return '오늘';
  if (isYesterday(d)) return '어제';
  return format(d, 'M월 d일');
}

export default function ActivityPage() {
  const { agent } = useInitAgent();
  const [logs, setLogs] = useState<AutonomousLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!agent?.id) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('gyeol_autonomous_logs' as any)
        .select('*').eq('agent_id', agent.id)
        .order('created_at', { ascending: false }).limit(50);
      setLogs((data as any[]) ?? []);
      setLoading(false);
    })();

    const channel = supabase
      .channel(`activity:${agent.id}`)
      .on('postgres_changes' as any,
        { event: 'INSERT', schema: 'public', table: 'gyeol_autonomous_logs', filter: `agent_id=eq.${agent.id}` },
        (payload: any) => { setLogs((prev) => [payload.new as AutonomousLog, ...prev]); }
      ).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [agent?.id]);

  const summary = {
    total: logs.length,
    learning: logs.filter((l) => l.activity_type === 'learning').length,
    reflection: logs.filter((l) => l.activity_type === 'reflection').length,
  };
  const grouped = logs.reduce<Record<string, AutonomousLog[]>>((acc, log) => {
    const key = formatDate(log.created_at);
    (acc[key] ??= []).push(log);
    return acc;
  }, {});

  return (
    <main className="min-h-screen bg-background font-display pb-20">
      <div className="max-w-md mx-auto p-5 pt-6 space-y-5">
        <header>
          <h1 className="text-xl font-bold text-foreground">활동 피드</h1>
          <p className="text-xs text-muted-foreground mt-1">AI가 자율적으로 수행한 활동</p>
        </header>

        <div className="grid grid-cols-3 gap-2">
          {[
            { label: '전체', value: summary.total, icon: 'timeline' },
            { label: '학습', value: summary.learning, icon: 'school' },
            { label: '성찰', value: summary.reflection, icon: 'psychology' },
          ].map((s) => (
            <div key={s.label} className="section-card !p-3 text-center">
              <span className="material-icons-round text-primary text-lg">{s.icon}</span>
              <p className="text-xl font-bold text-foreground mt-1">{s.value}</p>
              <p className="text-[9px] text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        {loading ? (
          <div className="flex flex-col items-center gap-2 py-12">
            <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-16">
            <span className="material-icons-round text-4xl text-muted-foreground/20 mb-3">dark_mode</span>
            <p className="text-sm text-muted-foreground">아직 활동이 없어요</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {Object.entries(grouped).map(([date, items]) => (
              <div key={date} className="space-y-2">
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider px-1">{date}</p>
                {items.map((log, i) => (
                  <motion.div key={log.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
                    className="section-card !p-3 flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="material-icons-round text-primary text-base">{TYPE_ICON[log.activity_type] ?? 'info'}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground">{format(new Date(log.created_at), 'HH:mm')}</span>
                        <span className="text-[10px] text-foreground/60 font-medium">{TYPE_LABEL[log.activity_type] ?? log.activity_type}</span>
                        {log.was_sandboxed && (
                          <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-500">Sandboxed</span>
                        )}
                      </div>
                      <p className="text-xs text-foreground/70 mt-1 leading-relaxed">{log.summary ?? '(상세 없음)'}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            ))}
          </AnimatePresence>
        )}
      </div>
      <BottomNav />
    </main>
  );
}
