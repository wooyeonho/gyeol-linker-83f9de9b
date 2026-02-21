import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/src/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';

interface TimelineEvent {
  id: string;
  type: 'evolution' | 'conversation' | 'achievement' | 'social' | 'learning';
  title: string;
  description?: string;
  created_at: string;
  icon: string;
}

export function ProfileTimeline({ agentId }: { agentId: string }) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!agentId) return;
    (async () => {
      setLoading(true);
      const [logsRes, achievementsRes, postsRes] = await Promise.all([
        supabase.from('gyeol_autonomous_logs' as any)
          .select('id, activity_type, summary, created_at')
          .eq('agent_id', agentId)
          .order('created_at', { ascending: false }).limit(10),
        supabase.from('gyeol_achievement_unlocks' as any)
          .select('id, unlocked_at, gyeol_achievements!inner(name, icon)')
          .eq('agent_id', agentId)
          .order('unlocked_at', { ascending: false }).limit(5),
        supabase.from('gyeol_moltbook_posts' as any)
          .select('id, content, post_type, created_at')
          .eq('agent_id', agentId)
          .order('created_at', { ascending: false }).limit(5),
      ]);

      const timeline: TimelineEvent[] = [];

      (logsRes.data as any[] ?? []).forEach((l: any) => {
        timeline.push({
          id: l.id, type: l.activity_type === 'learning' ? 'learning' : 'conversation',
          title: l.activity_type === 'learning' ? '새로운 학습' : l.activity_type === 'reflection' ? '자기 성찰' : l.activity_type,
          description: l.summary, created_at: l.created_at,
          icon: l.activity_type === 'learning' ? 'school' : l.activity_type === 'reflection' ? 'psychology' : 'auto_awesome',
        });
      });

      (achievementsRes.data as any[] ?? []).forEach((a: any) => {
        timeline.push({
          id: a.id, type: 'achievement',
          title: `업적 달성: ${a.gyeol_achievements?.name ?? '???'}`,
          created_at: a.unlocked_at, icon: a.gyeol_achievements?.icon ?? 'emoji_events',
        });
      });

      (postsRes.data as any[] ?? []).forEach((p: any) => {
        timeline.push({
          id: p.id, type: 'social',
          title: p.post_type === 'visit_log' ? 'Moltbook 방문 일지' : '커뮤니티 포스트',
          description: p.content?.slice(0, 80), created_at: p.created_at, icon: 'forum',
        });
      });

      timeline.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setEvents(timeline.slice(0, 20));
      setLoading(false);
    })();
  }, [agentId]);

  const typeColors: Record<string, string> = {
    evolution: 'text-amber-400', conversation: 'text-primary',
    achievement: 'text-emerald-400', social: 'text-secondary', learning: 'text-cyan-400',
  };

  if (loading) return (
    <div className="flex justify-center py-4">
      <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  );

  if (events.length === 0) return (
    <div className="text-center py-6 text-muted-foreground text-xs">아직 타임라인 이벤트가 없어요</div>
  );

  return (
    <div className="space-y-0 relative">
      {/* Vertical timeline line */}
      <div className="absolute left-[15px] top-2 bottom-2 w-px bg-border/30" />

      {events.map((event, i) => (
        <motion.div key={event.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.05 }}
          className="flex gap-3 py-2 relative">
          {/* Dot */}
          <div className={`w-[30px] h-[30px] rounded-full glass-card flex items-center justify-center shrink-0 z-10 ${typeColors[event.type] ?? 'text-muted-foreground'}`}>
            <span className="material-icons-round text-[14px]">{event.icon}</span>
          </div>
          {/* Content */}
          <div className="flex-1 min-w-0 pt-1">
            <p className="text-[11px] font-medium text-foreground/80">{event.title}</p>
            {event.description && (
              <p className="text-[10px] text-muted-foreground/60 mt-0.5 truncate">{event.description}</p>
            )}
            <p className="text-[9px] text-muted-foreground/40 mt-0.5">
              {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
            </p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
