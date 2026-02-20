import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useInitAgent } from '@/src/hooks/useInitAgent';
import { supabase } from '@/src/integrations/supabase/client';
import { BottomNav } from '../components/BottomNav';
import { format, isToday, isYesterday } from 'date-fns';

interface ActivityLog {
  id: string;
  activity_type: string;
  summary: string | null;
  created_at: string;
  was_sandboxed: boolean;
  details: Record<string, unknown>;
}

const TYPE_ICON: Record<string, string> = {
  learning: 'school', reflection: 'psychology', social: 'group',
  proactive_message: 'mail', skill_execution: 'build', error: 'shield',
  heartbeat: 'favorite',
};
const TYPE_LABEL: Record<string, string> = {
  learning: 'Learning', reflection: 'Reflection', social: 'Social',
  proactive_message: 'Proactive', skill_execution: 'Skill', error: 'Security',
  heartbeat: 'Heartbeat',
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  if (isToday(d)) return 'Today';
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'MMM d');
}

export default function ActivityPage() {
  const { agent } = useInitAgent();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [learnCount, setLearnCount] = useState(0);
  const [reflectCount, setReflectCount] = useState(0);
  const [showLogs, setShowLogs] = useState(false);
  const [chartMode, setChartMode] = useState<'weekly' | 'monthly'>('weekly');

  useEffect(() => {
    if (!agent?.id) return;

    const fetchLogs = async () => {
      setLoading(true);
      const [logsRes, learnRes, reflectRes] = await Promise.all([
        supabase.from('gyeol_autonomous_logs').select('*').eq('agent_id', agent.id).order('created_at', { ascending: false }).limit(50),
        supabase.from('gyeol_learned_topics').select('id', { count: 'exact', head: true }).eq('agent_id', agent.id),
        supabase.from('gyeol_reflections').select('id', { count: 'exact', head: true }).eq('agent_id', agent.id),
      ]);
      setLogs((logsRes.data as ActivityLog[]) ?? []);
      setLearnCount(learnRes.count ?? 0);
      setReflectCount(reflectRes.count ?? 0);
      setLoading(false);
    };
    fetchLogs();

    const channel = supabase
      .channel(`activity:${agent.id}`)
      .on(
        'postgres_changes' as any,
        { event: 'INSERT', schema: 'public', table: 'gyeol_autonomous_logs', filter: `agent_id=eq.${agent.id}` },
        (payload: any) => { setLogs((prev) => [payload.new as ActivityLog, ...prev]); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [agent?.id]);

  const grouped = useMemo(() =>
    logs.reduce<Record<string, ActivityLog[]>>((acc, log) => {
      const key = formatDate(log.created_at);
      (acc[key] ??= []).push(log);
      return acc;
    }, {}), [logs]);

  const interactionScore = agent?.total_conversations ? agent.total_conversations * 10 : 0;
  const growthLevel = agent?.gen ? agent.gen * 10 + 2 : 1;
  const learningGrowth = logs.filter(l => l.activity_type === 'learning').length > 0 ? 12 : 0;

  return (
    <main className="min-h-screen bg-background font-display pb-16 relative">
      <div className="aurora-bg" />
      <div className="max-w-md mx-auto px-5 pt-6 pb-4 space-y-4 relative z-10">
        {/* Stitch header */}
        <div className="flex items-end justify-between mb-2">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Activity & Growth</h1>
            <p className="text-sm text-slate-400 mt-1">Track your interaction depth and shared journey.</p>
          </div>
        </div>

        {/* Stat Cards — Interaction Score + Total Growth */}
        <div className="grid grid-cols-2 gap-3">
          {/* Interaction Score */}
          <div className="glass-card rounded-2xl p-4 relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="material-icons-round text-primary/50 text-lg">bolt</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-secondary/10 text-secondary font-bold">
                +{learningGrowth}%
              </span>
            </div>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider">Interaction Score</p>
            <p className="text-2xl font-bold text-foreground mt-1 whitespace-nowrap">
              {interactionScore}
              <span className="text-[11px] font-normal text-slate-400 ml-1">pts</span>
            </p>
            <div className="w-full h-1 rounded-full bg-white/[0.06] mt-3">
              <div className="h-full rounded-full bg-gradient-to-r from-primary to-secondary" style={{ width: '72%' }} />
            </div>
            <p className="text-[9px] text-slate-500 mt-1 text-right">High Resonance</p>
          </div>

          {/* Total Growth */}
          <div className="glass-card rounded-2xl p-4 relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="material-icons-round text-secondary/50 text-lg">trending_up</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
                Lv. {growthLevel}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider">Total Growth</p>
            <p className="text-2xl font-bold text-foreground mt-1 whitespace-nowrap">
              Lv.{growthLevel}
            </p>
            <p className="text-[9px] text-slate-400 mt-1 leading-tight">
              <strong className="text-foreground">Deep Empathy</strong> unlocked
            </p>
            <div className="flex gap-1 mt-2">
              {[1,2,3,4,5].map(g => (
                <div key={g} className={`flex-1 h-1 rounded-full ${g <= (agent?.gen ?? 1) ? 'bg-gradient-to-r from-primary to-secondary' : 'bg-white/[0.06]'}`} />
              ))}
            </div>
          </div>
        </div>

        {/* Interaction Volume Chart */}
        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-foreground">Interaction Volume</h3>
              <p className="text-[10px] text-slate-400">Daily conversation density</p>
            </div>
            <div className="flex gap-1 glass-card rounded-lg p-0.5">
              <button onClick={() => setChartMode('weekly')}
                className={`px-3 py-1 rounded-md text-[10px] font-medium transition ${
                  chartMode === 'weekly' ? 'bg-gradient-to-r from-primary to-secondary text-white' : 'text-slate-400'
                }`}>Weekly</button>
              <button onClick={() => setChartMode('monthly')}
                className={`px-3 py-1 rounded-md text-[10px] font-medium transition ${
                  chartMode === 'monthly' ? 'bg-gradient-to-r from-primary to-secondary text-white' : 'text-slate-400'
                }`}>Monthly</button>
            </div>
          </div>
          <div className="flex items-end gap-2 h-32 mt-2">
            {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((day, i) => {
              const height = [40, 55, 35, 60, 80, 45, 70][i];
              return (
                <div key={day} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full rounded-t-md bg-gradient-to-t from-primary/60 to-primary/20 transition-all"
                    style={{ height: `${height}%` }} />
                  <span className="text-[8px] text-slate-500">{day}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Activity Levels Heatmap + Recent Memories */}
        <div className="grid grid-cols-2 gap-3">
          {/* Activity Levels */}
          <div className="glass-card rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-foreground">Activity Levels</h3>
              <div className="flex items-center gap-1 text-[8px] text-slate-500">
                <span>Less</span>
                {[0.1, 0.25, 0.5, 0.75, 1].map((o, i) => (
                  <div key={i} className="w-2.5 h-2.5 rounded-full" style={{ background: `rgba(120,78,218,${o})` }} />
                ))}
                <span>More</span>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({length: 28}).map((_, i) => (
                <div key={i} className="w-full aspect-square rounded-sm"
                  style={{ background: `rgba(120,78,218,${Math.random() * 0.8 + 0.05})` }} />
              ))}
            </div>
          </div>

          {/* Recent Memories */}
          <div className="glass-card rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-foreground">Recent Memories</h3>
              <button className="text-[10px] text-secondary">View All</button>
            </div>
            <div className="space-y-3">
              {logs.slice(0, 3).map(log => (
                <div key={log.id} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="material-icons-round text-primary text-sm">{TYPE_ICON[log.activity_type] ?? 'info'}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium text-foreground truncate">{TYPE_LABEL[log.activity_type] ?? log.activity_type}</p>
                    <p className="text-[9px] text-slate-500">{formatDate(log.created_at)}</p>
                  </div>
                </div>
              ))}
              {logs.length === 0 && (
                <p className="text-[10px] text-slate-500 text-center py-2">No activity yet</p>
              )}
            </div>
          </div>
        </div>

        {/* Collapsible Activity Log */}
        <button onClick={() => setShowLogs(!showLogs)} className="flex items-center gap-2 text-[11px] text-slate-400 mt-2">
          <span className="material-icons-round text-[14px]">{showLogs ? 'expand_less' : 'expand_more'}</span>
          {showLogs ? 'Hide' : 'Show'} Activity Log
        </button>

        {showLogs && (
          <>
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="void-dot" />
              </div>
            ) : logs.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-10">
                <div className="void-dot" />
                <p className="text-[11px] text-white/20 mt-4">No activity yet</p>
              </div>
            ) : (
              <AnimatePresence mode="popLayout">
                {Object.entries(grouped).map(([date, items]) => (
                  <div key={date} className="space-y-2 mb-4">
                    <p className="text-[10px] text-slate-500 font-medium tracking-wider px-1">{date}</p>
                    <div className="glass-card rounded-2xl p-4">
                      {items.map((log, i) => (
                        <motion.div key={log.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
                          className="flex items-start gap-3 py-3 border-b border-white/[0.04] last:border-0">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                            log.activity_type === 'heartbeat' ? 'bg-rose-500/[0.07]' : 'bg-primary/[0.07]'
                          }`}>
                            <span className={`material-icons-round text-sm ${
                              log.activity_type === 'heartbeat' ? 'text-rose-500/50' : 'text-primary/50'
                            }`}>{TYPE_ICON[log.activity_type] ?? 'info'}</span>
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
                  </div>
                ))}
              </AnimatePresence>
            )}
          </>
        )}
      </div>
      <BottomNav />
    </main>
  );
}