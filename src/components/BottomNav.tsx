import { Link, useLocation } from 'react-router-dom';
import { useState, useEffect, memo } from 'react';
import { supabase } from '@/src/integrations/supabase/client';
import { useGyeolStore } from '@/store/gyeol-store';
import { Home, Trophy, Users, Activity, Settings } from 'lucide-react';

const NAV_ITEMS = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/gamification', icon: Trophy, label: 'Quest' },
  { to: '/social', icon: Users, label: 'Social' },
  { to: '/activity', icon: Activity, label: 'Activity' },
  { to: '/settings', icon: Settings, label: 'Settings' },
] as const;

function BottomNavInternal() {
  const { pathname } = useLocation();
  const agent = useGyeolStore((s) => s.agent);
  const [badges, setBadges] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!agent?.id) return;

    const fetchBadges = async () => {
      const [achievRes, questRes] = await Promise.all([
        supabase.from('gyeol_achievement_unlocks')
          .select('id', { count: 'exact', head: true })
          .eq('agent_id', agent.id)
          .eq('is_new', true),
        supabase.from('gyeol_quest_progress')
          .select('id', { count: 'exact', head: true })
          .eq('agent_id', agent.id)
          .eq('is_completed', true)
          .eq('is_claimed', false),
      ]);
      const gamBadge = (achievRes.count ?? 0) + (questRes.count ?? 0);
      setBadges(prev => ({ ...prev, '/gamification': gamBadge }));
    };
    fetchBadges();
  }, [agent?.id]);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[70] glass-panel border-t border-border/10"
      role="navigation" aria-label="Main navigation"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <div className="max-w-md mx-auto grid grid-cols-5 place-items-center h-14" role="list">
        {NAV_ITEMS.map((item) => {
          const active = item.to === '/' ? pathname === '/' : pathname.startsWith(item.to);
          const badge = badges[item.to] ?? 0;
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              role="listitem"
              aria-label={`${item.label}${badge > 0 ? ` (${badge} new)` : ''}`}
              aria-current={active ? 'page' : undefined}
              className="flex flex-col items-center justify-center gap-0.5 h-14 relative focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2 rounded-lg"
            >
              <span className="relative">
                <Icon
                  size={20}
                  className={`transition-colors duration-200 ${active ? 'text-primary' : 'text-muted-foreground'}`}
                  aria-hidden="true"
                />
                {badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-[14px] h-[14px] rounded-full bg-destructive text-foreground text-[8px] font-bold flex items-center justify-center px-0.5 shadow-lg shadow-destructive/40 animate-pulse">
                    {badge > 99 ? '99+' : badge}
                  </span>
                )}
              </span>
              <span className={`text-[10px] font-medium transition-colors duration-200 ${active ? 'text-primary' : 'text-muted-foreground'}`}>
                {item.label}
              </span>
              {active && (
                <div className="absolute bottom-1 w-1 h-1 rounded-full bg-primary shadow-[0_0_6px_hsl(var(--primary)/0.6)]" aria-hidden="true" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export const BottomNav = memo(BottomNavInternal);
