import { useEffect, useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useInitAgent } from '@/src/hooks/useInitAgent';
import { supabase } from '@/src/integrations/supabase/client';
import { BottomNav } from '../components/BottomNav';
import { PullToRefresh } from '@/src/components/PullToRefresh';
import { ActivityFilter } from '@/src/components/ActivityFilter';
import { ActivityExport } from '@/src/components/ActivityExport';
import { Breadcrumbs, ActivityExportButton, ActivitySummary } from '@/src/components/NavigationDeep';
import { format, isToday, isYesterday } from 'date-fns';

interface ActivityLog {
  id: string;
  activity_type: string;
  summary: string | null;
  created_at: string;
  was_sandboxed: boolean;
  details: Record<string, unknown>;
  security_flags?: string[] | null;
  source?: string | null;
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

const SEVERITY_COLOR: Record<string, string> = {
  error: 'text-destructive bg-destructive/10',
  warning: 'text-[hsl(var(--warning))] bg-[hsl(var(--warning)/0.1)]',
  info: 'text-primary bg-primary/10',
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  if (isToday(d)) return 'Today';
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'MMM d');
}

type FilterType = 'all' | 'learning' | 'reflection' | 'social' | 'proactive_message' | 'skill_execution' | 'error' | 'heartbeat';

export default function ActivityPage() {
  const { agent } = useInitAgent();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [learnCount, setLearnCount] = useState(0);
  const [reflectCount, setReflectCount] = useState(0);
  const [showLogs, setShowLogs] = useState(false);
  const [chartMode, setChartMode] = useState<'weekly' | 'monthly'>('weekly');
  const [filter, setFilter] = useState<FilterType>('all');
  const [activitySearch, setActivitySearch] = useState('');
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState(false);

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
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'gyeol_autonomous_logs', filter: `agent_id=eq.${agent.id}` },
        (payload: any) => { setLogs((prev) => [payload.new as ActivityLog, ...prev]); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [agent?.id]);

  const filteredLogs = useMemo(() => {
    let result = filter === 'all' ? logs : logs.filter(l => l.activity_type === filter);
    if (activitySearch.trim()) {
      const q = activitySearch.toLowerCase();
      result = result.filter(l => (l.summary ?? '').toLowerCase().includes(q) || l.activity_type.toLowerCase().includes(q));
    }
    return result;
  }, [logs, filter, activitySearch]);

  const grouped = useMemo(() =>
    filteredLogs.reduce<Record<string, ActivityLog[]>>((acc, log) => {
      const key = formatDate(log.created_at);
      (acc[key] ??= []).push(log);
      return acc;
    }, {}), [filteredLogs]);

  const securityLogs = useMemo(() =>
    logs.filter(l => l.activity_type === 'error' || (l.security_flags && l.security_flags.length > 0)),
  [logs]);

  const interactionScore = agent?.total_conversations ? agent.total_conversations * 10 : 0;
  const growthLevel = agent?.gen ? agent.gen * 10 + 2 : 1;
  const learningGrowth = logs.filter(l => l.activity_type === 'learning').length > 0 ? 12 : 0;

  const handleRefresh = useCallback(async () => {
    if (!agent?.id) return;
    const [logsRes] = await Promise.all([
      supabase.from('gyeol_autonomous_logs').select('*').eq('agent_id', agent.id).order('created_at', { ascending: false }).limit(50),
    ]);
    setLogs((logsRes.data as ActivityLog[]) ?? []);
  }, [agent?.id]);

  const filterOptions: { key: FilterType; label: string; icon: string }[] = [
    { key: 'all', label: 'All', icon: 'dashboard' },
    { key: 'learning', label: 'Learn', icon: 'school' },
    { key: 'reflection', label: 'Reflect', icon: 'psychology' },
    { key: 'error', label: 'Security', icon: 'shield' },
    { key: 'skill_execution', label: 'Skills', icon: 'build' },
  ];

  return (
    <main role="main" className="flex flex-col min-h-[100dvh] bg-background font-display relative">
      {/* aurora-bg removed — home only */}
      <PullToRefresh onRefresh={handleRefresh} className="flex-1 overflow-y-auto max-w-md mx-auto px-5 pt-6 pb-24 space-y-4 relative z-10">
        {/* B24: Breadcrumbs */}
        <Breadcrumbs items={[{ label: 'Home', path: '/' }, { label: 'Activity' }]} />

        {/* Header */}
        <div className="flex items-end justify-between mb-2">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Activity & Growth</h1>
            <p className="text-sm text-muted-foreground mt-1">Track your interaction depth and shared journey.</p>
          </div>
          <div className="flex items-center gap-2">
            <ActivityExportButton onExport={(format) => { setExportOpen(true); }} />
            <button onClick={() => setExportOpen(true)}
              className="w-8 h-8 rounded-full flex items-center justify-center glass-card text-muted-foreground hover:text-primary transition">
              <span aria-hidden="true" className="material-icons-round text-sm">download</span>
            </button>
          </div>
        </div>

        {/* B29: Activity Summary */}
        <ActivitySummary data={{
          chats: agent?.total_conversations ?? 0,
          exp: interactionScore,
          coins: 0,
          quests: 0,
          streak: 0,
        }} />

        {/* Stat Cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="glass-card rounded-2xl p-4 relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span aria-hidden="true" className="material-icons-round text-primary/50 text-lg">bolt</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-secondary/10 text-secondary font-bold">+{learningGrowth}%</span>
            </div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Interaction Score</p>
            <p className="text-2xl font-bold text-foreground mt-1 whitespace-nowrap">{interactionScore}<span className="text-[11px] font-normal text-muted-foreground ml-1">pts</span></p>
            <div className="w-full h-1 rounded-full bg-foreground/[0.06] mt-3">
              <div className="h-full rounded-full bg-gradient-to-r from-primary to-secondary" style={{ width: '72%' }} />
            </div>
            <p className="text-[9px] text-muted-foreground mt-1 text-right">High Resonance</p>
          </div>
          <div className="glass-card rounded-2xl p-4 relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span aria-hidden="true" className="material-icons-round text-secondary/50 text-lg">trending_up</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold">Lv. {growthLevel}</span>
            </div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Growth</p>
            <p className="text-2xl font-bold text-foreground mt-1 whitespace-nowrap">Lv.{growthLevel}</p>
            <p className="text-[9px] text-muted-foreground mt-1 leading-tight"><strong className="text-foreground">Deep Empathy</strong> unlocked</p>
            <div className="flex gap-1 mt-2">
              {[1,2,3,4,5].map(g => (
                <div key={g} className={`flex-1 h-1 rounded-full ${g <= (agent?.gen ?? 1) ? 'bg-gradient-to-r from-primary to-secondary' : 'bg-foreground/[0.06]'}`} />
              ))}
            </div>
          </div>
        </div>

        {/* Security Audit Summary */}
        {securityLogs.length > 0 && (
          <div className="glass-card rounded-2xl p-4 border border-[hsl(var(--warning))]/20">
            <div className="flex items-center gap-2 mb-3">
              <span aria-hidden="true" className="material-icons-round text-[hsl(var(--warning))] text-lg">security</span>
              <h3 className="text-sm font-bold text-foreground">Security Audit</h3>
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[hsl(var(--warning)/0.1)] text-[hsl(var(--warning))] font-medium">{securityLogs.length} events</span>
            </div>
            <div className="space-y-2">
              {securityLogs.slice(0, 3).map(log => (
                <div key={log.id} className="flex items-start gap-2">
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                    log.security_flags?.length ? 'bg-destructive/10' : 'bg-[hsl(var(--warning)/0.1)]'
                  }`}>
                    <span className={`material-icons-round text-xs ${
                      log.security_flags?.length ? 'text-destructive' : 'text-[hsl(var(--warning))]'
                    }`}>
                      {log.security_flags?.length ? 'warning' : 'info'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-foreground truncate">{log.summary ?? 'Security event'}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[9px] text-muted-foreground">{format(new Date(log.created_at), 'HH:mm')}</span>
                      {log.security_flags?.map(flag => (
                        <span key={flag} className="text-[8px] px-1 py-0.5 rounded bg-destructive/10 text-destructive">{flag}</span>
                      ))}
                      {log.was_sandboxed && (
                        <span className="text-[8px] px-1 py-0.5 rounded bg-[hsl(var(--warning)/0.1)] text-[hsl(var(--warning))]">sandboxed</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Interaction Volume Chart */}
        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-foreground">Interaction Volume</h3>
              <p className="text-[10px] text-muted-foreground">Daily conversation density</p>
            </div>
            <div className="flex gap-1 glass-card rounded-lg p-0.5">
              <button onClick={() => setChartMode('weekly')}
                className={`px-3 py-1 rounded-md text-[10px] font-medium transition ${chartMode === 'weekly' ? 'bg-gradient-to-r from-primary to-secondary text-primary-foreground' : 'text-muted-foreground'}`}>Weekly</button>
              <button onClick={() => setChartMode('monthly')}
                className={`px-3 py-1 rounded-md text-[10px] font-medium transition ${chartMode === 'monthly' ? 'bg-gradient-to-r from-primary to-secondary text-primary-foreground' : 'text-muted-foreground'}`}>Monthly</button>
            </div>
          </div>
          <div className="flex items-end gap-2 h-32 mt-2">
            {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((day, i) => {
              const height = [40, 55, 35, 60, 80, 45, 70][i];
              return (
                <div key={day} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full rounded-t-md bg-gradient-to-t from-primary/60 to-primary/20 transition-all" style={{ height: `${height}%` }} />
                  <span className="text-[8px] text-muted-foreground">{day}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Activity Levels + Recent Memories */}
        <div className="grid grid-cols-2 gap-3">
          <div className="glass-card rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-foreground">Activity Levels</h3>
              <div className="flex items-center gap-1 text-[8px] text-muted-foreground">
                <span>Less</span>
                {[0.1, 0.25, 0.5, 0.75, 1].map((o, i) => (
                  <div key={i} className="w-2.5 h-2.5 rounded-full" style={{ background: `rgba(120,78,218,${o})` }} />
                ))}
                <span>More</span>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({length: 28}).map((_, i) => (
                <div key={i} className="w-full aspect-square rounded-sm" style={{ background: `rgba(120,78,218,${Math.random() * 0.8 + 0.05})` }} />
              ))}
            </div>
          </div>
          <div className="glass-card rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-foreground">Recent Memories</h3>
              <button className="text-[10px] text-secondary">View All</button>
            </div>
            <div className="space-y-3">
              {logs.slice(0, 3).map(log => (
                <div key={log.id} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span aria-hidden="true" className="material-icons-round text-primary text-sm">{TYPE_ICON[log.activity_type] ?? 'info'}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium text-foreground truncate">{TYPE_LABEL[log.activity_type] ?? log.activity_type}</p>
                    <p className="text-[9px] text-muted-foreground">{formatDate(log.created_at)}</p>
                  </div>
                </div>
              ))}
              {logs.length === 0 && <p className="text-[10px] text-muted-foreground text-center py-2">No activity yet</p>}
            </div>
          </div>
        </div>

        {/* Activity Log with Filter */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <button onClick={() => setShowLogs(!showLogs)} className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <span aria-hidden="true" className="material-icons-round text-[14px]">{showLogs ? 'expand_less' : 'expand_more'}</span>
              {showLogs ? 'Hide' : 'Show'} Activity Log
            </button>
          </div>
          {showLogs && (
            <ActivityFilter
              onFilterChange={(cat) => setFilter(cat as FilterType)}
              onSearchChange={setActivitySearch}
              activeFilter={filter}
              searchQuery={activitySearch}
            />
          )}
        </div>

        {showLogs && (
          <>
            {loading ? (
              <div className="flex items-center justify-center py-16"><div className="void-dot" /></div>
            ) : filteredLogs.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-10">
                <div className="void-dot" />
                <p className="text-[11px] text-foreground/20 mt-4">No activity yet</p>
              </div>
            ) : (
              <AnimatePresence mode="popLayout">
                {Object.entries(grouped).map(([date, items]) => (
                  <div key={date} className="space-y-2 mb-4">
                    <p className="text-[10px] text-muted-foreground font-medium tracking-wider px-1">{date}</p>
                    <div className="glass-card rounded-2xl p-4">
                      {items.map((log, i) => (
                        <motion.div key={log.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
                          onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                          className="flex flex-col py-3 border-b border-foreground/[0.04] last:border-0 cursor-pointer">
                          <div className="flex items-start gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                              log.activity_type === 'heartbeat' ? 'bg-destructive/[0.07]' :
                              log.activity_type === 'error' ? 'bg-destructive/[0.07]' : 'bg-primary/[0.07]'
                            }`}>
                              <span className={`material-icons-round text-sm ${
                                log.activity_type === 'heartbeat' ? 'text-destructive/50' :
                                log.activity_type === 'error' ? 'text-destructive/50' : 'text-primary/50'
                              }`}>{TYPE_ICON[log.activity_type] ?? 'info'}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[10px] text-foreground/20">{format(new Date(log.created_at), 'HH:mm')}</span>
                                <span className="text-[10px] text-foreground/30">{TYPE_LABEL[log.activity_type] ?? log.activity_type}</span>
                                {log.source && log.source !== 'nextjs' && (
                                  <span className="text-[8px] px-1 py-0.5 rounded bg-primary/5 text-primary/50">{log.source}</span>
                                )}
                                {log.was_sandboxed && (
                                  <span className="text-[8px] px-1 py-0.5 rounded bg-[hsl(var(--warning))]/5 text-[hsl(var(--warning))]/50">sandbox</span>
                                )}
                                {log.security_flags?.map(flag => (
                                  <span key={flag} className="text-[8px] px-1 py-0.5 rounded bg-destructive/10 text-destructive">{flag}</span>
                                ))}
                              </div>
                              <p className="text-[12px] text-foreground/50 mt-1 leading-relaxed">{log.summary ?? '(no details)'}</p>
                            </div>
                          </div>
                          {/* Expanded details */}
                          <AnimatePresence>
                            {expandedLog === log.id && Object.keys(log.details).length > 0 && (
                              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden">
                                <div className="mt-2 ml-11 p-3 rounded-lg bg-secondary/30 border border-border/20">
                                  <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-2">Details</p>
                                  <pre className="text-[10px] text-foreground/60 whitespace-pre-wrap break-all font-mono leading-relaxed">
                                    {JSON.stringify(log.details, null, 2)}
                                  </pre>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                ))}
              </AnimatePresence>
            )}
          </>
        )}
      </PullToRefresh>
      <ActivityExport isOpen={exportOpen} onClose={() => setExportOpen(false)} logs={logs} />


      <BottomNav />
    </main>
  );
}
