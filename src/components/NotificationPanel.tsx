/**
 * 알림 패널 — 업적, 퀘스트 완료, 시스템 알림 등을 표시
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

export function NotificationPanel({ isOpen, onClose }: NotificationPanelProps) {
  const agent = useGyeolStore((s) => s.agent);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

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
        message: '업적을 달성했어요!',
        icon: a.gyeol_achievements?.icon ?? 'emoji_events',
        read: !a.is_new, created_at: a.unlocked_at,
      });
    }
    for (const q of (questRes.data ?? []) as any[]) {
      notifs.push({
        id: `quest-${q.id}`, type: 'quest',
        title: `✅ ${q.gyeol_quests?.title ?? 'Quest'}`,
        message: '퀘스트를 완료했어요!',
        icon: q.gyeol_quests?.icon ?? 'assignment_turned_in',
        read: true, created_at: q.completed_at ?? new Date().toISOString(),
      });
    }
    for (const e of (evoRes.data ?? []) as any[]) {
      const typeLabel = e.activity_type === 'learning' ? '📚 학습' : e.activity_type === 'reflection' ? '💭 성찰' : '💌 선제 메시지';
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
      .update({ is_new: false } as any)
      .eq('agent_id', agent.id)
      .eq('is_new', true);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const relTime = (d: string) => {
    const diff = Date.now() - new Date(d).getTime();
    if (diff < 60000) return '방금';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}분 전`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}시간 전`;
    return `${Math.floor(diff / 86400000)}일 전`;
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-[80]" onClick={onClose} />
          <motion.div
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 250 }}
            className="fixed top-0 right-0 bottom-0 w-[85%] max-w-[360px] bg-background z-[81] flex flex-col shadow-2xl"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/20">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-foreground">알림</h2>
                {unreadCount > 0 && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary text-white font-bold">{unreadCount}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="text-[10px] text-primary">모두 읽음</button>
                )}
                <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground">
                  <span className="material-icons-round text-lg">close</span>
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-20"><div className="void-dot" /></div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <span className="material-icons-round text-4xl text-muted-foreground/20">notifications_none</span>
                  <p className="text-sm text-muted-foreground">아직 알림이 없어요</p>
                </div>
              ) : (
                <div className="divide-y divide-border/10">
                  {notifications.map(n => (
                    <div key={n.id} className={`px-5 py-3 flex items-start gap-3 ${!n.read ? 'bg-primary/[0.03]' : ''}`}>
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                        n.type === 'achievement' ? 'bg-amber-500/10' :
                        n.type === 'quest' ? 'bg-emerald-500/10' : 'bg-primary/10'
                      }`}>
                        <span className={`material-icons-round text-sm ${
                          n.type === 'achievement' ? 'text-amber-400' :
                          n.type === 'quest' ? 'text-emerald-400' : 'text-primary'
                        }`}>{n.icon}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-bold text-foreground">{n.title}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{n.message}</p>
                        <p className="text-[9px] text-muted-foreground/60 mt-1">{relTime(n.created_at)}</p>
                      </div>
                      {!n.read && <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
