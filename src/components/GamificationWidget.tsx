import { memo } from 'react';
/**
 * 홈 화면 게이미피케이션 미니 위젯
 */
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useGamification, expToNextLevel } from '@/src/hooks/useGamification';

function GamificationWidgetInternal() {
  const { profile, quests, loading } = useGamification();

  if (loading || !profile) return null;

  const levelProgress = expToNextLevel(profile.exp, profile.level);
  const activeQuests = quests.filter(q => q.progress && !q.progress.is_claimed && q.quest_type === 'daily');
  const completedCount = activeQuests.filter(q => q.progress?.is_completed).length;

  return (
    <Link to="/gamification">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-2xl p-3 w-full max-w-[280px]"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <span className="text-white text-[10px] font-bold">Lv{profile.level}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-foreground">{profile.title ?? '초보 동반자'}</span>
              <div className="flex items-center gap-1.5">
                <span className="text-[8px] text-[hsl(var(--warning))]">🪙 {profile.coins}</span>
                <span className="text-[8px] text-muted-foreground">🔥 {profile.streak_days}d</span>
              </div>
            </div>
          </div>
          <span aria-hidden="true" className="material-icons-round text-muted-foreground/30 text-sm">chevron_right</span>
        </div>

        {/* EXP bar */}
        <div className="w-full h-1 rounded-full bg-muted/30 mb-2">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-secondary transition-all"
            style={{ width: `${levelProgress.progress}%` }}
          />
        </div>

        {/* Daily quests summary */}
        {activeQuests.length > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] text-muted-foreground">오늘의 퀘스트</span>
            <span className="text-[9px] font-bold text-primary">{completedCount}/{activeQuests.length}</span>
            {completedCount > 0 && completedCount < activeQuests.length && (
              <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary animate-pulse">보상 대기중</span>
            )}
          </div>
        )}
      </motion.div>
    </Link>
  );
}

export const GamificationWidget = memo(GamificationWidgetInternal);
