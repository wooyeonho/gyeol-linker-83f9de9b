/**
 * 스트릭 보너스 배너 — 연속 접속일 기반 보너스 표시
 */
import { motion } from 'framer-motion';

interface Props {
  streakDays: number;
  className?: string;
}

const MILESTONES = [
  { days: 3, bonus: '1.2x', label: '3일 연속' },
  { days: 7, bonus: '1.5x', label: '1주 연속' },
  { days: 14, bonus: '2x', label: '2주 연속' },
  { days: 30, bonus: '3x', label: '1달 연속' },
];

export function StreakBonus({ streakDays, className }: Props) {
  const currentMilestone = MILESTONES.filter(m => streakDays >= m.days).pop();
  const nextMilestone = MILESTONES.find(m => streakDays < m.days);

  if (streakDays < 2) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`glass-card rounded-2xl p-3 ${className ?? ''}`}
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center">
          <span className="text-lg">🔥</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-[12px] font-bold text-foreground">{streakDays}일 연속 접속!</p>
            {currentMilestone && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[hsl(var(--warning)/0.2)] text-[hsl(var(--warning))] font-bold">
                보상 {currentMilestone.bonus}
              </span>
            )}
          </div>
          {nextMilestone && (
            <div className="mt-1">
              <div className="flex items-center justify-between mb-0.5">
                <p className="text-[9px] text-muted-foreground">
                  Next 보너스: {nextMilestone.label} ({nextMilestone.bonus})
                </p>
                <p className="text-[9px] text-primary font-bold">
                  {nextMilestone.days - streakDays}일 남음
                </p>
              </div>
              <div className="w-full h-1 rounded-full bg-muted/20">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all"
                  style={{ width: `${Math.min((streakDays / nextMilestone.days) * 100, 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
