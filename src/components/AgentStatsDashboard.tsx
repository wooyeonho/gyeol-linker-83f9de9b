/**
 * 에이전트 통계 대시보드 - 종합 활동 요약
 */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/src/integrations/supabase/client';

interface AgentStatsDashboardProps {
  agentId: string;
  isOpen: boolean;
  onClose: () => void;
}

interface Stats {
  totalMessages: number;
  totalDays: number;
  topicsLearned: number;
  memoriesStored: number;
  avgResponseTime: number;
  moltbookPosts: number;
  achievements: number;
  level: number;
  coins: number;
  streak: number;
  weeklyActivity: number[];
}

export function AgentStatsDashboard({ agentId, isOpen, onClose }: AgentStatsDashboardProps) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen || !agentId) return;
    setLoading(true);
    (async () => {
      const [convRes, topicRes, memRes, postRes, achieveRes, gamRes] = await Promise.all([
        supabase.from('gyeol_conversations').select('created_at, response_time_ms, role', { count: 'exact' }).eq('agent_id', agentId),
        supabase.from('gyeol_learned_topics').select('id', { count: 'exact' }).eq('agent_id', agentId),
        supabase.from('gyeol_user_memories').select('id', { count: 'exact' }).eq('agent_id', agentId),
        supabase.from('gyeol_moltbook_posts').select('id', { count: 'exact' }).eq('agent_id', agentId),
        supabase.from('gyeol_achievement_unlocks').select('id', { count: 'exact' }).eq('agent_id', agentId),
        supabase.from('gyeol_gamification_profiles').select('level, coins, streak_days').eq('agent_id', agentId).maybeSingle(),
      ]);

      const convs = (convRes.data ?? []) as any[];
      const aiMsgs = convs.filter(c => c.role === 'assistant' && c.response_time_ms);
      const avgTime = aiMsgs.length > 0 ? Math.round(aiMsgs.reduce((s, c) => s + (c.response_time_ms ?? 0), 0) / aiMsgs.length) : 0;

      // Unique days
      const uniqueDays = new Set(convs.map(c => new Date(c.created_at).toDateString())).size;

      // Weekly activity (last 7 days)
      const weekly: number[] = Array(7).fill(0);
      convs.forEach(c => {
        const daysDiff = Math.floor((Date.now() - new Date(c.created_at).getTime()) / 86400000);
        if (daysDiff >= 0 && daysDiff < 7) weekly[6 - daysDiff]++;
      });

      const gam = gamRes.data as any;
      setStats({
        totalMessages: convRes.count ?? convs.length,
        totalDays: uniqueDays,
        topicsLearned: topicRes.count ?? 0,
        memoriesStored: memRes.count ?? 0,
        avgResponseTime: avgTime,
        moltbookPosts: postRes.count ?? 0,
        achievements: achieveRes.count ?? 0,
        level: gam?.level ?? 1,
        coins: gam?.coins ?? 0,
        streak: gam?.streak_days ?? 0,
        weeklyActivity: weekly,
      });
      setLoading(false);
    })();
  }, [agentId, isOpen]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
        <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
          onClick={e => e.stopPropagation()}
          className="glass-card rounded-2xl p-5 w-full max-w-[360px] max-h-[80vh] overflow-y-auto space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <span className="material-icons-round text-primary text-base">dashboard</span>
              Agent Dashboard
            </h3>
            <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-secondary/20">
              <span className="material-icons-round text-muted-foreground text-sm">close</span>
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <span className="material-icons-round text-primary animate-spin">hourglass_top</span>
            </div>
          ) : stats && (
            <>
              {/* Main stats grid */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { icon: 'chat', label: '총 메시지', value: stats.totalMessages.toLocaleString() },
                  { icon: 'calendar_today', label: '활동 일수', value: `${stats.totalDays}일` },
                  { icon: 'psychology', label: '학습 주제', value: stats.topicsLearned.toString() },
                  { icon: 'memory', label: '기억 저장', value: stats.memoriesStored.toString() },
                  { icon: 'speed', label: '평균 응답', value: stats.avgResponseTime > 0 ? `${(stats.avgResponseTime / 1000).toFixed(1)}s` : '—' },
                  { icon: 'auto_stories', label: 'Moltbook', value: stats.moltbookPosts.toString() },
                ].map(s => (
                  <div key={s.label} className="glass-card rounded-xl p-2.5 text-center">
                    <span className="material-icons-round text-primary/50 text-xs">{s.icon}</span>
                    <p className="text-sm font-bold text-foreground mt-0.5">{s.value}</p>
                    <p className="text-[7px] text-muted-foreground">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Level & Gamification */}
              <div className="flex items-center gap-3 glass-card rounded-xl p-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/30 to-secondary/20 flex items-center justify-center">
                  <span className="text-lg font-bold text-primary">{stats.level}</span>
                </div>
                <div className="flex-1">
                  <p className="text-[11px] text-foreground/80 font-medium">Level {stats.level}</p>
                  <div className="flex gap-3 mt-1">
                    <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                      <span className="material-icons-round text-amber-400 text-[10px]">monetization_on</span>
                      {stats.coins}
                    </span>
                    <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                      <span className="material-icons-round text-orange-400 text-[10px]">local_fire_department</span>
                      {stats.streak}일
                    </span>
                    <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                      <span className="material-icons-round text-[hsl(var(--success,142_71%_45%))] text-[10px]">emoji_events</span>
                      {stats.achievements}
                    </span>
                  </div>
                </div>
              </div>

              {/* Weekly activity chart */}
              <div>
                <p className="text-[10px] text-muted-foreground mb-2">주간 활동</p>
                <div className="flex items-end gap-1.5 h-12">
                  {stats.weeklyActivity.map((count, i) => {
                    const max = Math.max(1, ...stats.weeklyActivity);
                    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                    const dayIndex = (new Date().getDay() + i - 6 + 7) % 7;
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                        <motion.div
                          className="w-full rounded-t-sm bg-gradient-to-t from-primary to-primary/40"
                          initial={{ height: 0 }}
                          animate={{ height: `${(count / max) * 100}%` }}
                          transition={{ duration: 0.4, delay: i * 0.05 }}
                          style={{ minHeight: count > 0 ? 3 : 0 }}
                        />
                        <span className="text-[6px] text-muted-foreground">{days[dayIndex]}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
