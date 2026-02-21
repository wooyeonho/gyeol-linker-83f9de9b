/**
 * Intimacy Level업 연출 — Intimacy가 특정 단계에 도달했을 때 팝업
 */
import { motion, AnimatePresence } from 'framer-motion';

const INTIMACY_TIERS = [
  { min: 0, label: '낯선 사이', icon: '🌱', color: 'from-muted to-muted-foreground/30' },
  { min: 20, label: '아는 사이', icon: '🌿', color: 'from-[hsl(var(--success))]/30 to-teal-500/30' },
  { min: 40, label: '친한 사이', icon: '💚', color: 'from-green-500/30 to-[hsl(var(--success))]/30' },
  { min: 60, label: '가까운 사이', icon: '💙', color: 'from-blue-500/30 to-indigo-500/30' },
  { min: 80, label: '특별한 사이', icon: '💜', color: 'from-violet-500/30 to-primary/30' },
  { min: 95, label: '유일한 존재', icon: '✨', color: 'from-amber-500/30 to-rose-500/30' },
];

export function getIntimacyTier(intimacy: number) {
  return [...INTIMACY_TIERS].reverse().find(t => intimacy >= t.min) ?? INTIMACY_TIERS[0];
}

interface IntimacyLevelUpProps {
  show: boolean;
  intimacy: number;
  onClose: () => void;
}

export function IntimacyLevelUp({ show, intimacy, onClose }: IntimacyLevelUpProps) {
  const tier = getIntimacyTier(intimacy);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md"
          onClick={onClose}
          role="dialog"
          aria-label="Intimacy Level업"
        >
          <motion.div
            initial={{ scale: 0.3, opacity: 0, y: 40 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ type: 'spring', damping: 15, stiffness: 200 }}
            className="glass-card rounded-3xl p-8 text-center max-w-xs mx-auto"
            onClick={e => e.stopPropagation()}
          >
            {/* Heart pulse */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.2, 1] }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className={`w-24 h-24 mx-auto rounded-full bg-gradient-to-br ${tier.color} flex items-center justify-center mb-4 relative`}
            >
              <motion.div
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                className="text-4xl"
              >
                {tier.icon}
              </motion.div>
              {/* Ripple rings */}
              {[0, 0.3, 0.6].map((delay, i) => (
                <motion.div
                  key={i}
                  className="absolute inset-0 rounded-full border border-primary/20"
                  initial={{ scale: 1, opacity: 0.6 }}
                  animate={{ scale: [1, 2], opacity: [0.6, 0] }}
                  transition={{ duration: 1.5, delay, repeat: Infinity, ease: 'easeOut' }}
                />
              ))}
            </motion.div>

            <motion.h2
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-lg font-black text-foreground mb-1"
            >
              Intimacy UP!
            </motion.h2>
            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.45 }}
              className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary mb-1"
            >
              {tier.label}
            </motion.p>
            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="text-xs text-muted-foreground mb-6"
            >
              Intimacy {intimacy}에 도달했어요
            </motion.p>

            <motion.button
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.8 }}
              onClick={onClose}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-primary to-secondary text-primary-foreground font-bold text-sm shadow-lg shadow-primary/30"
            >
              Confirm
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
