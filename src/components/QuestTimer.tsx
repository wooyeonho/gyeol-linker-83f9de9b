/**
 * 퀘스트 카운트다운 타이머 — 일일/주간 퀘스트 리셋 시간 표시
 */
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

function getNextReset(type: 'daily' | 'weekly'): Date {
  const now = new Date();
  const reset = new Date(now);
  reset.setHours(0, 0, 0, 0);
  if (type === 'daily') {
    reset.setDate(reset.getDate() + 1);
  } else {
    // Next Monday
    const day = reset.getDay();
    const daysUntilMonday = day === 0 ? 1 : 8 - day;
    reset.setDate(reset.getDate() + daysUntilMonday);
  }
  return reset;
}

function formatTimeLeft(ms: number): string {
  if (ms <= 0) return '리셋!';
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  if (hours > 0) return `${hours}시간 ${minutes}분`;
  if (minutes > 0) return `${minutes}분 ${seconds}초`;
  return `${seconds}초`;
}

interface Props {
  type: 'daily' | 'weekly';
  compact?: boolean;
}

export function QuestTimer({ type, compact = false }: Props) {
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    const update = () => {
      const reset = getNextReset(type);
      setTimeLeft(reset.getTime() - Date.now());
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [type]);

  if (compact) {
    return (
      <span className="text-[9px] text-muted-foreground flex items-center gap-1">
        <span className="material-icons-round text-[10px]">schedule</span>
        {formatTimeLeft(timeLeft)}
      </span>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card rounded-xl px-3 py-2 flex items-center justify-between"
    >
      <div className="flex items-center gap-2">
        <span className="material-icons-round text-primary text-sm">timer</span>
        <span className="text-[10px] text-foreground font-medium">
          {type === 'daily' ? '일일 리셋' : '주간 리셋'}
        </span>
      </div>
      <span className="text-[11px] font-bold text-primary tabular-nums">
        {formatTimeLeft(timeLeft)}
      </span>
    </motion.div>
  );
}
