import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useInitAgent } from '@/src/hooks/useInitAgent';
import { supabase } from '@/src/lib/supabase';
import { BottomNav } from '../components/BottomNav';
import { format, isToday, isYesterday } from 'date-fns';
import type { AutonomousLog } from '@/lib/gyeol/types';

const TYPE_ICON: Record<string, string> = {
  learning: '📚',
  reflection: '💭',
  social: '🤝',
  proactive_message: '💌',
  skill_execution: '⚙️',
  error: '🛡️',
};

const TYPE_LABEL: Record<string, string> = {
  learning: 'Learning',
  reflection: 'Reflection',
  social: 'Social',
  proactive_message: 'Proactive',
  skill_execution: 'Skill',
  error: 'Security',
};

const TYPE_COLOR: Record<string, string> = {
  learning: 'from-blue-500/20 to-blue-500/5 border-blue-500/20',
  reflection: 'from-purple-500/20 to-purple-500/5 border-purple-500/20',
  social: 'from-green-500/20 to-green-500/5 border-green-500/20',
  proactive_message: 'from-pink-500/20 to-pink-500/5 border-pink-500/20',
  skill_execution: 'from-amber-500/20 to-amber-500/5 border-amber-500/20',
  error: 'from-red-500/20 to-red-500/5 border-red-500/20',
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
        .select('*')
        .eq('agent_id', agent.id)
        .order('created_at', { ascending: false })
        .limit(50);
      setLogs((data as any[]) ?? []);
      setLoading(false);
    })();

    const channel = supabase
      .channel(`activity:${agent.id}`)
      .on(
        'postgres_changes' as any,
        { event: 'INSERT', schema: 'public', table: 'gyeol_autonomous_logs', filter: `agent_id=eq.${agent.id}` },
        (payload: any) => {
          setLogs((prev) => [payload.new as AutonomousLog, ...prev]);
        }
      )
      .subscribe();

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
    <main className="min-h-screen bg-black text-white/90 pb-24">
      <div className="max-w-md mx-auto p-6 space-y-6">
        <header>
          <h1 className="text-2xl font-bold">Activity Feed</h1>
          <p className="text-sm text-white/50 mt-1">What your AI did today</p>
        </header>

        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total', value: summary.total, color: 'text-indigo-400' },
            { label: 'Learned', value: summary.learning, color: 'text-blue-400' },
            { label: 'Reflected', value: summary.reflection, color: 'text-purple-400' },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl bg-white/5 border border-white/5 p-3 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-white/40 mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {loading ? (
          <div className="flex flex-col items-center gap-2 py-12">
            <div className="w-6 h-6 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
            <p className="text-sm text-white/40">Loading...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">🌙</p>
            <p className="text-white/50">No activity yet</p>
            <p className="text-xs text-white/30 mt-1">Autonomous AI actions will appear here</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {Object.entries(grouped).map(([date, items]) => (
              <div key={date} className="space-y-2">
                <p className="text-xs text-white/30 font-medium px-1">{date}</p>
                {items.map((log, i) => (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className={`flex items-start gap-3 rounded-2xl bg-gradient-to-br ${TYPE_COLOR[log.activity_type] ?? 'from-white/5 to-white/[0.02] border-white/5'} border p-4`}
                  >
                    <span className="text-xl mt-0.5">{TYPE_ICON[log.activity_type] ?? '•'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-white/40">
                          {format(new Date(log.created_at), 'HH:mm')}
                        </span>
                        <span className="text-xs text-white/50 font-medium">
                          {TYPE_LABEL[log.activity_type] ?? log.activity_type}
                        </span>
                        {log.was_sandboxed && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400">Sandboxed</span>
                        )}
                      </div>
                      <p className="text-sm text-white/80 mt-1">{log.summary ?? '(no details)'}</p>
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
