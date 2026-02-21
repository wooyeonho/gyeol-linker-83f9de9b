/**
 * Phase 4: Achievement 달성 축하 팝업 애니메이션
 */
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/src/integrations/supabase/client';
import { useGyeolStore } from '@/store/gyeol-store';

interface AchievementData {
  name: string;
  description: string | null;
  icon: string | null;
  rarity: string;
  reward_title: string | null;
  reward_coins: number;
  reward_exp: number;
}

const RARITY_GRADIENT: Record<string, string> = {
  common: 'from-slate-400/20 to-slate-500/10',
  uncommon: 'from-[hsl(var(--success))]/20 to-[hsl(var(--success))]/10',
  rare: 'from-blue-400/20 to-blue-500/10',
  epic: 'from-primary/20 to-primary/10',
  legendary: 'from-amber-400/20 to-amber-500/10',
};

const RARITY_BORDER: Record<string, string> = {
  common: 'border-slate-400/30',
  uncommon: 'border-[hsl(var(--success,142_71%_45%)/0.3)]',
  rare: 'border-[hsl(var(--info))]/30',
  epic: 'border-primary/30',
  legendary: 'border-[hsl(var(--warning))]/30',
};

export function AchievementPopup() {
  const agent = useGyeolStore((s) => s.agent);
  const [achievement, setAchievement] = useState<AchievementData | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!agent?.id) return;

    const channel = supabase
      .channel(`achievement-popup:${agent.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'gyeol_achievement_unlocks', filter: `agent_id=eq.${agent.id}` },
        async (payload: any) => {
          const { data } = await supabase
            .from('gyeol_achievements')
            .select('name, description, icon, rarity, reward_title, reward_coins, reward_exp')
            .eq('id', payload.new.achievement_id)
            .maybeSingle();
          if (data) {
            setAchievement(data as any);
            setVisible(true);
            setTimeout(() => setVisible(false), 5000);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [agent?.id]);

  return (
    <AnimatePresence>
      {visible && achievement && (
        <motion.div
          initial={{ y: -100, opacity: 0, scale: 0.8 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: -100, opacity: 0, scale: 0.8 }}
          transition={{ type: 'spring', damping: 15, stiffness: 200 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] w-[90%] max-w-sm"
          onClick={() => setVisible(false)}
        >
          <div className={`glass-card rounded-2xl p-4 border ${RARITY_BORDER[achievement.rarity] ?? 'border-primary/30'} bg-gradient-to-r ${RARITY_GRADIENT[achievement.rarity] ?? ''}`}>
            {/* Confetti particles */}
            <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
              {Array.from({ length: 12 }).map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-1.5 h-1.5 rounded-full"
                  style={{
                    background: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'][i % 6],
                    left: `${10 + Math.random() * 80}%`,
                    top: `${Math.random() * 100}%`,
                  }}
                  initial={{ scale: 0, y: 0 }}
                  animate={{ scale: [0, 1.5, 0], y: [0, -30, -60] }}
                  transition={{ duration: 1.5, delay: i * 0.08, ease: 'easeOut' }}
                />
              ))}
            </div>

            <div className="flex items-center gap-3 relative z-10">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                <span aria-hidden="true" className="material-icons-round text-2xl text-primary">{achievement.icon ?? 'emoji_events'}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-primary/60 uppercase tracking-wider font-bold">🏆 Achievement Unlocked!</p>
                <p className="text-sm font-bold text-foreground truncate">{achievement.name}</p>
                <p className="text-[10px] text-muted-foreground truncate">{achievement.description}</p>
                <div className="flex items-center gap-2 mt-1">
                  {achievement.reward_exp > 0 && (
                    <span className="text-[9px] text-secondary">+{achievement.reward_exp} EXP</span>
                  )}
                  {achievement.reward_coins > 0 && (
                    <span className="text-[9px] text-[hsl(var(--warning))]">+{achievement.reward_coins}🪙</span>
                  )}
                  {achievement.reward_title && (
                    <span className="text-[9px] text-primary">🏷 {achievement.reward_title}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
