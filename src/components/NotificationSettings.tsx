/**
 * 알림 설정 세분화 컴포넌트
 */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/src/integrations/supabase/client';

interface NotifCategory {
  key: string;
  icon: string;
  label: string;
  description: string;
}

const NOTIF_CATEGORIES: NotifCategory[] = [
  { key: 'proactive', icon: 'chat_bubble', label: 'Proactive Messages', description: 'AI가 먼저 보내는 메시지' },
  { key: 'evolution', icon: 'auto_awesome', label: 'Evolution Events', description: '진화/돌연변이 알림' },
  { key: 'quest', icon: 'assignment_turned_in', label: 'Quest Updates', description: '퀘스트 완료/갱신 알림' },
  { key: 'achievement', icon: 'emoji_events', label: 'Achievements', description: '업적 달성 알림' },
  { key: 'social', icon: 'people', label: 'Social Activity', description: '팔로우/댓글/좋아요 알림' },
  { key: 'daily', icon: 'today', label: 'Daily Rewards', description: '일일 보상 알림' },
  { key: 'leaderboard', icon: 'leaderboard', label: 'Leaderboard', description: '순위 변동 알림' },
  { key: 'season', icon: 'stars', label: 'Season Events', description: '시즌 시작/종료/보상 알림' },
];

interface Props {
  agent: any;
  onUpdate: (settings: any) => void;
}

export function NotificationSettings({ agent, onUpdate }: Props) {
  const settings = (agent?.settings as any) ?? {};
  const notifSettings = settings.notifications ?? {};

  const [toggles, setToggles] = useState<Record<string, boolean>>(() => {
    const defaults: Record<string, boolean> = {};
    NOTIF_CATEGORIES.forEach(c => { defaults[c.key] = notifSettings[c.key] !== false; });
    return defaults;
  });

  const [quietStart, setQuietStart] = useState<number>(notifSettings.quietStart ?? 23);
  const [quietEnd, setQuietEnd] = useState<number>(notifSettings.quietEnd ?? 7);

  useEffect(() => {
    const ns = settings.notifications ?? {};
    const defaults: Record<string, boolean> = {};
    NOTIF_CATEGORIES.forEach(c => { defaults[c.key] = ns[c.key] !== false; });
    setToggles(defaults);
    setQuietStart(ns.quietStart ?? 23);
    setQuietEnd(ns.quietEnd ?? 7);
  }, [agent?.id]);

  const save = async (key: string, value: boolean) => {
    const updated = { ...toggles, [key]: value };
    setToggles(updated);
    const ns = { ...notifSettings, ...updated };
    const newSettings = { ...settings, notifications: ns };
    await supabase.from('gyeol_agents' as any).update({ settings: newSettings } as any).eq('id', agent?.id);
    onUpdate(newSettings);
  };

  const saveQuietHours = async (start: number, end: number) => {
    setQuietStart(start);
    setQuietEnd(end);
    const ns = { ...notifSettings, ...toggles, quietStart: start, quietEnd: end };
    const newSettings = { ...settings, notifications: ns };
    await supabase.from('gyeol_agents' as any).update({ settings: newSettings } as any).eq('id', agent?.id);
    onUpdate(newSettings);
  };

  const allOn = Object.values(toggles).every(Boolean);

  return (
    <div className="space-y-3">
      {/* Master toggle */}
      <div className="flex items-center justify-between py-1">
        <div>
          <p className="text-[11px] text-foreground/80 font-medium">All Notifications</p>
          <p className="text-[9px] text-muted-foreground">모든 알림 한번에 켜기/끄기</p>
        </div>
        <button type="button" onClick={() => {
          const newVal = !allOn;
          const updated: Record<string, boolean> = {};
          NOTIF_CATEGORIES.forEach(c => { updated[c.key] = newVal; });
          setToggles(updated);
          const ns = { ...notifSettings, ...updated };
          const newSettings = { ...settings, notifications: ns };
          supabase.from('gyeol_agents' as any).update({ settings: newSettings } as any).eq('id', agent?.id);
          onUpdate(newSettings);
        }}
          className={`w-10 h-6 rounded-full transition ${allOn ? 'bg-gradient-to-r from-primary to-secondary' : 'bg-foreground/10'}`}>
          <div className={`w-4 h-4 rounded-full bg-white mx-1 transition-transform shadow-sm ${allOn ? 'translate-x-4' : ''}`} />
        </button>
      </div>

      <div className="h-px bg-border/10" />

      {/* Individual categories */}
      {NOTIF_CATEGORIES.map(cat => (
        <div key={cat.key} className="flex items-center justify-between py-0.5">
          <div className="flex items-center gap-2">
            <span className="material-icons-round text-primary/40 text-sm">{cat.icon}</span>
            <div>
              <p className="text-[11px] text-foreground/80">{cat.label}</p>
              <p className="text-[9px] text-muted-foreground">{cat.description}</p>
            </div>
          </div>
          <button type="button" onClick={() => save(cat.key, !toggles[cat.key])}
            className={`w-9 h-5 rounded-full transition-colors flex-shrink-0 ${toggles[cat.key] ? 'bg-gradient-to-r from-primary to-secondary' : 'bg-foreground/[0.06]'}`}>
            <span className={`block w-3.5 h-3.5 rounded-full bg-white shadow-sm transition-all ${toggles[cat.key] ? 'ml-[18px]' : 'ml-1'}`} />
          </button>
        </div>
      ))}

      <div className="h-px bg-border/10" />

      {/* Quiet hours */}
      <div className="space-y-2">
        <p className="text-[10px] text-muted-foreground">🌙 Quiet Hours (방해금지 시간)</p>
        <div className="flex items-center gap-2">
          <select value={quietStart} onChange={e => saveQuietHours(Number(e.target.value), quietEnd)}
            className="flex-1 rounded-lg bg-foreground/[0.03] border border-foreground/[0.06] px-2 py-1.5 text-[11px] text-foreground outline-none">
            {Array.from({ length: 24 }, (_, i) => (
              <option key={i} value={i}>{String(i).padStart(2, '0')}:00</option>
            ))}
          </select>
          <span className="text-[10px] text-muted-foreground">~</span>
          <select value={quietEnd} onChange={e => saveQuietHours(quietStart, Number(e.target.value))}
            className="flex-1 rounded-lg bg-foreground/[0.03] border border-foreground/[0.06] px-2 py-1.5 text-[11px] text-foreground outline-none">
            {Array.from({ length: 24 }, (_, i) => (
              <option key={i} value={i}>{String(i).padStart(2, '0')}:00</option>
            ))}
          </select>
        </div>
        <p className="text-[9px] text-muted-foreground/60">이 시간대에는 푸시 알림이 발송되지 않아요</p>
      </div>
    </div>
  );
}
