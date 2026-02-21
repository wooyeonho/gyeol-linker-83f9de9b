/**
 * Notifications 패널 — Achievement, Quest Done, 시스템 Notifications 등을 표시
 */
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/src/integrations/supabase/client';
import { useGyeolStore } from '@/store/gyeol-store';

interface Notification {
  id: string;
  type: 'achievement' | 'quest' | 'evolution' | 'social' | 'system';
  title: string;
  message: string;
  icon: string;
  read: boolean;
  created_at: string;
}

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const TYPE_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  achievement: { bg: 'bg-[hsl(var(--warning)/0.1)]', text: 'text-[hsl(var(--warning))]', label: 'Achievement' },
  quest: { bg: 'bg-[hsl(var(--success,142_71%_45%)/0.1)]', text: 'text-[hsl(var(--success,142_71%_45%))]', label: 'Quest' },
  evolution: { bg: 'bg-primary/10', text: 'text-primary', label: 'Evolution' },
  social: { bg: 'bg-secondary/10', text: 'text-secondary', label: '소셜' },
  system: { bg: 'bg-primary/10', text: 'text-primary', label: '시스템' },
};

export function NotificationPanel({ isOpen, onClose }: NotificationPanelProps) {
  const agent = useGyeolStore((s) => s.agent);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string | null>(null);
  const [dismissing, setDismissing] = useState<string | null>(null);

  const loadNotifications = useCallback(async () => {
    if (!agent?.id) return;
    setLoading(true);

    const [achRes, questRes, evoRes] = await Promise.all([
      supabase.from('gyeol_achievement_unlocks')
        .select('id, achievement_id, unlocked_at, is_new, gyeol_achievements!inner(name, icon)')
        .eq('agent_id', agent.id)
        .order('unlocked_at', { ascending: false })
        .limit(10),
      supabase.from('gyeol_quest_progress')
        .select('id, quest_id, completed_at, is_completed, gyeol_quests!inner(title, icon)')
        .eq('agent_id', agent.id)
        .eq('is_completed', true)
        .order('completed_at', { ascending: false })
        .limit(10),
      supabase.from('gyeol_autonomous_logs')
        .select('id, activity_type, summary, created_at')
        .eq('agent_id', agent.id)
        .in('activity_type', ['learning', 'reflection', 'proactive_message'])
        .order('created_at', { ascending: false })
        .limit(10),
    ]);

    const notifs: Notification[] = [];
    for (const a of (achRes.data ?? []) as any[]) {
      notifs.push({
        id: `ach-${a.id}`, type: 'achievement',
        title: `🏆 ${a.gyeol_achievements?.name ?? 'Achievement'}`,
        message: 'Achievement을 달성했어요!',
        icon: a.gyeol_achievements?.icon ?? 'emoji_events',
        read: !a.is_new, created_at: a.unlocked_at,
      });
    }
    for (const q of (questRes.data ?? []) as any[]) {
      notifs.push({
        id: `quest-${q.id}`, type: 'quest',
        title: `✅ ${q.gyeol_quests?.title ?? 'Quest'}`,
        message: 'Quest를 Done했어요!',
        icon: q.gyeol_quests?.icon ?? 'assignment_turned_in',
        read: true, created_at: q.completed_at ?? new Date().toISOString(),
      });
    }
    for (const e of (evoRes.data ?? []) as any[]) {
      const typeLabel = e.activity_type === 'learning' ? '📚 Learning' : e.activity_type === 'reflection' ? '💭 Reflection' : '💌 Proactive';
      notifs.push({
        id: `evo-${e.id}`, type: 'system',
        title: typeLabel, message: e.summary ?? '활동이 기록되었어요',
        icon: e.activity_type === 'learning' ? 'school' : 'psychology',
        read: true, created_at: e.created_at,
      });
    }

    notifs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    setNotifications(notifs);
    setLoading(false);
  }, [agent?.id]);

  useEffect(() => {
    if (isOpen) loadNotifications();
  }, [isOpen, loadNotifications]);

  const markAllRead = async () => {
    if (!agent?.id) return;
    await supabase.from('gyeol_achievement_unlocks')
      .update({ is_new: false })
      .eq('agent_id', agent.id)
      .eq('is_new', true);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const dismissNotification = (id: string) => {
    setDismissing(id);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
      setDismissing(null);
    }, 300);
  };

  const relTime = (d: string) => {
    const diff = Date.now() - new Date(d).getTime();
    if (diff < 60000) return '방금';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}분 전`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}시간 전`;
    return `${Math.floor(diff / 86400000)}일 전`;
  };

  const unreadCount = notifications.filter(n => !n.read).length;
  const filtered = filter ? notifications.filter(n => n.type === filter) : notifications;

  // Group by date
  const grouped: Record<string, Notification[]> = {};
  for (const n of filtered) {
    const day = new Date(n.created_at).toLocaleDateString('ko-KR');
    (grouped[day] ??= []).push(n);
  }

  const FILTERS = [
    { key: null, label: '전체' },
    { key: 'achievement', label: 'Achievement' },
    { key: 'quest', label: 'Quest' },
    { key: 'system', label: '시스템' },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-[80]" onClick={onClose}
            role="presentation" />
          <motion.div
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 250 }}
            className="fixed top-0 right-0 bottom-0 w-[85%] max-w-[360px] bg-background z-[81] flex flex-col shadow-2xl"
            role="dialog" aria-label="Notifications 패널" aria-modal="true"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/20">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-foreground">Notifications</h2>
                {unreadCount > 0 && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground font-bold"
                    aria-label={`읽지 않은 Notifications ${unreadCount}개`}>{unreadCount}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="text-[10px] text-primary" aria-label="Mark all read 처리">Mark all read</button>
                )}
                <button onClick={onClose}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground transition"
                  aria-label="Notifications 패널 닫기">
                  <span aria-hidden="true" className="material-icons-round text-lg">close</span>
                </button>
              </div>
            </div>

            {/* Filter tabs */}
            <div className="flex gap-1.5 px-5 py-2 overflow-x-auto gyeol-scrollbar-hide" role="tablist">
              {FILTERS.map(f => (
                <button key={String(f.key)} onClick={() => setFilter(f.key)}
                  role="tab" aria-selected={filter === f.key}
                  className={`px-3 py-1 rounded-full text-[10px] font-medium whitespace-nowrap transition ${
                    filter === f.key
                      ? 'bg-primary/15 text-primary'
                      : 'bg-muted/10 text-muted-foreground hover:bg-muted/20'
                  }`}>
                  {f.label}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto" role="list" aria-label="Notifications 목록">
              {loading ? (
                <div className="flex items-center justify-center py-20"><div className="void-dot" /></div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <span aria-hidden="true" className="material-icons-round text-4xl text-muted-foreground/20">notifications_none</span>
                  <p className="text-sm text-muted-foreground">
                    {filter ? '해당 종류의 Notifications이 없어요' : '아직 Notifications이 없어요'}
                  </p>
                </div>
              ) : (
                Object.entries(grouped).map(([day, items]) => (
                  <div key={day}>
                    <div className="px-5 py-2 sticky top-0 bg-background/80 backdrop-blur-sm z-10">
                      <p className="text-[9px] text-muted-foreground/40 uppercase tracking-wider font-medium">{day}</p>
                    </div>
                    {items.map(n => {
                      const style = TYPE_STYLES[n.type] ?? TYPE_STYLES.system;
                      return (
                        <motion.div
                          key={n.id}
                          role="listitem"
                          initial={false}
                          animate={{ opacity: dismissing === n.id ? 0 : 1, x: dismissing === n.id ? 100 : 0 }}
                          transition={{ duration: 0.25 }}
                          className={`px-5 py-3 flex items-start gap-3 cursor-pointer hover:bg-muted/5 transition ${!n.read ? 'bg-primary/[0.03]' : ''}`}
                          onClick={() => dismissNotification(n.id)}
                        >
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${style.bg}`}>
                            <span className={`material-icons-round text-sm ${style.text}`}>{n.icon}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-[12px] font-bold text-foreground truncate">{n.title}</p>
                              <span className={`text-[8px] px-1.5 py-0.5 rounded-full ${style.bg} ${style.text} font-medium`}>{style.label}</span>
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{n.message}</p>
                            <p className="text-[9px] text-muted-foreground/60 mt-1">{relTime(n.created_at)}</p>
                          </div>
                          {!n.read && <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" aria-label="읽지 않음" />}
                        </motion.div>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
