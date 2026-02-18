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
  learning: 'Learning', reflection: 'Reflection', social: 'Social',
  proactive_message: 'Proactive', skill_execution: 'Skill', error: 'Security',
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  if (isToday(d)) return 'Today';
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'MMM d');
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
    <main className="min-h-screen bg-black font-display pb-16">
      <div className="max-w-md mx-auto px-5 pt-6 pb-4 space-y-5">
        <header>
          <h1 className="text-base font-semibold text-foreground/80">Activity</h1>
          <p className="text-[11px] text-white/20 mt-1">Autonomous activity feed</p>
        </header>

        <div className="flex gap-4">
          {[
            { label: 'Total', value: summary.total },
            { label: 'Learn', value: summary.learning },
            { label: 'Reflect', value: summary.reflection },
          ].map((s) => (
            <div key={s.label} className="flex-1 text-center">
              <p className="text-lg font-light text-foreground/70">{s.value}</p>
              <p className="text-[9px] text-white/20">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="h-px bg-white/[0.04]" />

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="void-dot" />
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-20">
            <div className="void-dot" />
            <p className="text-[11px] text-white/20 mt-4">No activity yet</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {Object.entries(grouped).map(([date, items]) => (
              <div key={date} className="space-y-1.5">
                <p className="text-[10px] text-white/15 font-medium tracking-wider px-1 mb-2">{date}</p>
                {items.map((log, i) => (
                  <motion.div key={log.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
                    className="flex items-start gap-3 py-2.5 border-b border-white/[0.03] last:border-0">
                    <div className="w-6 h-6 rounded-md bg-primary/[0.07] flex items-center justify-center shrink-0 mt-0.5">
                      <span className="material-icons-round text-primary/50 text-sm">{TYPE_ICON[log.activity_type] ?? 'info'}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-white/20">{format(new Date(log.created_at), 'HH:mm')}</span>
                        <span className="text-[10px] text-white/30">{TYPE_LABEL[log.activity_type] ?? log.activity_type}</span>
                        {log.was_sandboxed && (
                          <span className="text-[8px] px-1 py-0.5 rounded bg-amber-500/5 text-amber-500/50">sandbox</span>
                        )}
                      </div>
                      <p className="text-[12px] text-foreground/50 mt-1 leading-relaxed">{log.summary ?? '(no details)'}</p>
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
