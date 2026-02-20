/**
 * Phase 4: 일일 보상 / 로그인 보상 모달
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface DailyRewardProps {
  isOpen: boolean;
  onClose: () => void;
  streakDays: number;
  onClaim: () => Promise<void>;
  alreadyClaimed: boolean;
}

const DAILY_REWARDS = [
  { day: 1, coins: 5, exp: 10, icon: '🎁' },
  { day: 2, coins: 10, exp: 15, icon: '🎁' },
  { day: 3, coins: 15, exp: 20, icon: '🎁' },
  { day: 4, coins: 20, exp: 25, icon: '🎁' },
  { day: 5, coins: 30, exp: 35, icon: '🎁' },
  { day: 6, coins: 40, exp: 45, icon: '🎁' },
  { day: 7, coins: 100, exp: 100, icon: '🏆' },
];

export function DailyReward({ isOpen, onClose, streakDays, onClaim, alreadyClaimed }: DailyRewardProps) {
  const [claiming, setClaiming] = useState(false);
  const currentDay = ((streakDays - 1) % 7) + 1;

  const handleClaim = async () => {
    setClaiming(true);
    await onClaim();
    setClaiming(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="glass-card rounded-3xl p-6 w-full max-w-sm relative z-10"
          >
            <h2 className="text-lg font-bold text-foreground text-center mb-1">Daily Reward</h2>
            <p className="text-[11px] text-muted-foreground text-center mb-4">
              🔥 {streakDays}일 연속 접속!
            </p>

            <div className="grid grid-cols-7 gap-1.5 mb-4">
              {DAILY_REWARDS.map((r) => {
                const isPast = r.day < currentDay;
                const isCurrent = r.day === currentDay;
                return (
                  <div
                    key={r.day}
                    className={`flex flex-col items-center p-2 rounded-xl text-center transition-all ${
                      isCurrent
                        ? 'glass-card-selected scale-105'
                        : isPast
                        ? 'bg-primary/5 opacity-50'
                        : 'bg-muted/10'
                    }`}
                  >
                    <span className="text-sm">{isPast ? '✅' : r.icon}</span>
                    <span className="text-[7px] text-muted-foreground mt-0.5">D{r.day}</span>
                    <span className="text-[7px] text-amber-400 font-bold">{r.coins}🪙</span>
                  </div>
                );
              })}
            </div>

            {!alreadyClaimed ? (
              <button
                onClick={handleClaim}
                disabled={claiming}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-primary to-secondary text-white font-bold text-sm btn-glow disabled:opacity-30"
              >
                {claiming ? '받는 중...' : `보상 받기 (+${DAILY_REWARDS[currentDay - 1]?.coins ?? 5}🪙)`}
              </button>
            ) : (
              <div className="text-center py-3 text-[11px] text-muted-foreground">
                ✅ 오늘의 보상을 이미 받았습니다
              </div>
            )}

            <button onClick={onClose} className="absolute top-3 right-3 text-muted-foreground/40 hover:text-foreground">
              <span className="material-icons-round text-lg">close</span>
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
