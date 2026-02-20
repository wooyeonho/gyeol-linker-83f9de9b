/**
 * 시즌 패스 UI — 티어별 보상 트랙 표시
 */
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/src/integrations/supabase/client';
import { useGyeolStore } from '@/store/gyeol-store';

interface Season { id: string; name: string; description: string | null; theme_color: string; start_date: string; end_date: string; is_active: boolean; reward_summary: string | null; }
interface SeasonProgress { season_id: string; season_exp: number; tier: number; rewards_claimed: any; }

const TIER_REWARDS = [
  { tier: 1, exp: 100, reward: '🎁 10 코인', icon: 'monetization_on' },
  { tier: 2, exp: 300, reward: '✨ 50 EXP 부스터', icon: 'bolt' },
  { tier: 3, exp: 600, reward: '🎨 시즌 스킨', icon: 'palette' },
  { tier: 4, exp: 1000, reward: '🏷️ 시즌 칭호', icon: 'badge' },
  { tier: 5, exp: 1500, reward: '👑 레전더리 보상', icon: 'workspace_premium' },
];

export function SeasonPass() {
  const agent = useGyeolStore(s => s.agent);
  const [season, setSeason] = useState<Season | null>(null);
  const [progress, setProgress] = useState<SeasonProgress | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: s } = await supabase.from('gyeol_seasons')
        .select('*').eq('is_active', true).maybeSingle();
      if (s) {
        setSeason(s as any);
        if (agent?.id) {
          const { data: p } = await supabase.from('gyeol_season_progress')
            .select('*').eq('agent_id', agent.id).eq('season_id', (s as any).id).maybeSingle();
          setProgress(p as any);
        }
      }
      setLoading(false);
    })();
  }, [agent?.id]);

  if (loading) return null;
  if (!season) {
    return (
      <div className="glass-card rounded-2xl p-5 text-center">
        <span className="material-icons-round text-3xl text-muted-foreground/20 mb-2">event_busy</span>
        <p className="text-sm text-muted-foreground">현재 활성 시즌이 없습니다</p>
        <p className="text-[10px] text-muted-foreground/60 mt-1">다음 시즌을 기대해주세요!</p>
      </div>
    );
  }

  const currentExp = progress?.season_exp ?? 0;
  const currentTier = progress?.tier ?? 0;
  const daysLeft = Math.max(0, Math.ceil((new Date(season.end_date).getTime() - Date.now()) / 86400000));

  return (
    <div className="space-y-4">
      {/* Season header */}
      <div className="glass-card rounded-2xl p-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br opacity-20" style={{ background: `linear-gradient(135deg, ${season.theme_color}40, transparent)` }} />
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <span className="text-[8px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider" style={{ backgroundColor: `${season.theme_color}20`, color: season.theme_color }}>시즌 패스</span>
            <h3 className="text-sm font-bold text-foreground mt-1">{season.name}</h3>
            <p className="text-[10px] text-muted-foreground mt-0.5">{season.description}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-foreground">{currentExp}</p>
            <p className="text-[9px] text-muted-foreground">시즌 EXP</p>
            <p className="text-[9px] mt-1" style={{ color: season.theme_color }}>{daysLeft}일 남음</p>
          </div>
        </div>
      </div>

      {/* Tier track */}
      <div className="space-y-2">
        {TIER_REWARDS.map((t, i) => {
          const unlocked = currentTier >= t.tier;
          const isNext = currentTier === t.tier - 1;
          const pct = isNext ? Math.min((currentExp / t.exp) * 100, 100) : unlocked ? 100 : 0;

          return (
            <motion.div key={t.tier}
              initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`glass-card rounded-xl p-3 flex items-center gap-3 ${unlocked ? 'glass-card-selected' : ''} ${isNext ? 'border border-primary/30' : ''}`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                unlocked ? 'bg-gradient-to-br from-primary/20 to-secondary/20' : 'bg-muted/20'
              }`}>
                <span className={`material-icons-round text-lg ${unlocked ? 'text-primary' : 'text-muted-foreground/30'}`}>
                  {unlocked ? 'check_circle' : t.icon}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className={`text-[11px] font-bold ${unlocked ? 'text-foreground' : 'text-muted-foreground'}`}>
                    Tier {t.tier} — {t.reward}
                  </span>
                  <span className="text-[9px] text-muted-foreground">{t.exp} EXP</span>
                </div>
                {(isNext || unlocked) && (
                  <div className="w-full h-1.5 rounded-full bg-muted/30 mt-1.5">
                    <motion.div
                      className={`h-full rounded-full ${unlocked ? 'bg-emerald-400' : 'bg-gradient-to-r from-primary to-secondary'}`}
                      initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.6, ease: 'easeOut' }}
                    />
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
