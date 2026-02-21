import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Gift, Trophy } from 'lucide-react';

const INTIMACY_LEVELS = [
  { min: 0, emoji: '🌱', label: 'Seed', color: 'text-[hsl(var(--success,142_71%_45%))]' },
  { min: 20, emoji: '🌿', label: 'Sprout', color: 'text-[hsl(var(--success,142_71%_45%))]' },
  { min: 40, emoji: '🌸', label: 'Bloom', color: 'text-primary' },
  { min: 60, emoji: '🌺', label: 'Flower', color: 'text-primary' },
  { min: 80, emoji: '💎', label: 'Diamond', color: 'text-primary' },
];

export function getIntimacyInfo(intimacy: number) {
  const level = [...INTIMACY_LEVELS].reverse().find(l => intimacy >= l.min) ?? INTIMACY_LEVELS[0];
  return level;
}

export function IntimacyEmoji({ intimacy }: { intimacy: number }) {
  const info = getIntimacyInfo(intimacy);
  return (
    <span className={`text-sm ${info.color}`} title={`${info.label} (${intimacy})`}>
      {info.emoji}
    </span>
  );
}

export function IntimacyBonusPopup({ level, onClose }: { level: number; onClose: () => void }) {
  const rewards: Record<number, { title: string; desc: string; emoji: string }> = {
    3: { title: 'Special Chat Mode Unlocked!', desc: 'You can now use deep conversation mode.', emoji: '💬' },
    5: { title: 'Exclusive Skin Obtained!', desc: 'A limited edition skin has been added to your inventory.', emoji: '✨' },
  };
  const reward = rewards[level];
  if (!reward) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm p-6"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.8, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        onClick={e => e.stopPropagation()}
        className="glass-card rounded-2xl p-6 text-center max-w-[280px] w-full space-y-3"
      >
        <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 2 }}
          className="text-4xl">{reward.emoji}</motion.div>
        <Gift className="w-5 h-5 text-primary mx-auto" />
        <h3 className="text-sm font-bold text-foreground">{reward.title}</h3>
        <p className="text-[10px] text-muted-foreground">{reward.desc}</p>
        <button onClick={onClose}
          className="w-full py-2 rounded-xl bg-primary/10 text-primary text-[11px] font-medium hover:bg-primary/20 transition">
          Claim Reward
        </button>
      </motion.div>
    </motion.div>
  );
}

export function IntimacyRanking({ rankings }: { rankings: { name: string; intimacy: number; gen: number }[] }) {
  return (
    <div className="space-y-2">
      <h4 className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
        <Trophy className="w-3.5 h-3.5 text-primary" /> Intimacy Ranking
      </h4>
      <div className="space-y-1">
        {rankings.map((r, i) => {
          const info = getIntimacyInfo(r.intimacy);
          return (
            <div key={i} className="flex items-center gap-2 p-2 rounded-xl glass-card">
              <span className={`text-[11px] font-bold w-5 text-center ${i < 3 ? 'text-primary' : 'text-muted-foreground'}`}>
                {i + 1}
              </span>
              <span>{info.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-medium text-foreground truncate">{r.name}</p>
                <p className="text-[8px] text-muted-foreground">Gen {r.gen}</p>
              </div>
              <span className="text-[10px] text-primary font-mono">{r.intimacy}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
