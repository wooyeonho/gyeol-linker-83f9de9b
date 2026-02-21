import { motion, AnimatePresence } from 'framer-motion';

interface AgentStats {
  name: string;
  gen: number;
  warmth: number;
  logic: number;
  creativity: number;
  energy: number;
  humor: number;
  intimacy?: number;
  totalConversations?: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  agent1: AgentStats | null;
  agent2: AgentStats | null;
}

const TRAITS = ['warmth', 'logic', 'creativity', 'energy', 'humor'] as const;
const TRAIT_ICONS: Record<string, string> = {
  warmth: '❤️', logic: '🧠', creativity: '🎨', energy: '⚡', humor: '😄',
};

function StatBar({ label, icon, v1, v2 }: { label: string; icon: string; v1: number; v2: number }) {
  const max = Math.max(v1, v2, 1);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[10px]">
        <span className="text-primary font-medium w-8 text-right">{v1}</span>
        <span className="text-muted-foreground flex items-center gap-1">
          {icon} {label}
        </span>
        <span className="text-secondary font-medium w-8">{v2}</span>
      </div>
      <div className="flex gap-1 h-2">
        <div className="flex-1 flex justify-end">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(v1 / 100) * 100}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="h-full rounded-l-full bg-gradient-to-l from-primary to-primary/40"
          />
        </div>
        <div className="flex-1">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(v2 / 100) * 100}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="h-full rounded-r-full bg-gradient-to-r from-secondary to-secondary/40"
          />
        </div>
      </div>
    </div>
  );
}

export function AgentComparison({ open, onClose, agent1, agent2 }: Props) {
  if (!agent1 || !agent2) return null;

  const total1 = TRAITS.reduce((s, t) => s + (agent1[t] ?? 50), 0);
  const total2 = TRAITS.reduce((s, t) => s + (agent2[t] ?? 50), 0);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80]" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            className="fixed inset-x-4 bottom-4 top-auto z-[80] max-h-[80vh] overflow-y-auto glass-card rounded-2xl p-5 max-w-md mx-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-foreground">Agent Comparison</h2>
              <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-secondary/20">
                <span aria-hidden="true" className="material-icons-round text-muted-foreground text-sm">close</span>
              </button>
            </div>

            {/* Names header */}
            <div className="flex items-center justify-between mb-4">
              <div className="text-center flex-1">
                <div className="w-10 h-10 mx-auto rounded-full bg-gradient-to-br from-primary/40 to-primary/10 flex items-center justify-center mb-1">
                  <span className="text-sm">🤖</span>
                </div>
                <p className="text-xs font-bold text-primary">{agent1.name}</p>
                <span className="text-[9px] text-muted-foreground">Gen {agent1.gen}</span>
              </div>
              <div className="text-lg font-bold text-muted-foreground/30 px-3">VS</div>
              <div className="text-center flex-1">
                <div className="w-10 h-10 mx-auto rounded-full bg-gradient-to-br from-secondary/40 to-secondary/10 flex items-center justify-center mb-1">
                  <span className="text-sm">🤖</span>
                </div>
                <p className="text-xs font-bold text-secondary">{agent2.name}</p>
                <span className="text-[9px] text-muted-foreground">Gen {agent2.gen}</span>
              </div>
            </div>

            {/* Trait bars */}
            <div className="space-y-3 mb-4">
              {TRAITS.map(t => (
                <StatBar key={t} label={t.charAt(0).toUpperCase() + t.slice(1)} icon={TRAIT_ICONS[t]}
                  v1={agent1[t] ?? 50} v2={agent2[t] ?? 50} />
              ))}
            </div>

            {/* Total power */}
            <div className="glass-card rounded-xl p-3 flex items-center justify-between">
              <div className="text-center flex-1">
                <p className="text-lg font-bold text-primary">{total1}</p>
                <p className="text-[9px] text-muted-foreground">Total Power</p>
              </div>
              <div className="w-px h-8 bg-border/30" />
              <div className="text-center flex-1">
                <p className="text-lg font-bold text-secondary">{total2}</p>
                <p className="text-[9px] text-muted-foreground">Total Power</p>
              </div>
            </div>

            {/* Verdict */}
            <div className="mt-3 text-center">
              <p className="text-[10px] text-muted-foreground">
                {total1 > total2
                  ? `${agent1.name} leads by ${total1 - total2} points`
                  : total2 > total1
                    ? `${agent2.name} leads by ${total2 - total1} points`
                    : 'Both agents are equally matched!'}
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
