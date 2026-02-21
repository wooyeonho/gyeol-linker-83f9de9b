/**
 * Personality 변화 Notifications — 대화 후 Personality 변화 감지 시 표시
 */
import { motion, AnimatePresence } from 'framer-motion';

interface PersonalityChangeNotifProps {
  show: boolean;
  changes: Record<string, number>;
  onClose: () => void;
}

const TRAIT_LABELS: Record<string, string> = {
  warmth: 'Warmth', logic: 'Logic', creativity: '창의력', energy: 'Energy', humor: 'Humor',
};
const TRAIT_EMOJI: Record<string, string> = {
  warmth: '💗', logic: '🧠', creativity: '🎨', energy: '⚡', humor: '😄',
};

export function PersonalityChangeNotif({ show, changes, onClose }: PersonalityChangeNotifProps) {
  const entries = Object.entries(changes).filter(([, v]) => v !== 0);
  if (entries.length === 0) return null;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[80] glass-card rounded-2xl p-4 w-[280px] shadow-xl border border-primary/20"
        >
          <div className="flex items-center gap-2 mb-2">
            <span aria-hidden="true" className="material-icons-round text-primary text-sm">auto_awesome</span>
            <span className="text-[11px] font-bold text-foreground">Personality이 변했어요!</span>
            <button onClick={onClose} className="ml-auto text-muted-foreground hover:text-foreground">
              <span aria-hidden="true" className="material-icons-round text-sm">close</span>
            </button>
          </div>
          <div className="space-y-1">
            {entries.map(([key, val]) => (
              <div key={key} className="flex items-center justify-between text-[10px]">
                <span className="text-foreground/70">{TRAIT_EMOJI[key]} {TRAIT_LABELS[key] ?? key}</span>
                <span className={val > 0 ? 'text-[hsl(var(--success,142_71%_45%))]' : 'text-destructive'}>
                  {val > 0 ? '+' : ''}{val}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
