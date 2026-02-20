/**
 * 스트릭 캘린더 — 최근 28일 연속 접속 시각화
 */
import { useMemo } from 'react';
import { motion } from 'framer-motion';

interface StreakCalendarProps {
  streakDays: number;
  longestStreak: number;
  className?: string;
}

export function StreakCalendar({ streakDays, longestStreak, className }: StreakCalendarProps) {
  const today = useMemo(() => new Date(), []);

  const days = useMemo(() => {
    const result: { date: Date; active: boolean; isToday: boolean }[] = [];
    for (let i = 27; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      result.push({
        date: d,
        active: i < streakDays,
        isToday: i === 0,
      });
    }
    return result;
  }, [streakDays, today]);

  const weekDays = ['일', '월', '화', '수', '목', '금', '토'];

  return (
    <div className={`glass-card rounded-2xl p-4 ${className ?? ''}`} role="region" aria-label="접속 캘린더">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">🔥</span>
          <span className="text-xs font-bold text-foreground">{streakDays}일 연속</span>
        </div>
        <span className="text-[9px] text-muted-foreground">최장 {longestStreak}일</span>
      </div>

      {/* Weekday labels */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {weekDays.map(d => (
          <div key={d} className="text-center text-[8px] text-muted-foreground/50 font-medium">{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, i) => (
          <motion.div
            key={i}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: i * 0.015, duration: 0.2 }}
            className={`aspect-square rounded-lg flex items-center justify-center text-[9px] font-medium transition-colors relative ${
              day.active
                ? 'bg-primary/20 text-primary'
                : 'bg-muted/10 text-muted-foreground/30'
            } ${day.isToday ? 'ring-1 ring-primary/50' : ''}`}
            aria-label={`${day.date.getMonth() + 1}/${day.date.getDate()} ${day.active ? '접속' : '미접속'}`}
          >
            {day.date.getDate()}
            {day.active && (
              <motion.div
                className="absolute inset-0 rounded-lg bg-primary/10"
                animate={{ opacity: [0.3, 0.1, 0.3] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            )}
          </motion.div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 mt-3 justify-center">
        <div className="flex items-center gap-1">
          <div className="w-2.5 h-2.5 rounded bg-primary/20" />
          <span className="text-[8px] text-muted-foreground">접속</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2.5 h-2.5 rounded bg-muted/10" />
          <span className="text-[8px] text-muted-foreground">미접속</span>
        </div>
      </div>
    </div>
  );
}
