/**
 * Achievement 추천 컴포넌트 — 달성에 가까운 Achievement을 추천
 */
import { motion } from 'framer-motion';

interface Achievement {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  rarity: string;
  requirement_type: string;
  requirement_value: number;
  category: string;
  unlocked?: any;
  progress?: { current_value: number };
}

interface Props {
  achievements: Achievement[];
  onSelect?: (ach: Achievement) => void;
}

export function AchievementRecommend({ achievements, onSelect }: Props) {
  // Find not-yet-unlocked achievements, sorted by proximity to completion
  const recommendations = achievements
    .filter(a => !a.unlocked)
    .map(a => {
      const current = (a as any).currentProgress ?? 0;
      const pct = a.requirement_value > 0 ? Math.min(current / a.requirement_value, 1) : 0;
      return { ...a, pct };
    })
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 3);

  if (recommendations.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span aria-hidden="true" className="material-icons-round text-[hsl(var(--warning))] text-sm">recommend</span>
        <h4 className="text-[11px] font-bold text-foreground">추천 Achievement</h4>
      </div>
      {recommendations.map((ach, i) => (
        <motion.button
          key={ach.id}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.05 }}
          onClick={() => onSelect?.(ach)}
          className="w-full glass-card rounded-xl p-3 flex items-center gap-3 hover:bg-primary/5 transition text-left"
        >
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <span aria-hidden="true" className="material-icons-round text-primary text-sm">{ach.icon ?? 'emoji_events'}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold text-foreground truncate">{ach.name}</p>
            <p className="text-[9px] text-muted-foreground truncate">{ach.description}</p>
            <div className="w-full h-1 rounded-full bg-muted/20 mt-1">
              <div className="h-full rounded-full bg-gradient-to-r from-primary to-secondary transition-all"
                style={{ width: `${Math.round(ach.pct * 100)}%` }} />
            </div>
          </div>
          <span className="text-[9px] font-bold text-primary">{Math.round(ach.pct * 100)}%</span>
        </motion.button>
      ))}
    </div>
  );
}
