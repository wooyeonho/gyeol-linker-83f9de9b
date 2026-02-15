import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useInitAgent } from '@/src/hooks/useInitAgent';
import { supabase } from '@/src/lib/supabase';
import { BottomNav } from '../components/BottomNav';
import { TopNav } from '../components/TopNav';
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
const TYPE_COLOR: Record<string, string> = {
  learning: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
  reflection: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
  social: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
  proactive_message: 'bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400',
  skill_execution: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
  error: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
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
    <main className="min-h-screen bg-background font-display pb-24">
      <TopNav />
      <div className="max-w-md mx-auto p-6 pt-24 space-y-6">
        <header>
          <h1 className="text-2xl font-bold text-foreground">Activity Feed</h1>
          <p className="text-sm text-muted-foreground mt-1">What your AI did today</p>
        </header>

        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total', value: summary.total, icon: 'timeline' },
            { label: 'Learned', value: summary.learning, icon: 'school' },
            { label: 'Reflected', value: summary.reflection, icon: 'psychology' },
          ].map((s) => (
            <div key={s.label} className="section-card p-3 text-center">
              <span className="material-icons-round text-primary text-xl">{s.icon}</span>
              <p className="text-2xl font-bold text-foreground mt-1">{s.value}</p>
              <p className="text-[10px] text-muted-foreground mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {loading ? (
          <div className="flex flex-col items-center gap-2 py-12">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-16">
            <span className="material-icons-round text-5xl text-muted-foreground/30 mb-3">dark_mode</span>
            <p className="text-muted-foreground">No activity yet</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Autonomous AI actions will appear here</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {Object.entries(grouped).map(([date, items]) => (
              <div key={date} className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium px-1">{date}</p>
                {items.map((log, i) => (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="section-card flex items-start gap-3 p-4"
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${TYPE_COLOR[log.activity_type] ?? 'bg-secondary text-muted-foreground'}`}>
                      <span className="material-icons-round text-xl">{TYPE_ICON[log.activity_type] ?? 'info'}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{format(new Date(log.created_at), 'HH:mm')}</span>
                        <span className="text-xs text-foreground/70 font-medium">{TYPE_LABEL[log.activity_type] ?? log.activity_type}</span>
                        {log.was_sandboxed && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">Sandboxed</span>
                        )}
                      </div>
                      <p className="text-sm text-foreground/80 mt-1">{log.summary ?? '(no details)'}</p>
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
