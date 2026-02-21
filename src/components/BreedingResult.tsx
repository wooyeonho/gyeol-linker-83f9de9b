import { motion, AnimatePresence } from 'framer-motion';

interface ParentInfo {
  name: string;
  gen: number;
  warmth: number;
  logic: number;
  creativity: number;
  energy: number;
  humor: number;
}

interface ChildInfo extends ParentInfo {
  memories: { category: string; value: string }[];
  mutation?: string;
}

interface BreedingResultProps {
  isOpen: boolean;
  onClose: () => void;
  parentA?: ParentInfo;
  parentB?: ParentInfo;
  child?: ChildInfo;
}

const MOCK_PARENT_A: ParentInfo = { name: 'GYEOL-A', gen: 3, warmth: 80, logic: 40, creativity: 70, energy: 50, humor: 90 };
const MOCK_PARENT_B: ParentInfo = { name: 'GYEOL-B', gen: 3, warmth: 65, logic: 60, creativity: 55, energy: 70, humor: 45 };
const MOCK_CHILD: ChildInfo = {
  name: '결이', gen: 3, warmth: 73, logic: 52, creativity: 68, energy: 58, humor: 71,
  memories: [
    { category: '🧑', value: 'Username: Yeonho' },
    { category: '❤️', value: 'Favorite food: Tteokbokki' },
    { category: '🎯', value: 'Interest: Stock investing' },
    { category: '📚', value: 'Study topic: AI tech trends' },
  ],
  mutation: 'Creativity +15 burst!',
};

const STATS = ['warmth', 'logic', 'creativity', 'energy', 'humor'] as const;
const STAT_LABELS: Record<string, string> = {
  warmth: 'Warmth', logic: 'Logic', creativity: 'Creativity', energy: 'Energy', humor: 'Humor',
};

function StatBar({ label, value, parentA, parentB, color }: { label: string; value: number; parentA: number; parentB: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-foreground/50 w-12 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-border/20 overflow-hidden relative">
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
      <span className="text-[9px] text-foreground/60 w-16 text-right shrink-0">
        {value} <span className="text-muted-foreground/30">(A:{parentA} B:{parentB})</span>
      </span>
    </div>
  );
}

export function BreedingResult({ isOpen, onClose, parentA = MOCK_PARENT_A, parentB = MOCK_PARENT_B, child = MOCK_CHILD }: BreedingResultProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', damping: 22 }}
            className="w-full max-w-sm glass-panel rounded-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-5 pt-5 pb-3 text-center">
              <motion.p
                className="text-2xl mb-1"
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.3, 1] }}
                transition={{ duration: 0.5 }}
              >
                🎉
              </motion.p>
              <h2 className="text-sm font-bold text-foreground">Born! Gyeol Hybrid!</h2>

              {/* Parent spheres + child */}
              <div className="flex items-center justify-center gap-3 mt-4">
                <div className="text-center">
                  <div className="w-10 h-10 rounded-full bg-[hsl(var(--info)/0.2)] border border-[hsl(var(--info))]/30 flex items-center justify-center mx-auto">
                    <span className="text-[10px] text-[hsl(var(--info))] font-bold">A</span>
                  </div>
                  <p className="text-[9px] text-muted-foreground/50 mt-1">{parentA.name}</p>
                </div>
                <span className="text-muted-foreground/20 text-lg">+</span>
                <div className="text-center">
                  <div className="w-10 h-10 rounded-full bg-primary/20 border border-accent-pink/30 flex items-center justify-center mx-auto">
                    <span className="text-[10px] text-primary font-bold">B</span>
                  </div>
                  <p className="text-[9px] text-muted-foreground/50 mt-1">{parentB.name}</p>
                </div>
                <span className="text-muted-foreground/20 text-lg">=</span>
                <div className="text-center">
                  <motion.div
                    className="w-12 h-12 rounded-full bg-primary/20 border-2 border-primary/40 flex items-center justify-center mx-auto"
                    animate={{ boxShadow: ['0 0 0 0 hsl(244 63% 52% / 0)', '0 0 20px 4px hsl(244 63% 52% / 0.3)', '0 0 0 0 hsl(244 63% 52% / 0)'] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <span className="text-xs text-primary font-bold">✦</span>
                  </motion.div>
                  <p className="text-[9px] text-primary mt-1 font-medium">{child.name}</p>
                  <p className="text-[8px] text-muted-foreground/40">Gen {child.gen}</p>
                </div>
              </div>
            </div>

            {/* Personality comparison */}
            <div className="px-5 py-3 space-y-2">
              <p className="text-[10px] font-semibold text-foreground/60 mb-2">Inherited Personality</p>
              {STATS.map((stat) => (
                <StatBar
                  key={stat}
                  label={STAT_LABELS[stat]}
                  value={child[stat]}
                  parentA={parentA[stat]}
                  parentB={parentB[stat]}
                  color="hsl(var(--primary))"
                />
              ))}
            </div>

            {/* Inherited memories */}
            <div className="px-5 py-3 border-t border-border/20">
              <p className="text-[10px] font-semibold text-foreground/60 mb-2">
                Inherited Memories ({child.memories.length})
              </p>
              <div className="space-y-1">
                {child.memories.slice(0, 4).map((m, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-[10px] text-foreground/60">
                    <span>{m.category}</span>
                    <span>{m.value}</span>
                  </div>
                ))}
                {child.memories.length > 4 && (
                  <p className="text-[9px] text-muted-foreground/40">... and {child.memories.length - 4} more</p>
                )}
              </div>
            </div>

            {/* Mutation */}
            {child.mutation && (
              <motion.div
                className="mx-5 mb-3 px-3 py-2 rounded-xl bg-[hsl(var(--warning)/0.1)] border border-[hsl(var(--warning))]/20 text-center"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 }}
              >
                <p className="text-[10px] text-[hsl(var(--warning))] font-medium">
                  🫧 Mutation! {child.mutation}
                </p>
              </motion.div>
            )}

            {/* Actions */}
            <div className="flex gap-2 px-5 pb-5 pt-2">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl bg-primary/20 text-primary text-[12px] font-medium hover:bg-primary/30 transition"
              >
                Chat with offspring
              </button>
              <button
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl bg-surface border border-border/30 text-foreground/60 text-[12px] hover:bg-surface/80 transition"
              >
                Share to Community
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
